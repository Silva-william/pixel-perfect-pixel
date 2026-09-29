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

async function extractPdf(data: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += item.str + (item.hasEOL ? "\n" : " ");
    }
    pages.push(text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim());
  }
  return pages;
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

export async function extractPages(type: string, data: ArrayBuffer): Promise<string[]> {
  switch (type) {
    case "PDF":
      return extractPdf(data);
    case "DOCX":
      return extractDocx(data);
    case "EPUB":
      return extractEpub(data);
    default:
      return chunk(new TextDecoder().decode(data));
  }
}
