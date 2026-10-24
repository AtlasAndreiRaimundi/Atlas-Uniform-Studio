# Procedimento de versionamento e evidências

## Situação inicial
Este repositório contém documentação preliminar do ATLAS UNIFORM STUDIO. A versão atualmente implantada do site ainda não foi exportada, inspecionada nem importada.

## Ao incorporar o código-fonte
1. Obter exportação autorizada e íntegra do projeto (incluindo manifestos de dependências e configuração não sensível).
2. Inventariar origem dos arquivos, bibliotecas, licenças, imagens, moldes e demais ativos antes de publicá-los, mesmo em repositório privado.
3. Remover credenciais e informações confidenciais; não confiar exclusivamente no .gitignore.
4. Testar build, interface, exportações, autenticação, permissões e fluxos críticos.
5. Registrar commit e versão. Anotar o que foi efetivamente testado, sem retroagir datas de criação.
6. Para cada release, guardar fora do repositório uma cópia exata do pacote distribuído e seu SHA-256; usar `python tools/gerar_manifesto.py caminho/do/pacote.zip`.
7. Preencher o CHANGELOG com mudanças, commit, responsável, testes, tag, hash e localização segura do artefato.

## Convenção de versões
- `0.x.y`: desenvolvimento e validação, sujeito a mudanças.
- `1.0.0`: primeira versão contratualmente distribuível, depois de validações.
- Commits devem descrever alterações reais. Não supor autoria ou propriedade apenas pelo commit.
- Não reescrever histórico publicado. Recomenda-se proteger a branch principal quando houver código e colaboradores.

## Preservação de evidências
O hash identifica os bytes de um arquivo específico, mas não prova sozinho sua autoria, data original ou titularidade. Preservar o pacote correspondente, fontes originais de criação, contratos, histórico e comprovantes em backup restrito.

## Limites de automação
O GitHub registra automaticamente os commits feitos nele. Alterações realizadas em ferramentas externas, como o editor/hospedagem original do site, NÃO aparecem aqui até que haja integração de exportação/sincronização. Um assistente de IA não acompanha arquivos externos em tempo real sem um fluxo técnico configurado.
