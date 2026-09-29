import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadMaterial } from "@/lib/materials";

const ACCEPTED = ["PDF", "EPUB", "DOCX", "TXT"];

export function UploadArea({ subjectId, onUploaded }: { subjectId: string; onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File) => {
    if (!file || busy) return;
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
    if (!ACCEPTED.includes(ext)) {
      toast.error("Formato não aceito. Use PDF, EPUB, DOCX ou TXT.");
      return;
    }
    setBusy(true);
    try {
      await uploadMaterial(subjectId, file);
      toast.success(`Material adicionado: ${file.name}`);
      onUploaded();
    } catch (e) {
      toast.error("Não foi possível enviar o arquivo.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center transition-colors",
        dragging ? "border-primary bg-accent/50" : "border-border bg-surface",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{busy ? "Enviando..." : "Arraste seu arquivo aqui"}</p>
        <p className="text-xs text-muted-foreground">ou</p>
      </div>
      <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        Escolher arquivo
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.epub,.docx,.txt"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">Aceitos: {ACCEPTED.join(" · ")} · até 50 MB</p>
    </div>
  );
}
