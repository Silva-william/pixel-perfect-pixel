import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookMarked, Brain, Library, Plus, Target, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StudyCard } from "@/components/StudyCard";
import { ProgressBar } from "@/components/ProgressBar";
import { NewStudyDialog } from "@/components/NewStudyDialog";
import { Button } from "@/components/ui/button";
import { useStudies } from "@/lib/studies-store";
import { useAuth } from "@/lib/auth";
import { listActivity, type Activity } from "@/lib/activity";
import { dashboardStats, todayReview } from "@/data/mock";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Início — StudyAI" },
      {
        name: "description",
        content: "Continue seus estudos, acompanhe seu progresso e comece a revisão do dia.",
      },
      { property: "og:title", content: "Início — StudyAI" },
      {
        property: "og:description",
        content: "Continue seus estudos, acompanhe seu progresso e comece a revisão do dia.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { subjects, refresh } = useStudies();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity[] | null>(null);

  // Always show fresh progress and history when coming back to the home page.
  useEffect(() => {
    void refresh();
    listActivity(8).then(setActivity);
  }, [refresh]);

  // The subject whose material was opened/listened most recently.
  const featured =
    [...subjects]
      .filter((s) => s.lastStudiedAt)
      .sort((a, b) => (b.lastStudiedAt! > a.lastStudiedAt! ? 1 : -1))[0] ?? subjects[0];
  const totalMaterials = subjects.reduce((n, s) => n + s.materialsCount, 0);
  const totalFlashcards = subjects.reduce((n, s) => n + (s.flashcardsCount ?? 0), 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${profile?.name ?? ""} 👋`}
        subtitle="Continue seus estudos e mantenha seu ritmo."
        action={
          <NewStudyDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Novo estudo
              </Button>
            }
          />
        }
      />

      {featured ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Continue estudando</h2>
          <div className="card-soft flex flex-col gap-6 p-6 sm:p-8">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {featured.name}
              </p>
              <h3 className="font-serif text-2xl">{featured.continueFrom.title}</h3>
              <p className="text-sm text-muted-foreground">{featured.continueFrom.chapter}</p>
            </div>
            <ProgressBar value={featured.continueFrom.progress} showLabel />
            <Button
              className="self-start"
              onClick={() =>
                featured.continueFrom.materialId
                  ? navigate({ to: "/materials/$id", params: { id: featured.continueFrom.materialId } })
                  : navigate({ to: "/studies/$id", params: { id: featured.id } })
              }
            >
              {featured.continueFrom.materialId ? "Continuar estudando" : "Abrir matéria"}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Library className="size-4" />}
          value={subjects.length}
          label="Matérias"
        />
        <StatCard
          icon={<BookMarked className="size-4" />}
          value={totalMaterials}
          label="Materiais"
        />
        <StatCard
          icon={<Brain className="size-4" />}
          value={totalFlashcards}
          label="Flashcards"
        />
        <StatCard
          icon={<Target className="size-4" />}
          value={`${dashboardStats.quizAverage}%`}
          label="Média nos quizzes"
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seus estudos</h2>
          <Link to="/studies" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.slice(0, 6).map((subject) => (
            <StudyCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Atividade recente</h2>
          <ul className="card-soft divide-y divide-border">
            {activity === null ? (
              <li className="px-5 py-4 text-sm text-muted-foreground">Carregando...</li>
            ) : activity.length === 0 ? (
              <li className="px-5 py-4 text-sm text-muted-foreground">
                Nenhuma atividade ainda. Abra um material para começar.
              </li>
            ) : (
              activity.map((item) => (
                <li key={item.id}>
                  {item.materialId ? (
                    <Link
                      to="/materials/$id"
                      params={{ id: item.materialId }}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                    >
                      <span className="text-sm">{item.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <span className="text-sm">{item.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Revisão de hoje</h2>
          <div className="card-soft space-y-4 p-5">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Flashcards</span>
                <span className="font-medium">{todayReview.flashcards}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Questões</span>
                <span className="font-medium">{todayReview.questions}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Capítulos</span>
                <span className="font-medium">{todayReview.chapters}</span>
              </li>
            </ul>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Tempo estimado: {todayReview.estimatedMinutes} minutos
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/reviews" })}>
              Começar revisão
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
