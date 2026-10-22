import { parseHTML } from "linkedom";

export type WebDocument = { title: string; pages: string[]; images: string[] };

/** Static educational HTML becomes the same editable page format used by PDFs. */
export function extractWebContent(html: string, source: string): WebDocument {
  const { document } = parseHTML(html);
  const title = document.querySelector("title")?.textContent?.trim().replace(/\s+/g, " ") || "Material por link";
  const unitTitle = document.querySelector(".intro-header .paragraph-bigger")?.textContent?.trim().replace(/\s+/g, " ");
  const root = document.querySelector("main, article, [role=main]") ?? document.body;
  for (const label of Array.from(root.querySelectorAll(".titulo-quiz, .text-block-14"))) {
    if (/teste seus conhecimentos|atividade n[aã]o pontuada/i.test(label.textContent ?? "")) {
      const group = label.parentElement?.parentElement;
      if (group && group.textContent && group.textContent.length < 500) group.remove();
    }
  }
  root.querySelectorAll("script, style, noscript, nav, footer, form, iframe, .w-nav, .ref_bibliografica, .praticar-div, .intro-header, .linha, .call-action, .w-slider-arrow-left, .w-slider-arrow-right, .w-slider-nav, [hidden], [aria-hidden=true]").forEach(el => el.remove());
  // Drop exercise sections, but preserve the lesson which follows them.
  for (const heading of Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6"))) {
    const label = (heading.textContent ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!/^(referencias(?: bibliograficas)?|bibliografia|gabarito|exercicios?|atividades?(?: nao pontuadas?)?|vamos praticar)\b/i.test(label)) continue;
    const level = Number(heading.tagName.slice(1));
    let next = heading.nextElementSibling;
    while (next) {
      if (/^H[1-6]$/.test(next.tagName) && Number(next.tagName.slice(1)) <= level) break;
      const current = next;
      next = next.nextElementSibling;
      current.remove();
    }
    heading.remove();
  }
  const images: string[] = [];
  const isDecorativeImage = (el: Element, value: string) => {
    // Filter the visual shell, not its text or the neighboring lesson figure.
    if (el.closest(".header-capa, .w-background-video, .mouse-over-colorido, .logo-impressao, .maisinho, .bolinhas, .image-hamburguer, [role=presentation]")) return true;
    let filename = "";
    try { filename = decodeURIComponent(new URL(value, source).pathname.split("/").pop() ?? ""); } catch { return true; }
    return /(?:^|[-_\s])(?:logo|topo-bg|lupinha|capa-video|livros-capa|poster|box-para-ler|voce-sabia|saiba-mais-video|saiba-mais-artigo|icone)(?:[-_.\s]|$)|-poster-\d+\.|^linha(?:[-_.]|$)/i.test(filename);
  };
  const resolveImage = (value: string) => {
    try {
      const url = new URL(value, source);
      if (url.protocol !== "https:") return "";
      const index = images.indexOf(url.href);
      const n = index < 0 ? images.push(url.href) - 1 : index;
      return `\n\n![ ](web-image:${n})\n\n`;
    } catch { return ""; }
  };
  const inline = (node: Node): string => {
    if (node.nodeType === 3) return (node.textContent ?? "").replace(/\s+/g, " ");
    if (node.nodeType !== 1) return "";
    const el = node as Element;
    const children = () => Array.from(el.childNodes).map(inline).join("");
    if (el.tagName === "IMG") {
      const src = el.getAttribute("data-src") || el.getAttribute("src") || "";
      return !src || isDecorativeImage(el, src) ? "" : resolveImage(src);
    }
    if (el.tagName === "BR") return "\n";
    if (el.tagName === "STRONG" || el.tagName === "B") return `**${children().trim()}**`;
    if (el.tagName === "TABLE" || el.classList.contains("div-block-55")) {
      const cells = Array.from(el.children).filter(cell => cell.classList.contains("coluna-div"));
      const cleanCell = (cell: Element) => (cell.textContent ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
      const rows = el.tagName === "TABLE"
        ? Array.from(el.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cleanCell))
        : Array.from({ length: Math.ceil(cells.length / 2) }, (_, i) => cells.slice(i * 2, i * 2 + 2).map(cleanCell));
      const width = Math.max(0, ...rows.map(row => row.length));
      return "\n\n" + rows.map((row, i) => `| ${Array.from({ length: width }, (_, n) => row[n] ?? "").join(" | ")} |${i === 0 ? `\n| ${Array(width).fill("---").join(" | ")} |` : ""}`).join("\n") + "\n\n";
    }
    let value = children();
    const background = el.getAttribute("style")?.match(/background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/i)?.[1];
    // CSS backgrounds are decoration unless explicitly inside a didactic figure.
    if (background && el.closest("figure, .bloco-imagem, .infografico, .infographic") && !isDecorativeImage(el, background)) value = resolveImage(background) + value;
    if (/^H[1-6]$/.test(el.tagName)) return `\n\n**${value.trim().replace(/\*\*/g, "")}**\n\n`;
    if (el.tagName === "LI") return `\n• ${value.trim()}\n`;
    if (/^(P|DIV|SECTION|ARTICLE|BLOCKQUOTE|FIGURE|UL|OL)$/.test(el.tagName)) return `\n\n${value.trim()}\n\n`;
    return value;
  };
  const text = `${unitTitle ? `**${unitTitle}**\n\n` : ""}${inline(root)}`.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const pages: string[] = [];
  let page = "";
  for (const block of text.split(/\n\n/)) {
    if (page.length + block.length > 9000 && page) { pages.push(page); page = ""; }
    page += (page ? "\n\n" : "") + block;
  }
  if (page) pages.push(page);
  return { title, pages, images };
}

export function validateWebUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".") || /[\[\]:]/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host) || /\.(localhost|local|internal|test|invalid)$/.test(host)) {
    throw new Error("Use um link HTTPS de uma página pública.");
  }
  return url;
}

/** Explicitly trusted content hosts prevent DNS rebinding of arbitrary user domains. */
export function validateImportHost(value: string): URL {
  const url = validateWebUrl(value);
  if (url.hostname !== "fmu-content.s3.us-east-1.amazonaws.com") {
    throw new Error("Neste momento, a importação aceita links de conteúdo da FMU (fmu-content.s3.us-east-1.amazonaws.com).");
  }
  return url;
}

/** Image CDNs used by the trusted FMU ebooks; these are not allowed as lesson sources. */
export function validateImportImageHost(value: string): URL {
  const url = validateWebUrl(value);
  if (!["fmu-content.s3.us-east-1.amazonaws.com", "uploads-ssl.webflow.com", "cdn.prod.website-files.com"].includes(url.hostname)) {
    throw new Error("A origem desta imagem não é permitida para importação.");
  }
  return url;
}