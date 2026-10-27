# Código e identificação dos desenhos do pedido

Atualização de 27/10/2026.

## Contagem impressa

O indicador abaixo de PEDIDO conta os layouts de desenho gerados, independentemente do total de folhas do PDF. Um desenho e duas folhas de lista exibem **1 de 1** nas três folhas. Três desenhos exibem **1 de 3**, **2 de 3** e **3 de 3**; cada lista e continuação técnica mantém o número do desenho a que pertence.

As folhas da lista têm sua própria contagem no rodapé, por exemplo **LISTA 2 DE 2 · DESENHO 1**. O resumo geral de produção não ganha número de desenho. O seletor e a conferência ampliada identificam o desenho e a folha da lista separadamente. A contagem de desenhos considera os grupos realmente impressos, incluindo desdobramentos por configuração técnica.

O código fica alinhado à extrema direita do cabeçalho, sobre a coluna de informações. A posição anterior permanece em branco. SVG, PDF, miniaturas e pacote de produção usam a mesma composição.

## Código gerado pelo servidor

Formato atual: **0001-10-MNZ**.

- `0001`: identificação sequencial, com quatro dígitos.
- `10`: mês da primeira gravação, pelo horário de São Paulo.
- `MNZ`: unidade industrial atual, configurada pelo servidor; independente da marca ATLAS do software.

O código aparece no primeiro salvamento. Até lá, o campo informa que será gerado ao salvar, sem simular uma reserva. O servidor devolve o código, e a tela o aplica à prévia e ao rascunho local. Pedidos iniciados pelo simulador, importações e complementos usam a mesma regra. Um complemento recebe outra identificação, preservando a referência ao código original; o mês não é incrementado como se fosse a identificação.

O código de um pedido já salvo permanece igual ao editar dados, datas ou iniciar uma revisão. Códigos antigos não são substituídos. Pedidos antigos sem código o recebem na próxima gravação editável. Importar uma cópia cria outro pedido com nova identificação.

## Persistência e concorrência

A migração aditiva `0012_tiny_rhino.sql` cria apenas `production_order_sequences`. Uma instrução atômica reserva a sequência por unidade, acima dos identificadores existentes com esse sufixo. A reserva é global à unidade, inclusive entre contas e solicitações simultâneas. A sequência continua na mudança de mês e nunca reutiliza identificadores de pedidos excluídos.

A reserva pode deixar intervalos se a gravação posterior falhar; números não voltam ao conjunto disponível. Ao atingir 9999, a criação exige configuração de uma nova série/unidade: não há reinício silencioso ou quinto dígito. Não há interface pública para editar o sufixo ou o contador. Novas unidades deverão ser configuradas no servidor com sua própria sequência.

## Verificação

Testes cobrem concorrência entre contas, virada de mês em São Paulo, códigos legados, alteração de datas, tentativa de sobrescrita, importação, exclusão, unidades e limite de quatro dígitos. A impressão cobre um desenho com duas folhas de lista, três desenhos com continuações, resumo, miniaturas, alinhamento SVG/PDF e propagação do código à tela durante salvamento com edições em andamento.
