import { describe, expect, it } from "vitest";
import { extractWebContent, validateWebUrl } from "./web-content";

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
  it.each(["http://faculdade.edu", "https://127.0.0.1/a", "https://[::1]/", "https://localhost/", "https://site.internal/", "https://user:pass@faculdade.edu/"])("bloqueia endereço não público: %s", value => {
    expect(() => validateWebUrl(value)).toThrow();
  });
});