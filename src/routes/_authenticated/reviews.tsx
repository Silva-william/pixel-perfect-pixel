import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { studiedDays, todayReview } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reviews")({
  head: () => ({
    meta: [
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

const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

function ReviewsPage() {
  const navigate = useNavigate();
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <>
      <PageHeader title="Revisões" subtitle="Mantenha o ritmo revisando um pouco todos os dias." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-soft space-y-4 p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Revisão de hoje</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface p-4">
              <p className="text-2xl font-semibold">{todayReview.flashcards}</p>
              <p className="text-sm text-muted-foreground">flashcards</p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="text-2xl font-semibold">{todayReview.questions}</p>
              <p className="text-sm text-muted-foreground">questões</p>
            </div>
          </div>
          <Button onClick={() => navigate({ to: "/flashcards" })}>Começar revisão</Button>
        </div>

        <div className="card-soft flex flex-col items-center justify-center gap-2 p-6 text-center">
          <Flame className="size-7 text-warning" />
          <p className="font-serif text-3xl">7 dias</p>
          <p className="text-sm text-muted-foreground">consecutivos de estudo</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Histórico do mês</h2>
        <div className="card-soft space-y-3 p-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
            {weekDays.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const studied = studiedDays.includes(day);
              return (
                <div
                  key={day}
                  title={studied ? `Dia ${day}: estudou` : `Dia ${day}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-xs",
                    studied
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground",
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
