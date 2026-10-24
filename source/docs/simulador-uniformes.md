# Simulador de uniformes

O simulador fica em `/simulador`, no grupo Criação. O botão “CRIE SEU UNIFORME COM NOSSO SIMULADOR” está na entrada do estúdio e na montagem de pedidos. A interface acompanha os temas escuro, cinza e claro existentes.

## Montagem e pedido

- KIT ELITE 27, camiseta ou calção, com os 19 painéis organizados por corpo/recortes, golas, mangas/filetes, calção e cós.
- 26 grafismos geométricos originais, incluindo linhas horizontais e verticais, faixas clássicas, listras, diagonais, chevron e texturas. Edição de camadas, posição, tamanho, rotação, opacidade e ordem; vistas 3D e painel 2D.
- Três fontes fornecidas: MNZ AUTUMN 26, MNZ REVOKE 26 e MNZ BILBAO 26. Os arquivos TTF são preservados integralmente. Caracteres ausentes da fonte geram aviso.
- Personalizações do jogador usam as exibições fixas JOGADOR e 00; nomes e números reais vêm da lista do pedido. Textos ficam retos, sem controle de rotação. O tamanho mantém largura e altura proporcionais, inclusive nos limites, e o desenho da fonte é encaixado sem compressão horizontal. Desenhos antigos recebem essas regras ao serem reabertos no editor.
- 103 cores do XML PALETA SUBLIMACAO 2026. Código, espaço e valores nativos permanecem no catálogo e no estado salvo. As conversões de LAB e da cor especial para a tela são aproximações, identificadas na interface.
- Logos PNG com avaliação de resolução pelo tamanho aplicado. SVGs são simplificados para vetores sem scripts, texto vivo ou recursos externos; a interface orienta converter textos em curvas.
- Salvamento local automático separado por conta; “Salvar uniforme” cria uma versão durável na conta. “Meus uniformes” abre criações com nome e miniatura.
- “Conferir desenho” abre quatro vistas. Somente após a confirmação explícita aparecem os dados para iniciar um pedido. A criação gera um rascunho real, com imagem PNG transparente das quatro vistas, quantidade e cliente. A imagem exclui o fundo, a interface e a sombra de chão.
- O pedido retém uma cópia editável do desenho na versão conferida. Alterar a criação salva não altera pedidos anteriores. “Abrir desenho editável” abre a cópia do pedido como nova criação, preservando o pedido original.
- O rascunho segue a montagem e conferência de pedido/lista já existentes. Criar pelo simulador não libera nada para a fábrica.

## Do montador à apresentação

Depois de “Conferir desenho”, marque a confirmação e escolha **Criar apresentação**. O desenho é salvo na conta, convertido automaticamente em um mapa PNG de 4096 × 4096 e aberto no mesmo estúdio usado pelas apresentações com arte enviada. Não é necessário criar um pedido. Também há um atalho após a criação do pedido, mantendo o contexto para vinculá-lo pelo fluxo de conferência existente.

O projeto aparece em **Meus projetos** com o nome do uniforme e sua miniatura de quatro vistas. As opções normais do estúdio ficam disponíveis: imagens, quatro vistas transparentes, PDF de aprovação, vídeo, detalhes e link para o cliente. A apresentação continua exigindo sua própria conclusão/conferência antes de ser anexada a um pedido.

O mapa usa o mesmo renderizador de camadas, fontes, cores e logos do montador. Os três modelos internos (kit, camiseta e calção) mantêm exatamente as posições, normais e índices do GLB aprovado, com UVs convertidos para esse mapa e orientação vertical corrigida uma única vez. Peças ocultas no montador são excluídas do modelo da apresentação. Não são novas opções no catálogo comum de moldes.

Cada versão salva do uniforme abre um único projeto de apresentação; cliques repetidos e concorrentes não duplicam o projeto nem substituem edições feitas no estúdio. Uma nova versão do uniforme gera outra apresentação, preservando as anteriores. O upload e a criação do projeto são atômicos: uma falha não deixa um projeto vazio e pode ser repetida. As APIs verificam proprietário, versão, origem da requisição, formato e tamanho do mapa.

`scripts/prepare-simulator-presentations.mjs` reproduz os modelos e layouts internos a partir de `public/simulador/models/kit-elite-27.glb`. Os mapas auxiliares são de apresentação e identificam expressamente que não são moldes de corte. O estado editável permanece em Meus uniformes; o projeto do estúdio guarda uma cópia visual independente.

`tests/simulator-presentation.test.mjs` verifica cada vértice e UV dos três modelos, fontes/logos no renderizador compartilhado, peças isoladas, concorrência, versões, privacidade, repetição após falha e preservação de apresentações editadas.

## Administração e proteção

O editor do cliente não oferece upload de GLB. Há somente o KIT ELITE 27 aprovado; o servidor recusa IDs arbitrários de modelagem. A navegação administrativa usa `/admin/molds`, já protegido pela identidade estável `ADMIN_USER_ID`. O link também fica oculto para clientes.

As APIs exigem autenticação e verificam o proprietário em leituras, miniaturas, salvamentos e integração com pedidos. Mutações usam a proteção de origem existente, com leitura limitada do corpo real. O servidor valida painéis, cores, fontes, grafismos, posições e limites de camadas; deriva as dimensões do PNG do próprio arquivo e verifica a estrutura e CRC dos blocos. SVGs ativos ou externos são recusados.

Cada versão usa um objeto imutável no R2; atualizações exigem a versão exata no D1. Conflitos não sobrescrevem a edição de outra aba. Pedidos simultâneos da mesma versão compartilham uma reserva para evitar duplicação. A migração `0011_workable_johnny_blaze.sql` adiciona `uniform_designs` sem modificar tabelas existentes.

## Ativos e limites

O GLB completo mantém a geometria do KIT ELITE 27 original, com materiais foscos e UVs locais por painel. Navegadores sem WebGL usam uma versão reduzida do mesmo kit em um renderizador compatível. Essa alternativa foi usada na revisão visual do navegador remoto; a aparência com aceleração gráfica não foi inspecionada nesse ambiente.

O catálogo é reproduzível por `scripts/prepare-uniform-catalog.py`, que registra SHA-256 dos arquivos originais. As fontes e paleta vêm dos arquivos enviados pelo usuário. Os grafismos não copiam artes de terceiros.

Esta integração preserva o escopo do teste sem exportação técnica editável em PDF/CDR. A imagem e o estado editável são vinculados ao pedido; a validação de medidas, costuras e cores de impressão continua na conferência técnica.

## Verificação

`tests/simulator.test.mjs` cobre o catálogo, arquivos originais, validação no servidor, logos, isolamento por proprietário, conflitos de versões, criação concorrente de pedido e recuperação após falha. A suíte geral existente também cobre os fluxos de pedido, listas, complementos, produção e administração. A revisão visual conferiu o menu, temas, fontes, paleta, grafismos e conferência das quatro vistas. O fluxo autenticado de salvamento/pedido foi validado por integração com D1/R2 simulados, sem criar pedidos de teste na conta de produção.
