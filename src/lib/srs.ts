import { supabase } from "@/integrations/supabase/client";

export type Rating = "Difícil" | "Bom" | "Fácil";

export type ReviewCard = {
  id: string;
  subjectId: string;
  subjectName: string;
  front: string;
  back: string;
  ease: number;
  intervalDays: number;
  dueAt: string;
};

/**
 * SM-2 style scheduling (as in Anki).
 * intervalDays = 0 means the card is still new/learning.
 */
export function schedule(card: Pick<ReviewCard, "ease" | "intervalDays">, rating: Rating) {
  let ease = card.ease;
  let interval: number;
  let minutes = 0;
  const i = card.intervalDays;
  if (rating === "Difícil") {
    ease = Math.max(1.3, ease - 0.2);
    if (i === 0) minutes = 10;
    interval = i === 0 ? 0 : Math.max(1, Math.round(i * 1.2));
  } else if (rating === "Bom") {
    interval = i === 0 ? 1 : i === 1 ? 3 : Math.round(i * ease);
  } else {
    ease = Math.min(3, ease + 0.15);
    interval = i === 0 ? 4 : Math.round(i * ease * 1.3);
  }
  const due = new Date(Date.now() + (minutes ? minutes * 60_000 : interval * 86_400_000));
  return { ease, intervalDays: interval, dueAt: due.toISOString(), minutes };
}

export function describeNext(card: Pick<ReviewCard, "ease" | "intervalDays">, rating: Rating) {
  const s = schedule(card, rating);
  if (s.minutes) return `${s.minutes} min`;
  if (s.intervalDays < 30) return s.intervalDays === 1 ? "1 dia" : `${s.intervalDays} dias`;
  const m = Math.round(s.intervalDays / 30);
  return m === 1 ? "1 mês" : `${m} meses`;
}

export async function listDueCards(subjectId?: string): Promise<ReviewCard[]> {
  let q = supabase
    .from("flashcards")
    .select("id, subject_id, front, back, ease, interval_days, due_at, subjects(name)")
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(200);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    subjectName: (r.subjects as { name: string } | null)?.name ?? "",
    front: r.front,
    back: r.back,
    ease: r.ease,
    intervalDays: r.interval_days,
    dueAt: r.due_at,
  }));
}

export async function nextDueDate(subjectId?: string): Promise<string | null> {
  let q = supabase.from("flashcards").select("due_at").order("due_at").limit(1);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data } = await q;
  return data?.[0]?.due_at ?? null;
}

export async function rateCard(card: ReviewCard, rating: Rating) {
  const s = schedule(card, rating);
  const { error } = await supabase
    .from("flashcards")
    .update({ ease: s.ease, interval_days: s.intervalDays, due_at: s.dueAt })
    .eq("id", card.id);
  if (error) throw error;
  return s;
}
