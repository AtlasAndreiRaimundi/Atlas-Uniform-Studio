# Plano de execução para o Work — sem tocar em produção prematuramente

## Etapa 0 — Baseline e proteção

1. Abrir ambos os repositórios privados; verificar HEAD real e eventuais branches/PRs novas. Os SHAs de 29/10 são referências, não garantias de HEAD.
2. Criar `feature/atlas-vector-beta` **a partir do HEAD atual** de `Atlas-Uniform-Studio`; não alterar `main` diretamente. No repo do motor criar branch própria se precisar modificar o motor (`feature/paleta-generica-api-beta`).
3. Registrar e rodar os testes existentes (`cd source && npm test`, `npm run typecheck`, `npm run build` conforme infraestrutura); anotar problemas anteriores para não atribuí-los à integração.

## Etapa 1 — Menu correto

- Alterar `source/public/studio-navigation.js` em `NAV_GROUPS`, dentro de `id:'tools'`, **depois** da entrada `lists`:

```js
{id:'atlas-vector', label:'ATLAS VECTOR (BETA)', href:'/ferramentas/atlas-vector', icon:'M4 5h8M4 9h6M14 4l6 6-9 9H5v-6l9-9ZM15 18h5M18 15v6'},
```

- O projeto usa `source/app/studio-navigation.tsx` para React e `navigationHTML` para HTML estático, ambos importando `NAV_GROUPS` do mesmo arquivo.
- **Atenção:** `source/public/organizador.html` contém markup de menu preexistente. Verificar ferramentas/scripts que geram esses snapshots; atualizar snapshots estáticos relevantes, ou substituir a duplicação por inclusão sincronizada de forma compatível com testes. Não basta atualizar um menu React e declarar finalizado.
- Não remover nem renomear `Criador de planilha`.

## Etapa 2 — Página independente

Caminhos sugeridos (criar se ausentes):

```text
source/app/ferramentas/atlas-vector/page.tsx
source/app/ferramentas/atlas-vector/atlas-vector-client.tsx
source/app/ferramentas/atlas-vector/atlas-vector.css
source/app/api/tools/atlas-vector/status/route.ts
source/app/api/tools/atlas-vector/trace/route.ts
source/tests/atlas-vector-ui.test.mjs
source/tests/atlas-vector-api.test.mjs
source/docs/atlas-vector-beta.md
```

- `page.tsx`: chamar `await requireChatGPTUser('/ferramentas/atlas-vector')`, exportar metadata e usar tema/layout/sidebar já existentes.
- Preferir componente React nativo; não copiar HTML inteiro do Organizador sem necessidade.
- Importar `StudioNavigation` quando apropriado com `active='atlas-vector'`; confirmar markup de `aside.studio-sidebar` e `dashboard-main` em outra página real.
- Formulário único → progresso real → comparativo SVG vs raster → download. Sem DB e sem projetos.
- No estado sem motor: exibir BETA indisponível, sem SVG fictício.

## Etapa 3 — Transformar o motor atual em serviço

No repo `Atlas-Vector`, manter as rotinas geométricas próprias. Incluir wrapper de serviço Python separado (FastAPI ou similar):

- Endpoint de processamento privado e endpoint de saúde operacional sem expor credenciais.
- Receber bytes limitados, inspecionar assinatura/tamanho/dimensões, normalizar cores e transparência.
- Consertar a paleta fixa do `trace_multicolor_experimental.py`; remover título do clube no output.
- Fixar modo padrão fiel com correção de frestas; habilitar simplificado apenas após comprovar efeito real e limites de erro.
- Limpeza de arquivos temporários, budget de memória/tempo, erros tipados, sanitização/validação do SVG e métricas internas.
- Criar testes sintéticos: círculo, estrela, letras geométricas simplificadas, faixa bicolor sem fresta e transparência legítima.
- Distribuição/versionamento: usar commit/tag congelado do motor; README com script local reproduzível, dependências e env `.env.example` **sem segredos**.

## Etapa 4 — Gateway do site

- `POST /api/tools/atlas-vector/trace` reutiliza `account()`, `mutation()`, `boundedForm()`; verifica feature flag, limites e assinatura; chama o motor por serviço privado com URL/segredo do servidor.
- `GET /api/tools/atlas-vector/status` informa `enabled`/`engineConnected` e modos disponíveis sem vazar URL ou token.
- Adicionar cabeçalhos de segurança do download, cache `no-store`, CSP do SVG e resposta tipada.
- Não expor URL Python no frontend nem permitir URL de processamento arbitrária.

## Etapa 5 — Testar, apresentar e liberar

- Executar todos os testes do site e do motor, typecheck, lint e build. Testar localmente com serviço Python REAL e imagens sintéticas.
- Testar preview hospedado com autorização real, dois tamanhos de tela, a política de CSP e download no browser.
- Abrir PR descrevendo arquivos alterados, diferenças visuais, riscos, variáveis necessárias, logs de testes, plano de rollback e evidência de que `Simulador`, `Criador de planilha`, `Pedidos` e `Projetos` funcionam.
- Aplicar env de serviço somente em infraestrutura autorizada. **Não fazer deploy público nem declarar completo sem teste end-to-end em hospedagem com motor acessível**.
- Feature flag inicialmente desligada por padrão; testar com acesso restrito e habilitar quando critérios de aceite passarem.

## Critérios de interrupção

- Se não houver serviço Python executável na hospedagem ou acesso do runtime Worker ao endpoint, documentar bloqueio e deixar interface **desligada**.
- Se a paleta genérica ainda não funcionar, bloquear processamento de logos arbitrárias e não anunciar que está pronto.
- Se houver regressão em qualquer módulo preexistente, não integrar o PR; corrigir isoladamente e voltar a testar.
