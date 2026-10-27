# Orçamento do pedido — Anexo 01/2026

Fonte: tabela de preços PDF fornecida por Andrei em 27/10/2026. Versão de cálculo `ANEXO-01-2026`. Esta instrução substitui a reserva anterior do espaço do orçamento em branco. O módulo prioriza CAM-001 e CAL-001; não presume preços de produtos fora do escopo.

## Preços base por unidade

| Peça / tecido | R$ |
| --- | ---: |
| Camiseta Dry | 59,90 |
| Camiseta Elastic / Manchester / Army | 64,90 |
| Camiseta Jacquard | 72,50 |
| Calção Dry | 54,90 |
| Calção Strech | 56,90 |
| Polo Elastic / Manchester / Army | 72,50 |

Polo usa a categoria base própria, sem somar mais uma gola premium. Golas Brasil, V e Redonda não acrescentam valor. As demais golas de camiseta acrescentam R$ 5,00. Recorte lateral acrescenta R$ 7,50 por peça; filete de manga, R$ 2,50 por peça (não por manga).

## Aplicações por ocorrência em cada peça

| Item | R$ |
| --- | ---: |
| Escudo aplique | 5,00 |
| Escudo aplique 3D | 7,50 |
| Escudo alto relevo | 10,00 |
| Termocolante tag | 1,50 |
| Termocolante brasão | 5,00 |
| Termocolante grande | 7,50 |
| Número termocolante | 15,00 |
| DTF logo pequena | 5,00 |
| DTF logo grande | 10,00 |

Marca MEINERZ em TPU permanece gratuita conforme a ficha de produção. O preço de aplique 3D, o tamanho de DTF e o tipo de termocolante são escolhas comerciais; a aplicação técnica e suas setas são preservadas. A etiqueta oficial termocolante usa tag por padrão. Alto relevo usa R$ 10,00 por ocorrência, exceto a marca gratuita.

## Cálculo e pendências

1. Somar base do tecido/categoria, gola, recorte, filete e cada aplicação × ocorrências por peça.
2. Aplicar o desconto percentual ao unitário completo (incluindo os adicionais).
3. Arredondar o unitário em centavos, metade para cima; multiplicar esse valor pela quantidade.
4. Somar as linhas do pedido. Kits preservam as quantidades independentes de camiseta e calção, inclusive baby look e infantil. Nenhum preço infantil diferente foi fornecido.

O desconto fica em `document.pricing.discountBps` (100 = 1%). Zero não imprime aviso; valor positivo imprime que já está aplicado. Preços e desconto usam inteiros em centavos/pontos-base e são validados no servidor; o cálculo percentual usa inteiros grandes para não perder precisão.

Abstrat, Hibisco, Solutio, Flex e demais tecidos sem correspondência expressa no anexo ficam A DEFINIR. Flex não é tratado como Strech por suposição. Filete de calção e bordado sem preço também exigem informação manual. Preço base e filete do calção admitem valor informado; DTF/termocolante exigem escolher categoria/tamanho. Pendências não bloqueiam rascunhos, mas impedem a conferência final. O orçamento aparece na etapa Lista e atualiza automaticamente com alterações técnicas/quantidades. Alterar preço/desconto invalida as conferências como qualquer edição do pedido.

A tabela é versionada. Em futuras alterações de preço, preservar o cálculo de `ANEXO-01-2026` e criar nova versão, para não recalcular silenciosamente as revisões antigas. Revisões protegidas sem orçamento não são modificadas automaticamente.

## Impressão e arquivos

Orçamento no retângulo inferior esquerdo da ficha A4 horizontal, sem reduzir a área das peças. Campos: quantidade, descrição, unitário líquido e total. Até quatro linhas por desenho; excedentes aparecem nos dados complementares. Pedidos com múltiplos desenhos mostram o subtotal do desenho e o total do pedido, quando couber; listas permanecem intercaladas após cada desenho.

Código ampliado no cabeçalho à direita, com redução automática apenas para códigos longos. PDF, SVG, dados, ZIP e CDRs baixados começam com `código - cliente - nome do pedido`. Sufixos identificam folha, arquivo técnico e manifesto. Nomes são sanitizados e limitados para compatibilidade; o CDR original mantém bytes, hash e nome original no manifesto. O arquivo enviado pelo cliente não é regravado nem convertido.

Cadastros antigos com gola, recorte ou filete descritos em texto livre exigem aplicar a ficha técnica ou informar o preço base já incluindo esses acabamentos. O sistema não considera automaticamente que um acabamento antigo é gratuito. Aplicações físicas continuam sendo somadas separadamente.
