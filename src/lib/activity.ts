import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/time";

/** Study history: what the user did (opened, listened, generated…), newest first. */

export type ActivityKind = "material" | "audio" | "generated" | "flashcard";

export type Activity = {
  id: string;
  kind: ActivityKind;
  text: string;
  time: string;
  subjectId: string | null;
  materialId: string | null;
};

export async function logActivity(a: {
  kind: ActivityKind;
  text: string;
  subjectId?: string | null;
  materialId?: string | null;
}) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await supabase.from("study_activity").insert({
    user_id: userId,
    kind: a.kind,
    text: a.text,
    subject_id: a.subjectId ?? null,
    material_id: a.materialId ?? null,
  });
}

export async function listActivity(limit = 8): Promise<Activity[]> {
  const { data } = await supabase
    .from("study_activity")
    .select("id, kind, text, created_at, subject_id, material_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind as ActivityKind,
    text: r.text,
    time: relativeTime(r.created_at),
    subjectId: r.subject_id,
    materialId: r.material_id,
  }));
}
