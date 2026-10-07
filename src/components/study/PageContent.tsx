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

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const sections: { table: boolean; lines: string[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const table = line.trim().startsWith("|") && line.trim().endsWith("|");
    const previous = sections[sections.length - 1];
    if (previous?.table === table) previous.lines.push(line);
    else sections.push({ table, lines: [line] });
  }
  return <>{sections.map((section, index) => {
    if (!section.table || !section.lines[1]?.match(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/)) {
      return <p key={index} className="whitespace-pre-line"><InlineText text={section.lines.join("\n")} /></p>;
    }
    const rows = section.lines.filter((_, i) => i !== 1).map(line => line.trim().slice(1, -1).split("|").map(cell => cell.trim()));
    return <div key={index} className="my-6 overflow-x-auto"><table className="w-full border-collapse font-sans text-sm leading-relaxed">
      <thead className="bg-muted"><tr>{rows[0]?.map((cell, i) => <th key={i} className="border border-border p-3 text-left font-semibold"><InlineText text={cell} /></th>)}</tr></thead>
      <tbody>{rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="min-w-32 border border-border p-3 align-top"><InlineText text={cell} /></td>)}</tr>)}</tbody>
    </table></div>;
  })}</>;
}

/** Page text with the inserted images (infographics, tables) rendered in place. */
export function PageContent({ text }: { text: string }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const blocks = parsePage(text);

  return (
    <div className="mx-auto max-w-prose font-serif text-lg leading-relaxed">
      {blocks.map((b, i) =>
        b.kind === "text" ? (
          <TextBlock key={i} text={b.text} />
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
