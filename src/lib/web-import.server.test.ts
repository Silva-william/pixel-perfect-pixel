import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicResource, loadWebLesson } from "./web-import.server";
import { extractWebContent } from "./web-content";

const imageUrl = "https://uploads-ssl.webflow.com/5c0fb0def554acb75500c1fc/5c110206ea9a8540ec10478d_lupinha.svg";
const dnsResponse = () => Response.json({ Answer: [{ type: 1, data: "104.16.1.1" }] });

afterEach(() => vi.unstubAllGlobals());

describe("aulas FMU carregadas em seções", () => {
  const source = "https://fmu-content.s3.us-east-1.amazonaws.com/FMU/EAD/Conteudo/CTI_COMFOR_21/unidade_1/ebook/index.html";
  const shell = '<html><head><title>Computação Forense</title></head><body><header id="header"><p class="subtitle">UNIDADE 1 - FUNDAMENTOS DA PERÍCIA FORENSE COMPUTACIONAL</p><p>Autoria</p></header><script src="js/render.js"></script></body></html>';
  it("reúne as partes em ordem e resolve figuras como o ebook original", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response('for(var page=1;page<=2;page++){ $.ajax({url: "sections/" + page + ".html"}); }'))
      .mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response('<h2>Introdução</h2><p>Perícia <b>forense</b></p>', { headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response('<p>Conclusão</p><img src="sections/img/8475277393855407551.jpg">', { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    const lesson = await loadWebLesson(shell, source);
    const extracted = extractWebContent(lesson.html, source);
    expect(lesson.sections.map(section => section.url)).toEqual([source.replace("index.html", "sections/1.html"), source.replace("index.html", "sections/2.html")]);
    expect(extracted.pages.join("\n")).toContain("**Introdução**\n\nPerícia **forense**\n\nConclusão");
    expect(extracted.pages.join("\n")).toContain("**UNIDADE 1 - FUNDAMENTOS DA PERÍCIA FORENSE COMPUTACIONAL**");
    expect(extracted.pages.join("\n")).not.toContain("Autoria");
    expect(extracted.images).toEqual([source.replace("index.html", "sections/img/8475277393855407551.jpg")]);
  });
  it("recusa manifestos fora do limite sem executar scripts", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response('for(var page=1;page<=999;page++){url: "sections/" + page + ".html"}'));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadWebLesson(shell, source)).rejects.toThrow("partes");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("mantém ebooks estáticos sem buscar recursos extras", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadWebLesson('<html><body><p>Aula estática</p></body></html>', source)).toEqual({ html: '<html><body><p>Aula estática</p></body></html>', sections: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("download de imagens FMU hospedadas no Webflow", () => {
  it("baixa o SVG permitido após verificar DNS", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response("<svg></svg>", { headers: { "content-type": "image/svg+xml" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPublicResource(imageUrl, 1024, "image");
    expect(result.type).toBe("image/svg+xml");
    expect(new TextDecoder().decode(result.bytes)).toBe("<svg></svg>");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("name=uploads-ssl.webflow.com");
  });

  it("revalida DNS ao redirecionar para o outro CDN permitido", async () => {
    const target = "https://cdn.prod.website-files.com/assets/figure.svg";
    const fetchMock = vi.fn().mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: target } }))
      .mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchPublicResource(imageUrl, 1024, "image")).url).toBe(target);
    expect(fetchMock.mock.calls[2]?.[0]).toContain("name=cdn.prod.website-files.com");
  });

  it("bloqueia redirecionamento de imagem para domínio arbitrário", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(dnsResponse())
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://attacker.example/figure.svg" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublicResource(imageUrl, 1024, "image")).rejects.toThrow("origem");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("bloqueia DNS privado mesmo para um CDN permitido", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ Answer: [{ type: 1, data: "127.0.0.1" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublicResource(imageUrl, 1024, "image")).rejects.toThrow("pública");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});