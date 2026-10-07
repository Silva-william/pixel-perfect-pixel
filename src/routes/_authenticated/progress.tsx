import { useEffect } from "react";
import { useStudies } from "@/lib/studies-store";
import { formatStudyTime } from "@/lib/activity";
import { createFileRoute } from "@tanstack/react-router";
import { BookMarked, Brain, CheckCircle2, Clock, Library } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Meu progresso — StudyAI" },
      { name: "description", content: "Tempo estudado e materiais concluídos." },
      { property: "og:title", content: "Meu progresso — StudyAI" },
      {
        property: "og:description",
        content: "Tempo estudado e materiais concluídos.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { subjects, refresh } = useStudies();
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalMinutes = subjects.reduce((n, s) => n + s.studiedMinutes, 0);
  const totalMaterials = subjects.reduce((n, s) => n + s.materialsCount, 0);
  const totalFlashcards = subjects.reduce((n, s) => n + (s.flashcardsCount ?? 0), 0);
  const completedMaterials = subjects.reduce((n, s) => n + s.completedMaterials, 0);

  return (
    <>
      <PageHeader title="Meu progresso" subtitle="Acompanhe sua evolução ao longo do tempo." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Clock className="size-4" />}
          value={formatStudyTime(totalMinutes)}
          label="Tempo total estudado"
        />
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
          icon={<CheckCircle2 className="size-4" />}
          value={completedMaterials}
          label="Materiais concluídos"
        />
        <StatCard
          icon={<Brain className="size-4" />}
          value={totalFlashcards}
          label="Flashcards"
        />
      </section>
    </>
  );
}
