import { formatStudyTime } from "@/lib/activity";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Brain, Clock, FileCheck, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { FlashcardView } from "@/components/FlashcardView";
import { QuizRunner } from "@/components/QuizRunner";
import { KnowledgeCards } from "@/components/study/KnowledgeCards";
import { MaterialsPanel } from "@/components/study/MaterialsPanel";
import { SummaryPanel } from "@/components/study/SummaryPanel";
import { Button } from "@/components/ui/button";
import { useStudies } from "@/lib/studies-store";
import { Generated } from "@/components/study/Generated";
import { TutorThreads } from "@/components/study/TutorThreads";
import { ReviewSession } from "@/components/study/ReviewSession";
import type { Flashcard, KnowledgeCard, Quiz, SummaryDoc } from "@/data/types";
import { subjectSoft } from "@/lib/subject-colors";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/studies/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Matéria — StudyAI" },
      { name: "description", content: "Materiais, resumos, flashcards e quizzes da matéria." },
      { property: "og:title", content: "Matéria — StudyAI" },
      {
        property: "og:description",
        content: "Materiais, resumos, flashcards e quizzes da matéria.",
      },
    ],
  }),
  component: SubjectPage,
});

const tabs = [
  { value: "overview", label: "Visão geral" },
  { value: "materials", label: "Materiais" },
  { value: "summary", label: "Resumo" },
  { value: "cards", label: "Cards" },
  { value: "flashcards", label: "Flashcards" },
  { value: "quiz", label: "Quiz" },
  { value: "audio", label: "Áudio" },
  { value: "tutor", label: "Tutor IA" },
];

function SubjectPage() {
  const { id } = Route.useParams();
  const { getSubject, loading, refresh } = useStudies();
  const subject = getSubject(id);
  const [quizOpen, setQuizOpen] = useState(false);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!subject) {
    if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
    throw notFound();
  }


  return (
    <>
      <div className="space-y-6">
        <Link
          to="/studies"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para meus estudos
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={`flex size-12 items-center justify-center rounded-2xl text-2xl ${subjectSoft[subject.color]}`}
              aria-hidden
            >
              {subject.icon}
            </span>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">{subject.name}</h1>
              <p className="max-w-prose text-sm text-muted-foreground">{subject.description}</p>
            </div>
          </div>
          <div className="w-full sm:w-56">
            <ProgressBar value={subject.progress} showLabel />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Clock className="size-4" />}
              value={formatStudyTime(subject.studiedMinutes)}
              label="Tempo estudado"
            />
            <StatCard
              icon={<FileCheck className="size-4" />}
              value={`${subject.completedMaterials}/${subject.materialsCount}`}
              label="Materiais concluídos"
            />
            <StatCard
              icon={<Brain className="size-4" />}
              value={subject.reviewedFlashcards}
              label="Flashcards revisados"
            />
            <StatCard
              icon={<Target className="size-4" />}
              value={`${subject.quizAverage}%`}
              label="Média dos quizzes"
            />
          </div>

          <div className="card-soft flex flex-col gap-4 p-6">
            <h3 className="text-base font-semibold">Continue de onde parou</h3>
            <div className="space-y-1">
              <p className="font-serif text-xl">{subject.continueFrom.title}</p>
              <p className="text-sm text-muted-foreground">{subject.continueFrom.chapter}</p>
            </div>
            <ProgressBar value={subject.continueFrom.progress} showLabel />
            {subject.continueFrom.materialId ? (
              <Button asChild className="self-start">
                <Link to="/materials/$id" params={{ id: subject.continueFrom.materialId }}>
                  Continuar de onde parei
                </Link>
              </Button>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsPanel subjectId={subject.id} />
        </TabsContent>

        <TabsContent value="summary">
          <Generated<{ text: string; keyPoints: string[] }> subjectId={subject.id} kind="summary">
            {(d, regen) => (
              <SummaryPanel
                summary={{ subjectId: subject.id, text: d.text, keyPoints: d.keyPoints ?? [] } as SummaryDoc}
                action={regen}
              />
            )}
          </Generated>
        </TabsContent>

        <TabsContent value="cards">
          <Generated<{ cards: Omit<KnowledgeCard, "id" | "subjectId">[] }> subjectId={subject.id} kind="cards">
            {(d, regen) => (
              <div className="space-y-4">
                <KnowledgeCards
                  cards={(d.cards ?? []).map((c, i) => ({ ...c, id: String(i), subjectId: subject.id }))}
                />
                {regen}
              </div>
            )}
          </Generated>
        </TabsContent>

        <TabsContent value="flashcards">
          <Generated<Flashcard[]> subjectId={subject.id} kind="flashcards">
            {(_list, regen) => (
              <div className="space-y-4">
                <ReviewSession subjectId={subject.id} />
                {regen}
              </div>
            )}
          </Generated>
        </TabsContent>

        <TabsContent value="quiz">
          <Generated<{ title: string; questions: Omit<Quiz["questions"][number], "id">[] }>
            subjectId={subject.id}
            kind="quiz"
          >
            {(d, regen) => {
              const quiz: Quiz = {
                id: subject.id,
                subjectId: subject.id,
                title: d.title || `Quiz de ${subject.name}`,
                questionsCount: d.questions?.length ?? 0,
                average: 0,
                questions: (d.questions ?? []).map((q, i) => ({ ...q, id: String(i) })),
              };
              return quizOpen ? (
                <QuizRunner quiz={quiz} onExit={() => setQuizOpen(false)} />
              ) : (
                <div className="card-soft flex flex-col gap-4 p-6">
                  <div>
                    <h3 className="text-base font-semibold">{quiz.title}</h3>
                    <p className="text-xs text-muted-foreground">{quiz.questionsCount} questões</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setQuizOpen(true)}>Começar quiz</Button>
                    {regen}
                  </div>
                </div>
              );
            }}
          </Generated>
        </TabsContent>

        <TabsContent value="audio">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Abra um material e clique em "Ouvir página" para escutar a leitura em voz alta, com
              velocidade de 1x a 2x.
            </p>
            <MaterialsPanel subjectId={subject.id} />
          </div>
        </TabsContent>

        <TabsContent value="tutor">
          <TutorThreads subjectId={subject.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

