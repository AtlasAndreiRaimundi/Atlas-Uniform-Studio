# Ajustes de montagem e produção — 27/10/2026

Decisões expressas do responsável pelo sistema, posteriores às fichas originais de 26/10/2026:

- Filete costurado da camiseta sempre usa o mesmo tecido principal, inclusive Elastic. Substitui a antiga regra de Dry e a exceção de ribana. A interface não pede um material de filete separado; rascunhos antigos são atualizados para a nova regra ao editar/salvar. O histórico de revisões permanece guardado.
- Recortes iniciam com Fluence quando ativados ou quando um molde com recorte é escolhido. É possível escolher o mesmo tecido da peça quando necessário; escolhas anteriores não são alteradas só por abrir o pedido.
- Nomes de peças são derivados do tipo, gola, molde e recorte; não é exigida redigitação do nome do modelo. A cor de gola pronta é mostrada pelo nome informal, mantendo IDs internos estáveis.
- Vincular uma apresentação cujo molde está cadastrado como conjunto reconhece o kit e suas duas peças, usando uma imagem compartilhada. Dados e quantidades já preenchidos são preservados. Apresentações de uma peça não são classificadas como kit apenas pelo nome do projeto.
- A área das peças não é reduzida para uma ficha textual. Acabamentos essenciais aparecem na coluna de informações; somente exceções e conteúdo que realmente não cabe seguem para detalhes. Margens transparentes vazias são retiradas da cópia da imagem anexada ao pedido. O projeto e o CDR originais permanecem preservados.
- A edição de imagem/apontamentos não aparece nas etapas de configurar as peças. Ajustes e setas ficam na etapa Aplicações e setas. Textos das setas usam fundo branco de proteção contra linhas sobre as letras, tanto no SVG quanto no PDF.
- Técnicas marcadas no cabeçalho são derivadas da estampa, aplicações, componentes e extras presentes no pedido. Remover a aplicação remove a indicação automática correspondente quando não houver outra fonte.
- Depois da Lista, há uma etapa CDR do desenho. Pelo menos um CDR original pertencente ao pedido é obrigatório para registrar uma nova conferência final; a validação também ocorre no servidor. Rascunhos continuam podendo ser salvos antes do arquivo. Consulta de revisões antigas permanece disponível.
- Após concluir a conferência única, o sistema oferece baixar o pacote PDF com listas incorporadas + CDRs da mesma revisão. O envio à fábrica continua separado.

As especificações originais estão preservadas em `docs/produtos`. Este adendo prevalece sobre as regras antigas de material do filete.

## Simplificação do quadro lateral
O quadro Estampa e aplicações mostra apenas a técnica de estampa (TRANSFER apresentado como SUBLIMAÇÃO) e os tipos de aplicações físicas. Corte, filete, gola, recorte e acabamento de barra não são repetidos nesse quadro. A cor do cordão aparece na linha de aplicações da peça, inclusive quando o calção não tem aplicação física. Os dados técnicos de cadastro são preservados.

## Encerramento sem resumo geral
A conferência e os arquivos exportados não incluem a folha final de resumo geral de kits e avulsos nem o quadro redundante de resumo geral na tela. Cada desenho mantém as próprias quantidades e listas; o orçamento permanece no layout. Dados complementares efetivamente necessários continuam preservados.
