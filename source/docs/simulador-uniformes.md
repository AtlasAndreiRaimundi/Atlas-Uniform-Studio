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

## Guia de primeiros passos

Após carregar o criador, o primeiro acesso de cada conta/navegador recebe o convite **Quer aprender a criar seu uniforme?**, com **Sim, quero aprender** e **Agora não**. O botão **Como usar** no cabeçalho reabre o convite a qualquer momento. A preferência fica no armazenamento local, separada por conta; falhas nesse armazenamento não interrompem o editor.

O guia tem 12 etapas: modelo/peças, seleção de painel, visualização, cores, substituição/adição de grafismos, ordem de camadas, ajustes, textos, logos/qualidade, cópia/simetria, salvamento/histórico e conferência/apresentação/pedido. Ele abre a aba da ferramenta e destaca o controle real; Voltar/Próximo, setas do teclado, Pular e Escape permitem navegar ou sair. Os textos explicam JOGADOR/00, proporção travada, prioridade da identidade e simetria ativa com cores independentes.

O guia não chama operações de edição, salvamento de uniforme, criação de pedido ou apresentação. Ao sair/concluir, restaura a ferramenta e a rolagem anteriores. Não altera peças, camadas, cores, seleção, histórico ou câmera. O realce acompanha rolagem e redimensionamento e o cartão mantém a navegação dentro da tela. `tutorial.js`/`tutorial.css` isolam o comportamento e `tests/simulator-tutorial.test.mjs` verifica posicionamento e persistência tolerante a falhas.

## Grafismos por camada e prioridade de identidade

A biblioteca troca o grafismo em edição a cada escolha, preservando ID, cor, posição, tamanho, rotação, opacidade, inversão e vínculo de simetria. O seletor **Grafismo em edição** e a lista **Grafismos** identificam qual camada será trocada; quando uma logo/texto está selecionada, vale o último grafismo editado daquele painel (ou o superior existente). Em um painel sem grafismos, a primeira escolha cria uma camada. **Adicionar outro grafismo** prepara uma única nova camada; depois da escolha, os próximos cliques voltam a substituir. Cancelar, mudar de painel, selecionar um elemento ou abrir outro uniforme encerra essa intenção de adicionar. Grafismos fixados exigem desfixar antes da troca.

O inspetor separa **Escudos e personalização** e **Grafismos**, mostrando a ordem de cima para baixo. Todos os escudos, logos PNG/SVG e textos (incluindo JOGADOR/00) permanecem acima de todos os grafismos. Subir/Descer atua apenas dentro do grupo escolhido. `layers.js` define a ordem estável usada pelo pintor compartilhado, seleção por clique, validação/salvamento e mapas de apresentação; a prioridade também vale para desenhos antigos, independentemente da ordem original de suas camadas.

## Cópia e simetria opcional entre lados

O botão **Copiar entre lados / simetria**, abaixo de Elementos do painel, abre dois modos, com origem, destino e prévia 2D: **Cópia única** e **Tempo real**. Os pares são mangas, filetes de manga, lados do calção e recortes laterais, filtrados pelas peças em uso. Nos novos uniformes, a simetria começa ligada nos quatro pares, espelhando grafismos e mantendo cores/fundos independentes. Ao editar um painel de um par ativo, um lembrete abaixo da seleção identifica o par e o outro painel; **Desligar simetria** desativa somente aquele par imediatamente. Uniformes já salvos preservam suas configurações, inclusive pares desligados, sem aplicar o padrão novamente ao abrir ou recarregar.

Na cópia única, a pessoa pode espelhar horizontalmente ou manter as posições proporcionais; preservar as cores dos elementos equivalentes no destino, copiar as cores da origem ou escolher outra cor; selecionar camadas; copiar o fundo opcionalmente; atualizar/adicionar ou substituir todos os elementos do destino. Elementos novos sem equivalente usam a cor da origem quando a opção é preservar cores. As cópias têm camadas e identificadores independentes.

Em Tempo real, a prévia mostra o desenho que será usado para iniciar/atualizar o par. É possível sincronizar somente grafismos ou todos os elementos. Cores dos detalhes e fundos são independentes por padrão, com caixas separadas para ligá-los também. Mover, redimensionar, girar grafismos, adicionar, excluir e reorganizar elementos em qualquer lado atualiza o outro nos eventos de entrada, inclusive antes de terminar o gesto. Novos elementos começam com a cor da origem; equivalentes mantêm sua cor quando as cores são independentes. As logos PNG/SVG mantêm as cores do próprio arquivo.

O painel mostra quais pares estão ligados. **Desligar atualização deste par** preserva o desenho e as cores dos dois lados. As configurações por par e os equivalentes persistem ao salvar/reabrir. Desfazer/Refazer restaura também a ligação; pedidos mantêm sua cópia congelada da versão conferida. Uma cópia única com opções diferentes exige desligar antes o tempo real daquele par.

O espelhamento usa o UV local normalizado do KIT ELITE 27 e reflete posições/grafismos, preservando o sentido de leitura de textos e logos. JOGADOR/00 permanecem retos e com proporção travada. O controle de inversão horizontal aparece somente para grafismos. A geometria do molde não é alterada; a prévia orienta conferir as posições no 3D, inclusive em painéis com dimensões físicas diferentes.

`public/simulador/symmetry.js` contém as operações de cópia e sincronização; `symmetry-ui.js` controla as duas opções e as prévias. A validação do servidor aceita somente os pares/configurações aprovados e mantém os limites de camadas e tamanho. O renderizador compartilhado preserva os grafismos espelhados também nos mapas usados para apresentação.

`tests/simulator-symmetry.test.mjs` cobre edição bidirecional durante gestos, cores independentes ou compartilhadas, grafismos/todos, novas camadas, remoção, ordem, desligar, Desfazer/Refazer, quotas, legibilidade e salvamento/reabertura/pedido.

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
