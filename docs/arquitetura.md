# Arquitetura — levantamento pendente

## Estado conhecido
O MEINERZ UNIFORM STUDIO é concebido como aplicação web para simulador de uniformes e fluxo de produção. A fonte está em source/. A inspeção de source/package.json identificou Next, React, TypeScript, Drizzle, Vite/Vinext e Wrangler; detalhes no handoff. Infraestrutura publicada, banco e bindings ainda não foram inspecionados.

## Inventário a completar após importação autorizada do código
- Framework/linguagens e respectivas versões.
- Bibliotecas de visualização 3D e licenças.
- Estrutura de mapas, moldes, texturas e formatos aceitos.
- Serviços de autenticação, usuários e permissões.
- Modelo de dados: clientes, projetos, apresentação, pedido, lista, workflow.
- Banco de dados, migrações, armazenamento e backups.
- Fluxos de exportação, limites, custos de renderização.
- Dependências externas, seus contratos/licenças e custos.
- Deploy, variáveis de ambiente, gestão de segredos, auditoria e monitoramento.

## Política de segurança mínima
Nunca versionar .env, chaves de API, tokens, credenciais, dados pessoais reais ou material corporativo confidencial. Usar placeholders e armazenamento de segredos apropriado.

## Evolução de versões
Cada entrega deve vincular um commit/tag a uma descrição, testes, código ou artefato exato preservado e resumo criptográfico SHA-256.
