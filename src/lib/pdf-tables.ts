import type { PdfItem } from "./pdf-layout";
import { insidePdfBox, type PdfBox } from "./pdf-visibility";

/** Keep native PDF tables in row/cell order, rather than interleaving both columns. */
export function preservePdfTables(items: PdfItem[], cells: PdfBox[]): PdfItem[] {
  const rows = new Map<string, PdfBox[]>();
  for (const cell of cells) {
    const key = `${Math.round(cell.y0)}:${Math.round(cell.y1)}`;
    const row = rows.get(key) ?? [];
    if (!row.some(c => Math.abs(c.x0 - cell.x0) < 2 && Math.abs(c.x1 - cell.x1) < 2)) row.push(cell);
    rows.set(key, row);
  }
  const candidates = [...rows.values()].filter(r => r.length >= 2).map(r => r.sort((a, b) => a.x0 - b.x0)).sort((a, b) => (b[0]?.y1 ?? 0) - (a[0]?.y1 ?? 0));
  const tables: PdfBox[][][] = [];
  for (const row of candidates) {
    const previous = tables[tables.length - 1];
    const last = previous?.[previous.length - 1];
    if (last && row.length === last.length && Math.abs((last[0]?.y0 ?? 0) - (row[0]?.y1 ?? 0)) < 3 && row.every((c, i) => Math.abs(c.x0 - (last[i]?.x0 ?? 0)) < 3 && Math.abs(c.x1 - (last[i]?.x1 ?? 0)) < 3)) previous?.push(row);
    else tables.push([row]);
  }
  let result = [...items];
  for (const table of tables.filter(t => t.length >= 3)) {
    const used = new Set<PdfItem>();
    const textRows = table.map(row => row.map(cell => {
      const parts = result.filter(item => insidePdfBox(item, cell) && !item.str.includes("media:"));
      parts.forEach(item => used.add(item));
      return parts.sort((a, b) => b.y - a.y || a.x - b.x).map(p => p.str.trim()).join(" ").replace(/\|/g, " ");
    }));
    if (!textRows[0]?.every(Boolean) || textRows.filter(r => r.some(Boolean)).length < 3) continue;
    const header = textRows[0];
    const markdown = [header, header.map(() => "---"), ...textRows.slice(1)].map(row => `| ${row.join(" | ")} |`).join("\n");
    result = result.filter(item => !used.has(item));
    const first = table[0]?.[0];
    if (first) result.push({ str: `\u0001${markdown}\u0001`, x: first.x0, y: first.y1, h: 10 });
  }
  return result;
}