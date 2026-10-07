import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { listDueCards, nextDueDate } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/reviews")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Revisões — StudyAI" },
      { name: "description", content: "Acompanhe a revisão do dia e sua sequência de estudos." },
      { property: "og:title", content: "Revisões — StudyAI" },
      {
        property: "og:description",
        content: "Acompanhe a revisão do dia e sua sequência de estudos.",
      },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const navigate = useNavigate();
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [nextDue, setNextDue] = useState<string | null>(null);

  useEffect(() => {
    listDueCards().then((cards) => setDueCount(cards.length));
    nextDueDate().then(setNextDue);
  }, []);

  return (
    <>
      <PageHeader title="Revisões" subtitle="Mantenha o ritmo revisando um pouco todos os dias." />

      <div className="card-soft max-w-xl space-y-4 p-6">
        <h2 className="text-base font-semibold">Revisão de hoje</h2>
        <div className="rounded-xl bg-surface p-4">
          <p className="text-2xl font-semibold">{dueCount === null ? "…" : dueCount}</p>
          <p className="text-sm text-muted-foreground">flashcards para revisar</p>
        </div>
        {dueCount === 0 && nextDue ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma revisão para hoje 🎉 Próxima revisão:{" "}
            {new Date(nextDue).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
          </p>
        ) : null}
        <Button onClick={() => navigate({ to: "/flashcards" })}>Começar revisão</Button>
      </div>
    </>
  );
}
