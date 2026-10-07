import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StudyCard } from "@/components/StudyCard";
import { EmptyState } from "@/components/EmptyState";
import { NewStudyDialog } from "@/components/NewStudyDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudies } from "@/lib/studies-store";
import { cn } from "@/lib/utils";

type Filter = "all" | "progress" | "done";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "progress", label: "Em andamento" },
  { value: "done", label: "Concluídos" },
];

export const Route = createFileRoute("/_authenticated/studies/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Meus estudos — StudyAI" },
      {
        name: "description",
        content: "Organize seus materiais e acompanhe o progresso de cada matéria.",
      },
      { property: "og:title", content: "Meus estudos — StudyAI" },
      {
        property: "og:description",
        content: "Organize seus materiais e acompanhe o progresso de cada matéria.",
      },
    ],
  }),
  component: StudiesPage,
});

function StudiesPage() {
  const { subjects } = useStudies();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    return subjects
      .filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
      .filter((s) =>
        filter === "all" ? true : filter === "done" ? s.progress >= 100 : s.progress < 100,
      );
  }, [subjects, query, filter]);

  return (
    <>
      <PageHeader
        title="Meus estudos"
        subtitle="Organize seus materiais e acompanhe seu progresso."
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar matéria"
            className="pl-9"
            aria-label="Buscar matéria"
          />
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                filter === f.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((subject) => (
            <StudyCard key={subject.id} subject={subject} showMeta />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="Nenhuma matéria encontrada"
          description="Crie um novo estudo para começar a organizar seus materiais."
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
      )}
    </>
  );
}
