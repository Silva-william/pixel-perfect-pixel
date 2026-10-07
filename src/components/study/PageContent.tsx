import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getMediaUrl } from "@/lib/materials";
import { parsePage } from "@/lib/page-media";

function PageImage({ path, caption, onZoom }: { path: string; caption: string; onZoom: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getMediaUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [path]);

  return (
    <figure className="my-6">
      {failed ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar esta imagem.
        </div>
      ) : url ? (
        <img
          src={url}
          alt={caption || "Imagem do material"}
          onClick={() => onZoom(url)}
          className="mx-auto max-h-[70vh] w-auto cursor-zoom-in rounded-lg border bg-card object-contain"
        />
      ) : (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      )}
      {caption ? (
        <figcaption className="mt-2 text-center font-sans text-sm text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Renders **bold** markers (kept from the PDF) as real bold text. */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
      )}
    </>
  );
}

/** Page text with the inserted images (infographics, tables) rendered in place. */
export function PageContent({ text }: { text: string }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const blocks = parsePage(text);

  return (
    <div className="mx-auto max-w-prose font-serif text-lg leading-relaxed">
      {blocks.map((b, i) =>
        b.kind === "text" ? (
          <p key={i} className="whitespace-pre-line">
            <InlineText text={b.text} />
          </p>
        ) : (
          <PageImage key={i} path={b.path} caption={b.caption} onZoom={setZoom} />
        ),
      )}
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-5xl p-2">
          {zoom ? <img src={zoom} alt="Imagem ampliada" className="max-h-[85vh] w-full object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
