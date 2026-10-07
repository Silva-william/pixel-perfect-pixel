import { useRef, useState } from "react";
import { Link2, Loader2, UploadCloud } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadMaterial } from "@/lib/materials";
import { importLinkMaterial } from "@/lib/web-import.functions";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACCEPTED = ["PDF", "EPUB", "DOCX", "TXT"];

export function UploadArea({ subjectId, onUploaded }: { subjectId: string; onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const importLink = useServerFn(importLinkMaterial);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    try {
      const value = new URL(url.trim());
      if (value.protocol !== "https:") throw new Error();
    } catch { toast.error("Cole um link HTTPS válido."); return; }
    setBusy(true);
    try {
      const result = await importLink({ data: { subjectId, url: url.trim() } });
      toast.success(`Material adicionado: ${result.title}`, { description: `${result.pages} páginas · ${result.images} imagens` });
      if (result.warnings.length) toast.warning(result.warnings.join(" "));
      setUrl("");
      onUploaded();
    } catch (error) {
      toast.error("Não foi possível importar o link.", { description: error instanceof Error ? error.message : undefined });
    } finally { setBusy(false); }
  };

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
    <Tabs defaultValue="file" className="w-full">
      <TabsList>
        <TabsTrigger value="file" disabled={busy}><UploadCloud className="mr-2 size-4" /> Arquivo</TabsTrigger>
        <TabsTrigger value="link" disabled={busy}><Link2 className="mr-2 size-4" /> Link</TabsTrigger>
      </TabsList>
      <TabsContent value="file">
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
      </TabsContent>
      <TabsContent value="link">
        <form onSubmit={handleLink} className="space-y-4 border border-dashed border-border bg-surface p-6 rounded-lg">
          <label htmlFor={`material-link-${subjectId}`} className="block text-sm font-medium">Link do material</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input id={`material-link-${subjectId}`} type="url" required maxLength={2048} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} disabled={busy} className="min-w-0 flex-1" />
            <Button type="submit" disabled={busy || !url.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              {busy ? "Importando..." : "Importar link"}
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}
