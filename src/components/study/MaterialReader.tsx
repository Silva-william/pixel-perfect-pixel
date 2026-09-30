import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  ExternalLink,
  Headphones,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ProgressBar";
import { AudioPlayer, chunkText, type ListenPosition } from "@/components/study/AudioPlayer";
import { logActivity } from "@/lib/activity";
import {
  deleteMaterial,
  getOriginalUrl,
  getPage,
  removeSnippetEverywhere,
  reprocessMaterial,
  saveAudioPosition,
  saveReadingPosition,
  updatePage,
  type AudioPosition,
  type MaterialDetail,
} from "@/lib/materials";

type Reading = { chunk: number; ratio: number } | null;

/** Text shown while listening: split like the audio, with the sentence being read highlighted. */
function HighlightedText({ text, reading }: { text: string; reading: NonNullable<Reading> }) {
  const chunks = useMemo(() => chunkText(text).map((c) => c.match(/[^.!?]+[.!?]*\s*/g) ?? [c]), [text]);
  const activeRef = useRef<HTMLSpanElement>(null);
  const sentences = chunks[reading.chunk] ?? [];
  const len = sentences.reduce((n, s) => n + s.length, 0);
  let target = reading.ratio * len;
  let active = sentences.length - 1;
  for (let i = 0; i < sentences.length; i++) {
    target -= sentences[i]!.length;
    if (target <= 0) {
      active = i;
      break;
    }
  }
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [reading.chunk, active]);

  return (
    <div className="mx-auto max-w-prose font-serif text-lg leading-relaxed">
      {chunks.map((ss, ci) => (
        <span key={ci} className={ci === reading.chunk ? "" : "text-muted-foreground"}>
          {ss.map((s, si) => {
            const on = ci === reading.chunk && si === active;
            return (
              <span
                key={si}
                ref={on ? activeRef : undefined}
                className={on ? "rounded bg-primary/20 text-foreground transition-colors" : undefined}
              >
                {s}
              </span>
            );
          })}{" "}
        </span>
      ))}
    </div>
  );
}

export function MaterialReader({
  material,
  onChanged,
}: {
  material: MaterialDetail;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const total = material.pages;
  const [page, setPage] = useState(Math.min(Math.max(material.currentPage, 1), Math.max(total, 1)));
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [audio, setAudio] = useState<AudioPosition | null>(material.audio);
  const [autoPlay, setAutoPlay] = useState(false);
  const [reading, setReading] = useState<Reading>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [snippet, setSnippet] = useState("");
  const [confirm, setConfirm] = useState<"delete" | "reprocess" | null>(null);
  const listenedPages = useRef(new Set<number>());
  const ready = material.status === "ready" || material.status === "no_text";

  useEffect(() => {
    if (!ready) return;
    setText(null);
    setEditing(null);
    setReading(null);
    getPage(material.id, page).then(setText);
    void saveReadingPosition(material.id, page, total);
  }, [material.id, page, total, ready]);

  // Study history: one entry each time the material is opened.
  useEffect(() => {
    if (!ready) return;
    void logActivity({
      kind: "material",
      text: `Abriu "${material.name}" na página ${page}`,
      subjectId: material.subjectId,
      materialId: material.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id, ready]);

  const goTo = (p: number) => {
    setAutoPlay(false);
    setPage(p);
  };

  const onAudioProgress = (next: ListenPosition & { page: number }) => {
    setAudio(next);
    void saveAudioPosition(material.id, next);
  };

  const onAudioStart = () => {
    if (listenedPages.current.has(page)) return;
    listenedPages.current.add(page);
    void logActivity({
      kind: "audio",
      text: `Ouviu a página ${page} de "${material.name}"`,
      subjectId: material.subjectId,
      materialId: material.id,
    });
  };

  const onAudioFinished = () => {
    if (page < total) {
      const next = { page: page + 1, chunk: 0, seconds: 0 };
      setAudio(next);
      void saveAudioPosition(material.id, next);
      setAutoPlay(true);
      setPage(page + 1);
    } else {
      setAudio(null);
      void saveAudioPosition(material.id, null);
      toast.success("Você terminou de ouvir este material.");
    }
  };

  const openOriginal = async () => {
    if (!material.storagePath) return;
    try {
      window.open(await getOriginalUrl(material.storagePath), "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o arquivo.");
    }
  };

  const reprocess = async () => {
    setBusy(true);
    try {
      await reprocessMaterial(material);
      toast.success("Material processado.");
      onChanged();
    } catch (e) {
      toast.error("Não foi possível ler este arquivo.", {
        description: e instanceof Error ? e.message : undefined,
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMaterial(material);
      toast.success("Material excluído.");
      navigate({ to: "/studies/$id", params: { id: material.subjectId } });
    } catch (e) {
      toast.error("Não foi possível excluir.", { description: e instanceof Error ? e.message : undefined });
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (editing === null) return;
    setBusy(true);
    try {
      await updatePage(material.id, page, editing);
      setText(editing);
      setEditing(null);
      toast.success("Texto da página salvo.");
    } catch {
      toast.error("Não foi possível salvar o texto.");
    } finally {
      setBusy(false);
    }
  };

  const removeSnippet = async () => {
    setBusy(true);
    try {
      const n = await removeSnippetEverywhere(material.id, snippet);
      setSnippetOpen(false);
      setSnippet("");
      toast.success(n ? `Trecho removido de ${n} página(s).` : "O trecho não foi encontrado.");
      setText(await getPage(material.id, page));
    } catch {
      toast.error("Não foi possível remover o trecho.");
    } finally {
      setBusy(false);
    }
  };

  const dialogs = (
    <>
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? "Excluir este material?" : "Processar o arquivo novamente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "O arquivo, o texto e os áudios salvos serão apagados. Isso não pode ser desfeito."
                : "O texto será lido de novo do arquivo original e as edições que você fez serão perdidas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void (confirm === "delete" ? remove() : reprocess())}
              className={confirm === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {confirm === "delete" ? "Excluir" : "Processar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={snippetOpen} onOpenChange={setSnippetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover trecho em todas as páginas</DialogTitle>
            <DialogDescription>
              Cole um texto que se repete, como o rodapé ou cabeçalho da página. Ele será apagado de todas as
              páginas, junto com o número da página que vier logo depois.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            placeholder="Ex.: UNIDADE 1 – FUNDAMENTOS DA SEGURANÇA DA INFORMAÇÃO"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnippetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={removeSnippet} disabled={busy || !snippet.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const deleteButton = (
    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirm("delete")} disabled={busy}>
      <Trash2 className="size-4" /> Excluir
    </Button>
  );

  if (!ready) {
    const msg =
      material.status === "failed"
        ? "Não conseguimos ler o texto deste arquivo."
        : material.status === "processing"
          ? "Este material está sendo processado."
          : "Este material ainda não foi processado.";
    return (
      <section className="card-soft space-y-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">{msg}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={reprocess} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {busy ? "Processando..." : "Processar agora"}
          </Button>
          {deleteButton}
        </div>
        {dialogs}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Leitura</h2>
        <div className="flex flex-wrap items-center gap-2">
          {material.storagePath ? (
            <Button variant="outline" size="sm" onClick={openOriginal}>
              <ExternalLink className="size-4" /> Abrir original
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setEditing(text ?? "")} disabled={text === null || editing !== null}>
            <Pencil className="size-4" /> Editar texto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSnippetOpen(true)}>
            <Eraser className="size-4" /> Remover trecho
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm("reprocess")} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Processar novamente
          </Button>
          {deleteButton}
        </div>
      </div>

      {audio && audio.page !== page ? (
        <div className="card-soft flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Headphones className="size-4" />
            Você parou de ouvir na página {audio.page}.
          </span>
          <Button size="sm" variant="outline" onClick={() => goTo(audio.page)}>
            Ir para a página {audio.page}
          </Button>
        </div>
      ) : null}

      {text && editing === null ? (
        <AudioPlayer
          text={text}
          materialId={material.id}
          page={page}
          resume={audio && audio.page === page ? audio : null}
          autoPlay={autoPlay}
          onProgress={onAudioProgress}
          onStart={onAudioStart}
          onFinished={onAudioFinished}
          onReading={setReading}
        />
      ) : null}

      <article className="card-soft min-h-[420px] p-6 sm:p-10">
        {editing !== null ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Apague o que não quer que seja lido. O texto salvo passa a ser usado na leitura, no áudio e pela IA.
            </p>
            <Textarea
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              className="min-h-[420px] font-serif text-base leading-relaxed"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={saveEdit} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        ) : text === null ? (
          <p className="text-sm text-muted-foreground">Carregando página...</p>
        ) : text.trim() ? (
          reading ? (
            <HighlightedText text={text} reading={reading} />
          ) : (
            <div className="mx-auto max-w-prose whitespace-pre-line font-serif text-lg leading-relaxed">{text}</div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta página não tem texto selecionável (pode ser uma imagem ou digitalização). Use "Abrir original"
            para vê-la.
          </p>
        )}
      </article>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          <ChevronLeft className="size-4" /> Anterior
        </Button>
        <div className="w-40 space-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Página {page} de {total}
          </p>
          <ProgressBar value={total ? (page / total) * 100 : 0} />
        </div>
        <Button variant="outline" disabled={page >= total} onClick={() => goTo(page + 1)}>
          Próxima <ChevronRight className="size-4" />
        </Button>
      </div>
      {dialogs}
    </section>
  );
}
