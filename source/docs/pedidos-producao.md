# Pedidos de produção MEINERZ

Referências visuais: `LAYOUT 2025 - MEINERZ.cdr` e o pedido preenchido 7003-02-MNZ da ADEMA. Os arquivos originais permanecem fora dos arquivos públicos do site.

## Contrato da folha

O documento tem 297 × 210 mm, na horizontal. A marca, o título PEDIDO, o número e a contagem de folhas ficam no cabeçalho. Etiqueta/destaque, técnicas e tipo de pedido ocupam os três quadros logo abaixo. A área de mockups fica à esquerda. A coluna direita mantém contato/telefone, cliente, telefone, cadastro, condição de pagamento, controles N/E, datas, transporte, vendedor e especificações de cada peça.

Por peça: produto (inclusive personalizado), modelo/molde, tecido, cor do tecido, cor dos detalhes, técnica de estampa, quantidade, grade, componentes, materiais, acabamentos, posições, observações e lista de personalização. Há até duas colunas técnicas por folha. Peças individuais são o padrão; avulsas e conjuntos dependem de escolha explícita. Quantidades de peças nunca são multiplicadas automaticamente como se fossem kits.

As quantidades usam grupos verticais, por exemplo:

```text
QUANTIDADES:
CAMISETA
P = 2
M = 4

BABY LOOK
P = 1

INFANTIL
TAM 10 = 1
```

A área inferior esquerda onde havia o orçamento permanece inteiramente branca no PDF e no SVG: sem tabela, valores, linhas, título ou instrução. O lembrete de conferência e a assinatura ficam ao lado. Amostra do cliente, pedido anterior e arte-finalista permanecem na base da coluna direita.

O documento usa Chakra Petch regular/semibold incorporada ao PDF. Os SVGs incluem a fonte e imagens por dados embutidos. A identidade e as artes dos produtos não são redesenhadas. Os mockups podem ser enviados manualmente ou aproveitados da imagem salva de um projeto; não se exige um modelo 3D para preencher a ficha. A distribuição dos mockups pode empilhar as peças com frente e costas lado a lado, ou mostrar peças em blocos lado a lado.

## Operação

- Menu **Pedidos de produção**, rota `/pedidos`.
- Botão **Gerar pedido técnico** no organizador transfere a lista, respeitando os tamanhos independentes de camiseta e calção ou jaqueta e calça. Números conservam zeros à esquerda.
- Páginas podem ser criadas, duplicadas, reordenadas e removidas. Adicionar uma peça avulsa não cria um conjunto.
- Divergências de quantidade, grade ou personalização bloqueiam as exportações. Uma grade inválida não é ignorada.
- Textos, componentes e grades que excedem o espaço seguem integralmente em folhas complementares numeradas; não são cortados nem têm fontes reduzidas sem limite. Listas de nomes seguem em complemento.
- O PDF contém texto vetorial e fontes incorporadas. O SVG da folha selecionada pode ser aberto no CorelDRAW para edição e inserção do orçamento. Não há geração de CDR nativo nesta implementação.

## Conservação dos pedidos

Pedidos salvos usam dados no D1 e o documento completo com imagens no R2. Toda operação exige a identidade autenticada e verifica a propriedade do pedido. Atualizações usam versão esperada para impedir sobrescrita entre abas. Objetos anteriores são conservados, sem exclusão durante o salvamento.

Há rascunho no IndexedDB separado por conta, salvamento automático no estúdio após alterações e botões para salvar, abrir e baixar/importar uma cópia JSON. Um erro de rede ou conflito não confirma um salvamento nem descarta o rascunho. **Salvar como novo** permite conservar uma cópia após um conflito.

As conversas não são a única fonte da definição: este documento, o renderizador e os testes fazem parte do repositório do Site.
