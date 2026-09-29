import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { FlashcardView } from "@/components/FlashcardView";
import { EmptyState } from "@/components/EmptyState";
import { flashcards, dashboardStats } from "@/data/mock";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — StudyAI" },
      { name: "description", content: "Revise os conceitos que você já estudou com flashcards." },
      { property: "og:title", content: "Flashcards — StudyAI" },
      {
        property: "og:description",
        content: "Revise os conceitos que você já estudou com flashcards.",
      },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [index, setIndex] = useState(0);
  const card = flashcards[index];

  return (
    <>
      <PageHeader title="Flashcards" subtitle="Revise os conceitos que você já estudou." />

      <div className="card-soft flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium">Flashcards para revisar hoje</p>
          <p className="text-xs text-muted-foreground">{dashboardStats.flashcards} cards</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {Math.min(index + 1, flashcards.length)} / {flashcards.length}
        </p>
      </div>

      {card ? (
        <FlashcardView
          key={card.id}
          card={card}
          onRate={() => setIndex((i) => (i + 1) % flashcards.length)}
        />
      ) : (
        <EmptyState title="Nenhuma revisão para hoje 🎉" description="Volte amanhã para continuar." />
      )}
    </>
  );
}
