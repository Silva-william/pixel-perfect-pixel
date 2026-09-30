# Materiais: excluir, editar texto, destaque da leitura e correção do PDF

## 1. Excluir um material
- Botão de lixeira em cada material da lista (aba Materiais) e na página do material.
- Janela de confirmação: "Excluir este material? Isso não pode ser desfeito."
- Remove o arquivo original, o texto das páginas, os áudios salvos e a posição de leitura/escuta. O histórico de atividade continua, sem o link.

## 2. Editar o texto das páginas
- Botão "Editar texto" no leitor abre a página atual numa caixa de edição, com "Salvar" e "Cancelar".
- Ao salvar, o texto novo passa a ser o usado na leitura, no áudio e na IA (resumos, quiz, tutor). Áudios antigos da página são refeitos automaticamente.
- **Remover rodapés/cabeçalhos repetidos (ex.: "UNIDADE 1 – FUNDAMENTOS DA SEGURANÇA DA INFORMAÇÃO 1"):** opção "Remover trecho em todas as páginas" — você cola o trecho uma vez e ele é apagado de todas as páginas (o número da página no final também é ignorado).
- Aviso: "Processar novamente" refaz a leitura do arquivo e descarta as edições (confirmação antes).

## 3. Destaque do trecho sendo lido
- Enquanto o áudio toca, a frase/trecho em leitura fica com fundo destacado no texto da página, e a tela rola para acompanhar.
- O destaque segue as partes em que o áudio já é dividido (acompanha a parte atual; não é palavra por palavra).

## 4. Corrigir trechos que somem do PDF (citação da página)
- Diagnóstico ainda não confirmado: primeiro abro o PDF enviado ("AUDITORIA DE SISTEMAS") e verifico por que a citação em negrito não vem na extração.
- Causas prováveis e correções: fontes que precisam de arquivos extras do leitor de PDF (cmaps/fontes padrão), texto marcado de forma diferente dentro do PDF, ou ordem do texto quebrada. Ajusto a extração e testo com esse arquivo antes de concluir.
- Depois, basta clicar "Processar novamente" no material.

## Detalhes técnicos
- `deleteMaterial(id)` em `src/lib/materials.ts`: remove `storage.materials` (original + pasta `<userId>/audio/<id>/`), `material_pages`, nulifica `study_activity.material_id`, depois `materials`. Sem migração (RLS atual cobre). Se as FKs não tiverem cascade, deleção na ordem acima.
- `updatePage(materialId, page, content)` e `removeSnippetEverywhere(materialId, snippet)` (regex tolerante a espaços + número de página final opcional), atualizando `material_pages` em lote.
- AudioPlayer: expor `chunk` atual via `onChunkChange`; MaterialReader renderiza o texto dividido com o mesmo `chunkText` (extraído para util compartilhado) e aplica `bg-primary/15` + `scrollIntoView` no chunk ativo. O hash do texto já invalida o cache de áudio após edição.
- extract-text.ts: configurar `cMapUrl`, `cMapPacked`, `standardFontDataUrl` do pdfjs-dist, `includeMarkedContent`, e ordenar itens por posição (y/x) ao montar linhas; validar com script sobre o arquivo do Storage.
- MaterialCard: botão excluir fora do Link (stopPropagation) + AlertDialog.
