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

/** Adds studied minutes to a subject (counted while the user is actively studying). */
export async function addStudyMinutes(subjectId: string, minutes = 1) {
  const { data } = await supabase.from("subjects").select("studied_minutes").eq("id", subjectId).maybeSingle();
  if (!data) return;
  await supabase.from("subjects").update({ studied_minutes: data.studied_minutes + minutes }).eq("id", subjectId);
}

/** "15 min" below one hour, otherwise "1h 20min". */
export function formatStudyTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}
