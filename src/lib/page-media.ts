/**
 * Images inside a page's text are stored as a markdown-like marker on its own line:
 *   ![Legenda](media:<storage path>)
 * The reader renders them, the audio/AI ignore them.
 */

export const MEDIA_RE = /!\[([^\]]*)\]\(media:([^)\s]+)\)/g;

export type PageBlock =
  | { kind: "text"; text: string }
  | { kind: "image"; caption: string; path: string };

export function mediaMarker(caption: string, path: string) {
  return `![${caption.replace(/[[\]]/g, "")}](media:${path})`;
}

/** Splits a page into text blocks and image blocks, in order. */
export function parsePage(text: string): PageBlock[] {
  const blocks: PageBlock[] = [];
  let last = 0;
  for (const m of text.matchAll(MEDIA_RE)) {
    const before = text.slice(last, m.index);
    if (before.trim()) blocks.push({ kind: "text", text: before.trim() });
    blocks.push({ kind: "image", caption: m[1] ?? "", path: m[2] ?? "" });
    last = m.index + m[0].length;
  }
  const rest = text.slice(last);
  if (rest.trim()) blocks.push({ kind: "text", text: rest.trim() });
  return blocks;
}

/** Page text without the image markers — used for audio and for the AI. */
export function stripMedia(text: string) {
  return text.replace(MEDIA_RE, (_m, caption: string) => (caption ? `\n${caption}\n` : "\n"))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Storage paths of every image used in a page. */
export function mediaPaths(text: string) {
  return [...text.matchAll(MEDIA_RE)].map((m) => m[2] ?? "").filter(Boolean);
}
