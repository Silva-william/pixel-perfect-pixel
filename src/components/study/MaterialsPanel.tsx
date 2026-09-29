import { useCallback, useEffect, useState } from "react";
import { listMaterials } from "@/lib/materials";
import { FileStack, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialCard } from "@/components/MaterialCard";
import { EmptyState } from "@/components/EmptyState";
import { UploadArea } from "@/components/UploadArea";
import type { Material } from "@/data/types";

export function MaterialsPanel({ subjectId }: { subjectId: string }) {
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const load = useCallback(() => {
    listMaterials(subjectId).then(setMaterials).catch(() => setMaterials([]));
  }, [subjectId]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Materiais</h3>
        <Button size="sm" variant={uploading ? "outline" : "default"} onClick={() => setUploading((v) => !v)}>
          <Plus className="size-4" />
          {uploading ? "Fechar" : "Adicionar material"}
        </Button>
      </div>

      {uploading ? <UploadArea subjectId={subjectId} onUploaded={() => { setUploading(false); load(); }} /> : null}

      {materials.length ? (
        <div className="space-y-3">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileStack className="size-5" />}
          title="Você ainda não possui materiais."
          description="Adicione seu primeiro e-book para começar."
          action={
            <Button onClick={() => setUploading(true)}>
              <Plus className="size-4" />
              Adicionar material
            </Button>
          }
        />
      )}
    </div>
  );
}
