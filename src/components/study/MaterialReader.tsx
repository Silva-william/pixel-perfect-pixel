import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Headphones, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ProgressBar";
import { AudioPlayer, type ListenPosition } from "@/components/study/AudioPlayer";
import { logActivity } from "@/lib/activity";
import {
  getOriginalUrl,
  getPage,
  reprocessMaterial,
  saveAudioPosition,
  saveReadingPosition,
  type AudioPosition,
  type MaterialDetail,
} from "@/lib/materials";

export function MaterialReader({
  material,
  onChanged,
}: {
  material: MaterialDetail;
  onChanged: () => void;
}) {
  const total = material.pages;
  const [page, setPage] = useState(Math.min(Math.max(material.currentPage, 1), Math.max(total, 1)));
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [audio, setAudio] = useState<AudioPosition | null>(material.audio);
  const [autoPlay, setAutoPlay] = useState(false);
  const listenedPages = useRef(new Set<number>());
  const ready = material.status === "ready" || material.status === "no_text";

  useEffect(() => {
    if (!ready) return;
    setText(null);
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

  const onAudioProgress = (pos: ListenPosition) => {
    const next = { page, ...pos };
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

  // Page read to the end: continue listening on the next page.
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

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {material.storagePath ? (
        <Button variant="outline" size="sm" onClick={openOriginal}>
          <ExternalLink className="size-4" /> Abrir original
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={reprocess} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Processar novamente
      </Button>
    </div>
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
        <Button onClick={reprocess} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {busy ? "Processando..." : "Processar agora"}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Leitura</h2>
        {toolbar}
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

      {text ? (
        <AudioPlayer
          text={text}
          materialId={material.id}
          page={page}
          resume={audio && audio.page === page ? audio : null}
          autoPlay={autoPlay}
          onProgress={onAudioProgress}
          onStart={onAudioStart}
          onFinished={onAudioFinished}
        />
      ) : null}

      <article className="card-soft min-h-[420px] p-6 sm:p-10">
        {text === null ? (
          <p className="text-sm text-muted-foreground">Carregando página...</p>
        ) : text.trim() ? (
          <div className="mx-auto max-w-prose whitespace-pre-line font-serif text-lg leading-relaxed">
            {text}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta página não tem texto selecionável (pode ser uma imagem ou digitalização). Use "Abrir
            original" para vê-la.
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
    </section>
  );
}
