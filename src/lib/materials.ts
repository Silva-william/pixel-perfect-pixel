import { supabase } from "@/integrations/supabase/client";
import type { Material, MaterialType } from "@/data/types";

/** Materials repository: file in Storage (materials/<userId>/...), metadata in the materials table. */

function relative(iso: string | null) {
  if (!iso) return "nunca";
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 1) return "agora";
  if (min < 60) return `há ${Math.round(min)} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} dias`;
}

export async function listMaterials(subjectId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("id, subject_id, name, type, pages, progress, last_viewed_at, created_at")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    name: r.name,
    type: r.type as MaterialType,
    pages: r.pages,
    progress: r.progress,
    lastViewed: relative(r.last_viewed_at ?? r.created_at),
  }));
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

  const { error } = await supabase.from("materials").insert({
    user_id: userId,
    subject_id: subjectId,
    name: file.name,
    type,
    storage_path: path,
  });
  if (error) {
    await supabase.storage.from("materials").remove([path]);
    throw error;
  }
}
