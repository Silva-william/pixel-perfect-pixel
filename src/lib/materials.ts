import { supabase } from "@/integrations/supabase/client";
import type { Material, MaterialType } from "@/data/types";
import { relativeTime as relative } from "@/lib/time";

/** Materials repository: file in Storage (materials/<userId>/...), metadata + extracted text in the database. */

const COLS =
  "id, subject_id, name, type, pages, progress, status, current_page, storage_path, last_viewed_at, created_at, audio_page, audio_chunk, audio_seconds";

type Row = {
  id: string;
  subject_id: string;
  name: string;
  type: string;
  pages: number;
  progress: number;
  status: string;
  current_page: number;
  storage_path: string | null;
  last_viewed_at: string | null;
  created_at: string;
  audio_page: number | null;
  audio_chunk: number;
  audio_seconds: number;
};

export type MaterialDetail = Material & {
  status: string;
  currentPage: number;
  storagePath: string | null;
  /** Where the user stopped listening (null = never listened). */
  audio: AudioPosition | null;
};

export type AudioPosition = { page: number; chunk: number; seconds: number };

function toMaterial(r: Row): MaterialDetail {
  return {
    id: r.id,
    subjectId: r.subject_id,
    name: r.name,
    type: r.type as MaterialType,
    pages: r.pages,
    progress: r.progress,
    lastViewed: relative(r.last_viewed_at ?? r.created_at),
    status: r.status,
    currentPage: r.current_page,
    storagePath: r.storage_path,
    audio: r.audio_page ? { page: r.audio_page, chunk: r.audio_chunk, seconds: r.audio_seconds } : null,
  };
}

export async function listMaterials(subjectId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select(COLS)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toMaterial);
}

export async function getMaterialDetail(id: string): Promise<MaterialDetail | null> {
  const { data, error } = await supabase.from("materials").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toMaterial(data as Row) : null;
}

export async function getPage(materialId: string, page: number): Promise<string> {
  const { data } = await supabase
    .from("material_pages")
    .select("content")
    .eq("material_id", materialId)
    .eq("page_number", page)
    .maybeSingle();
  return data?.content ?? "";
}

export async function saveReadingPosition(id: string, page: number, total: number) {
  const progress = total ? Math.round((page / total) * 100) : 0;
  await supabase
    .from("materials")
    .update({ current_page: page, progress, last_viewed_at: new Date().toISOString() })
    .eq("id", id);
}

/** Saves the listening position so audio resumes where it stopped. `null` clears it (finished). */
export async function saveAudioPosition(id: string, pos: AudioPosition | null) {
  const now = new Date().toISOString();
  await supabase
    .from("materials")
    .update({
      audio_page: pos?.page ?? null,
      audio_chunk: pos?.chunk ?? 0,
      audio_seconds: pos?.seconds ?? 0,
      audio_updated_at: now,
      last_viewed_at: now,
    })
    .eq("id", id);
}

export async function getOriginalUrl(path: string, type?: string) {
  if (type === "LINK") {
    const { data, error } = await supabase.storage.from("materials").download(path);
    if (error) throw error;
    const { source } = JSON.parse(await data.text()) as { source: string };
    const url = new URL(source);
    if (url.protocol !== "https:") throw new Error("Link original inválido.");
    return url.href;
  }
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/** Extracts the text of a file and stores it page by page. */
export async function processMaterial(id: string, type: string, data: ArrayBuffer) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error("Você precisa estar conectado.");
  await supabase.from("materials").update({ status: "processing" }).eq("id", id);
  try {
    const { extractPages } = await import("@/lib/extract-text");
    const pages = await extractPages(type, data, async (blob, page, n) => {
      const path = `${userId}/images/${id}/pdf-p${page}-${n}.png`;
      const { error } = await supabase.storage
        .from("materials")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (error) throw error;
      return path;
    });
    await supabase.from("material_pages").delete().eq("material_id", id);
    const rows = pages.map((content, i) => ({
      user_id: userId,
      material_id: id,
      page_number: i + 1,
      content: content.replace(/\u0000/g, ""),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("material_pages").insert(rows.slice(i, i + 200));
      if (error) throw error;
    }
    const hasText = pages.some((p) => p.trim().length > 0);
    await supabase
      .from("materials")
      .update({ status: hasText ? "ready" : "no_text", pages: pages.length })
      .eq("id", id);
  } catch (e) {
    await supabase.from("materials").update({ status: "failed" }).eq("id", id);
    throw e;
  }
}

/** Re-processes an already uploaded file by downloading it from storage. */
export async function reprocessMaterial(m: MaterialDetail) {
  if (!m.storagePath) throw new Error("Arquivo original não encontrado.");
  const { data, error } = await supabase.storage.from("materials").download(m.storagePath);
  if (error) throw error;
  await processMaterial(m.id, m.type, await data.arrayBuffer());
}

export async function uploadMaterial(subjectId: string, file: File) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error("Você precisa estar conectado.");
  const type = (file.name.split(".").pop() ?? "").toUpperCase();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${subjectId}/${crypto.randomUUID()}-${safe}`;

  const { error: upErr } = await supabase.storage
    .from("materials")
    .upload(path, file, file.type ? { contentType: file.type } : {});
  if (upErr) throw upErr;

  const { data: row, error } = await supabase
    .from("materials")
    .insert({ user_id: userId, subject_id: subjectId, name: file.name, type, storage_path: path })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("materials").remove([path]);
    throw error;
  }
  await processMaterial(row.id, type, await file.arrayBuffer());
}

/** Deletes a material with its original file, extracted pages and saved audio. */
export async function deleteMaterial(m: { id: string; storagePath?: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error("Você precisa estar conectado.");
  const paths: string[] = [];
  for (const folder of [`${userId}/audio/${m.id}`, `${userId}/images/${m.id}`]) {
    const { data: files } = await supabase.storage.from("materials").list(folder, { limit: 1000 });
    for (const f of files ?? []) paths.push(`${folder}/${f.name}`);
  }
  if (m.storagePath) paths.push(m.storagePath);
  if (paths.length) await supabase.storage.from("materials").remove(paths);
  await supabase.from("study_activity").update({ material_id: null }).eq("material_id", m.id);
  await supabase.from("material_pages").delete().eq("material_id", m.id);
  const { error } = await supabase.from("materials").delete().eq("id", m.id);
  if (error) throw error;
}

/** Renames a material. */
export async function renameMaterial(materialId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("O título não pode ficar vazio.");
  const { error } = await supabase.from("materials").update({ name: trimmed }).eq("id", materialId);
  if (error) throw error;
  return trimmed;
}

/** Replaces the text of one page. */
export async function updatePage(materialId: string, page: number, content: string) {
  const { error } = await supabase
    .from("material_pages")
    .update({ content })
    .eq("material_id", materialId)
    .eq("page_number", page);
  if (error) throw error;
}

/** Uploads an image (infographic, table, diagram) used inside a page's text. Returns its storage path. */
export async function uploadPageImage(materialId: string, file: File) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error("Você precisa estar conectado.");
  const safe = file.name.replace(/[^\w.\-]+/g, "_") || "imagem.png";
  const path = `${userId}/images/${materialId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage
    .from("materials")
    .upload(path, file, file.type ? { contentType: file.type } : {});
  if (error) throw error;
  return path;
}

/** Signed URL to display a page image. */
export async function getMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes a snippet (e.g. a repeated footer) from every page. Whitespace is
 * matched loosely and a trailing page number after the snippet is removed too.
 * Returns how many pages changed.
 */
export async function removeSnippetEverywhere(materialId: string, snippet: string) {
  const words = snippet.replace(/\s+\d+\s*$/, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const re = new RegExp(words.map(escapeRe).join("\\s+") + "(?:\\s+\\d+)?", "g");
  const { data, error } = await supabase
    .from("material_pages")
    .select("page_number, content")
    .eq("material_id", materialId);
  if (error) throw error;
  let changed = 0;
  for (const row of data ?? []) {
    const next = row.content.replace(re, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (next !== row.content) {
      await updatePage(materialId, row.page_number, next);
      changed++;
    }
  }
  return changed;
}
