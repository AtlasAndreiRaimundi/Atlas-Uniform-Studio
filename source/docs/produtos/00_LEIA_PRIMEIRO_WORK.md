# ATLAS Uniform Studio — Pacote de implementação das fichas técnicas

**Data:** 26/10/2026  
**Escopo:** CAM-001 (Camiseta Sublimada/Transfer), CAL-001 (Calção de Jogo).  
**Estado:** requisitos aprovados em conversa; implementação e testes ainda NÃO executados.

## Instrução para o ChatGPT Work

Analise o projeto existente ATLAS Uniform Studio ANTES de alterar a implementação. Preserve módulos, navegação, layout A4 horizontal do pedido, persistência, exportação, integração com a lista e apresentações, controle de acesso e demais funcionalidades existentes. Não substitua ou reconstrua componentes sem necessidade. Crie/atualize um catálogo de produtos que habilite campos e opções somente quando o produto correspondente estiver selecionado, com validação tanto na interface quanto na persistência e geração/exportação de pedidos. Utilize as duas especificações anexas como fonte de verdade. Ao identificar conflitos com o código existente, documente-os e implemente a solução mais conservadora, sem descartar dados antigos. Solicite confirmação das pendências listadas nos documentos antes de atribuir comportamentos produtivos não definidos.

**Arquivos:**
- `CAM-001_CAMISETA_SUBLIMADA_TRANSFER.md` — regras de produto, materiais, golas, mangas, aplicações e validações.
- `CAL-001_CALCAO_DE_JOGO.md` — tecidos, nove moldes, acabamentos, bolsos, cordões, kits e validações.
- `TIRAS RIBANAS E POLO TRICOSTURA.pdf` (fornecido pelo usuário no chat original): referência visual das 14 combinações e cores lisas das ribanas, com a página 2 dedicada às golas Polo. Se este PDF não for anexado no Work, use as tabelas transcritas na ficha CAM-001, mas conserve os nomes e códigos de fábrica.

## Contrato transversal de arquitetura

1. **Biblioteca central** de materiais e acabamentos, com códigos estáveis e rótulos amigáveis; vincular por produto, função e molde. Um material autorizado para um recorte não é automaticamente autorizado como tecido principal. Evitar opções digitadas livremente em campos de catálogo.
2. **Escopos distintos**: `order` → `page` → `designVariant` / `item` → `orderLine` / `athlete`. Não reduzir tudo a um único formulário plano. O tipo de manga (raglan/tradicional) da CAM-001 é regra do pedido; tecido/gola/recortes/adicionais do mesmo desenho são regras de variação/página; modelagem, comprimento de manga, tamanho, nome e quantidade têm seus escopos conforme as fichas.
3. **Separação de produção**: diferentes características que mudam o processo fabril demandam novas páginas/variações conforme a ficha. A cor do cordão é exceção expressa. Agrupamento inteligente apresenta *sugestões*, exige revisão do arte-finalista e nunca aplica separação definitiva silenciosamente.
4. **Kits** são vínculos comerciais/organizacionais entre produtos, não uma unidade indivisível de quantidade: modelagem, tamanho e quantidade de camiseta e calção independentes; número compartilhado somente quando ambos são numerados no mesmo kit. Avulsos independentes. Resumo de produção SOMA kits e avulsos por produto/modelagem/tamanho sem seção separada de 'kits'. Exibição por página permanece independente.
5. **Aplicações físicas especiais**: registros separados por tipo, quantidade e localização, mesmo quando gratuitos. Sublimação já embutida na arte NÃO gera linha adicional. Marca MEINERZ em TPU em camiseta: uma por camiseta, cobrança zero. Marca MEINERZ no calção: sublimada somente.
6. **Setas manuais**: não criar seta automaticamente ao selecionar aplicação/acabamento. Disponibilizar anotações editáveis/posicionáveis com informações técnicas. Não confundir setas de visualização com prova de que o produto tem o acabamento.
7. **Validação em três pontos**: seleção UI, salvamento/back-end e geração do pedido/exportação. Ao trocar produto/molde/tecido, invalidar escolhas dependentes incompatíveis com aviso claro; não manter estados inválidos ocultos.
8. **Migração**: manter projetos antigos legíveis, mapear campos existentes sem perda, e prever versionamento dos catálogos e registros. Não alterar modelos salvos sem estratégia de migração.
9. **Testes mínimos**: testes unitários de catálogos/compatibilidade, testes de formulário dependente, agrupamento de páginas, kit vs. avulso, limites de tamanhos especiais, exceções infantis, e renderização/exportação A4 paisagem.
10. **Não inventar** cores, tecidos, restrições, preços ou disponibilidade ainda não fornecidos. Pendências devem aparecer claramente em relatórios técnicos, não virar regras silenciosas.

## Checklist de entrega no Work

- Registrar estrutura de dados, validações e UX existente alterada.
- Implementar cadastros CAM-001 e CAL-001 e menus condicionais; não expor produtos não cadastrados como selecionáveis sem regras.
- Criar testes automatizados e roteiro de teste manual para arte-finalista/PCP.
- Testar as 14 combinações da ribana e a grade Polo, preservando equivalências comerciais e códigos originais.
- Garantir que o PDF/arte-final indique especificações por página/peça, setas manuais e quantidades.
- Informar arquivos de código afetados, comportamento antes/depois, casos pendentes e eventuais limitações reais.

## Observação

Estes documentos são **especificações para executar no Work**, não comprovantes de alteração do site. Iniciar implementação somente dentro do projeto/repositório autorizado e depois verificar no ambiente de teste.
