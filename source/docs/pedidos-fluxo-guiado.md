# Montagem guiada do pedido

Sequência: Cliente → Informações gerais → Informações sobre o pedido e observações → 1ª peça → 2ª peça (quando houver) → Personalizações e apontamentos → Lista → Conferência geral.

A escolha de kit, peça avulsa ou duas peças independentes está nas informações gerais. Cada peça mantém modelo, tecido, arte e acabamentos. Adulto, Baby Look e infantil continuam na mesma família, com seletor interno para restrições e exceções.

Aplicações físicas ficam numa etapa comum, com seleção da peça. Adicionar aplicação gera as setas vinculadas e abre o editor A4 para posicionar; o botão de posicionar permite voltar. Edições preservam posições e apontamentos livres. As restrições das fichas técnicas permanecem vigentes.

A lista vinculada preenche automaticamente quantidades e grades no layout. Não há formulário duplicado de quantidades na sequência das peças. O retorno da lista abre a etapa Lista, com resumo das quantidades aplicadas. A conferência continua explícita, protegida pelas validações existentes; não envia à fábrica automaticamente. Arquivos CDR, pacote de produção e envio continuam após o preenchimento e conferência.

Pedidos existentes, páginas adicionais, edição de rascunhos e revisões protegidas permanecem disponíveis. Navegação não altera dados nem dispara conferência automaticamente.

## Aplicações e setas em uma confirmação

O botão Adicionar aplicação e seta abre um rascunho isolado com tipo, quantidade e prévia no mesmo editor. Selecionar outro tipo ou quantidade atualiza as setas em tempo real. OK salva aplicação e apontamentos juntos; cancelar não altera o pedido. Confirmar a seta preenche a posição como “Conforme seta no desenho”, dispensando a digitação repetida. A observação textual é opcional. Aplicações antigas sem posição podem ser abertas e confirmadas pelo mesmo fluxo.

A criação e edição mantêm as regras de produto e modelagem. TPU infantil continua exigindo justificativa; a marca Meinerz continua limitada a uma por camiseta. A posição geométrica é preservada ao reabrir. O editor de imagens fica recolhido durante aplicações, e os controles de desenho livre ficam separados das opções essenciais da seta.

O nome do pedido é sugerido pelo cliente, mas um nome personalizado nunca é substituído automaticamente. As quantidades continuam derivadas da lista.


## Aplicações do pedido e conferência única

Aplicações ficam exclusivamente na etapa Aplicações e setas, em uma lista única de todo o pedido. A peça de destino serve ao cálculo de produção e ao vínculo da seta; não há menus de aplicações dentro da primeira ou segunda peça. A escolha da aplicação e o posicionamento continuam na mesma confirmação.

Setas de aplicações distintas não são fundidas apenas por terem o mesmo tipo. Modelagens equivalentes mantêm a confirmação da mesma aplicação sem pedir sua posição novamente. Ao aplicar o layout geral do kit, todas as setas correspondentes no desenho têm sua indicação registrada; no editor de uma aplicação, somente aquela aplicação é confirmada. Setas antigas que foram posicionadas e salvas podem recuperar a indicação de posição sem redigitação. Uma seta de camiseta não é tomada como seta de calção.

Depois de anexar uma lista e completar os dados obrigatórios, um convite pergunta se é hora da conferência final. Só a escolha Revisar abre a tela cheia. A tela reúne desenhos e listas do pedido com navegação por todas as folhas. O único botão Conferi tudo confirma arte, lista e dados técnicos juntos, preservando as validações e registrando a revisão. O envio à fábrica continua sendo uma ação posterior. Alterações no pedido invalidam a conferência e convites antigos. Não há conferências individuais de peça ou confirmação intermediária da importação de lista.


## Listas salvas

A etapa Lista mostra nome, número de itens e situação das listas salvas. Listas prontas podem ser anexadas diretamente; rascunhos abrem no organizador. A exclusão pede confirmação identificando a lista e exige proprietário e versão atuais. Listas excluídas saem das listagens e não aceitam leitura ou gravação posterior; os objetos e registros são preservados como tombstones. Dados já incorporados ao pedido permanecem no seu snapshot, inclusive nas revisões conferidas. Uma nova lista vinculada ao mesmo pedido usa uma identidade diferente para impedir que uma aba antiga sobrescreva a substituta.

A exclusão também está disponível na biblioteca do criador de planilhas. Migração aditiva: `0013_empty_power_man` (`order_lists.deleted_at`).
