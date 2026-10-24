# Controle de versões e preservação de evidências

## O que já está protegido
Este GitHub privado preserva os commits dos arquivos que forem efetivamente enviados ao repositório. A documentação inicial foi publicada em 24/10/2026.

## O que não está sincronizado
Alterações no site publicado, em ferramentas de criação ou em conversas do ChatGPT **não entram automaticamente neste repositório**. É necessária integração explícita com a origem do código.

## Rotina indicada
1. Confirmar que o código pertence ao projeto e não contém material confidencial de terceiros.
2. Enviar a alteração ao GitHub por commit identificado.
3. Registrar funcionalidade, motivo, testes e limitações no CHANGELOG.md.
4. Associar o commit a uma tag de release.
5. Exportar o código/artefato completo da release, calcular SHA-256 e guardar cópia exata em armazenamento privado com backup.
6. Guardar evidências externas de cronologia e proveniência sem inventar datas.

## Gerador local de manifesto
Executar `python scripts/gerar_manifesto.py . > manifesto.json`. O manifesto contém hashes dos arquivos encontrados e não um hash único do arquivo ZIP a ser eventualmente apresentado ao INPI. Para um ZIP específico use, por exemplo, `sha256sum arquivo.zip` (Linux/macOS) ou `Get-FileHash arquivo.zip -Algorithm SHA256` (PowerShell).

Evitar inserir credenciais, segredos, arquivos de clientes ou cópias integrais de documentos jurídicos pessoais no repositório, mesmo privado.

## Automação
GitHub Actions podem gerar verificações e artefatos a cada push. A publicação automática de uma nova versão do site depende da configuração da plataforma de hospedagem e **não está ativa**.
