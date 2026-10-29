# ATLAS VECTOR (BETA) — integração independente em Ferramentas

**Preparado em:** 29/10/2026  
**Destino:** ATLAS UNIFORM STUDIO, repositório privado `AtlasAndreiRaimundi/Atlas-Uniform-Studio`  
**Motor:** repositório privado **separado** `AtlasAndreiRaimundi/Atlas-Vector`, versão 1.9.3 experimental  
**Produto:** ferramenta de teste, **não** uma função do simulador.  
**Autoria declarada:** Andrei Raimundi. Direitos reservados; não conceder licença pública sem autorização.

## Solicitação aprovada pelo proprietário

Adicionar **ATLAS VECTOR (BETA)** ao grupo existente **Ferramentas** do menu do Uniform Studio, ao lado de **Criador de planilha**. O usuário carrega uma imagem, seleciona opções que *realmente alterem* o motor, manda vetorizar, compara visualmente e baixa SVG editável. Fim do fluxo.

**Não fazer:** integrar ao simulador 3D, pedidos, listas, projetos, pastas, biblioteca de clientes, compartilhamento, preços, assinaturas ou salvamento permanente. Não alterar o motor original para outro vetorizar. Não apresentar conversão fictícia, não embutir raster no SVG e não entregar objeto bloqueado. Não substituir o VTracer pelo motor ATLAS.

## Estado REAL verificado nos repositórios — ponto de partida, não substitui nova leitura

- Uniform Studio: branch `main`, commit observado `815a7aefa9124ed26e15f8a0cec8eb8a5283d192`; fonte em `source/`; stack Next.js/React/TypeScript + Vinext/Vite + Cloudflare Workers, D1, R2, autenticação fornecida pela plataforma.
- ATLAS VECTOR: branch `main`, commit observado `5ebaf0ddceb8d5492d372737056a0edd07dda9f6`; motor Python, OpenCV, Pillow, NumPy, CairoSVG, skimage e módulos próprios.
- Menu-fonte **confirmado**: `source/public/studio-navigation.js` → `NAV_GROUPS` → grupo `id:'tools'`, `label:'Ferramentas'` → entrada `id:'lists'`, `/organizador`. Renderização React em `source/app/studio-navigation.tsx` e HTML estático por `navigationHTML`; `source/public/organizador.html` também contém cópia HTML do menu que requer sincronização/auditoria.
- Auth de páginas: `requireChatGPTUser('/rota')` em `source/app/chatgpt-auth.ts`. API: `account()`, `mutation()`, `handle()`, `result()` em `source/lib/api.ts`, limites de `boundedForm()` em `source/lib/request-security.mjs`.
- O motor 1.9.3 **NÃO está pronto para vetorização genérica**: `trace_multicolor_experimental.py` contém **paleta fixa de 3 cores do Rosario** e `<title>` hardcoded com `Rosario Central`; correção de frestas é pós-processamento, não fronteira compartilhada; um modo de busca exaustiva pode consumir tempo excessivo. Resolver esses pontos antes de habilitar processamento genérico no site.
- **Não** há confirmação de serviço Python implantado e acessível aos Workers. Como o site usa Cloudflare Workers, não considerar que o Python roda dentro do processo JavaScript; integrar por backend separado e seguro.

## Entrega técnica mínima

1. Nova opção em **Ferramentas**: `ATLAS VECTOR (BETA)` → `/ferramentas/atlas-vector`.
2. Página autenticada, responsiva, visual alinhado ao Uniform Studio; sem integração de dados com demais módulos.
3. PNG (e JPEG/WEBP *somente quando normalização e testes estiverem prontos*), upload local, prévia, configurações genuínas, processamento real, comparação e download de SVG independente.
4. Gateway autenticado no Uniform Studio e serviço Python privado do ATLAS. Nenhum segredo no browser. Se serviço indisponível, erro legível e botão desabilitado, sem simulação enganosa.
5. Segurança do upload e SVG; limites de arquivo e de pixels; limites de execução e concorrência; descarte de temporários; **não persistir logos ou SVGs em projetos/contas**.
6. Testes automáticos, testes de navegador e prova de regressão que todas as rotas existentes continuam funcionando.
7. PR separada para o site; outra PR para evoluções no motor. Não modificar `main` nem publicar sem revisão e validação.

## Como entregar ao Work

1. Anexe **este ZIP** ao chat Work, junto à instrução de `PROMPT_PARA_WORK.md`.
2. Permita que o Work consulte os **dois repositórios privados** conectados. Atualize a leitura do código antes de editar (os commits podem ter mudado).
3. Se não houver infraestrutura Python externa utilizável, entregue UI pronta sob feature flag, serviço local reproduzível, testes e relatório de bloqueio; **não declare integração concluída** até executar um PNG real na hospedagem de destino.
4. Nunca salve no GitHub nenhuma imagem de teste de clubes, segredo, credencial, arquivo de cliente ou dados pessoais sensíveis.

## Documentos do pacote

- `PROMPT_PARA_WORK.md` — mensagem executável para colar no Work.
- `01_ESPECIFICACAO_FUNCIONAL.md` — limites e estados de interface.
- `02_ARQUITETURA_E_SEGURANCA.md` — separação das aplicações, validações e controles.
- `03_CONTRATO_API.yaml` — contrato inicial HTTP a ser adaptado ao serviço real.
- `04_PLANO_DE_IMPLEMENTACAO.md` — sequência, caminhos e patch sugerido.
- `05_TESTES_E_ACEITE.md` — critérios obrigatórios de liberação.
- `06_RISCOS_E_PENDENCIAS.md` — pontos críticos do motor 1.9.3 e implantação.
- `patches/studio-navigation.diff` — alteração proposta da entrada principal (contextual; validar contra HEAD).
- `MANIFEST_SHA256.json` — integridade dos arquivos desta preparação.

**Este pacote é um handoff técnico — não é um deploy, não configura um backend e não altera nenhum repositório por si só.**
