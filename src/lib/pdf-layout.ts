/**
 * Pure layout helpers that turn positioned PDF text items into readable pages:
 * reading order, duplicate "shadow" text, repeated footers/headers, text that
 * overflows into the next page, and cover/table-of-contents noise on page 1.
 */

export type PdfItem = { str: string; x: number; y: number; h: number; bold?: boolean };
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
    const similar = line && Math.max(it.h, line.h) / Math.max(1, Math.min(it.h, line.h)) < 1.3;
    if (line && similar && Math.abs(line.y - it.y) < Math.max(it.h, line.h) * 0.5) line.parts.push(it);
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

/** Line text with bold parts wrapped in **markers** (markdown-style). */
function boldText(l: Line) {
  let out = "";
  let open = false;
  for (const p of l.parts) {
    const s = p.str.trim();
    if (!s) continue;
    if (p.bold && !open) {
      if (out) out += " ";
      out += "**";
      open = true;
    } else if (!p.bold && open) {
      out += "** ";
      open = false;
    } else if (out) {
      out += " ";
    }
    out += s;
  }
  if (open) out += "**";
  return out;
}

function render(lines: Line[]) {
  let text = "";
  lines.forEach((l, i) => {
    if (i > 0) text += lines[i - 1]!.y - l.y > l.h * 2.2 ? "\n\n" : "\n";
    text += boldText(l);
  });
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Removes repeated footer/header items (and the page number next to them) before building lines. */
function dropRepeatedItems(pages: PdfItem[][]): PdfItem[][] {
  if (pages.length < 3) return pages;
  const count = new Map<string, number>();
  for (const items of pages)
    for (const k of new Set(items.filter((i) => norm(i.str).length >= 8).map((i) => repeatKey(i.str)))) count.set(k, (count.get(k) ?? 0) + 1);
  const min = Math.max(3, Math.ceil(pages.length * 0.4));
  const repeated = [...count.entries()].filter(([, n]) => n >= min).map(([k]) => k);
  if (!repeated.length) return pages;
  return pages.map((items) => {
    const bands: number[] = [];
    const isRep = (i: PdfItem) => {
      const k = repeatKey(i.str);
      return k.length >= 8 && repeated.some((r) => r === k || (k.length >= 15 && r.startsWith(k.slice(0, 15))));
    };
    for (const i of items) if (isRep(i)) bands.push(i.y);
    return items.filter((i) => {
      if (isRep(i)) return false;
      const near = bands.some((y) => Math.abs(y - i.y) < 3);
      return !(near && /^\s*[\dA-ZÀ-Ú]{0,3}\s*$/.test(i.str));
    });
  });
}

/**
 * Removes the bibliography section ("REFERÊNCIAS" / "REFERÊNCIAS BIBLIOGRÁFICAS"):
 * the heading and everything below it on the page. References usually run to the
 * end of the document, so trailing pages that are only bibliography entries are
 * dropped too (handled in layoutPages).
 */
export function dropReferences(items: PdfItem[]): PdfItem[] {
  const heading = items.find((i) => /^\s*refer[eê]ncias(\s+bibliogr[aá]ficas)?\s*$/i.test(i.str) && i.h >= 12);
  if (!heading) return items;
  return items.filter((i) => i.y > heading.y + 1);
}

/** True when a page looks like a bibliography continuation (mostly reference entries). */
export function isBibliographyPage(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return false;
  const entry = lines.filter((l) => /[.;]\s*(19|20)\d{2}[.,)]/.test(l) || /\b(dispon[ií]vel em|acesso em|in:|ed\.|v\.\s*\d)/i.test(l));
  return entry.length >= Math.max(2, Math.ceil(lines.length * 0.5));
}

/**
 * Removes practice exercises ("A importância da...", options a–e, "Gabarito na página N"):
 * the block between the large exercise title and the "Gabarito" line, drawn in a
 * larger font than the body text.
 */
export function dropExercises(items: PdfItem[]): PdfItem[] {
  // Answer key section ("Gabarito" heading): drop it and everything below on that page.
  const key = items.find((i) => /^\s*gabarito\s*$/i.test(i.str) && i.h >= 14);
  if (key) items = items.filter((i) => i.y > key.y + 1);
  const gab = items.filter((i) => /gabarito\s+na\s+p[áa]gina/i.test(i.str));
  if (!gab.length) return items;
  const hs = new Map<number, number>();
  for (const i of items) hs.set(Math.round(i.h), (hs.get(Math.round(i.h)) ?? 0) + 1);
  const body = [...hs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 9;
  const drop = new Set<PdfItem>();
  for (const g of gab) {
    drop.add(g);
    const title = items
      .filter((i) => i.y > g.y && i.h >= body * 1.8)
      .sort((a, b) => b.y - a.y)[0];
    if (!title) continue;
    for (const i of items) {
      if (i.y < g.y || i.y > title.y + 1) continue;
      const exerciseFont = i.h >= body * 1.8 || (i.h >= body * 1.15 && i.h <= body * 1.4);
      if (exerciseFont) drop.add(i);
    }
  }
  return items.filter((i) => !drop.has(i));
}

export function layoutPages(pages: PdfItem[][]): string[] {
  const all = dropRepeatedItems(pages.map((items) => dropReferences(dropExercises(items)))).map(toLines);

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

  // Cover page: keep only the title, drop credits, banner and summary.
  if (all.length > 1) {
    const first = all[0]!;
    const hs = all.flat().map((l) => Math.round(l.h));
    const freq = new Map<number, number>();
    for (const h of hs) freq.set(h, (freq.get(h) ?? 0) + 1);
    const bodyH = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
    const maxH = Math.max(...first.map((l) => l.h));
    const cover = first.filter((l) => l.h > bodyH * 1.6);
    const seen = new Set<string>();
    const title = cover
      .filter((l) => l.h >= maxH * 0.6)
      .sort((a, b) => (b.h >= maxH - 1 ? 1 : 0) - (a.h >= maxH - 1 ? 1 : 0) || b.y - a.y)
      .map((l) => l.text)
      .filter((t) => (seen.has(t.toLowerCase()) ? false : (seen.add(t.toLowerCase()), true)))
      .join(" ")
      .replace(/(\S)\s+(DA|DE|DO)\s/g, "$1 $2 ");
    const body: Line[] = [];
    let skipNext = false;
    for (const l of first) {
      if (l.h > bodyH * 1.6) continue;
      if (/^(autor|revisor)\s*:?$/i.test(l.text)) {
        skipNext = true;
        continue;
      }
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (!isCoverNoise(l)) body.push(l);
    }
    all[0] = body;
    const out = all.map(render);
    if (title) out[0] = [title, out[0]].filter(Boolean).join("\n\n");
    return out;
  }
  return all.map(render);
}
