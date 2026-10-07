import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { extractWebContent, validateWebUrl } from "./web-content";
import { mediaMarker } from "./page-media";

/** Validate DNS and every redirect before fetching user-supplied public URLs. */
export async function fetchPublicResource(value: string, limit: number): Promise<{ bytes: Uint8Array; url: string; type: string }> {
  let url = validateWebUrl(value);
  for (let i = 0; i < 5; i++) {
    const dns = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(url.hostname)}&type=A`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(15000) });
    if (!dns.ok) throw new Error("Não foi possível verificar o endereço da página.");
    const records = await dns.json() as { Answer?: { type: number; data: string }[] };
    const ips = records.Answer?.filter(r => r.type === 1).map(r => r.data) ?? [];
    if (!ips.length || ips.some(ip => /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01])|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])|198\.(18|19)|22[4-9]|23\d|24\d|25[0-5])\./.test(ip))) throw new Error("Este endereço não é uma página pública permitida.");
    const response = await fetch(url.href, { redirect: "manual", signal: AbortSignal.timeout(25000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("O link redirecionou sem informar a página.");
      url = validateWebUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw new Error(`A página não pôde ser acessada (${response.status}). Verifique se o link é público e não exige login.`);
    if (Number(response.headers.get("content-length")) > limit) throw new Error("O conteúdo é grande demais para importar.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("A página não retornou conteúdo.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) { await reader.cancel(); throw new Error("O conteúdo é grande demais para importar."); }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
    return { bytes, url: url.href, type: response.headers.get("content-type")?.split(";")[0] ?? "" };
  }
  throw new Error("Este link redireciona muitas vezes.");
}

export async function importWebMaterial(supabase: SupabaseClient<Database>, userId: string, input: { subjectId?: string; materialId?: string; url?: string }) {
  let source = input.url;
  let id = input.materialId;
  let subjectId = input.subjectId;
  if (id) {
    const { data, error } = await supabase.from("materials").select("subject_id, storage_path, type").eq("id", id).eq("user_id", userId).single();
    if (error || data?.type !== "LINK" || !data.storage_path) throw new Error("Material por link não encontrado.");
    const snapshot = await supabase.storage.from("materials").download(data.storage_path);
    if (snapshot.error) throw snapshot.error;
    source = (JSON.parse(await snapshot.data.text()) as { source: string }).source;
    subjectId = data.subject_id;
  }
  if (!source || !subjectId) throw new Error("Informe a matéria e o link.");
  const { data: subject } = await supabase.from("subjects").select("id").eq("id", subjectId).eq("user_id", userId).single();
  if (!subject) throw new Error("Matéria não encontrada.");
  const fetched = await fetchPublicResource(source, 5 * 1024 * 1024);
  if (!/html/.test(fetched.type)) throw new Error("Este link deve abrir uma página de conteúdo HTML. Para PDFs, envie o arquivo.");
  const html = new TextDecoder().decode(fetched.bytes);
  const extracted = extractWebContent(html, fetched.url);
  if (!extracted.pages.length || extracted.pages.join("").length < 100) throw new Error("Não encontramos conteúdo para estudar. A página pode exigir login ou carregar o texto apenas depois de abrir no navegador.");
  id ??= crypto.randomUUID();
  const created = !input.materialId;
  const uploaded: string[] = [];
  const warnings: string[] = [];
  if (created) {
    const { error } = await supabase.from("materials").insert({ id, user_id: userId, subject_id: subjectId, name: extracted.title.slice(0, 250), type: "LINK", status: "processing" });
    if (error) throw error;
  }
  try {
    const replacements = new Map<number, string>();
    for (let i = 0; i < extracted.images.length; i++) {
      const imageUrl = extracted.images[i];
      if (!imageUrl) continue;
      try {
        const image = await fetchPublicResource(imageUrl, 10 * 1024 * 1024);
        if (!/^image\/(png|jpeg|webp|gif|svg\+xml|avif)$/.test(image.type)) throw new Error("Formato de imagem não aceito.");
        const ext = image.type.split("/")[1]?.replace("svg+xml", "svg").replace("jpeg", "jpg") ?? "png";
        const path = `${userId}/images/${id}/web-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("materials").upload(path, image.bytes, { contentType: image.type });
        if (error) throw error;
        uploaded.push(path);
        replacements.set(i, mediaMarker("", path));
      } catch { warnings.push(`Não foi possível importar a imagem ${i + 1}.`); }
    }
    const pages = extracted.pages.map(p => p.replace(/!\[ \]\(web-image:(\d+)\)/g, (_m, n: string) => replacements.get(Number(n)) ?? "[Imagem indisponível na origem]"));
    const path = `${userId}/${subjectId}/${id}-link.json`;
    const { error: fileError } = await supabase.storage.from("materials").upload(path, new Blob([JSON.stringify({ source: fetched.url, html })], { type: "application/json" }), { contentType: "application/json", upsert: true });
    if (fileError) throw fileError;
    if (created) uploaded.push(path);
    const rows = pages.map((content, i) => ({ user_id: userId, material_id: id as string, page_number: i + 1, content }));
    const { error: pageError } = await supabase.from("material_pages").upsert(rows, { onConflict: "material_id,page_number" });
    if (pageError) throw pageError;
    const { error: trimError } = await supabase.from("material_pages").delete().eq("material_id", id).gt("page_number", pages.length);
    if (trimError) throw trimError;
    const { error } = await supabase.from("materials").update({ status: "ready", pages: pages.length, storage_path: path, name: extracted.title.slice(0, 250), current_page: 1, progress: 0, audio_page: null, audio_chunk: 0, audio_seconds: 0 }).eq("id", id);
    if (error) throw error;
    return { id, title: extracted.title, pages: pages.length, images: replacements.size, warnings };
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("materials").remove(uploaded);
    if (created) { await supabase.from("material_pages").delete().eq("material_id", id); await supabase.from("materials").delete().eq("id", id); }
    throw error;
  }
}