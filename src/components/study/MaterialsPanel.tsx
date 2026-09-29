import { useState } from "react";
import { FileStack, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialCard } from "@/components/MaterialCard";
import { EmptyState } from "@/components/EmptyState";
import { UploadArea } from "@/components/UploadArea";
import type { Material } from "@/data/types";

export function MaterialsPanel({ materials }: { materials: Material[] }) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Materiais</h3>
        <Button size="sm" variant={uploading ? "outline" : "default"} onClick={() => setUploading((v) => !v)}>
          <Plus className="size-4" />
          {uploading ? "Fechar" : "Adicionar material"}
        </Button>
      </div>

      {uploading ? <UploadArea /> : null}

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
