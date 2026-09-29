import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/time";
import type { Subject, SubjectColor } from "@/data/types";

/** Studies repository backed by the database (subjects table, per-user via RLS). */

type NewSubjectInput = { name: string; description: string; color: SubjectColor };

type StudiesContextValue = {
  subjects: Subject[];
  loading: boolean;
  getSubject: (id: string) => Subject | undefined;
  createSubject: (input: NewSubjectInput) => Promise<Subject>;
  /** Re-reads subjects (progress, last material) from the database. */
  refresh: () => Promise<void>;
};

// Kept on globalThis so hot reloads of this file reuse the same context
// (otherwise mounted consumers lose their provider and throw).
const g = globalThis as { __studiesContext?: React.Context<StudiesContextValue | null> };
const StudiesContext = (g.__studiesContext ??= createContext<StudiesContextValue | null>(null));

type SubjectRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  studied_minutes: number;
  updated_at: string;
  materials: {
    id: string;
    name: string;
    pages: number;
    current_page: number;
    progress: number;
    last_viewed_at: string | null;
  }[];
  flashcards: { count: number }[];
};

function toSubject(r: SubjectRow): Subject {
  const mats = r.materials ?? [];
  const last = mats
    .filter((m) => m.last_viewed_at)
    .sort((x, y) => (y.last_viewed_at! > x.last_viewed_at! ? 1 : -1))[0];
  const progress = mats.length
    ? Math.round(mats.reduce((sum, m) => sum + m.progress, 0) / mats.length)
    : r.progress;
  const lastStudiedAt = last?.last_viewed_at ?? null;
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    color: r.color as SubjectColor,
    materialsCount: mats.length,
    progress,
    lastActivity: relativeTime(
      lastStudiedAt && lastStudiedAt > r.updated_at ? lastStudiedAt : r.updated_at,
    ),
    studiedMinutes: r.studied_minutes,
    completedMaterials: mats.filter((m) => m.progress >= 100).length,
    reviewedFlashcards: 0,
    quizAverage: 0,
    flashcardsCount: r.flashcards?.[0]?.count ?? 0,
    lastStudiedAt,
    continueFrom: last
      ? {
          title: last.name,
          chapter: `Página ${last.current_page} de ${last.pages}`,
          progress: last.progress,
          materialId: last.id,
        }
      : { chapter: "Abra um material para começar", title: "Nenhum material iniciado", progress: 0 },
  };
}

const SELECT = "id, name, description, icon, color, progress, studied_minutes, updated_at, materials(id, name, pages, current_page, progress, last_viewed_at), flashcards(count)";

export function StudiesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSubjects([]);
      return;
    }
    const { data } = await supabase
      .from("subjects")
      .select(SELECT)
      .order("created_at", { ascending: false });
    setSubjects(((data ?? []) as unknown as SubjectRow[]).map(toSubject));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const createSubject = useCallback(
    async (input: NewSubjectInput) => {
      if (!userId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("subjects")
        .insert({ ...input, user_id: userId })
        .select(SELECT)
        .single();
      if (error) throw error;
      const subject = toSubject(data as unknown as SubjectRow);
      setSubjects((prev) => [subject, ...prev]);
      return subject;
    },
    [userId],
  );

  const value = useMemo<StudiesContextValue>(
    () => ({
      subjects,
      loading,
      getSubject: (id) => subjects.find((s) => s.id === id),
      createSubject,
      refresh,
    }),
    [subjects, loading, createSubject, refresh],
  );

  return <StudiesContext.Provider value={value}>{children}</StudiesContext.Provider>;
}

export function useStudies() {
  const ctx = useContext(StudiesContext);
  if (!ctx) throw new Error("useStudies must be used inside StudiesProvider");
  return ctx;
}
