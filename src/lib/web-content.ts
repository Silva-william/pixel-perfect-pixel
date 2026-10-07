import { parseHTML } from "linkedom";

export type WebDocument = { title: string; pages: string[]; images: string[] };

/** Static educational HTML becomes the same editable page format used by PDFs. */
export function extractWebContent(html: string, source: string): WebDocument {
  const { document } = parseHTML(html);
  const title = document.querySelector("title")?.textContent?.trim().replace(/\s+/g, " ") || "Material por link";
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
    if (el.tagName === "IMG") return resolveImage(el.getAttribute("data-src") || el.getAttribute("src") || "");
    if (el.tagName === "BR") return "\n";
    if (el.tagName === "STRONG" || el.tagName === "B") return `**${children().trim()}**`;
    if (el.tagName === "TABLE") {
      const rows = Array.from(el.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => (cell.textContent ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").trim()));
      const width = Math.max(0, ...rows.map(row => row.length));
      return "\n\n" + rows.map((row, i) => `| ${Array.from({ length: width }, (_, n) => row[n] ?? "").join(" | ")} |${i === 0 ? `\n| ${Array(width).fill("---").join(" | ")} |` : ""}`).join("\n") + "\n\n";
    }
    let value = children();
    const background = el.getAttribute("style")?.match(/background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/i)?.[1];
    if (background) value = resolveImage(background) + value;
    if (/^H[1-6]$/.test(el.tagName)) return `\n\n**${value.trim().replace(/\*\*/g, "")}**\n\n`;
    if (el.tagName === "LI") return `\n• ${value.trim()}\n`;
    if (/^(P|DIV|SECTION|ARTICLE|BLOCKQUOTE|FIGURE|UL|OL)$/.test(el.tagName)) return `\n\n${value.trim()}\n\n`;
    return value;
  };
  const text = inline(root).replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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