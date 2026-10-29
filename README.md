# ATLAS UNIFORM STUDIO

Plataforma de Andrei Raimundi para apresentações 3D, pedidos de produção e listas de personalização de uniformes.

## Estado atual

- Site publicado: v86, somente KIT EDGE 2027 (mapa v3). Pedidos e imagens incorporadas preservados.
- ATLAS VECTOR (BETA): implementação independente em revisão na PR #26, em Ferramentas, após Criador de planilha. Motor próprio no repositório separado Atlas-Vector, PR #1. Não publicado nem habilitado: falta hospedar e validar o serviço Python externo.
- Nome de exibição do Site: **ATLAS UNIFORM STUDIO**.

## Código e validação

O código está em `source/`, com inventário e hashes em `source-manifest.json`. Execute `python3 scripts/restore_source.py` antes de conferir a integridade e executar o projeto. A branch do VECTOR preserva a limpeza v86 e inclui522 arquivos de fonte; a produção continua com499.

[Relatório do VECTOR](source/docs/atlas-vector-beta.md) · [Pacote técnico completo](source/docs/atlas-vector-handoff/complete/00_LEIA_PRIMEIRO.md) · [Limpeza dos moldes](source/docs/mold-reset-2026-10-29.md) · [Histórico](CHANGELOG.md).

VECTOR: PNG local → opções reais → motor ATLAS → comparar → SVG editável. Sem ligação com simulador, pedidos, listas ou projetos; sem salvar resultados. O serviço usa um commit fixo indicado em `source/docs/atlas-vector-engine-lock.json`, sem copiar o motor para este repositório.

Validação local:388 testes do Studio (362 aprovados,26 ignorados),12 casos de gateway,28 testes Python com integração HTTP real, TypeScript e build. Limitações de navegador, Corel e infraestrutura hospedada estão documentadas. Não considerar BETA online concluído até realizar E2E hospedado.

## Documentação do sistema

[Funcionalidades](docs/funcionalidades.md) · [Arquitetura](docs/arquitetura.md) · [Atualização do código](docs/atualizacoes-do-codigo.md) · [Titularidade e riscos](docs/propriedade-intelectual.md).

Copyright Andrei Raimundi. Direitos reservados; nenhuma licença pública concedida. O histórico técnico não substitui registro ou parecer jurídico sobre titularidade.
