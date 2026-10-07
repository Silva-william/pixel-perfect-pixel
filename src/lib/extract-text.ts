/**
 * Browser-only text extraction. Libraries are loaded dynamically so they never
 * enter the server bundle. Returns one string per "page": real pages for PDF,
 * ~3000-character chunks for DOCX / TXT / EPUB.
 */

const CHUNK = 3000;

function chunk(text: string): string[] {
  const paragraphs = text.replace(/\r/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pages: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length > CHUNK) {
      pages.push(current);
      current = "";
    }
    current += (current ? "\n\n" : "") + p;
  }
  if (current) pages.push(current);
  return pages.length ? pages : [""];
}

/** Saves an image cropped from a PDF page; returns its storage path. */
export type SaveImage = (blob: Blob, page: number, index: number) => Promise<string>;

type Box = { x0: number; y0: number; x1: number; y1: number };

/** Bounding boxes (PDF units) of raster images drawn on a page, tracking the transform stack. */
function imageBoxes(ol: { fnArray: number[]; argsArray: unknown[] }, OPS: { save: number; restore: number; transform: number; paintImageXObject: number; paintInlineImageXObject: number }): Box[] {
  let m = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const boxes: Box[] = [];
  const mul = (a: number[], b: number[]) => [
    a[0]! * b[0]! + a[2]! * b[1]!,
    a[1]! * b[0]! + a[3]! * b[1]!,
    a[0]! * b[2]! + a[2]! * b[3]!,
    a[1]! * b[2]! + a[3]! * b[3]!,
    a[0]! * b[4]! + a[2]! * b[5]! + a[4]!,
    a[1]! * b[4]! + a[3]! * b[5]! + a[5]!,
  ];
  ol.fnArray.forEach((fn, i) => {
    if (fn === OPS.save) stack.push(m);
    else if (fn === OPS.restore) m = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) m = mul(m, ol.argsArray[i] as number[]);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [m[0]! * x! + m[2]! * y! + m[4]!, m[1]! * x! + m[3]! * y! + m[5]!]);
      const xs = pts.map((p) => p[0]!);
      const ys = pts.map((p) => p[1]!);
      boxes.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
    }
  });
  return boxes;
}

async function extractPdf(data: ArrayBuffer, saveImage?: SaveImage): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data }).promise;
  const { layoutPages } = await import("@/lib/pdf-layout");
  const raw: { str: string; x: number; y: number; h: number; bold: boolean }[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      // Resolve the font to keep the PDF's bold in the extracted text.
      let bold = false;
      try {
        const font = await (page.commonObjs as { get(n: string): Promise<{ name?: string }> }).get(item.fontName);
        bold = /bold|black|heavy|semibold|demi/i.test(font?.name ?? "");
      } catch {
        bold = false;
      }
      items.push({ str: item.str, x: item.transform[4], y: item.transform[5], h: item.height || 10, bold });
    }
    // Figures (charts, screenshots, infographics) drawn as images: crop and keep them in the text.
    if (saveImage && i > 1) {
      try {
        const [, , pw, ph] = page.view as number[];
        const ol = await page.getOperatorList();
        const boxes = imageBoxes(ol, pdfjs.OPS).filter(
          (b) => b.y0 > -5 && b.y1 < ph! + 5 && b.x1 - b.x0 > 80 && b.y1 - b.y0 > 60 && (b.x1 - b.x0) * (b.y1 - b.y0) > pw! * ph! * 0.03,
        );
        if (boxes.length) {
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvas, canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;
          for (let n = 0; n < boxes.length; n++) {
            const b = boxes[n]!;
            const [x0, y0] = viewport.convertToViewportPoint(b.x0, b.y0);
            const [x1, y1] = viewport.convertToViewportPoint(b.x1, b.y1);
            const left = Math.max(0, Math.min(x0!, x1!));
            const top = Math.max(0, Math.min(y0!, y1!));
            const w = Math.min(canvas.width - left, Math.abs(x1! - x0!));
            const h = Math.min(canvas.height - top, Math.abs(y1! - y0!));
            if (w < 20 || h < 20) continue;
            const crop = document.createElement("canvas");
            crop.width = w;
            crop.height = h;
            crop.getContext("2d")!.drawImage(canvas, left, top, w, h, 0, 0, w, h);
            const blob = await new Promise<Blob | null>((r) => crop.toBlob(r, "image/png"));
            if (!blob) continue;
            const path = await saveImage(blob, i, n);
            items.push({ str: `\u0001![](media:${path})\u0001`, x: 0, y: b.y1, h: 10, bold: false });
          }
        }
      } catch (e) {
        console.warn("Falha ao extrair imagens da página", i, e);
      }
    }
    raw.push(items);
  }
  // Reading order, repeated footers, page overflow and cover noise are handled in pdf-layout.
  return layoutPages(raw).map((t) =>
    t.replace(/\s*\u0001(.*?)\u0001\s*/g, "\n\n$1\n\n").replace(/\n{3,}/g, "\n\n").trim(),
  );
}

async function extractDocx(data: ArrayBuffer): Promise<string[]> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: data });
  return chunk(value);
}

function htmlToText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style").forEach((n) => n.remove());
  doc.querySelectorAll("p,div,h1,h2,h3,h4,h5,h6,li,br").forEach((n) => n.append("\n\n"));
  return (doc.body?.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

async function extractEpub(data: ArrayBuffer): Promise<string[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(data);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) throw new Error("EPUB inválido");
  const opf = new DOMParser().parseFromString(await zip.file(opfPath)!.async("string"), "application/xml");
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const manifest = new Map<string, string>();
  opf.querySelectorAll("manifest > item").forEach((it) => {
    manifest.set(it.getAttribute("id") ?? "", it.getAttribute("href") ?? "");
  });
  const texts: string[] = [];
  for (const ref of Array.from(opf.querySelectorAll("spine > itemref"))) {
    const href = manifest.get(ref.getAttribute("idref") ?? "");
    if (!href) continue;
    const html = await zip.file(base + decodeURIComponent(href))?.async("string");
    if (html) texts.push(htmlToText(html));
  }
  return chunk(texts.filter(Boolean).join("\n\n"));
}

export async function extractPages(type: string, data: ArrayBuffer, saveImage?: SaveImage): Promise<string[]> {
  switch (type) {
    case "PDF":
      return extractPdf(data, saveImage);
    case "DOCX":
      return extractDocx(data);
    case "EPUB":
      return extractEpub(data);
    default:
      return chunk(new TextDecoder().decode(data));
  }
}
