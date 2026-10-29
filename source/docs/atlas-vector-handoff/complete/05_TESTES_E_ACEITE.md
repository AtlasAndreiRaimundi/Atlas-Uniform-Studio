# Testes e critérios de aceite — obrigatórios antes de liberar o Beta

## Testes automatizados de API e motor

1. `401` para chamadas sem login; `403` para origem cruzada; sem contornar `account`/`mutation`.
2. `413` para body > limite real mesmo quando `Content-Length` é mentiroso ou ausente; e para arquivo decodificado acima do limite de pixels.
3. `415` para PDF/SVG/ZIP/arquivo falso `.png` e MIME não suportado; `422` para imagem corrompida/multiframe não suportado.
4. URL do motor sempre fixa; ninguém consegue passar host externo ao proxy. Token de serviço não aparece em HTML, JS, payloads de erro ou logs.
5. Com feature flag desligada ou motor offline, mostrar erro informativo, botão não envia, nenhuma arte é inventada; sem crash do site.
6. Testar concorrência, timeout, memória, cancelamento (se existir) e limpeza de temporários mesmo após exceção.
7. Traçar imagens sintéticas de 3 cores que **não sejam a paleta Rosario**; verificar que cores e transparência não foram substituídas por valores fixos.
8. Verificar que o SVG contém pelo menos um caminho ou primitiva vetorial editável e não contém `image`, `script`, `foreignObject`, recurso externo, handler `on*`, `javascript:` nem `data:` de bitmap.
9. Verificar preenchimento sem frestas acidentais **e** preservação de buracos intencionais (letras como A, P, R; estrelas separadas; bordas externas transparentes); não aceitar fechamento de tudo como solução.
10. Testar 150 × 171, 501 × 571 e 1201 × 1371 em fixtures **sintéticas autorizadas**, não publicar escudos de clubes. Testar processamento sob o timeout da hospedagem real.
11. Verificar que `Fiel` e `Simplificado` (quando disponíveis) produzem realmente SVGs distintos na imagem de controle. A opção `Fechar frestas` também deve produzir efeito verificável nos casos com frestas. Se não, ocultar controle.
12. Testar nomes de arquivo com HTML, caracteres Unicode, 10k caracteres, caracteres especiais e caminhos; saída deve receber nome fixo seguro.

## Testes de interface e acessibilidade

- Item `ATLAS VECTOR (BETA)` dentro de **Ferramentas** em menus React **e** estáticos, sem duplicações e sem tirar Criador de planilha.
- Link vai para `/ferramentas/atlas-vector` em mesma guia, com menu destacando item `atlas-vector`.
- Sem login, redireciona pelo fluxo já existente; token não aparece no navegador.
- Área de upload funciona com clique, arrastar e soltar e uso por teclado; mensagens de estado acessíveis.
- Comparativo mostra **imagem gerada de verdade** (SVG pelo backend) e original; fundo quadriculado dá transparência real.
- Download do SVG abre no Inkscape e é importável no CorelDRAW sem bitmap embutido; Corel é verificação manual no Windows.
- Visual compatível com temas escuro, cinza e claro; tela móvel 375 px; sem rolagem horizontal.
- Teste de reload/cancelamento não deixa processo ou download fantasma.

## Regressões obrigatórias no Uniform Studio

- Criador de planilha abre, importa e exporta como antes.
- Simulador 3D carrega e aceita arte, sem alteração de telas e GLBs.
- Pedidos continuam acessíveis; projetos/pastas e navegação seguem intactos.
- APIs existentes não perdem autenticação, limites nem cabeçalhos de segurança.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` no diretório `source/` (registrar restrições de ambiente ou testes previamente falhos); `python -m pytest -q tests` no motor.

## Prova de qualidade

- Salvar relatórios de teste com SHA do commit de cada repo, versão do motor, status do backend, ambiente, tempos, limites e screenshots sem dados de clientes.
- Medir diferenças de alpha e cores rasterizadas versus fixture sintética; reportar erros sem inventar fidelidade 100%.
- Especificar se o SVG contém caminhos auxiliares de reparo, distinguindo de formas originais.
- Conferir se as formas podem ser selecionadas e editadas no CorelDRAW. **Nenhuma alegação de teste no Corel se ele não foi realmente aberto.**

## Aceite final (todas exigidas)

- [ ] Ferramenta separada e isolada no grupo Ferramentas.
- [ ] Identidade/visual do Studio preservados.
- [ ] Processamento real por motor ATLAS, não VTracer, não simulado.
- [ ] Logo com cores diferentes da paleta Rosario corretamente vetorizada.
- [ ] PNG com transparência preserva área externa e vazios internos intencionais.
- [ ] SVG editável, sem raster, seguro e para download.
- [ ] Erros, timeout e ausência do motor tratados sem comprometer o Studio.
- [ ] Sem salvar imagem em projetos, listas, pastas ou R2 permanente.
- [ ] Nenhum segredo exposto; testes de segurança passam.
- [ ] CI do site e do motor sem regressões novas.
- [ ] Teste E2E realizado no ambiente hospedado com motor real disponível.
- [ ] PRs independentes, changelogs e rollback documentados; sem publicação não autorizada.
