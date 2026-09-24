import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { subjectSoft } from "@/lib/subject-colors";
import type { Subject } from "@/data/types";

export function StudyCard({ subject, showMeta = false }: { subject: Subject; showMeta?: boolean }) {
  return (
    <Link
      to="/studies/$id"
      params={{ id: subject.id }}
      className="card-soft group flex flex-col gap-4 p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 items-center justify-center rounded-xl text-lg ${subjectSoft[subject.color]}`}
            aria-hidden
          >
            {subject.icon}
          </span>
          <div>
            <h3 className="text-base font-semibold leading-tight">{subject.name}</h3>
            <p className="text-xs text-muted-foreground">{subject.materialsCount} materiais</p>
          </div>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>

      {showMeta ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{subject.description}</p>
      ) : null}

      <div className="mt-auto space-y-2">
        <ProgressBar value={subject.progress} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{subject.progress}% concluído</span>
          {showMeta ? <span>Atualizado {subject.lastActivity}</span> : null}
        </div>
      </div>
    </Link>
  );
}
