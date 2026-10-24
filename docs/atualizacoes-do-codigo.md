# Versionamento das próximas atualizações

A pasta `source/` contém a exportação real do ATLAS. A documentação anterior permanece na raiz e em docs/. O site publicado não é alterado por esta importação.

1. Obter um checkout atualizado usando o acesso autorizado de código do Sites para o mesmo project_id. Não guardar credenciais no repositório.
2. Em um clone atualizado deste GitHub, executar `python3 scripts/sync_source.py /caminho/do/checkout-autorizado`. O script lê os arquivos do commit de origem, faz a varredura antes da substituição e atualiza o manifesto. Não lê .env locais nem importa o histórico antigo.
3. Revisar `git diff`, sobretudo dados pessoais, ativos e licenças. Executar `python3 scripts/restore_source.py`, `python3 scripts/check_source.py` e os testes/build apropriados em source/.
4. Atualizar CHANGELOG; criar branch `update/descricao`, commit e pull request. O workflow confere os hashes, padrões de segredos e 36 testes sem dependências. O workflow anterior de integridade continua ativo.
5. Após merge, usar uma tag SemVer anotada, por exemplo `git tag -a v0.1.1 -m 'Descrição da alteração'` e `git push origin v0.1.1`. Para um pacote de release, usar o gerador SHA-256 existente em tools/gerar_manifesto.py.

Não usar force push nem reescrever commits publicados. A origem registrada no manifesto permite comparar uma futura exportação com este snapshot. Não foi instalada sincronização contínua entre Sites e GitHub: alterações no Sites exigem nova exportação autorizada. Nenhum token permanente ou agendamento foi criado.
