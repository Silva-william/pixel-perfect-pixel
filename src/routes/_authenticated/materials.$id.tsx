import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
import { getMaterialDetail, type MaterialDetail } from "@/lib/materials";
import { useStudies } from "@/lib/studies-store";

export const Route = createFileRoute("/_authenticated/materials/$id")({
  head: () => ({
    meta: [
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
          <h1 className="text-3xl font-semibold tracking-tight">{material.name}</h1>
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
