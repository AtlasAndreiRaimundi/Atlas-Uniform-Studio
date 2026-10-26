# Páginas e novo preenchimento de pedidos

Atualização de 26/10/2026. Mantém as fichas técnicas, impressão A4, listas, apresentações e bloqueios de revisões existentes.

## Ações visíveis

- **Novo pedido** fica no cabeçalho da montagem, junto ao salvamento. O atalho **Criar pedido** do menu lateral usa a mesma ação quando o montador já está aberto.
- **Excluir página** fica junto ao indicador e à seleção de páginas, na etapa Peças e kits. A confirmação identifica a página e as peças/quantidades afetadas.
- A única página também pode ser excluída: uma página vazia é criada no lugar, preservando os dados gerais do pedido. O documento permanece válido com pelo menos uma página.

## Descartar e começar outro

Quando há preenchimento, a confirmação oferece **Continuar editando** ou **Descartar e começar novo**. Um formulário já vazio pode começar diretamente. A ação limpa os campos, páginas, imagens, personalizações, lista incorporada, vínculo de apresentação, arquivos técnicos e prévia PDF do formulário aberto. Retorna à primeira etapa, sem ID/versão do pedido anterior e com os responsáveis da conta preenchidos.

Descartar não inicia um salvamento do preenchimento antigo e não depende de ele estar válido. Um pedido que já foi salvo permanece em Meus pedidos; sua exclusão da conta é uma ação separada e identificada. Listas e apresentações independentes não são apagadas. Essa distinção aparece na confirmação.

O acesso direto com `?new=1`, quando recupera um rascunho, oferece a mesma escolha. Integrações com lista/apresentação mantêm sua conferência e seu fluxo próprios.

## Concorrência e proteção

Uma requisição de salvamento já enviada termina antes da troca, para que sua resposta não associe o ID antigo ao novo formulário. Novos salvamentos automáticos ficam suspensos enquanto se decide descartar. Os timers antigos são cancelados; gravações locais são serializadas e o formulário limpo é a última gravação desta tela, evitando recuperar conteúdo descartado no recarregamento.

A exclusão de página confirma o ID da página e a revisão do documento, em vez de depender de qual aba estava selecionada depois. Alteração do pedido durante a confirmação exige nova conferência. Imagens, apontamentos e lista impressa daquela página deixam o documento; a cópia PDF anterior é invalidada. Páginas de revisões conferidas/enviadas/aceitas ou históricas continuam protegidas. Durante uma operação de arquivo técnico ou navegação à lista, as ações aguardam sua conclusão.

## Verificação

31 testes de fluxo da tela aprovados, incluindo nove novos casos: visibilidade/cancelamento, exclusão seletiva e impressão, única página, revisão bloqueada ou trocada, cancelamento sem salvar, descarte após conflito, salvamento em andamento/duplo clique, ordem das gravações locais e navegação com recuperação de rascunho. A validação no navegador confere os botões, confirmações e o retorno ao formulário vazio.
