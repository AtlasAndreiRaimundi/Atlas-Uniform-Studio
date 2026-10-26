# Histórico de alterações — ATLAS UNIFORM STUDIO

Formato inspirado em Keep a Changelog. Alterações efetivas devem apontar para commits, tags, testes e arquivos de evidência.

## Registro inicial — 2026-10-24 (histórico)
### Documentação
- Estrutura inicial de documentação criada no repositório privado.
- Inventário preliminar dos módulos e das necessidades de validação.
- Orientações de preservação de evidências e integridade.

### Limitações registradas naquela data
- O código-fonte em produção **não foi importado**.
- A cronologia técnica anterior à criação do repositório depende de evidências externas que precisam ser preservadas.
- Não há prova técnica neste repositório de que funcionalidades descritas estejam finalizadas.

## Modelo para próximas versões
### [versão] — AAAA-MM-DD
- Mudança:
- Razão:
- Arquivos/commits:
- Responsável:
- Testes e resultado:
- Tag/release:
- SHA-256 do artefato:
- Local de armazenamento seguro do artefato:

## 2026-10-24 — Importação autorizada do código real

- Snapshot Sites v51, origem `d88265ccff069ea40ddbc36255191d1aefbb46d8`, 439 arquivos e 94.211.140 bytes em source/.
- Histórico GitHub preservado; manifesto SHA-256, restauração lossless de três GLBs grandes, varredura sem achados nos padrões verificados e 36 testes aprovados.
- Workflow de verificação e procedimento/script para novas exportações. Build e validação visual não repetidos nesta etapa; dados de produção não exportados. Ver docs/importacao-2026-10-24.md.

## 2026-10-26 — Fichas CAM-001 / CAL-001 e sincronização v57

- Código e documentação sincronizados com o commit Sites `03f6a9b71841f48ef7464efd2af52fd567c087bb`, versão pública 57, preservando o histórico existente e as atualizações v52–v56.
- Catálogo técnico versionado, formulários dependentes, aplicações físicas, tamanhos especiais, lista com quantidades independentes, organização de páginas e resumo A4.
- Fichas originais preservadas em `source/docs/produtos/`, com registro de implementação, migração, pendências e roteiro de homologação.
- 298 testes aprovados (1 referência antiga ausente), TypeScript, build, conferência visual e varredura de padrões de segredo. A suíte de catálogo sem dependências foi adicionada ao workflow existente.
- Artefato publicado: SHA-256 `2c97832fc5346a8852b9074cfdcbd7f2fb0d6ca257a2a8be10f08807aac5ecee`. Manifesto por arquivo em `source-manifest.json`.
- Detalhes e limites: [sincronização das fichas](docs/implementacao-fichas-2026-10-26.md).
