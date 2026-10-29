# Arquitetura e segurança — diretrizes para o Work

## Fontes existentes confirmadas

- `Atlas-Uniform-Studio/source/package.json`: Next.js/React/TypeScript, Vinext/Cloudflare Workers.
- `source/app/organizador/page.tsx`: exemplo de página autenticada; o organizador usa iframe HTML, mas o vetor pode ser uma página React nativa.
- `source/app/chatgpt-auth.ts`: `requireChatGPTUser` e `getChatGPTUser`.
- `source/lib/api.ts`: `account`, `mutation`, `handle`, `result`.
- `source/lib/request-security.mjs`: `boundedForm`, `assertMutation`, leitura dos bytes do body com limite real.
- `source/public/studio-navigation.js`: fonte principal do menu e export `navigationHTML`; `source/app/studio-navigation.tsx` reutiliza `NAV_GROUPS`.
- `source/public/organizador.html`: contém snapshot HTML do menu e pode precisar de regeneração se o mecanismo atual não o atualizar sozinho.

## Separação exigida

```text
Navegador (React no Uniform Studio)
       |
       | POST multipart, mesma origem; sessão existente
       v
Cloudflare Worker / Next API route
       | checa sessão + limites; NÃO executa OpenCV em JS
       | busca token em segredo do ambiente; não expõe url/credencial
       v
Serviço privado ATLAS VECTOR Python
       | valida e normaliza raster em ambiente isolado
       | motor ATLAS 1.9.x + fill guard
       | sanitiza SVG e aplica limites de CPU/memória/tempo
       v
Gateway devolve SVG para download + prévia segura
```

- Serviço Python: oferecer **FastAPI** (ou solução equivalente compatível com o runtime). Hospedagem e autenticação de rede precisam ser verificadas; Cloudflare Workers não executa diretamente esse Python/OpenCV.
- O Uniform Studio **não copia** o motor para seu repo: instalar uma versão fixa (commit ou tag) do repo privado `Atlas-Vector`, documentar hash do motor.
- Definir env privado `ATLAS_VECTOR_API_URL` e segredo `ATLAS_VECTOR_API_TOKEN` **somente no servidor**; jamais `NEXT_PUBLIC_` ou JavaScript estático. A configuração exata depende de bindings reais do Worker/Sites.
- `ATLAS_VECTOR_ENABLED` e, opcionalmente, `ATLAS_VECTOR_BETA_ADMIN_ONLY` servem como feature flags avaliadas no backend. Não é suficiente ocultar um botão no frontend.
- Se não houver infraestrutura Python: construir protótipo local e UI sob flag `false`, com estado `indisponível`. Não trocar backend real por resultado pré-gerado ou vetorizar via VTracer sem autorização.

## Endpoint sugerido no Studio

`POST /api/tools/atlas-vector/trace` (multipart): arquivo `image`, modo `faithful|simplified` se implementado, `closeGaps=true|false` se implementado.

- O endpoint **exige** `account()` e valida a origem por `mutation()`; reutilizar `boundedForm` com teto de bytes apropriado.
- Gateway verifica *conteúdo de fato*, não só extensão/MIME; usa limits de largura, altura e megapixels; rejeita ZIP, SVG, PDF, arquivos poliglotas suspeitos e decoders inesperados.
- Normalização definitiva dos formatos/EXIF deve ocorrer no serviço Python, com validação duplicada e descompressão protegida.
- Requisições atendidas pelo servidor Python apenas com token de serviço e idealmente rede privada ou allowlist. O backend Python jamais aceita diretamente a identidade do usuário recebida do navegador.
- Configurar rate limiting por identidade, concorrência baixa e quotas de CPU/tempo; não confiar em `Content-Length` isoladamente.
- Definir timeout de gateway de acordo com limites reais da hospedagem. Se arquivos grandes excederem esse limite, migrar para job assíncrono idempotente + consulta de progresso; **não** ultrapassar limites com promises desligadas ou processos órfãos.
- No proxy, impedir SSRF: URL do motor fixa em variável de ambiente controlada; nunca aceitar URL de destino enviada pelo usuário, nem redirecionamento arbitrário.

## Regras rígidas para o Python

1. Processar em diretório temporário único por solicitação; impor timeout, CPU/memória e limpeza em `finally` / recuperação de erro. Não deixar imagens de clientes em disco indefinidamente.
2. Pillow: limites de pixel, EXIF orientation seguro, bloquear decompression bombs, controlar ICC/alpha, limitar a uma imagem estática e normalizar para RGBA RGB antes da segmentação.
3. **Remover a paleta fixa do Rosario** (`PALETTE`/`HEX` em `trace_multicolor_experimental.py`) e o título específico do clube; implantar segmentação automática genérica, preservando paletas de logos e transparência. Sem isso, não liberar Beta para qualquer imagem.
4. Preservar o traçador geométrico ATLAS como núcleo. Não substituí-lo por VTracer. Bibliotecas auxiliares podem ser usadas se apropriadas e devidamente licenciadas.
5. `atlas_fill_guard.py`: manter reparo de frestas sob validação; não criar áreas coloridas onde há transparência original e não fechar recortes legítimos (buracos de letras, espaços entre estrelas, vazios externos).
6. Comparar os resultados fiéis e simplificados com base em rasterização; selecionar o padrão fiel quando a simplificação produzir regressão significativa.
7. Saída SVG: validar `viewBox`, dimensões, quantidade de paths, tamanho, namespace, `fill-rule` e que cada objeto é editável. Rejeitar e remover `<script>`, `<image>`, `<foreignObject>`, handlers `on*`, `href`, `xlink:href`, `url(...)` externo, entidades perigosas e links. SVG sem código ativo e sem dependências externas.
8. Não exibir SVG como HTML inline não sanitizado. Preferir `<img src=blob:...>` em contexto protegido. Download com `Content-Disposition: attachment`, `Content-Type: image/svg+xml`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` (adaptar conforme política real testada).
9. Não registrar em logs nomes de arquivos, conteúdo de imagem ou SVG, tokens ou dados pessoais; logar somente duração, dimensões, modalidade, resultado e erros categorizados.

## Contrato inicial

Arquivo `03_CONTRATO_API.yaml` é **proposta**, não uma API já existente. O Work deve implementá-lo ou documentar alterações justificadas antes dos testes. O serviço Python pode receber bytes via HTTPS privado e devolver SVG diretamente ou fornecer jobs; não declarar contrato real antes de executá-lo.

## Critério para ativar a flag

- API externa acessível **do runtime hospedado** (não apenas do computador local).
- Timeout/limites comprovados com logo 1201 × 1371 e imagens de erro (sem imagens de clubes publicadas no repositório).
- Autenticação, varredura de SVG e anti-abuso aprovados.
- Fail-closed no desligamento do serviço.
- Regressão de Simulador, Projetos, Criador de Planilha e Pedidos aprovada.
