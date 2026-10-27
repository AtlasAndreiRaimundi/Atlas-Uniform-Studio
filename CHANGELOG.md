# Histórico de alterações — ATLAS UNIFORM STUDIO

Formato inspirado em Keep a Changelog. Alterações efetivas devem apontar para commits, tags, testes e arquivos de evidência.

## Registro inicial — 2026-10-24 (histórico)
### Documentação
- Estrutura inicial de documentação criada no repositório privado.
- Inventário preliminar dos módulos e das necessidades de validação.
- Orientações de preservação de evidências e integridade.

### Limitações registradas naquela data
- O código-fonte em produção **não foi importado**.
- A cronologia técnica anterior à criação do repositório depende de evidências externas que precisam ser preservadas.
- Não há prova técnica neste repositório de que funcionalidades descritas estejam finalizadas.

## Modelo para próximas versões
### [versão] — AAAA-MM-DD
- Mudança:
- Razão:
- Arquivos/commits:
- Responsável:
- Testes e resultado:
- Tag/release:
- SHA-256 do artefato:
- Local de armazenamento seguro do artefato:

## 2026-10-24 — Importação autorizada do código real

- Snapshot Sites v51, origem `d88265ccff069ea40ddbc36255191d1aefbb46d8`, 439 arquivos e 94.211.140 bytes em source/.
- Histórico GitHub preservado; manifesto SHA-256, restauração lossless de três GLBs grandes, varredura sem achados nos padrões verificados e 36 testes aprovados.
- Workflow de verificação e procedimento/script para novas exportações. Build e validação visual não repetidos nesta etapa; dados de produção não exportados. Ver docs/importacao-2026-10-24.md.

## 2026-10-26 — Fichas CAM-001 / CAL-001 e sincronização v58

- Código e documentação sincronizados com o commit Sites `6ee6dd626bdbab2fe2406b4ba2887cf0f3c550f9`, versão pública 58, preservando o histórico existente e as atualizações v52–v56.
- Catálogo técnico versionado, formulários dependentes, aplicações físicas, tamanhos especiais, lista com quantidades independentes, organização de páginas e resumo A4.
- Fichas originais preservadas em `source/docs/produtos/`, com registro de implementação, migração, pendências e roteiro de homologação.
- 299 testes aprovados (1 referência antiga ausente), TypeScript, build, conferência visual e varredura de padrões de segredo. A suíte de catálogo sem dependências foi adicionada ao workflow existente.
- Artefato publicado: SHA-256 `95aba47d28bda87081ed0d1efb81bcc27bd6b8d41b14c2b6a1cc46a387df1a29`. Manifesto por arquivo em `source-manifest.json`.
- Detalhes e limites: [sincronização das fichas](docs/implementacao-fichas-2026-10-26.md).

## 2026-10-26 — Excluir páginas e descartar preenchimento (v59)

- Excluir página fica visível junto ao indicador de páginas; confirmação identifica os dados afetados. A única página pode ser excluída e substituída por uma vazia, mantendo a identidade do pedido.
- Novo pedido fica no cabeçalho e permite descartar sem iniciar salvamento do formulário anterior. O menu Criar pedido e a recuperação com new=1 oferecem a mesma escolha; pedidos já salvos continuam disponíveis.
- Protege respostas de salvamento em andamento e a ordem das gravações locais; preserva revisões bloqueadas. Invalida a prévia PDF anterior.
- Nove novos casos de regressão; 308 testes completos aprovados e 1 referência antiga ausente; TypeScript/build e navegador aprovados. O workflow passa a incluir os testes de fluxo da montagem.
- Origem Sites: `9acb1b516331ac1e562dfd1cb29f5ca444f03425`, 469 arquivos verificados; artefato publicado SHA-256 `440fc99c1bfaf723b4d0287d4cb5dca0cc61e2e9b7dc5a7c6fcfed364b73e52f`.
- [Documentação junto ao código](source/docs/pedidos-edicao.md).

## 2026-10-27 — Código automático e contagem de desenhos (v60)

- O indicador do pedido conta apenas layouts de desenho; listas e detalhes mantêm a identificação do desenho correspondente e têm paginação própria. O resumo não aumenta essa contagem.
- Código gerado no servidor no primeiro salvamento, com quatro dígitos, mês da criação em São Paulo e unidade MNZ. Reserva atômica por unidade, códigos existentes preservados e códigos novos para importações/complementos; mês não é incrementado ao criar complemento.
- Código alinhado à direita do cabeçalho em SVG, PDF, prévias e pacote de produção; antiga posição em branco. Migração aditiva da sequência, sem reescrever pedidos.
- 318 testes aprovados e 1 referência antiga ausente; TypeScript/build aprovados. Prévia e lista conferidas no navegador. A suíte de numeração foi acrescentada ao workflow.
- Origem Sites: `13ac07fd17ade36f67e9551af5a147c27255b28d`, 474 arquivos; artefato publicado SHA-256 `7d7fdc0bc4c0a0a1b30cae28f69f713be8d5743a2bf01a4d20ec06c33fff669e`.
- [Documentação junto ao código](source/docs/pedidos-numeracao.md).

## 2026-10-27 — Composição inicial e múltiplas modelagens (v61)

- Pedidos novos começam pela escolha explícita entre kit, peça avulsa e duas peças independentes, antes dos dados do cliente. Kits: camiseta/calção, jaqueta/calça e polo/bermuda; cada peça mantém sua identidade.
- As modelagens masculina, Baby Look e infantil podem ser selecionadas juntas, com configurações técnicas e quantidades independentes. Listas mistas preservam o desenho e o tecido, sem duplicar quantidades ou personalização.
- Preserva as validações CAM-001/CAL-001 e os moldes por modelagem. Outros tipos usam detalhes técnicos manuais, sem criar catálogos homologados. O marcador manual não substitui ficha cadastrada. Pedidos antigos continuam legíveis.
- 326 testes aprovados e 1 referência XLSX antiga ausente; TypeScript e build aprovados; início, kits e seleção das três modelagens conferidos no navegador. Testes de composição adicionados ao workflow.
- Origem Sites: `dbf024a8ab05e1a38b981905a9eefdee0df8ff39`, 477 arquivos verificados; artefato publicado SHA-256 `000febed0a3737e76f10c0e6dd8026d44ca450624417957881897a0747dabd6a`.
- [Documentação junto ao código](source/docs/pedidos-composicao-modelagens.md).

## 2026-10-27 — Peças agrupadas e aplicações vinculadas (v63)

- Uma aba por peça/desenho reúne adulto, Baby Look e infantil; quantidades e impressão agrupadas, mantendo validações e exceções por modelagem.
- Características comuns compartilhadas e seletor interno de conferência, sem criar abas adicionais por categoria.
- Aplicações geram setas por unidade aplicada em cada peça, preservam posições ao editar e removem apenas apontamentos vinculados. Totais de aplicações respeitam as quantidades de cada modelagem.
- 327 testes aprovados, 1 referência antiga ausente; TypeScript/build e conferência no navegador aprovados.
- Origem Sites: `b9006c2b595b52fbe584cf3f3a7c037ea5f81b4e`, 480 arquivos. Documentação: source/docs/pedidos-pecas-agrupadas.md.

## 2026-10-27 — Montagem guiada em etapas (v64)

- Cliente, informações gerais e observações separados; configuração da 1ª e 2ª peças antes das aplicações e apontamentos.
- Personalizações de ambas as peças na mesma etapa; criação de aplicação gera setas e abre o editor de layout.
- Quantidades preenchidas pela lista, com resumo no retorno; conferência explícita ao final.
- 328 testes aprovados, 1 referência antiga ausente; TypeScript, build e navegador verificados.
- Origem Sites: `0aace28836709142e20565b6d9234be99b9fcc23`, 481 arquivos. Documentação: source/docs/pedidos-fluxo-guiado.md.

## 2026-10-27 — Aplicações e setas em uma confirmação (v65)

- Editor único para tipo, quantidade e posição da aplicação. OK salva aplicação e setas juntos; cancelar descarta o rascunho.
- Posição indicada pela seta preenche o dado técnico automaticamente, corrigindo o bloqueio de conferência por posição textual vazia.
- Controles opcionais recolhidos; textos simplificados; nome do pedido sugerido pelo cliente sem substituir título personalizado.
- Regras por produto e modelagem preservadas. 329 testes aprovados, 1 referência antiga ausente; TypeScript, build e fluxo publicado verificados.
- Origem Sites: `fd8ecb4f40a566af3ec33ed65f1692048d1bffd5`, 482 arquivos verificados.

## 2026-10-27 — Aplicações unificadas, conferência final e listas salvas (v66)

- Aplicações exclusivas da etapa Aplicações e setas, em lista única do pedido. Posição confirmada do layout inteiro preservada para todas as peças; aplicações distintas mantêm setas distintas.
- Convite após anexar lista válida abre a única conferência em tela cheia; um botão confirma arte, lista e dados técnicos juntos. Validações e envio posterior preservados.
- Listas salvas visíveis no pedido, com usar/abrir/excluir; exclusão também no organizador, com proprietário e versão verificados e snapshots de pedidos preservados.
- Migração aditiva 0013: order_lists.deleted_at. Identidades novas impedem que abas antigas sobrescrevam listas substitutas.
- 334 testes aprovados, 1 referência antiga ausente; TypeScript e build aprovados. Origem Sites `a9ae6228707574a44835d6bffac234dff8717fec`, 484 arquivos.

## v67 — 2026-10-27
- Layout com prioridade às peças, nomes e técnicas automáticos; apresentação de conjunto reconhecida como kit.
- Filete costurado no tecido da camiseta, recortes FLUENCE e cores informais de golas prontas.
- CDR obrigatório após a lista, conferência única e oferta de PDF + CDR; validação de propriedade no servidor.
- Fonte canônica: `8bca631db833f37da908d7121ca39c7e3e41c9e7` (488 arquivos).
- Validação: 339 testes aprovados, 1 ignorado preexistente, nenhum erro; TypeScript e build concluídos.

## v68 — 2026-10-27
- Quadro lateral mostra apenas estampa e aplicações; cor do cordão na linha do calção, inclusive sem aplicação física.
- Fonte: `cf576f90743818fd4226e0e8c41bc76002dffe2a` (488 arquivos).
- 29 testes de catálogo e impressão aprovados; build concluído.

## v69 — 2026-10-27
- Orçamento automático de camisetas e calções: tecido, gola, recorte, filete e aplicações; unitário líquido, quantidades, total e desconto opcional.
- Tabela Anexo 01/2026 versionada; preços ausentes ficam pendentes, sem valores presumidos. Validação no servidor e bloqueio da conferência com orçamento incompleto.
- Código ampliado à direita; PDF, SVG, JSON, ZIP e CDRs começam com código - cliente - pedido.
- Fonte canônica `4888960f0ff02d5403c3ea12f6df795a72025daf` (492 arquivos). 347 testes aprovados, 1 ignorado preexistente, zero falhas; TypeScript e build concluídos. PDF gerado e inspecionado visualmente.
