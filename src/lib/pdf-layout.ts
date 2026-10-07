/**
 * Pure layout helpers that turn positioned PDF text items into readable pages:
 * reading order, duplicate "shadow" text, repeated footers/headers, text that
 * overflows into the next page, and cover/table-of-contents noise on page 1.
 */

export type PdfItem = { str: string; x: number; y: number; h: number };
type Line = { y: number; h: number; text: string; parts: PdfItem[] };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
/** Key used to detect repeated lines; ignores page numbers. */
const repeatKey = (s: string) => norm(s).replace(/\d+/g, "#").toLowerCase();

function toLines(raw: PdfItem[]): Line[] {
  const items: PdfItem[] = [];
  for (const it of raw) {
    if (!it.str.trim()) continue;
    // Drop "shadow" copies (same text drawn twice with a 1-2px offset).
    if (items.some((o) => o.str === it.str && Math.abs(o.x - it.x) < 3 && Math.abs(o.y - it.y) < 3)) continue;
    items.push(it);
  }
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  for (const it of items) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - it.y) < Math.max(it.h, line.h) * 0.5) line.parts.push(it);
    else lines.push({ y: it.y, h: it.h, text: "", parts: [it] });
  }
  for (const l of lines) {
    l.parts.sort((a, b) => a.x - b.x);
    l.text = norm(l.parts.map((p) => p.str).join(" "));
  }
  return lines;
}

function isCoverNoise(l: Line) {
  const t = l.text;
  if (/^(autor|revisor)\s*:/i.test(t)) return true;
  if (/^[A-ZÀ-Ú](\s[A-ZÀ-Ú]){3,}$/.test(t)) return true; // "I N I C I A R"
  // Table of contents line: text ... far-right page number.
  const last = l.parts[l.parts.length - 1]!;
  const prev = l.parts[l.parts.length - 2];
  if (l.parts.length > 1 && /^\d{1,3}$/.test(last.str.trim()) && prev && last.x - prev.x > 200) return true;
  // Names right after "Autor:" / "Revisor:" labels are short centered lines; handled by caller.
  return false;
}

function render(lines: Line[]) {
  let text = "";
  lines.forEach((l, i) => {
    if (i > 0) text += lines[i - 1]!.y - l.y > l.h * 2.2 ? "\n\n" : "\n";
    text += l.text;
  });
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function layoutPages(pages: PdfItem[][]): string[] {
  const all = pages.map(toLines);

  // Footers/headers: lines repeated (ignoring numbers) on many pages.
  if (all.length >= 3) {
    const count = new Map<string, number>();
    for (const lines of all) for (const k of new Set(lines.map((l) => repeatKey(l.text)))) count.set(k, (count.get(k) ?? 0) + 1);
    const min = Math.max(3, Math.ceil(all.length * 0.4));
    for (let p = 0; p < all.length; p++) {
      all[p] = all[p]!.filter((l) => (count.get(repeatKey(l.text)) ?? 0) < min || l.text.length < 4 && !/^\d+$/.test(l.text));
      // Standalone page numbers left behind.
      all[p] = all[p]!.filter((l) => !/^\d{1,3}$/.test(l.text));
    }
  }

  // Overflow: text at the bottom of a page drawn again at the top of the next one.
  for (let p = 1; p < all.length; p++) {
    const prev = new Set(all[p - 1]!.slice(-12).map((l) => l.text));
    const cur = all[p]!;
    let k = 0;
    while (k < cur.length && k < 12 && prev.has(cur[k]!.text)) k++;
    if (k) all[p] = cur.slice(k);
  }

  // Cover page: keep the title (largest text) and the real content, drop credits and summary.
  if (all.length > 1) {
    const first = all[0]!;
    const maxH = Math.max(...first.map((l) => l.h));
    const titleLines = first.filter((l) => l.h >= maxH * 0.65);
    const titleTexts = new Set<string>();
    const kept: Line[] = [];
    let skipNext = false;
    for (const l of first) {
      if (/^(autor|revisor)\s*:?$/i.test(l.text)) {
        skipNext = true;
        continue;
      }
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (isCoverNoise(l)) continue;
      if (titleLines.includes(l)) {
        const key = l.text.toLowerCase();
        if (titleTexts.has(key)) continue;
        titleTexts.add(key);
      }
      kept.push(l);
    }
    // Title sizes repeat at slightly different sizes; keep only the biggest occurrence group.
    const big = kept.filter((l) => l.h >= maxH * 0.65);
    const title = big.map((l) => l.text).join(" ");
    const body = kept.filter((l) => l.h < maxH * 0.65 && !isTitleFragment(l.text, title));
    all[0] = body;
    const out = all.map(render);
    out[0] = [title, out[0]].filter(Boolean).join("\n\n");
    return out;
  }
  return all.map(render);
}

/** Smaller copies of title words (e.g. the title repeated in a banner). */
function isTitleFragment(text: string, title: string) {
  const t = text.toUpperCase();
  return t.length > 6 && t === text && title.toUpperCase().includes(t);
}
