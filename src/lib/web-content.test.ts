import { describe, expect, it } from "vitest";
import { extractWebContent, validateWebUrl, validateImportHost, validateImportImageHost } from "./web-content";

describe("material por link", () => {
  it("preserva texto, negrito e infográfico na ordem original", () => {
    const result = extractWebContent('<html><head><title>Unidade 2</title></head><body><main><p>Antes <strong>segurança</strong>.</p><img src="images/info.png"><p>Depois.</p></main></body></html>', "https://faculdade.edu/ebook/index.html");
    expect(result.pages[0]).toBe("Antes **segurança**.\n\n![ ](web-image:0)\n\nDepois.");
    expect(result.images).toEqual(["https://faculdade.edu/ebook/images/info.png"]);
  });
  it("exclui exercícios sem apagar a aula seguinte", () => {
    const result = extractWebContent('<html><body><main><p>Aula inicial</p><div class="praticar-div">Questão e alternativas</div><h2>Exercícios</h2><p>Outra questão</p><h2>Próxima aula</h2><p>Conteúdo importante</p></main></body></html>', "https://faculdade.edu/aula");
    expect(result.pages.join("")).not.toMatch(/Questão|questão|alternativas|Exercícios/);
    expect(result.pages.join("")).toContain("Conteúdo importante");
  });
  it("ignora referências bibliográficas e gabarito", () => {
    const result = extractWebContent('<html><body><p>Aula</p><div class="ref_bibliografica">Autor, 2008</div><h2>Gabarito</h2><p>Resposta B</p></body></html>', "https://faculdade.edu/aula");
    expect(result.pages).toEqual(["Aula"]);
  });
  it("ignora quizzes incorporados da faculdade mantendo o texto da seção", () => {
    const result = extractWebContent('<html><body><section><p>Ameaças digitais</p><div><div><div class="titulo-quiz">Teste seus conhecimentos</div></div><iframe src="quiz/q1/index.html"></iframe><div><div class="text-block-14">Atividade não pontuada.</div></div></div><p>Próxima explicação</p></section></body></html>', "https://faculdade.edu/aula");
    expect(result.pages).toEqual(["Ameaças digitais\n\nPróxima explicação"]);
  });
  it("preserva tabelas com as células na mesma linha", () => {
    const result = extractWebContent('<html><body><table><tr><th>Fraude</th><th>Descrição</th></tr><tr><td>Delivery</td><td>Visor danificado</td></tr></table></body></html>', "https://faculdade.edu/aula");
    expect(result.pages[0]).toBe("| Fraude | Descrição |\n| --- | --- |\n| Delivery | Visor danificado |");
  });
  it("preserva o título da unidade e a tabela de níveis da FMU", () => {
    const result = extractWebContent('<html><body><div class="intro-header"><div class="paragraph-bigger">UNIDADE 2 – Gestão da segurança da informação</div><div>Autor: Nome</div></div><div class="div-block-55"><div class="coluna-div">NÍVEL</div><div class="coluna-div">CARACTERÍSTICAS</div><div class="coluna-div">Operacional</div><div class="coluna-div">Situações cotidianas</div></div></body></html>', "https://faculdade.edu/aula");
    expect(result.pages[0]).toBe("**UNIDADE 2 – Gestão da segurança da informação**\n\n| NÍVEL | CARACTERÍSTICAS |\n| --- | --- |\n| Operacional | Situações cotidianas |");
  });
  it("aceita a origem FMU fornecida e bloqueia domínios arbitrários", () => {
    expect(validateImportHost("https://fmu-content.s3.us-east-1.amazonaws.com/FMU/EAD/Conteudo/CTI_AUDSIS_21/unidade_2/ebook/index.html").hostname).toBe("fmu-content.s3.us-east-1.amazonaws.com");
    expect(() => validateImportHost("https://attacker.example/aula")).toThrow();
  });
  it("aceita as imagens Webflow da aula de laboratório sem liberar o CDN como material", () => {
    const image = "https://uploads-ssl.webflow.com/5c0fb0def554acb75500c1fc/5c110206ea9a8540ec10478d_lupinha.svg";
    expect(validateImportImageHost(image).hostname).toBe("uploads-ssl.webflow.com");
    expect(validateImportImageHost("https://cdn.prod.website-files.com/assets/figure.png").hostname).toBe("cdn.prod.website-files.com");
    expect(() => validateImportHost(image)).toThrow();
    expect(() => validateImportImageHost("https://uploads-ssl.webflow.com.attacker.example/figure.png")).toThrow();
    expect(() => validateImportImageHost("https://attacker.example/figure.png")).toThrow();
  });
  it.each(["http://faculdade.edu", "https://127.0.0.1/a", "https://[::1]/", "https://localhost/", "https://site.internal/", "https://user:pass@faculdade.edu/"])("bloqueia endereço não público: %s", value => {
    expect(() => validateWebUrl(value)).toThrow();
  });
});