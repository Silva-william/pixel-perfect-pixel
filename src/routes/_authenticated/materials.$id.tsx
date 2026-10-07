import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProgressBar } from "@/components/ProgressBar";
import { MaterialReader } from "@/components/study/MaterialReader";
import { getMaterialDetail, renameMaterial, type MaterialDetail } from "@/lib/materials";
import { useStudies } from "@/lib/studies-store";

export const Route = createFileRoute("/_authenticated/materials/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Material — StudyAI" },
      { name: "description", content: "Visualize o material, seu progresso e o resumo gerado." },
      { property: "og:title", content: "Material — StudyAI" },
      {
        property: "og:description",
        content: "Visualize o material, seu progresso e o resumo gerado.",
      },
    ],
  }),
  component: MaterialPage,
});

function MaterialPage() {
  const { id } = Route.useParams();
  const { getSubject } = useStudies();
  const [material, setMaterial] = useState<MaterialDetail | null | undefined>(undefined);
  const load = useCallback(() => {
    getMaterialDetail(id).then(setMaterial).catch(() => setMaterial(null));
  }, [id]);
  useEffect(load, [load]);

  if (material === undefined) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!material) throw notFound();

  const subject = getSubject(material.subjectId);

  return (
    <>
      <div className="space-y-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/studies">Meus estudos</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {subject ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/studies/$id" params={{ id: subject.id }}>
                      {subject.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : null}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{material.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {subject ? (
          <Link
            to="/studies/$id"
            params={{ id: subject.id }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para {subject.name}
          </Link>
        ) : null}

        <div className="space-y-2">
          <EditableTitle
            name={material.name}
            onSave={async (name) => {
              const saved = await renameMaterial(material.id, name);
              setMaterial({ ...material, name: saved });
            }}
          />
          <p className="text-sm text-muted-foreground">
            {material.type} · {material.pages} páginas · visto {material.lastViewed}
          </p>
        </div>

        <div className="max-w-sm">
          <ProgressBar value={material.progress} showLabel />
        </div>
      </div>

      <MaterialReader key={material.id + material.status} material={material} onChanged={load} />
    </>
  );
}

function EditableTitle({ name, onSave }: { name: string; onSave: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
      toast.success("Título atualizado.");
    } catch {
      toast.error("Não foi possível salvar o título.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => setEditing(true)}
          aria-label="Editar título"
        >
          <Pencil className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") {
            setEditing(false);
            setValue(name);
          }
        }}
        autoFocus
        disabled={saving}
        className="max-w-xl text-xl font-semibold"
      />
      <Button size="icon" className="size-8" onClick={() => void save()} disabled={saving} aria-label="Salvar título">
        <Check className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => {
          setEditing(false);
          setValue(name);
        }}
        disabled={saving}
        aria-label="Cancelar"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
