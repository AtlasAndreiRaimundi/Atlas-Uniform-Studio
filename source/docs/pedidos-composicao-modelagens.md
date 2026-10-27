# Início do pedido e modelagens no mesmo pedido

Atualização de 27/10/2026.

## Primeira escolha

Um pedido novo começa pela pergunta **O que vamos montar primeiro?**, sem alternativa marcada previamente. Dados do cliente e demais campos aparecem após a escolha:

1. **Kit**: camiseta e calção, jaqueta e calça, polo e bermuda; permite também selecionar outra combinação dos tipos disponíveis.
2. **Peça avulsa**: uma peça, com suas modelagens e quantidades.
3. **2 peças independentes**: dois itens com dados próprios, sem associação automática de kit.

`compositionKind` registra a escolha no documento JSON. A opção de duas peças usa `avulsas`, com IDs e desenhos independentes, sem `kitGroupId`. O kit mantém esse vínculo. Os seletores iniciais permitem mudar enquanto a composição estiver vazia; não apagam peças já configuradas. Pedidos antigos continuam legíveis e têm sua composição inferida sem exigir uma nova escolha.

## Modelagens

O seletor exclusivo Masculina / Baby Look / Infantil foi substituído por caixas de seleção **Modelagens deste desenho · marque uma ou mais**. As três podem existir juntas no mesmo pedido. As abas identificam peça e modelagem, e o cabeçalho diferencia tipos de peça de configurações.

Cada modelagem continua tendo um registro técnico próprio, com quantidade, grade, nomes, molde e acabamentos. Isso preserva as regras de molde do calção, botões, aplicações infantis e demais restrições das fichas. Adicionar outra modelagem preserva a imagem e o desenho, mas não duplica atletas, quantidades, instruções de tamanho especial ou aplicações físicas. As novas quantidades começam em zero. A remoção fica bloqueada enquanto aquela modelagem tiver grade ou personalização; o usuário deve revisar a lista primeiro.

A importação de lista identifica as modelagens pelos campos e tamanhos, distribui os itens nas configurações correspondentes e preserva o desenho e o tecido já configurados. Quando acrescenta uma modelagem ao mesmo desenho, cria sua configuração sem copiar quantidades da anterior. Reimportar a mesma lista atualiza os mesmos IDs.

## Tipos de peça e fichas

Camiseta e calção continuam obrigatoriamente vinculados às fichas CAM-001/CAL-001 e suas validações. Os demais tipos disponíveis têm preenchimento técnico manual explícito (`manualTechnical`), para permitir os kits jaqueta/calça e polo/bermuda sem inventar catálogos de tecidos ou acabamentos homologados. O marcador manual não substitui uma ficha cadastrada para camiseta ou calção; tentativas são rejeitadas pelo servidor.

Pedidos exclusivamente com produtos do catálogo usam a lista com os campos técnicos atuais. Kits que incluem produtos de preenchimento manual usam o modelo compatível de lista, com os nomes corretos das peças. Duas peças independentes não viram kit apenas por conter camiseta e calção.

## Verificação

Testes cobrem a primeira pergunta, as três opções, os três kits, persistência e abertura da lista, seleção simultânea das modelagens, preservação de quantidades e imagens, bloqueio de remoção com dados, importação/reimportação mista, moldes independentes por modelagem e proteção das fichas cadastradas. Conferência no navegador inclui o início do pedido, mudança de kit e três modelagens marcadas juntas.
