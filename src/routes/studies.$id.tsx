import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Brain, Clock, FileCheck, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { ComingSoon } from "@/components/ComingSoon";
import { EmptyState } from "@/components/EmptyState";
import { FlashcardView } from "@/components/FlashcardView";
import { QuizRunner } from "@/components/QuizRunner";
import { KnowledgeCards } from "@/components/study/KnowledgeCards";
import { MaterialsPanel } from "@/components/study/MaterialsPanel";
import { SummaryPanel } from "@/components/study/SummaryPanel";
import { Button } from "@/components/ui/button";
import { useStudies } from "@/lib/studies-store";
import { getFlashcards, getKnowledgeCards, getMaterials, getQuizzes, getSummary } from "@/data/mock";
import { subjectSoft } from "@/lib/subject-colors";
import { useState } from "react";

export const Route = createFileRoute("/studies/$id")({
  head: () => ({
    meta: [
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
  const { getSubject } = useStudies();
  const subject = getSubject(id);
  const [quizOpen, setQuizOpen] = useState(false);

  if (!subject) {
    throw notFound();
  }

  const materials = getMaterials(subject.id);
  const cards = getKnowledgeCards(subject.id);
  const cardsForFlash = getFlashcards(subject.id);
  const quiz = getQuizzes(subject.id)[0];
  const summary = getSummary(subject.id);

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
              value={`${Math.round(subject.studiedMinutes / 60)}h`}
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

          <div className="card-soft space-y-4 p-6">
            <h3 className="text-base font-semibold">Continue de onde parou</h3>
            <div className="space-y-1">
              <p className="font-serif text-xl">{subject.continueFrom.title}</p>
              <p className="text-sm text-muted-foreground">{subject.continueFrom.chapter}</p>
            </div>
            <ProgressBar value={subject.continueFrom.progress} showLabel />
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsPanel materials={materials} />
        </TabsContent>

        <TabsContent value="summary">
          <SummaryPanel summary={summary} />
        </TabsContent>

        <TabsContent value="cards">
          <KnowledgeCards cards={cards} />
        </TabsContent>

        <TabsContent value="flashcards">
          {cardsForFlash.length ? (
            <FlashcardView card={cardsForFlash[0]} />
          ) : (
            <EmptyState
              title="Nenhum flashcard nesta matéria"
              description="Os flashcards serão gerados a partir dos materiais em uma próxima etapa."
            />
          )}
        </TabsContent>

        <TabsContent value="quiz">
          {quiz ? (
            quizOpen ? (
              <QuizRunner quiz={quiz} onExit={() => setQuizOpen(false)} />
            ) : (
              <div className="card-soft flex flex-col gap-4 p-6">
                <div>
                  <h3 className="text-base font-semibold">{quiz.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {quiz.questionsCount} questões · Média: {quiz.average}%
                  </p>
                </div>
                <Button className="self-start" onClick={() => setQuizOpen(true)}>
                  Começar quiz
                </Button>
              </div>
            )
          ) : (
            <EmptyState
              title="Nenhum quiz disponível"
              description="Os quizzes serão gerados a partir dos materiais em uma próxima etapa."
            />
          )}
        </TabsContent>

        <TabsContent value="audio">
          <ComingSoon
            title="Áudio dos materiais"
            description="A conversão dos seus materiais em áudio será implementada em uma próxima etapa."
          />
        </TabsContent>

        <TabsContent value="tutor">
          <ComingSoon
            title="Tutor IA"
            description="Conversar com uma IA baseada exclusivamente nos seus materiais será implementado em uma próxima etapa."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
