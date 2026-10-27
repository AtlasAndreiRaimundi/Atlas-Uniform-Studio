# Revisão visual — 27/10/2026

## Paleta

O tema escuro agora declara todos os tokens compartilhados em `interface-theme.css`: fundos, navegação, painéis, campos, divisórias, texto e estados. Superfícies principais usam RGB neutro (R=G=B); dourado é reservado a destaques e seleção. Alertas preservam cores semânticas. Cinza e claro mantêm suas próprias variáveis. O teste existente de contraste passa a incluir o escuro, exigindo pelo menos 4,5:1 em texto, rótulos, ações e alertas.

A capa deixou os verdes/olivas fixos: fundo e cartões neutros, acentos dourados e composição fotográfica monocromática por CSS. Somente as imagens decorativas da capa recebem o tratamento; as texturas do uniforme, paletas dos clientes, iluminação 3D e arquivos impressos não são alterados.

## Correções

- Orçamento: margem interna coerente com o formulário, desconto com rótulo acima do campo, controle de largura, linhas/totais legíveis e tabela com rolagem própria em telas estreitas.
- Botões de ação: quebra de linha em barras extensas, textos sem extrapolar cartões e rodapé de etapas adaptável.
- Campos: filhos de grades podem encolher; controles respeitam a largura disponível.
- Arquivos técnicos: nomes longos quebram sem deslocar o botão de remoção.
- Listas: barras de ações e busca adaptáveis, espaçamento dos botões e título/seletores alinhados no início.
- Projetos: títulos longos não forçam expansão da grade; layout de lista mantém os mesmos pontos de quebra.
- Simulador: fundo da interface neutro, cabeçalho adaptável e caixa de edição de grafismo sem sobrepor a biblioteca ao rolar.
- Modais: limites de largura/altura da janela e rolagem interna; botões de fechar não comprimidos.
- Capa: rodapé e chamada de entrada separados nas regras de telas menores.

## Verificação e limites

Inspeção visual no navegador da capa, pedido de exemplo, criador de listas e editor isolado do simulador; medidas de caixas e largura da página via DOM. Revisão do CSS compartilhado também alcança projetos, acompanhamento, perfil, propostas, referências técnicas e apresentação. Telas com dados de conta não foram preenchidas nem tiveram registros modificados; não se afirma inspeção visual de todos os estados autenticados. A prévia de desenvolvimento foi configurada com o perfil managed-linux e teve o bloqueio local de inicialização antigo removido, sem alterar autenticação ou permissões do site.
