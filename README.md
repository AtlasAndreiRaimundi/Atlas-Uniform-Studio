# ATLAS UNIFORM STUDIO

Software em desenvolvimento para criação, apresentação e gestão de uniformes esportivos.

**Responsável pelo projeto (autoria declarada):** Andrei Raimundi.  
**Status:** desenvolvimento e validação; código e documentação sincronizados com o Site v75 em 28/10/2026.

> Este repositório é privado e reúne documentação e o código-fonte real exportado do projeto em `source/`. **Snapshot canônico de 28/10/2026: 559 arquivos, Site v75, com manifesto SHA-256, testes e limites documentados.** O histórico de commits daqui não comprova, sozinho, as datas de criação de versões anteriores nem resolve a titularidade jurídica.

## Áreas do sistema
- Apresentação 3D de uniformes e exportações visuais.
- Montagem de pedidos técnicos.
- Gestão e importação de listas de personalização.
- Fluxo de conferência e integração entre módulos.
- Gestão de clientes, pastas, projetos e acessos.

Consultar [funcionalidades](docs/funcionalidades.md), [arquitetura](docs/arquitetura.md), [titularidade e riscos](docs/propriedade-intelectual.md) e [histórico](CHANGELOG.md).

## Planejamento inicial (24/10/2026)
1. Exportar o código-fonte real da versão atual do site de modo autorizado.
2. Verificar segredos, senhas, tokens, dados pessoais e materiais confidenciais antes de subir arquivos.
3. Importar o código, descrever dependências e validar execução/testes.
4. Criar tags de versão e registros de integridade (SHA-256 dos artefatos exatos).
5. Configurar workflow de documentação e verificação de integridade para novas versões.

**Aviso:** informação técnica e organização de evidências, não parecer jurídico ou registro de programa no INPI.

## Fichas técnicas de produção

As fichas CAM-001 e CAL-001 estão versionadas com o código, incluindo catálogos, listas com quantidades independentes, validações e impressão A4. Veja [implementação, testes e pendências](docs/implementacao-fichas-2026-10-26.md) e as [especificações originais](source/docs/produtos/00_LEIA_PRIMEIRO_WORK.md).

O código do pedido é gerado automaticamente no formato `0001-10-MNZ`, e a contagem impressa considera os desenhos, separando as folhas da lista. Veja [numeração e impressão](source/docs/pedidos-numeracao.md).

A montagem permite excluir páginas e começar outro pedido descartando o preenchimento. Veja [ações de edição e proteção de dados](source/docs/pedidos-edicao.md).

## Código importado e atualizações

Consulte [o relatório da importação](docs/importacao-2026-10-24.md) e [o procedimento de atualização](docs/atualizacoes-do-codigo.md). Execute `python3 scripts/restore_source.py` na raiz antes de usar o código. As verificações automáticas conferem integridade, padrões de segredos e testes críticos. Os próximos passos anteriores são preservados como planejamento inicial; a exportação e a importação foram realizadas, com limites de validação descritos no relatório.

Nas informações gerais, a composição distingue kit, peça avulsa e duas peças independentes. As modelagens masculina, Baby Look e infantil podem coexistir no pedido. Veja [composição e modelagens](source/docs/pedidos-composicao-modelagens.md).

Peças do mesmo desenho reúnem todas as modelagens na mesma aba. Aplicações físicas geram setas vinculadas por peça. Veja [agrupamento e apontamentos](source/docs/pedidos-pecas-agrupadas.md).

A montagem segue Cliente → Informações gerais → Pedido e observações → 1ª peça → 2ª peça → Personalizações e apontamentos → Lista → Conferência. Veja [fluxo guiado](source/docs/pedidos-fluxo-guiado.md).

Aplicação e seta são editadas e confirmadas juntas, sem redigitar a posição. O nome do pedido é sugerido pelo cliente. Veja [montagem guiada](source/docs/pedidos-fluxo-guiado.md).

Aplicações ficam em uma única etapa do pedido. Listas salvas podem ser anexadas ou excluídas sem apagar snapshots dos pedidos. A conferência final única abre em tela cheia após o convite da lista. Veja [montagem guiada](source/docs/pedidos-fluxo-guiado.md).

A montagem v67 prioriza as peças e exige o CDR antes da conferência final. Consulte [regras de montagem e produção](source/docs/pedido-montagem-producao-2026-10-27.md).

O orçamento automático usa o Anexo 01/2026, com desconto por cliente e nomes de exportação iniciados pelo código do pedido. Veja [cálculo, tabela e pendências](source/docs/orcamento-anexo-01-2026.md).

A revisão visual usa superfícies neutras no tema escuro e acentos dourados, com correções de espaçamento e adaptação dos painéis. Consulte [revisão visual e limites de validação](source/docs/revisao-visual-2026-10-27.md).

Seis moldes adicionais para apresentações e pedidos, com mapas organizados e geometria preservada: [documentação](source/docs/order-molds-2026-10.md).

A criação de apresentações separa camisetas e peças avulsas dos kits completos. Cada kit possui uma versão somente camiseta, com mapa próprio.

O editor permite trocar o molde na apresentação sem sair da tela, preservando arte apenas entre variantes do mesmo mapa e salvando a escolha na revisão do projeto.
