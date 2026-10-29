# PROMPT — IMPLEMENTAR ATLAS VECTOR (BETA) NO MENU FERRAMENTAS

Execute esta tarefa no **Work**, usando os dois repositórios privados do GitHub conectados:

- Site: `AtlasAndreiRaimundi/Atlas-Uniform-Studio`.
- Motor: `AtlasAndreiRaimundi/Atlas-Vector`.

**Objetivo absolutamente restrito:** acrescentar no menu **Ferramentas**, logo depois do **Criador de planilha**, uma ferramenta independente chamada **ATLAS VECTOR (BETA)**. O fluxo é **enviar logo → ajustar opções reais → vetorizar pelo motor ATLAS → comparar → baixar SVG editável**. Não integrar com simulador 3D, pedidos, projetos, biblioteca, cliente ou planilhas. Não salvar nem compartilhar resultados. Não remover recursos existentes.

Leia **todos os documentos anexados** neste pacote, especialmente `00_LEIA_PRIMEIRO.md`, `01_ESPECIFICACAO_FUNCIONAL.md`, `02_ARQUITETURA_E_SEGURANCA.md`, `03_CONTRATO_API.yaml`, `04_PLANO_DE_IMPLEMENTACAO.md`, `05_TESTES_E_ACEITE.md` e `06_RISCOS_E_PENDENCIAS.md`. Trate o contrato OpenAPI como **proposta a implementar**, nunca como API já funcional.

**Caminhos concretos já conferidos:** item do menu em `source/public/studio-navigation.js` (`NAV_GROUPS`, grupo `tools`), também consumido por `source/app/studio-navigation.tsx`; a página do Criador de Planilha é `/organizador`; `source/public/organizador.html` inclui um snapshot de menu que deve ser auditado. Crie a nova rota `/ferramentas/atlas-vector`; autenticação com `requireChatGPTUser`; APIs privadas seguindo `source/lib/api.ts`, `source/lib/request-security.mjs` e a segurança existente. O Uniform Studio é Next/Vinext/Cloudflare Workers; o motor está em Python/OpenCV e deverá rodar como serviço separado, acessado por gateway autenticado. Não incorporar motor Python diretamente no Worker.

**IMPEDITIVOS A RESOLVER NO MOTOR:** `trace_multicolor_experimental.py` ainda usa paleta azul/dourado/branco fixa e título Rosario Central; corrigir para imagens genéricas antes de habilitar botão. O `atlas_fill_guard.py` repara frestas por preenchimentos auxiliares e exige testes para não pintar vazios legítimos. Modo `--full` pode ser lento. Preservar motor geométrico ATLAS; não substituir por VTracer ou serviço pago. Não adicionar controles decorativos ou valores de qualidade inventados. Preparar SVGs seguros, transparentes, sem raster incorporado e com caminhos editáveis.

**Execução e entrega:**
1. Releia HEAD dos dois repositórios; crie branches independentes a partir deles, sem alterar `main` diretamente.
2. Implemente a página com UI responsiva, BETA visível, upload, modo fiel, correção de frestas, prévia original×resultado e download SVG. Ative outras opções somente quando realmente funcionarem.
3. Implemente ou configure serviço Python protegido e gateway do Studio; validar auth, upload, anti-SSRF, dimensões, limites, timeout, limpeza e segurança do SVG. Se a infraestrutura externa não estiver disponível, **deixe o recurso inacessível com aviso honesto**, documente o bloqueio e não declare conversão web concluída.
4. Rode testes de API, unidade, navegador, build, segurança, qualidade e regressão dos módulos existentes; evidencie os resultados. Usar fixtures geométricas próprias, nunca publicar escudos/logotipos de terceiros.
5. Entregue PR(s) para revisão, changelog, variáveis necessárias (sem segredos), evidências de teste e procedimento de rollback. Só publique no site de produção após confirmar comportamento real e obter autorização para release, preservando a audiência privada.

**Critério de aceite:** o usuário autenticado abre Ferramentas → ATLAS VECTOR (BETA), importa um PNG real, controla os parâmetros disponíveis, gera um SVG genuíno pelo motor próprio, compara e baixa o SVG, sem modificar nenhum módulo de uniformes. Em erro/indisponibilidade, não existe saída falsa nem prejuízo ao restante do site.

Evite pedir detalhes já decididos: a localização, o nome, o caráter BETA, o isolamento e o fluxo mínimo estão definidos neste pacote. Caso encontre diferenças no repositório atual, adapte a implementação e informe-as, sem sobrescrever alterações recentes.
