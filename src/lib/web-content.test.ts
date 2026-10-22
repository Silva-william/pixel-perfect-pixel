import { describe, expect, it } from "vitest";
import { extractWebContent, validateWebUrl, validateImportHost, validateImportImageHost } from "./web-content";

describe("material por link", () => {
  it("mantém figuras do formato em seções sem ícones, exercícios e referências", () => {
    const result = extractWebContent('<html><body><main><img id="img-introduction" src="img/introduction.png"><p>Aula</p><img src="img/Exclude.png"><img src="img/caixas/icon_o_conhece.png"><div class="agora-voce">Agora é com você! Esta atividade não é pontuada.</div><div class="caixa-icone-foto"><div class="text-area"><h1>Vamos Praticar!</h1><p>Escreva uma resenha.</p></div></div><p>Explicação seguinte</p><div class="caixa-fonte"><span class="zoom"><img src="sections/img/figure.jpg"><img class="img-zoom" src="./img/lupa.png"></span><div>Figura 5 - Quadro semiótico</div></div><div class="referencias"><h1>Referências</h1><p>BRASIL. Decreto-lei</p></div></main></body></html>', 'https://fmu-content.s3.us-east-1.amazonaws.com/ebook/index.html');
    expect(result.images).toEqual(['https://fmu-content.s3.us-east-1.amazonaws.com/ebook/sections/img/figure.jpg']);
    expect(result.pages.join('\n')).toContain('Explicação seguinte');
    expect(result.pages.join('\n')).toContain('Figura 5 - Quadro semiótico');
    expect(result.pages.join('\n')).not.toMatch(/atividade|resenha|Decreto-lei/);
  });
  it("ignora a capa decorativa e mantém a Figura 2.1 no conteúdo", () => {
    const result = extractWebContent('<html><body><div class="header-capa w-background-video"><div style="background-image:url(https://uploads-ssl.webflow.com/media/Pexels-poster-00001.jpg)"></div><img src="images/logo-branca-br.svg"><h1>Banco de dados</h1></div><p>Arquitetura</p><div class="bloco-imagem"><a><div class="mouse-over-colorido"><img src="https://uploads-ssl.webflow.com/assets/lupinha.svg"></div><img class="imagem-thumbnail" src="images/figura.2.1.png"></a><p>Figura 2.1 - Arquitetura de Banco de Dados</p></div></body></html>', "https://faculdade.edu/ebook/index.html");
    expect(result.images).toEqual(["https://faculdade.edu/ebook/images/figura.2.1.png"]);
    expect(result.pages.join("\n")).toContain("**Banco de dados**");
    expect(result.pages.join("\n")).toContain("Arquitetura\n\n![ ](web-image:0)\n\nFigura 2.1 - Arquitetura de Banco de Dados");
  });
  it("exclui ícones e capas genéricas sem excluir explicações ou diagramas SVG", () => {
    const result = extractWebContent('<html><body><div><img class="image-hamburguer" src="https://uploads-ssl.webflow.com/assets/Ativo%2014.svg"><p>Etapa importante</p></div><img class="maisinho" src="images/topo-bg-mais-1.svg"><img class="bolinhas" src="images/topo-bg-bolinhas.svg"><img src="images/capa-video-generica.jpg"><img src="images/livros-capa-generica.jpg"><figure><img src="images/arquitetura.svg"><figcaption>Diagrama</figcaption></figure></body></html>', "https://faculdade.edu/ebook/index.html");
    expect(result.images).toEqual(["https://faculdade.edu/ebook/images/arquitetura.svg"]);
    expect(result.pages.join("\n")).toContain("Etapa importante");
  });
  it("ignora fundos de página e mantém infográficos de fundo dentro de figuras", () => {
    const result = extractWebContent('<html><body><section style="background-image:url(images/background.jpg)"><p>Aula</p></section><figure><div style="background-image:url(images/infografico.png)"></div><figcaption>Infográfico</figcaption></figure></body></html>', "https://faculdade.edu/ebook/index.html");
    expect(result.images).toEqual(["https://faculdade.edu/ebook/images/infografico.png"]);
    expect(result.pages.join("\n")).toContain("Aula");
  });
  it("remove ícones de caixas informativas mas mantém seu texto e infográfico", () => {
    const result = extractWebContent('<html><body><section><img src="images/voce-sabia.png"><p>Explicação importante</p><img src="images/box-para-ler.png"><img src="images/linha_1linha.png"><img src="images/saiba-mais-video-branco.png"><img src="images/saiba-mais-artigo-branco.png"><div class="imagem-div"><img src="images/infografico---simples-1.png"></div></section></body></html>', "https://faculdade.edu/ebook/index.html");
    expect(result.images).toEqual(["https://faculdade.edu/ebook/images/infografico---simples-1.png"]);
    expect(result.pages.join("\n")).toContain("Explicação importante");
  });
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