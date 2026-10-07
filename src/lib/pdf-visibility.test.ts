import { describe, expect, it } from "vitest";
import { insidePdfBox, pdfGeometry } from "./pdf-visibility";
import { preservePdfTables } from "./pdf-tables";
import { layoutPages } from "./pdf-layout";
import { stripMedia } from "./page-media";

describe("PDF visible page content", () => {
  it("excludes the hidden Delivery layer below the clipping boundary on page 7", () => {
    const bounds = { x0: 29, y0: 741.512, x1: 567, y1: 816.631 };
    expect(insidePdfBox({ x: 164.1, y: 586.5, h: 9, w: 35 }, bounds)).toBe(false);
    expect(insidePdfBox({ x: 62.8, y: 800.2, h: 12.5, w: 250 }, bounds)).toBe(true);
  });

  it("uses each group's outer clipping boundary instead of its nested clip", () => {
    const ops = { beginMarkedContentProps: 1, save: 2, clip: 3, constructPath: 4, restore: 5, endMarkedContent: 6 };
    const geometry = pdfGeometry({ fnArray: [1, 2, 3, 4, 2, 3, 4, 5, 5, 6], argsArray: [[], null, null, [28, [], [29, 741.512, 567, 816.631]], null, null, [28, [], [0, 980, 500, 1000]], null, null, null] }, ops);
    expect(geometry.groups).toEqual([{ x0: 29, y0: 741.512, x1: 567, y1: 816.631 }]);
  });

  it("removes identical shadow text offset by nine PDF points", () => {
    const text = "1.2 Crimes virtuais e no mundo real";
    expect(layoutPages([[{ str: text, x: 62.8, y: 809.1, h: 12.5 }, { str: text, x: 62.8, y: 800.2, h: 12.5 }]])[0]).toBe(text);
  });

  it("keeps each fraud together with its own description in table row order", () => {
    const labels = ["FRAUDES", "Delivery", "Extravio de cartão", "Falso leilão", "Golpe do falso funcionário bancário", "Golpe do falso motoboy", "Golpe do Whatsapp"];
    const descriptions = ["CARACTERÍSTICAS", "Visor danificado", "Cartões por correspondência", "Envio de dados bancários", "Irregularidades na conta", "Recolher o cartão", "Código de seis dígitos"];
    const cells = labels.flatMap((_, i) => [{ x0: 30, x1: 155, y0: 700 - (i + 1) * 80, y1: 700 - i * 80 }, { x0: 155, x1: 565, y0: 700 - (i + 1) * 80, y1: 700 - i * 80 }]);
    const items = labels.flatMap((str, i) => [{ str, x: 40, y: 660 - i * 80, h: 11, w: 80 }, { str: descriptions[i] ?? "", x: 180, y: 680 - i * 80, h: 11, w: 200 }]);
    const output = preservePdfTables(items, cells);
    expect(output).toHaveLength(1);
    labels.forEach((label, i) => expect(output[0]?.str).toContain(`| ${label} | ${descriptions[i]} |`));
  });

  it("passes table content to narration without separator syntax", () => {
    expect(stripMedia("| FRAUDES | CARACTERÍSTICAS |\n| --- | --- |\n| Delivery | Visor danificado |"))
      .toBe("FRAUDES. CARACTERÍSTICAS\n\nDelivery. Visor danificado");
  });
});