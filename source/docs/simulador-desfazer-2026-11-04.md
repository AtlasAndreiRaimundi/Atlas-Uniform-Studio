# Desfazer e refazer no simulador — 04/11/2026

Ctrl+Z (ou Cmd+Z) desfaz a última edição concluída. Ctrl+Y, Ctrl+Shift+Z e Cmd+Shift+Z refazem. Os botões do cabeçalho usam a mesma restauração do histórico de até 40 estados por sessão.

O atalho agora funciona com foco em controles não textuais, incluindo sliders. Campos de texto/número, seletores, conteúdo editável, composição de texto e diálogos mantêm seu comportamento nativo. Repetição ao segurar a tecla é ignorada. Operações assíncronas e gestos em andamento não são interrompidos.

A restauração recupera o estado completo, incluindo alterações simétricas, atualiza a visualização e agenda o salvamento local. Não desfaz pedidos já gerados nem grava automaticamente na conta; salvar o uniforme continua explícito. O histórico é reiniciado ao abrir outra criação ou começar um uniforme novo.

Validação: 22 testes aprovados de atalhos, histórico, camadas e simetria. Testes verificam foco em controles, proteção da digitação, agrupamento do movimento espelhado, redo e descarte da ramificação ao editar após desfazer. A interação WebGL pelo teclado no navegador não foi verificada neste ambiente.
