import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { subjects as seedSubjects } from "@/data/mock";
import type { Subject, SubjectColor } from "@/data/types";

/**
 * In-memory studies store. Mirrors the shape of a future Supabase-backed
 * repository (list / getById / create) so pages don't need changes later.
 */

type NewSubjectInput = { name: string; description: string; color: SubjectColor };

type StudiesContextValue = {
  subjects: Subject[];
  getSubject: (id: string) => Subject | undefined;
  createSubject: (input: NewSubjectInput) => Subject;
};

const StudiesContext = createContext<StudiesContextValue | null>(null);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function StudiesProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);

  const createSubject = useCallback((input: NewSubjectInput) => {
    const subject: Subject = {
      id: `${slugify(input.name) || "estudo"}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name,
      description: input.description,
      icon: "📓",
      color: input.color,
      materialsCount: 0,
      progress: 0,
      lastActivity: "agora",
      studiedMinutes: 0,
      completedMaterials: 0,
      reviewedFlashcards: 0,
      quizAverage: 0,
      continueFrom: { chapter: "—", title: "Nenhum material ainda", progress: 0 },
    };
    setSubjects((prev) => [subject, ...prev]);
    return subject;
  }, []);

  const value = useMemo<StudiesContextValue>(
    () => ({
      subjects,
      getSubject: (id) => subjects.find((s) => s.id === id),
      createSubject,
    }),
    [subjects, createSubject],
  );

  return <StudiesContext.Provider value={value}>{children}</StudiesContext.Provider>;
}

export function useStudies() {
  const ctx = useContext(StudiesContext);
  if (!ctx) throw new Error("useStudies must be used inside StudiesProvider");
  return ctx;
}
