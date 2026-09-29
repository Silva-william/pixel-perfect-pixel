import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Subject, SubjectColor } from "@/data/types";

/** Studies repository backed by the database (subjects table, per-user via RLS). */

type NewSubjectInput = { name: string; description: string; color: SubjectColor };

type StudiesContextValue = {
  subjects: Subject[];
  loading: boolean;
  getSubject: (id: string) => Subject | undefined;
  createSubject: (input: NewSubjectInput) => Promise<Subject>;
};

const StudiesContext = createContext<StudiesContextValue | null>(null);

type SubjectRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  studied_minutes: number;
  updated_at: string;
  materials: { count: number }[];
  flashcards: { count: number }[];
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${Math.round(diff)} min`;
  if (diff < 1440) return `há ${Math.round(diff / 60)} h`;
  const d = Math.round(diff / 1440);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

function toSubject(r: SubjectRow): Subject {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    color: r.color as SubjectColor,
    materialsCount: r.materials?.[0]?.count ?? 0,
    progress: r.progress,
    lastActivity: relativeTime(r.updated_at),
    studiedMinutes: r.studied_minutes,
    completedMaterials: 0,
    reviewedFlashcards: 0,
    quizAverage: 0,
    continueFrom: { chapter: "—", title: "Nenhum material ainda", progress: r.progress },
  };
}

const SELECT = "id, name, description, icon, color, progress, studied_minutes, updated_at, materials(count), flashcards(count)";

export function StudiesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    supabase
      .from("subjects")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSubjects(((data ?? []) as unknown as SubjectRow[]).map(toSubject));
        setLoading(false);
      });
  }, [userId]);

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
    }),
    [subjects, loading, createSubject],
  );

  return <StudiesContext.Provider value={value}>{children}</StudiesContext.Provider>;
}

export function useStudies() {
  const ctx = useContext(StudiesContext);
  if (!ctx) throw new Error("useStudies must be used inside StudiesProvider");
  return ctx;
}
