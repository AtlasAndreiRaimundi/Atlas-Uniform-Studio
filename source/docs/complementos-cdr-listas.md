# Complementos, CDR e lista incorporada

## Impressão

O PDF e a prévia usam o mesmo gerador. Cada ficha técnica é seguida pela lista das peças daquela ficha: ficha 1, lista da ficha 1, ficha 2, lista da ficha 2. O cabeçalho da lista contém o número do pedido e a página de origem, por exemplo `LISTA DE 0001-01-MNZ - PÁGINA 1`. A contagem física de folhas inclui fichas, listas e detalhes.

Listas longas continuam em folhas identificadas antes da próxima ficha. Detalhes técnicos excedentes permanecem no bloco da ficha correspondente. O espaço reservado ao orçamento continua vazio nas fichas técnicas; as folhas de lista usam a largura total.

As listas vêm das personalizações e grades guardadas em cada peça, preservando nomes, números, tamanhos, quantidades e adicional. Nome, número e adicional vazios são identificados como ausentes; `0`, `00` e `07` permanecem números válidos. Uma grade manual é impressa como grade sem personalização. Não se cria uma relação de atletas inexistente.

Nos kits com linhas correspondentes, uma tabela mantém os dois tamanhos em colunas independentes. Quando as personalizações divergem, as peças usam tabelas separadas. Peças avulsas não são convertidas em kits automaticamente na impressão.

## Complemento

Em **Pedidos salvos e outras ações**, abrir o pedido de origem e usar **Criar complemento deste pedido**. Informar um novo número, escolher o tipo e descrever as alterações quando houver. A cópia da lista/grade anterior é uma opção explícita, inicialmente desmarcada.

O novo pedido conserva cliente, desenhos, enquadramentos, tecidos, acabamentos e CDRs. Recebe novos IDs de pedido, páginas, peças, apontamentos e arquivos. A origem registra número, ID, revisão e versão observadas. Número, prazo, lista e nova conferência devem ser preenchidos/revisados; envio e aceite anteriores não são copiados. As alterações aparecem no pedido impresso.

O original permanece preservado. CDRs copiados têm armazenamento independente, inclusive se o pedido original for excluído posteriormente. A opção anterior de salvar uma cópia genérica foi substituída pelo fluxo de complemento. Backups JSON continuam disponíveis; importar um JSON não transporta referências privadas aos CDRs de outro pedido.

## CDR e pacote de produção

Após preencher os dados, entrar em **Conferência**, fechar a leitura ampliada e usar **Anexar CDR original**. Até dez arquivos, de até 20 MiB cada, com identificação do formato CDR clássico RIFF ou contêiner ZIP. O site guarda o original, sem converter ou interpretar o desenho do CorelDRAW. A conferência técnica inclui verificar os CDRs anexados.

Anexar/remover arquivos altera a versão salva e limpa as confirmações locais. Uma revisão conferida não aceita troca de arquivo: iniciar uma nova revisão. Remover de um rascunho mantém o arquivo de revisões anteriores. Cada referência contém nome, tamanho e SHA-256 emitidos pelo servidor. Os arquivos ficam no armazenamento privado, com autorização por pedido e revisão.

**Baixar pacote de produção (.zip)** fica disponível em uma revisão conferida com CDR. O pacote contém o PDF completo com listas, os CDRs originais e um manifesto de versão/hashes. Não inclui Excel. O navegador verifica os hashes antes de oferecer o download; falha de leitura ou divergência cancela a geração inteira. O PDF com listas também pode ser baixado separadamente.

Na fila da fábrica, **Conferir ficha** oferece **Baixar PDF com listas** e **Baixar pacote com CDR**. O pacote e seus downloads usam a versão observada; uma alteração concorrente exige atualizar. A equipe da fábrica precisa da permissão já existente e recebe somente a revisão disponível na fila. Links públicos de apresentação não dão acesso aos CDRs.

## Estrutura e validação

- Migração aditiva `0010_green_garia`: tabela de metadados `order_technical_files`, com referência ao pedido e exclusão em cascata dos metadados.
- Origem e referências da revisão permanecem no documento imutável do pedido. Metadados de CDR enviados pelo cliente são substituídos pelos registros autorizados no servidor.
- Testes cobrem isolamento entre contas, versões divergentes, bloqueio de revisão conferida, arquivos originais e hashes, revisões antigas, permissão da fábrica, limpeza após falhas, cópia independente e colisões concorrentes de número.
- Testes de impressão cobrem intercalação, agrupamento de kits, campos vazios, tamanhos independentes, paginação longa, totais e pacote ZIP sem Excel.
- Testes do controlador real cobrem criação/cancelamento de complemento e edição durante upload sem perda dos dados novos.
- PDF de seis folhas renderizado e conferido visualmente, incluindo uma lista de kit em três folhas e uma segunda ficha com sua lista própria.
