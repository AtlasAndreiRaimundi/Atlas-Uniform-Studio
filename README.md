# ATLAS UNIFORM STUDIO

Plataforma de Andrei Raimundi para criação de uniformes, apresentações, pedidos e orçamentos.

**Produção: v90 — 04/11/2026.** Fonte sincronizada em `source/`,524 arquivos com manifesto SHA-256. Autoria declarada: Andrei Raimundi; direitos reservados.

## Módulos

- **Orçamentos:** camiseta + calção, componentes, valor por kit, quantidade, desconto, vendedor obrigatório e apresentação opcional. Salvar, reabrir, excluir e conferir para imprimir/salvar PDF, sem exigir pedido ou desenho.
- **Apresentações:** arte aplicada ao KIT EDGE2027, quatro vistas e exportações do estúdio.
- **Pedidos:** fichas técnicas, listas, aplicações, apontamentos, arquivos CDR e conferência de produção.
- **Criador de planilha:** importação e organização de listas independentes ou vinculadas.
- **Simulador:** reativado com o único molde retido KIT EDGE2027;19 painéis. WebGL para edição e quatro vistas; alternativa2D local sem aceleração gráfica.

O catálogo continua com somente KIT EDGE2027. Moldes antigos permanecem excluídos; pedidos e artes incorporadas são preservados. Dados salvos de outra base não são convertidos silenciosamente.

**ATLAS VECTOR BETA** permanece nas PRs separadas #26 (Studio) e Atlas-Vector#1. Não está publicado nem habilitado: depende de serviço Python externo. Esta versão não incorpora o VECTOR.

## Central de Produção · Meinerz / Adiprime

Aprovações novas com indústria selecionada entram automaticamente na fila correspondente. Usuários autorizados acessam somente a indústria atribuída; as permissões são individuais e o histórico de downloads é registrado. Pedidos antigos sem destino permanecem privados até classificação. A migração **0016** precisa ser aplicada no D1 antes da atualização do Site. [Orientações de implantação](source/docs/portal-producao-2026-11-12.md).

## Implementação e validação

[Orçamento e simulador EDGE](source/docs/orcamentos-2026-10-31.md) · [Tabela de preços](source/docs/orcamento-anexo-01-2026.md) · [Limpeza do catálogo](source/docs/mold-reset-2026-10-29.md) · [Histórico](CHANGELOG.md).

Validação histórica v89 — 384 testes locais:359 aprovados,25 históricos ignorados,zero falhas. TypeScript e build oficial aprovados. Navegador: cálculo, desconto e conferência com dados fictícios; editor EDGE em2D. WebGL acelerado e tela375px não foram verificados neste ambiente. Evidência: [prévia fictícia](source/docs/releases/atlas-orcamento-conferencia-20261031.jpg).

Execute `python3 scripts/restore_source.py` antes de conferir a integridade e usar o código. A migração0014 adiciona somente tabela/índice de orçamentos; não modifica dados existentes.

[Funcionalidades](docs/funcionalidades.md) · [Arquitetura](docs/arquitetura.md) · [Atualização do código](docs/atualizacoes-do-codigo.md) · [Titularidade e riscos](docs/propriedade-intelectual.md).

## Orçamento compartilhável — v88/v89

Ficha A4 paisagem com quatro vistas e página pública `/orcamento/[token]` reunindo preços e apresentação3D. Gerar/copiar/atualizar/desativar link por orçamento salvo; versões comerciais e arte congeladas até atualização explícita. Revisões e revogações são conferidas também nos endpoints de modelo/mapa/miniatura. Nenhuma edição privada do projeto é exposta.

## Desfazer no simulador — v90

Ctrl+Z/Cmd+Z para desfazer; Ctrl+Y ou Ctrl+Shift+Z para refazer. Corrigido o foco nos sliders sem interceptar edição de texto. Gestos em andamento e operações assíncronas são protegidos. 22 testes de atalhos, histórico, camadas e simetria aprovados; TypeScript e build oficial aprovados. Interação WebGL pelo teclado não verificada no navegador deste ambiente. [Detalhes](source/docs/simulador-desfazer-2026-11-04.md).

[Minutas de licença, implantação e manutenção Meinerz](docs/negociacao-meinerz/README.md): proposta sem cessão patrimonial, não assinada, com condições e revisão jurídica pendentes.
