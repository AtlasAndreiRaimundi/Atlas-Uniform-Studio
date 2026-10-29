# Limpeza definitiva do catálogo — 29/10/2026

O proprietário confirmou preservar somente KIT EDGE 2027, identificador
`kit-edge-2027-mapa-v3`, com o mapa organizado e filetes 7 e 8 iguais.
Modelo e mapa preparados mantidos byte a byte; a fonte GLB original necessária
permanece em `assets/molds/kit-edge-2027/source.glb`. Não é uma segunda opção.

Os demais 61 IDs antigos foram retirados definitivamente. Seus modelos, fontes,
mapas e descritores saíram dos arquivos ativos, incluindo versões arquivadas,
camiseta clássica, polos, peças avulsas, kits de passeio/jogo e bases do simulador.
Não se trata de esconder opções com status arquivado. IDs antigos têm bloqueio
explícito para não ressurgirem por metadados persistidos ou restauração de lixeira.
Uploads futuros continuam possíveis e são independentes desta limpeza.

O pedido indicado pelo proprietário usa imagem PNG incorporada, sem referência
ao modelo 3D. O proprietário confirmou o nome do molde após essa verificação.
Nenhum pedido, lista, pasta, projeto, arte de cliente, revisão ou CDR foi removido.
Apresentações com modelos excluídos conservam os dados/miniaturas, mas perdem a
geometria 3D e precisam de novo molde. Não remapeamos automaticamente arte para
geometrias diferentes. O montador independente informa indisponibilidade até
receber nova base; dados dos uniformes salvos continuam intactos.

## Exclusão no armazenamento

`resetMoldCatalog`, no Worker, aplica uma operação única identificada por
`2026-10-29-edge-only-v1`. Uma tabela técnica guarda primeiro uma lista estável
dos IDs e chaves existentes. Remove objetos somente do prefixo `templates/`,
exceto chaves ligadas ao molde preservado, e depois remove as linhas antigas.
Não toca prefixos de projetos, pedidos, desenhos ou arquivos técnicos.

A operação é idempotente, retoma falhas e usa o mesmo snapshot em requisições
concorrentes. Ao concluir, apaga o manifesto temporário e guarda somente data e
contagens de exclusão. Não arquiva os moldes apagados. Novos uploads posteriores
não entram nessa lista e não são apagados em acessos futuros.

`scripts/remove-other-molds.mjs` permite somente os cinco arquivos necessários
ao KIT EDGE no diretório de moldes e elimina cópias temporárias de transferência.
Executar antes do build e novamente no pacote final. Arquivos legados não devem
ser reintroduzidos ao aplicar a PR pendente do ATLAS VECTOR ou outras branches.

## Validação

Testes novos cobrem catálogo único, bloqueio de restauração dos 61 IDs, limpeza
real em SQLite e storage em memória, paginação, retries, preservação dos arquivos
de pedidos/CDR e proteção de uploads posteriores. A geometria, normais, índices,
UVs e SHA-256 do KIT EDGE são conferidos contra sua fonte; os 19 painéis e os
dois filetes mantêm o mapa correto. Testes de importação futura seguem ativos.

Fixtures antes ligadas à camiseta clássica foram substituídas por PNG sintético
e pelo GLB preservado. Casos exclusivos das coleções apagadas estão marcados
explicitamente como históricos ignorados; não comprovam disponibilidade atual.
O histórico Git permanece preservado, sem reescrita; os arquivos antigos não
fazem parte da versão ativa nem do pacote publicado.

Esta limpeza não publica ATLAS VECTOR: suas PRs seguem separadas e em revisão.

Suíte final:376 testes,350 aprovados,26 ignorados (casos históricos e uma
verificação já ignorada anteriormente),0 falhas. TypeScript sem erros.
