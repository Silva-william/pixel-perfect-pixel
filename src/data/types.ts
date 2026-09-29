export type SubjectColor = "green" | "blue" | "amber" | "violet" | "rose" | "slate";

export type Subject = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: SubjectColor;
  materialsCount: number;
  progress: number;
  lastActivity: string;
  studiedMinutes: number;
  completedMaterials: number;
  reviewedFlashcards: number;
  quizAverage: number;
  continueFrom: { chapter: string; title: string; progress: number; materialId?: string };
  flashcardsCount?: number;
  /** ISO date of the last time a material of this subject was opened/listened. */
  lastStudiedAt?: string | null;
};

export type MaterialType = "PDF" | "EPUB" | "DOCX" | "TXT";

export type Material = {
  id: string;
  subjectId: string;
  name: string;
  type: MaterialType;
  pages: number;
  progress: number;
  lastViewed: string;
};

export type Flashcard = {
  id: string;
  subjectId: string;
  front: string;
  back: string;
};

export type KnowledgeCard = {
  id: string;
  subjectId: string;
  label: string;
  term: string;
  definition: string;
};

export type Quiz = {
  id: string;
  subjectId: string;
  title: string;
  questionsCount: number;
  average: number;
  questions: QuizQuestion[];
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type ActivityItem = {
  id: string;
  text: string;
  time: string;
  kind: "chapter" | "quiz" | "flashcard" | "material";
};

export type SummaryDoc = {
  subjectId: string;
  text: string;
  keyPoints: string[];
};
