# Exportação autorizada do ATLAS — 24/10/2026

Origem: projeto Sites `appgprj_6ad921f302148191932d8c1e12374ce3`, título ATLAS UNIFORM STUDIO, versão publicada 51 no momento da consulta. Exportação pelo acesso de repositório fornecido pelo Sites ao proprietário. Commit de origem: `d88265ccff069ea40ddbc36255191d1aefbb46d8`.

Foram importados 439 arquivos versionados, 94.211.140 bytes, incluindo aplicação, serviços, migrations, testes, lockfile, modelos 3D, fontes e licenças presentes na origem. `source-manifest.json` registra SHA-256 de cada arquivo. O histórico existente do GitHub foi preservado como ancestral do commit de importação; o histórico antigo do Sites não foi transplantado, pois conteria versões anteriores fora da revisão. A data desta exportação não representa a data original de criação.

Não foram solicitados nem exportados segredos de runtime, bancos D1, objetos privados R2, cadastros, pedidos reais ou arquivos locais ignorados. Identificadores de projeto e nomes dos bindings DB/BUCKET são configuração, não credenciais. Fontes, marcas e moldes incluídos são materiais já versionados no projeto autorizado; sua inclusão não comprova direitos de terceiros.

## Revisão e validação

Varredura dos 439 arquivos por chaves privadas, tokens GitHub/OpenAI, chaves AWS, JWT, URLs com credenciais e atribuições literais de senhas/segredos: nenhum achado nesses padrões. Referências a tokens nos serviços foram conferidas como implementação de links aleatórios ou controles de autenticação; não são credenciais incorporadas. Nenhum arquivo foi redigido nesta exportação. Recursos binários foram preservados e identificados por hash, sem auditoria forense de metadados.

Executados 36 testes de `security`, `projects` e `simulator`, todos aprovados. Build, typecheck, teste visual com GPU e suíte completa dependente de pacotes não foram repetidos nesta importação; o checkout exportado não continha node_modules. A revisão não é certificação de segurança nem auditoria jurídica.

## Modelos grandes

Três GLBs ultrapassam o limite de 16 MiB por requisição da conexão após codificação base64. Seus bytes foram transportados em gzip determinístico, em `import-assets/`. `python3 scripts/restore_source.py` restaura os originais e verifica o manifesto inteiro. O workflow `source.yml`, depois dos testes, registra os três GLBs originais em um commit adicional na main. Não altera geometria ou textura. Se a política do GitHub impedir a escrita do bot, a restauração local continua disponível e verificável.

## Execução

Execute `python3 scripts/restore_source.py` e `python3 scripts/check_source.py` na raiz. Em `source/`, use a versão de pnpm indicada no package.json e `pnpm install --frozen-lockfile`, depois `pnpm test`, `pnpm typecheck` e `pnpm build`. Hospedagem, identidade ChatGPT e bindings D1/R2 dependem da plataforma; este repositório não inclui credenciais nem replica os dados de produção.
