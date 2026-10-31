# Orçamento independente e simulador EDGE — 31/10/2026

## Fluxo comercial

Nova rota autenticada `/orcamentos`, seção própria Orçamentos no menu compartilhado React/HTML. Cliente, título, vendedor obrigatório, quantidade de kits; camiseta e calção com tecidos, gola, recortes, filetes e aplicações por ocorrência; desconto; apresentação opcional. Nenhum pedido, lista ou desenho é exigido para orçar.

O cálculo reutiliza `public/order-pricing.js`, versão ANEXO-01-2026. Valor por kit é a soma dos dois unitários líquidos, arredondados por peça em centavos antes da multiplicação pelos kits. Desconto positivo aparece como já aplicado; zero não imprime aviso. Tecidos sem preço, como FLEX e HIBISCO, e filete de calção continuam pendentes até informação explícita de preço. Não inferir FLEX como STRECH. Preço manual é base anterior ao desconto e não remove os demais adicionais. Não foram criados preços novos.

Vendedores: sugestões do nome da conta e de vendedores presentes nos orçamentos salvos; é possível informar outro vendedor. Este campo não concede acesso nem cria conta. Apresentações são selecionadas da conta atual, com ID e versão; mudanças de versão exigem selecionar novamente. O vínculo não muda a apresentação. A conferência possui prévia de impressão/PDF com dados comerciais e imagem opcional, sem autorizar produção. Usa impressão nativa do navegador, não envio automático.

Salvar, reabrir e excluir orçamentos independentes. Não salva automaticamente a cada tecla: alterações não salvas são indicadas e há aviso ao sair e confirmação para descartar. Impressão pode ocorrer antes de salvar, desde que todos os dados estejam válidos. Não altera pedidos, listas, descontos ou projetos já existentes.

## Dados e segurança

Tabela D1 `sales_quotations` com documento comercial, proprietário, versão e datas, e índice proprietário/data. Migração schema-only `0014_ambitious_shaman.sql`, snapshot e journal gerados pelo Drizzle; sem DDL durante requisições. Nenhum arquivo de imagem é duplicado no orçamento.

APIs `/api/quotations` e `/api/quotations/[id]`: sessão, validação de origem, body limitado a64KiB, listas de valores permitidos, centavos/pontos-base inteiros, limites de quantidades e aplicações, titularidade da apresentação e CAS de versão em edições/exclusões. Cálculo é refeito no servidor; totais enviados pelo browser são descartados. IDs/nomes em SQL são parâmetros. Textos renderizados por React, sem HTML arbitrário.

O vínculo de apresentação é referência a uma revisão, não cópia imutável da imagem. Se projeto mudar ou desaparecer, a conferência exige atualizar/remover vínculo em vez de mostrar uma imagem de outra revisão como a originalmente escolhida. Quotas de preços são versão fixada; futuras tabelas devem preservar a anterior.

## Simulador

Reativado editor com o arquivo canônico `/assets/molds/kit-edge-2027-mapa-v3/model.glb` e descriptor retidos na v86. Nenhum molde excluído foi restaurado nem novo GLB criado. IDs e grupos dos19 painéis preservados; regiões de UV são normalizadas somente na cópia em memória para edição local. Associação do GLTFLoader por índice de mesh identifica os painéis, pois nomes de nodes são diferentes dos nomes comerciais de mesh. Geometria, posições e arquivo original não são regravados.

Mapa de apresentação usa os mesmos retângulos4096×4096 do EDGE; kit completo gera projeto nativo usando o template existente, sem registrar novos moldes. Camiseta/calção podem ser editados isoladamente, mas a apresentação nativa disponível é somente do kit completo; o botão informa/impede combinação incompatível. Fluxo de pedido derivado continua independente.

Uniformes salvos com base anterior são preservados e não convertidos silenciosamente. Abertura/atualização indica que é preciso começar outro desenho com a base atual. A conta antiga e o pedido1237-10-MNZ não foram modificados.

WebGL:95mil vértices permanecem abaixo do limite do renderer normal. Sem aceleração gráfica, a alternativa2D usa os painéis e salva localmente; conferência de quatro vistas e salvamento na conta exigem3D. Não foram geradas quatro vistas falsas. O renderer/observer são descartados ao entrar em alternativa2D.

## Verificação

Testes de cálculo cobrem kits, desconto/centavos, aplicações repetidas, quantidade, tecidos pendentes e preenchimento manual. Serviço testado em SQLite com isolamento por proprietário, versão concorrente, exclusão, referência de apresentação e rejeição de totais arbitrários. Integração real do simulador com apresentação nativa cobre o EDGE, seus19 painéis, salvamento independente e reuso da revisão.

No navegador: rota privada sem sessão redireciona; componente testado em harness local temporário com dados fictícios, removido antes da publicação;22kits e25% confirmados em R$86,11/kit e R$1.894,42total; conferência em tela cheia inspecionada. Simulador inicializado em2D no navegador sem aceleração. Renderização WebGL real, tela375px e impressão física não verificadas neste ambiente.

Reversão: voltar à versão anterior do Site. A tabela nova pode permanecer; não remover dados comerciais salvos em rollback. Catálogo continua com somente KIT EDGE2027. ATLAS VECTOR permanece na sua PR separada, sem implantação de backend.

Resultado de regressão final:382 testes,357 aprovados,25 casos históricos ignorados e zero falhas. TypeScript aprovado; lint do novo módulo sem erros (uma recomendação next/image para a miniatura autenticada). Migrações locais de0000 a0014 aplicadas em ordem com sucesso. Evidência fictícia da conferência em `docs/releases/atlas-orcamento-conferencia-20261031.jpg`.
