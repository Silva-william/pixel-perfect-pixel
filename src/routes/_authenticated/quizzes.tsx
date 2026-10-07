import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { QuizCard } from "@/components/QuizCard";
import { QuizRunner } from "@/components/QuizRunner";
import { EmptyState } from "@/components/EmptyState";
import { quizzes } from "@/data/mock";

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Quizzes — StudyAI" },
      { name: "description", content: "Teste seus conhecimentos com quizzes por matéria." },
      { property: "og:title", content: "Quizzes — StudyAI" },
      {
        property: "og:description",
        content: "Teste seus conhecimentos com quizzes por matéria.",
      },
    ],
  }),
  component: QuizzesPage,
});

function QuizzesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = quizzes.find((q) => q.id === activeId);

  return (
    <>
      <PageHeader title="Quizzes" subtitle="Teste o que você aprendeu em cada matéria." />

      {active ? (
        <QuizRunner quiz={active} onExit={() => setActiveId(null)} />
      ) : quizzes.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onStart={() => setActiveId(quiz.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum quiz disponível"
          description="Adicione materiais para gerar quizzes em uma próxima etapa."
        />
      )}
    </>
  );
}
