import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED = ["PDF", "EPUB", "DOCX", "TXT"];

export function UploadArea() {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (name?: string) => {
    toast.success(name ? `Material adicionado: ${name}` : "Material adicionado.", {
      description: "O envio real de arquivos será conectado em uma próxima etapa.",
    });
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]?.name);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center transition-colors",
        dragging ? "border-primary bg-accent/50" : "border-border bg-surface",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <UploadCloud className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">Arraste seu arquivo aqui</p>
        <p className="text-xs text-muted-foreground">ou</p>
      </div>
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        Escolher arquivo
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.epub,.docx,.txt"
        onChange={(e) => handleFile(e.target.files?.[0]?.name)}
      />
      <p className="text-xs text-muted-foreground">Aceitos: {ACCEPTED.join(" · ")}</p>
    </div>
  );
}
