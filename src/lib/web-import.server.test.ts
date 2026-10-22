import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicResource } from "./web-import.server";

const imageUrl = "https://uploads-ssl.webflow.com/5c0fb0def554acb75500c1fc/5c110206ea9a8540ec10478d_lupinha.svg";
const dnsResponse = () => Response.json({ Answer: [{ type: 1, data: "104.16.1.1" }] });

afterEach(() => vi.unstubAllGlobals());

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