import { Link } from "@tanstack/react-router";
import { FileText, FileType, BookOpen, FileCode } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import type { Material } from "@/data/types";

const icons = {
  PDF: FileText,
  DOCX: FileType,
  EPUB: BookOpen,
  TXT: FileCode,
} as const;

export function MaterialCard({ material }: { material: Material }) {
  const Icon = icons[material.type];

  return (
    <Link
      to="/materials/$id"
      params={{ id: material.id }}
      className="card-soft flex flex-col gap-3 p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:gap-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{material.name}</p>
        <p className="text-xs text-muted-foreground">
          {material.type} · {material.pages} páginas · visto {material.lastViewed}
        </p>
      </div>

      <div className="w-full sm:w-40">
        <ProgressBar value={material.progress} />
        <p className="mt-1 text-right text-xs text-muted-foreground">{material.progress}%</p>
      </div>
    </Link>
  );
}
