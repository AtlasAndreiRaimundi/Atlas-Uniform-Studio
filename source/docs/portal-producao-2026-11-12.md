# Portal de Produção · Meinerz / Adiprime (12/11/2026)

## Operação

- Ao montar o pedido, o designer seleciona **MEINERZ** ou **ADIPRIME** em Informações gerais.
- A conferência final (**Aprovar para produção**) grava a revisão e a publica automaticamente na fila da indústria escolhida. O envio manual foi removido do caminho normal.
- **Meus pedidos / Pedidos aprovados** permanece para o dono; **Central de produção** atende funcionários das fábricas. PDF, lista incorporada e ZIP com CDR têm downloads autenticados.
- O dono escolhe a indústria de pedidos antigos já conferidos, antes de torná-los visíveis à fábrica. Pedidos antigos sem indústria ficam fora das duas filas.
- Ao aceitar o pedido, a fábrica confirma o recebimento. Devolução exige justificativa; o designer pode iniciar uma nova revisão após devolução. Download não equivale a início de fabricação.
- A administração pode transferir um pedido ainda pendente de uma indústria para outra; a empresa anterior perde acesso imediatamente. Pedidos aceitos não podem ser transferidos.

## Controle de acesso

- Tabela `factory_memberships` concede permissões explícitas, **por usuário e por indústria**, administradas na aba de acompanhamento. O antigo campo booleano `profiles.factory_access` não autoriza mais acesso: migração não concede permissões implícitas.
- Toda listagem, detalhe, miniatura e rota técnica de download checa a mesma relação de permissão no servidor. Alterar query strings ou abrir links copiados não permite consultar pedidos da outra indústria.
- O administrador identificado em `ADMIN_USER_ID` pode consultar as duas indústrias e autorizar usuários.
- Downloads PDF/ZIP pelo portal e CDRs pela rota de arquivos geram eventos `factory_download_events`. PDF e ZIP são gerados no navegador, portanto um evento indica que o navegador solicitou o download, não comprova que o arquivo foi salvo nem que a produção começou.

## Persistência e implantação

- Migration aditiva: `0016_factory_queues.sql` cria `production_orders.factory_id`, `factory_memberships` e `factory_download_events` sem excluir pedidos antigos. Não há concessão automática de acesso a partir do campo legado.
- **Aplique a migration 0016 no D1 hospedado antes de publicar o código**, para evitar erros por tabela/coluna inexistentes.
- Após migrar, o administrador precisa autorizar cada funcionário nas indústrias correspondentes. Verifique com duas contas de teste que nenhuma indústria lê arquivos da outra, e teste a transferência e revogação.
- Para publicar, execute os testes, TypeScript e build com as dependências do projeto, além de conferir visualmente a tela de pedido e a central. Nenhuma migração nem publicação de produção é executada por este commit no GitHub.
