# Sincronização das fichas técnicas — 26/10/2026

- Site existente: ATLAS UNIFORM STUDIO, versão publicada **58**.
- Commit canônico Sites: `6ee6dd626bdbab2fe2406b4ba2887cf0f3c550f9`.
- Publicação confirmada em https://uniforme-studio-andrei.rockyowl7.chatgpt.site.
- Catálogo: `2026-10-26.1`; CAM-001 e CAL-001.
- Snapshot: 468 arquivos, com manifesto SHA-256 por arquivo; histórico GitHub preservado.
- A sincronização inclui as alterações canônicas entre o snapshot anterior (v51) e a v58: favicon Atlas, simetria, edição de grafismos e tutorial, além das fichas desta entrega. Não há mudanças locais exclusivas sobrepostas à fonte canônica.

## Documentação junto ao código

- [Ficha CAM-001](../source/docs/produtos/CAM-001_CAMISETA_SUBLIMADA_TRANSFER.md)
- [Ficha CAL-001](../source/docs/produtos/CAL-001_CALCAO_DE_JOGO.md)
- [Contrato original de implementação](../source/docs/produtos/00_LEIA_PRIMEIRO_WORK.md)
- [Implementação, migração e pendências](../source/docs/produtos/IMPLEMENTACAO-2026-10-26.md)
- [Roteiro de homologação fabril](../source/docs/produtos/ROTEIRO-DE-HOMOLOGACAO.md)

As três orientações anexadas foram preservadas sem alterações. Os dois novos registros documentam o estado implementado. As pendências (bolsos, abertura V da Polo, referências não fornecidas) não receberam disponibilidade ou preços inventados.

## Verificação executada

- 300 testes locais: **299 aprovados**, 1 ignorado por ausência da planilha de referência antiga. Vinte e um testes novos exercitam as fichas e arquivos, além do fluxo atualizado.
- TypeScript e build de produção aprovados.
- Varredura dos padrões de segredo do repositório aprovada, sem imprimir valores. Isso não é certificação geral de segurança.
- Navegador: nova seleção de kit, regras da camiseta ELASTIC/Edge e do Stein Feminino, aplicações e lista com duas camisetas + um calção sem nome/número.
- PDF gerado e inspecionado em A4 paisagem, com referências técnicas, aplicações na folha principal, lista incorporada, continuação e resumo somado; orçamento livre preservado.
- Integridade de todos os arquivos restaurados e suíte sem dependências do workflow verificadas antes do commit GitHub.

Nenhum pedido real foi enviado à fábrica. O roteiro de homologação permanece uma revisão adicional do arte-finalista/PCP. Atualizações posteriores devem mudar código e documentação no mesmo commit e revisar o manifesto.

