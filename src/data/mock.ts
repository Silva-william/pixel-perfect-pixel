import type {
  ActivityItem,
  Flashcard,
  KnowledgeCard,
  Material,
  Quiz,
  Subject,
  SummaryDoc,
} from "./types";

/**
 * Centralized mock data layer.
 * Every read goes through the accessor functions at the bottom of this file so
 * they can later be swapped for Supabase queries without touching the UI.
 */

export const currentUser = {
  name: "William",
  email: "william@studyai.app",
  dailyGoalMinutes: 45,
  streak: 7,
};

export const subjects: Subject[] = [
  {
    id: "historia-do-brasil",
    name: "História do Brasil",
    description: "Do período colonial à república contemporânea.",
    icon: "📕",
    color: "rose",
    materialsCount: 12,
    progress: 72,
    lastActivity: "há 2 horas",
    studiedMinutes: 1420,
    completedMaterials: 8,
    reviewedFlashcards: 214,
    quizAverage: 80,
    continueFrom: { chapter: "Capítulo 3", title: "A Independência do Brasil", progress: 72 },
  },
  {
    id: "ingles",
    name: "Inglês",
    description: "Gramática, vocabulário e compreensão de textos.",
    icon: "📗",
    color: "green",
    materialsCount: 8,
    progress: 45,
    lastActivity: "ontem",
    studiedMinutes: 860,
    completedMaterials: 3,
    reviewedFlashcards: 158,
    quizAverage: 74,
    continueFrom: { chapter: "Unit 5", title: "Present Perfect", progress: 45 },
  },
  {
    id: "biblia",
    name: "Bíblia",
    description: "Leitura sistemática e estudo de contexto histórico.",
    icon: "📘",
    color: "blue",
    materialsCount: 15,
    progress: 81,
    lastActivity: "há 3 dias",
    studiedMinutes: 2010,
    completedMaterials: 12,
    reviewedFlashcards: 96,
    quizAverage: 88,
    continueFrom: { chapter: "Capítulo 9", title: "Cartas Paulinas", progress: 81 },
  },
  {
    id: "programacao",
    name: "Programação",
    description: "Fundamentos, estruturas de dados e boas práticas.",
    icon: "📙",
    color: "amber",
    materialsCount: 6,
    progress: 32,
    lastActivity: "há 5 dias",
    studiedMinutes: 540,
    completedMaterials: 2,
    reviewedFlashcards: 61,
    quizAverage: 69,
    continueFrom: { chapter: "Módulo 2", title: "Estruturas de repetição", progress: 32 },
  },
];

export const materials: Material[] = [
  {
    id: "m1",
    subjectId: "historia-do-brasil",
    name: "Introdução à História.pdf",
    type: "PDF",
    pages: 124,
    progress: 72,
    lastViewed: "há 2 horas",
  },
  {
    id: "m2",
    subjectId: "historia-do-brasil",
    name: "Capítulo 2.docx",
    type: "DOCX",
    pages: 32,
    progress: 100,
    lastViewed: "ontem",
  },
  {
    id: "m3",
    subjectId: "historia-do-brasil",
    name: "Independência do Brasil.epub",
    type: "EPUB",
    pages: 88,
    progress: 40,
    lastViewed: "há 4 dias",
  },
  {
    id: "m4",
    subjectId: "ingles",
    name: "Grammar in Use.pdf",
    type: "PDF",
    pages: 210,
    progress: 45,
    lastViewed: "ontem",
  },
  {
    id: "m5",
    subjectId: "ingles",
    name: "Vocabulário essencial.txt",
    type: "TXT",
    pages: 14,
    progress: 100,
    lastViewed: "há 6 dias",
  },
  {
    id: "m6",
    subjectId: "biblia",
    name: "Contexto histórico.pdf",
    type: "PDF",
    pages: 156,
    progress: 81,
    lastViewed: "há 3 dias",
  },
  {
    id: "m7",
    subjectId: "programacao",
    name: "Estruturas de dados.pdf",
    type: "PDF",
    pages: 320,
    progress: 32,
    lastViewed: "há 5 dias",
  },
];

export const flashcards: Flashcard[] = [
  {
    id: "f1",
    subjectId: "historia-do-brasil",
    front: "O que foi a Revolução Industrial?",
    back: "Foi um período de grandes transformações econômicas e tecnológicas iniciado na Inglaterra no século XVIII, marcado pela mecanização da produção.",
  },
  {
    id: "f2",
    subjectId: "historia-do-brasil",
    front: "Quando ocorreu a Independência do Brasil?",
    back: "Em 7 de setembro de 1822, com a proclamação de Dom Pedro I às margens do riacho Ipiranga.",
  },
  {
    id: "f3",
    subjectId: "ingles",
    front: "Quando usamos o Present Perfect?",
    back: "Para ações que começaram no passado e têm relação com o presente, ou cujo tempo exato não é especificado.",
  },
  {
    id: "f4",
    subjectId: "biblia",
    front: "Quantas são as cartas paulinas?",
    back: "Tradicionalmente são atribuídas treze cartas ao apóstolo Paulo no Novo Testamento.",
  },
  {
    id: "f5",
    subjectId: "programacao",
    front: "O que é uma estrutura de repetição?",
    back: "Um bloco de código executado várias vezes enquanto uma condição for verdadeira, como for e while.",
  },
];

export const knowledgeCards: KnowledgeCard[] = [
  {
    id: "k1",
    subjectId: "historia-do-brasil",
    label: "Conceito",
    term: "Revolução Industrial",
    definition: "Transformação econômica iniciada na Europa durante o século XVIII.",
  },
  {
    id: "k2",
    subjectId: "historia-do-brasil",
    label: "Data",
    term: "7 de setembro de 1822",
    definition: "Marco da Independência do Brasil em relação a Portugal.",
  },
  {
    id: "k3",
    subjectId: "historia-do-brasil",
    label: "Personagem",
    term: "Dom Pedro I",
    definition: "Primeiro imperador do Brasil, responsável pela proclamação da independência.",
  },
];

export const quizzes: Quiz[] = [
  {
    id: "q-historia",
    subjectId: "historia-do-brasil",
    title: "História do Brasil",
    questionsCount: 10,
    average: 80,
    questions: [
      {
        id: "q1",
        prompt: "Qual acontecimento marcou o início da Revolução Industrial?",
        options: [
          "A invenção da máquina a vapor na Inglaterra",
          "A queda da Bastilha na França",
          "A chegada da corte portuguesa ao Brasil",
          "A assinatura da Lei Áurea",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "Em que ano foi proclamada a Independência do Brasil?",
        options: ["1808", "1822", "1889", "1500"],
        correctIndex: 1,
      },
      {
        id: "q3",
        prompt: "Quem proclamou a Independência do Brasil?",
        options: ["Dom João VI", "Tiradentes", "Dom Pedro I", "Marechal Deodoro"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "q-ingles",
    subjectId: "ingles",
    title: "Inglês",
    questionsCount: 15,
    average: 74,
    questions: [
      {
        id: "q1",
        prompt: "Which sentence uses the Present Perfect correctly?",
        options: [
          "I have finished my homework.",
          "I has finish my homework.",
          "I have finishing my homework.",
          "I am finish my homework.",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "Choose the correct comparative form of 'good'.",
        options: ["gooder", "more good", "better", "best"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "q-biblia",
    subjectId: "biblia",
    title: "Bíblia",
    questionsCount: 8,
    average: 88,
    questions: [
      {
        id: "q1",
        prompt: "Qual é o primeiro livro do Novo Testamento?",
        options: ["Gênesis", "Mateus", "Atos", "Romanos"],
        correctIndex: 1,
      },
    ],
  },
];

export const summaries: SummaryDoc[] = [
  {
    subjectId: "historia-do-brasil",
    text: "A Revolução Industrial provocou profundas transformações econômicas e sociais, substituindo a produção artesanal pela produção mecanizada e reorganizando o trabalho, as cidades e as relações sociais em toda a Europa — com efeitos que chegaram ao Brasil ao longo do século XIX.",
    keyPoints: [
      "Surgimento das máquinas",
      "Crescimento das cidades",
      "Mudanças nas relações de trabalho",
      "Expansão da produção industrial",
    ],
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    text: "Você concluiu o capítulo 2 de História do Brasil",
    time: "há 2 horas",
    kind: "chapter",
  },
  { id: "a2", text: "Você acertou 9 de 10 questões em Inglês", time: "ontem", kind: "quiz" },
  { id: "a3", text: "Você revisou 15 flashcards", time: "há 2 dias", kind: "flashcard" },
  { id: "a4", text: "Novo material adicionado em Bíblia", time: "há 3 dias", kind: "material" },
];

export const todayReview = {
  flashcards: 12,
  questions: 5,
  chapters: 1,
  estimatedMinutes: 25,
};

export const dashboardStats = {
  subjects: 4,
  materials: 12,
  flashcards: 126,
  quizAverage: 78,
};

export const progressStats = {
  totalMinutes: 4830,
  completedMaterials: 25,
  reviewedFlashcards: 529,
  quizzesTaken: 34,
  overallAverage: 78,
  streak: 7,
};

export const weeklyStudyTime = [
  { week: "Sem 1", minutes: 240 },
  { week: "Sem 2", minutes: 310 },
  { week: "Sem 3", minutes: 280 },
  { week: "Sem 4", minutes: 420 },
  { week: "Sem 5", minutes: 380 },
  { week: "Sem 6", minutes: 460 },
];

export const quizPerformance = [
  { label: "Jan", score: 62 },
  { label: "Fev", score: 68 },
  { label: "Mar", score: 71 },
  { label: "Abr", score: 76 },
  { label: "Mai", score: 74 },
  { label: "Jun", score: 82 },
];

export const materialsCompleted = [
  { subject: "História", total: 8 },
  { subject: "Inglês", total: 3 },
  { subject: "Bíblia", total: 12 },
  { subject: "Programação", total: 2 },
];

/** Days studied in the current month (day numbers). */
export const studiedDays = [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18];

/* ---------------------------------------------------------------- accessors */

export function getSubjects() {
  return subjects;
}

export function getSubject(id: string) {
  return subjects.find((s) => s.id === id);
}

export function getMaterials(subjectId?: string) {
  return subjectId ? materials.filter((m) => m.subjectId === subjectId) : materials;
}

export function getMaterial(id: string) {
  return materials.find((m) => m.id === id);
}

export function getFlashcards(subjectId?: string) {
  return subjectId ? flashcards.filter((f) => f.subjectId === subjectId) : flashcards;
}

export function getKnowledgeCards(subjectId: string) {
  return knowledgeCards.filter((k) => k.subjectId === subjectId);
}

export function getQuizzes(subjectId?: string) {
  return subjectId ? quizzes.filter((q) => q.subjectId === subjectId) : quizzes;
}

export function getQuiz(id: string) {
  return quizzes.find((q) => q.id === id);
}

export function getSummary(subjectId: string) {
  return summaries.find((s) => s.subjectId === subjectId) ?? summaries[0];
}
