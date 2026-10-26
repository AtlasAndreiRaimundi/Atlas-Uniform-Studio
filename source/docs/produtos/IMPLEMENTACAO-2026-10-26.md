# Implementação das fichas CAM-001 e CAL-001

Catálogo: `2026-10-26.1`. As três fichas recebidas foram preservadas, sem alterar seu conteúdo. Este registro distingue a especificação original do comportamento implementado. O PDF visual de ribanas não foi fornecido neste ambiente; o catálogo usa as tabelas transcritas na CAM-001, incluindo a ordem dos códigos de fábrica.

## Comportamento entregue

| Área | Antes | Com as fichas |
|---|---|---|
| Novas peças | Nomes e tecidos livres | Seleção CAM-001 / CAL-001, com tecidos e acabamentos condicionais |
| Camiseta | Campos técnicos genéricos | 8 tecidos, 9 golas, modelagem e manga por peça, corte tradicional/raglan único por pedido |
| Calção | Acabamentos genéricos | 9 moldes por modelagem, DRY CALÇÃO/FLEX, cordão obrigatório, viés e filete conforme molde |
| Ribanas prontas | Texto genérico | 14 combinações e 10 lisas compartilhadas, 10 cores exclusivas Polo; nome amigável e referência original preservados |
| Aplicações | Caixas por técnica | Registros de finalidade, técnica, aplicações por unidade, total, posição manual e justificativa infantil |
| Lista de kit | Quantidade e personalização comuns | Quantidades, modelagens e ausência de número por peça; nome do calção explícito e opcional |
| Especiais | Tamanho genérico | Até 3 unidades de camiseta e 3 de calção no pedido completo, com referência e instruções |
| Páginas | Organização manual | Sugestão explícita segundo compatibilidade fabril, com conferência de imagens e apontamentos |
| Impressão | Pedido e lista incorporada | Mantém A4 horizontal, cabeçalho, lista por página e orçamento livre; acrescenta especificações e resumo por produto/modelagem/tamanho |
| Pedidos antigos | Cadastro anterior | Leitura preservada; conversão solicitada por peça, com os dados técnicos originais disponíveis para revisão |

A aplicação de marca **MEINERZ** é o acabamento físico descrito nas fichas: uma por camiseta em TPU e gratuita ao cliente; no calção, sublimada somente. O software e sua identidade continuam ATLAS. A gratuidade não remove a aplicação do quantitativo de produção.

## Estrutura e responsabilidades

- `public/product-catalog.js`: materiais, produtos, grades, nove moldes, nove golas, ribanas, regras, sugestões de página, quantitativos e texto técnico. IDs estáveis, versão explícita, sem cadastro livre de tecido principal.
- `public/product-catalog-ui.js` e `product-catalog.css`: formulário dependente integrado às etapas existentes. Alterações incompatíveis são removidas com aviso ou rejeitadas, preservando o estado anterior. Todas as setas continuam manuais.
- `public/catalog-list.js` e `catalog-list-ui.js`: extensão opcional da lista, por peça. Os campos usuais continuam no formulário básico; o painel adicional reúne quantidades/modelagens/especiais.
- `public/order-list.js`, `order-files.js`, `organizer-ui.js`: leitura, gravação e edição. O template técnico usa versão 3; modelos anteriores continuam legíveis. A planilha mantém as sete colunas usuais e acrescenta onze colunas opcionais, com instruções e validações.
- `public/production-core.js`: integração de lista sem perder `athleteId`, `kitId`, quantidades independentes ou instruções especiais. Campos pessoais vazios não herdam a linha anterior. O nome vazio do calção em kit significa sem nome.
- `lib/production-service.mjs`, `list-service.mjs` e criação HTTP de pedidos: higienização, limites e validação no servidor. Novos pedidos HTTP exigem catálogo atual; fichas já salvas não podem ser removidas para contornar a validação. Rascunhos admitem campos obrigatórios ainda incompletos, mas combinações técnicas concretamente inválidas são rejeitadas. Listas com pendências podem ser guardadas como rascunho e não podem ser concluídas nem incorporadas como conferidas.
- `lib/simulator-service.mjs`: pedidos iniciados pelo simulador também recebem as fichas; o desenho permanece vinculado e as escolhas de produção ficam para a montagem do pedido.
- `public/production-sheet.js`: especificações por peça, totais físicos, referências fabris, destaque de especiais, paginação de textos longos e resumo que soma kits e avulsos. Manga curta e longa do mesmo desenho são representadas na mesma folha, com espaço para o calção. Detalhes que excedem a folha recebem continuação; aplicações físicas aparecem resumidas na folha principal.
- `/catalogo-tecnico`: consulta acessível a partir do pedido, com as regras e pendências. A rota do estúdio usa a autenticação existente; o conteúdo estático não contém dados de clientes.
- `public/record-id.js`: UUID v4 com fonte criptográfica, compatível também com o ambiente local HTTP, sem `Math.random`.

O pedido mantém schema 1 para compatibilidade e recebe `technicalCatalogVersion`. Cada produto cadastrado recebe `technical` com versão, código, `designId`, modelagem, tecido, acabamento e aplicações. O corte de manga pertence ao pedido. Linhas de atletas mantêm os vínculos comerciais e suas próprias quantidades. A lista versão 3 é identificada por linha e no metadado do XLSX de modelo.

## Organização e preservação

A sugestão não altera o pedido ao ser aberta. Só é aplicada após o arte-finalista conferir. Mantém IDs das peças/atletas, quantitativos, imagens individuais, vínculos, notas e apontamentos; cria novas páginas e exige revisão visual em cada uma. Há desfazer enquanto nenhuma outra edição ocorrer.

Se a junção descartaria duas imagens únicas de kit ou enquadramentos diferentes, a sugestão é recusada com orientação para passar as imagens às peças antes de agrupar. Observações combinadas acima do limite também exigem ajuste manual. Não se escolhe uma imagem silenciosamente. Novos apontamentos não são gerados ao selecionar acabamento.

## Compatibilidade e migração

Não há migração em massa nem alteração do banco. Pedidos, listas e revisões anteriores conservam a leitura e suas regras de origem. A conversão de uma peça é explícita e preserva tipo/modelo/tecido/estampa/aplicações anteriores em `legacyTechnical`. A conferência dessa conversão é obrigatória para liberar a ficha atual.

Um item antigo que mistura várias modelagens precisa ser revisado pela lista técnica ou desmembrado antes de receber uma modelagem única da ficha. Opções antigas fora das duas fichas permanecem legíveis; não são oferecidas para novas peças. Um rascunho antigo ainda não salvo na conta precisa aplicar as fichas antes de sua primeira criação HTTP. Complementos preservam a revisão de origem e suas regras de migração; dados técnicos já cadastrados continuam sujeitos ao catálogo.

## Pendências deliberadamente não homologadas

1. Bolsos: quantidade/construção/posição e confirmação de compatibilidade dos moldes, incluindo Stein Infantil. Padrão sem bolsos. Stein/Elite Femininos bloqueiam expressamente; nos demais, a solicitação fica registrada como pendente e impede a liberação produtiva.
2. Polo: moldes compatíveis com abertura em V nas duas laterais inferiores. O campo não é oferecido como opção produtiva aprovada; entrada adulterada é rejeitada.
3. Redonda/V: catálogo específico de cores/material da ribana não fornecido. Nenhuma cor pronta foi inventada para esses acabamentos.
4. Peitilho redondo: limite de dois botões; quantidade deve ser explícita. Sem default/minímo inventado.
5. TPU infantil: justificativa e alerta obrigatórios. Não foi criado um papel de aprovador que a ficha não definiu.
6. Valores de adicionais e distância em milímetros da etiqueta à barra não foram inventados. A posição é registrada manualmente, com o padrão de lado indicado na ficha.

A homologação desses pontos exige decisão da fábrica e uma nova versão do catálogo. A implementação não é uma certificação geral de segurança do software.

## Verificação

As suítes `product-catalog.test.mjs` e `product-catalog-files.test.mjs` exercitam as matrizes de tecidos/golas/moldes, todos os códigos de ribana, dependências de formulário, kits com quantidades independentes, especiais, exceções infantis, preservação/migração, validação no salvamento e exportação e PDF A4. Os testes de fluxo existentes continuam cobrindo pedidos/listas/apresentações e operações protegidas.

Ver também `ROTEIRO-DE-HOMOLOGACAO.md`. Os resultados finais e a origem exata do snapshot constam no registro de sincronização do GitHub e no manifesto de fonte.

Verificação local de 26/10/2026: suíte completa com 300 casos (299 aprovados e 1 ignorado porque a planilha de referência antiga não foi anexada), TypeScript aprovado, teste no navegador dos formulários CAM/CAL e kit 2+1, e inspeção visual do PDF gerado em A4 paisagem. Vinte e um casos novos cobrem as fichas, além dos testes de fluxo atualizados. O roteiro de homologação fabril permanece uma revisão humana adicional.

A página estática de referência usa nome distinto da rota autenticada do estúdio (`referencia-producao.html` versus `/catalogo-tecnico`) para evitar colisão no roteamento de assets. O catálogo público não contém dados de clientes; pedidos e listas continuam protegidos no servidor.
