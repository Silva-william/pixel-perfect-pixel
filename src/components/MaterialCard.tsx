import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, FileType, BookOpen, FileCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Material } from "@/data/types";
import { deleteMaterial } from "@/lib/materials";

const icons = {
  PDF: FileText,
  DOCX: FileType,
  EPUB: BookOpen,
  TXT: FileCode,
} as const;

export function MaterialCard({
  material,
  onDeleted,
}: {
  material: Material & { storagePath?: string | null };
  onDeleted?: () => void;
}) {
  const Icon = icons[material.type] ?? FileText;
  const [open, setOpen] = useState(false);

  const remove = async () => {
    try {
      await deleteMaterial(material);
      toast.success("Material excluído.");
      onDeleted?.();
    } catch (e) {
      toast.error("Não foi possível excluir.", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="card-soft flex items-center gap-2 pr-2 transition-colors hover:border-primary/40">
      <Link
        to="/materials/$id"
        params={{ id: material.id }}
        className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5"
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

      {onDeleted ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Excluir ${material.name}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{material.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo, o texto e os áudios salvos serão apagados. Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void remove()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
