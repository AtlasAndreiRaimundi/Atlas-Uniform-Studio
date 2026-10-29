# ATLAS VECTOR (BETA) — integração no ATLAS UNIFORM STUDIO

Data: 29/10/2026. Autoria declarada: Andrei Raimundi. Direitos reservados.

## Estado e liberação

Implementação em branches separadas `feat/atlas-vector-beta`. Site em produção permanece na v86, com somente KIT EDGE 2027. O nome de exibição do Site foi corrigido para ATLAS UNIFORM STUDIO. O código desta proposta parte da fonte v86 `5446afb8431cd5fa303862bed853d7c0543c5131` e não reintroduz moldes removidos nem reativa o simulador temporariamente indisponível.

O pacote completo está em `docs/atlas-vector-handoff/complete/`; todos os nove hashes do manifesto foram conferidos. Os documentos originais são preservados, e as adaptações reais estão descritas abaixo.

**Bloqueio de ativação:** não existe serviço Python externo configurado no Site. As variáveis de produção foram consultadas: sem URL, token ou flag VECTOR. Não habilitar conversão nem publicar esta integração como funcional antes de implantar o serviço, conectar os segredos e executar um PNG pela rota autenticada no ambiente hospedado. Não foi contratado nem criado serviço pago. Não há vetorização simulada, VTracer, imagens prontas ou bitmap embutido no SVG.

## Interface e isolamento

Ferramentas → Criador de planilha → ATLAS VECTOR (BETA), rota `/ferramentas/atlas-vector`, autenticada. Menus React e snapshots de Pedidos, Organizador e Acervo sincronizados. A página desativada do simulador permanece intacta.

Fluxo único: PNG por clique, teclado ou arrastar → modo fiel e correção de frestas ligada por padrão → ATLAS → comparação e download fixo `atlas-vector-resultado.svg`. Zoom de100–400%, fundo quadriculado/claro/escuro somente na prévia, dimensões/tamanho e aviso para imagens menores que300px. Contagem de objetos calculada no SVG. BETA e limitações de acabamento explícitos. Sem projetos, pedidos, listas, banco de logos, R2 ou histórico de resultados. Object URLs liberadas no navegador.

Somente modo fiel disponível: simplificado, sensibilidade e quantidade de cores não são controles fictícios. Fotos/degradês são reduzidos a até oito cores, alfa binário128; texto vira curvas e não fonte reconhecida. Correção usa caminhos auxiliares do fill_guard e não fronteiras compartilhadas.

## Contrato e configuração

- `GET /api/tools/atlas-vector/status`: sessão obrigatória, `{enabled,engineConnected,engineVersion,availableModes}`; não revela URL/token.
- `POST /api/tools/atlas-vector/trace`: sessão e origem obrigatórias; multipart limitado, `image`, `mode=faithful`, `closeGaps=true|false` (padrão true); campos desconhecidos/duplicados rejeitados. Retorna SVG seguro com contagem de paths.
- Alias legado `/api/atlas-vector` mantém autenticação, PNG binário e identidade derivada no servidor.
- Gateway: `ATLAS_VECTOR_ENABLED=false` por padrão, `ATLAS_VECTOR_API_URL` (origem HTTPS fixa), `ATLAS_VECTOR_API_TOKEN` secreto >=32 caracteres. Exemplo sem valores em `docs/atlas-vector.vars.example`. Sem NEXT_PUBLIC.
- Python privado: `GET /health`, `POST /vectorize`, Bearer em `ATLAS_VECTOR_TOKEN`; PNG binário, `X-Atlas-Gap-Repair`, `X-Atlas-Subject` SHA256 da origem+identidade confiável derivado pelo gateway. Browser não escolhe identidade de quota.
- Versão do serviço: `1.9.3-beta-service.1`. O Studio referencia commit imutável no arquivo `docs/atlas-vector-engine-lock.json`; motor não é copiado para o Studio.

Limites adotados:4 MiB,2.097.152 pixels,8–1536px por lado,8 MiB de SVG,20.000paths. Menores que os limites inicialmente propostos, com1201×1371 testado.5 solicitações/min por identidade e uma operação/container; quota em memória e concorrência são locais: usar1worker,1réplica ou quota compartilhada no proxy. Upload8s no Python/10s no gateway,30s parede/25sCPU no subprocesso,35s gateway,2GiB endereço virtual,16MiB arquivo. Cancelamento monitora desconexão; timeout mata grupo de processo e limpa diretório temporário.

CRC/chunks/IEND completos, rejeição de conteúdo anexado e APNG, Pillow verify, limites de descompressão, EXIF transpose, normalização RGBA sem metadados. ICC é descartado; não há gerenciamento profissional CMYK. SVG XML seguro allowlist svg/title/path, dimensões e fill-rule; gateway reconstrói caminhos, parser linear rejeita XML ativo. Sem entidades, imagens, links, scripts ou recursos externos. Download attachment, no-store, nosniff, CSP sandbox. Exibição por img/blob, sem injeção de HTML. Origem fixa, sem redirects e sem URL enviada pelo usuário. Subprocesso sem shell/segredo, temporários descartados.

## Validação em29/10

- Studio:388 testes,362 aprovados,26 ignorados,zero falhas. Testes históricos de moldes removidos continuam explicitamente ignorados pela v86.
- Gateway:12 casos, incluindo origem, assinatura/dimensões, multipart/campos duplicados, identidade derivada, backend indisponível, SVG ativo e delimitadores malformados.
- Python:28 casos aprovados localmente com integração real gateway→HTTP→subprocessoATLAS (CI isolado ignora somente esse teste entre repositórios). Fixtures sintéticas próprias; sem dados/logos de clientes.
- Resoluções150×171,501×571 e1201×1371 processadas de verdade, três cores genéricas, área externa e recorte transparente preservados; alphaIoU>0,97 nas fixtures. Não é garantia de fidelidade universal.
- Testes de reparo, limpeza em sucesso/timeout, subprocesso real, concorrência, quota por identidade, bytes/CRC/conteúdo anexado,413pixels, SVG hostil e busca exaustiva bloqueada.
- TypeScript aprovado. Lint específico:zero erros,duas recomendações de next/image; img é usado para blob local temporário. Não declarar lint global limpo; há dívida anterior fora do módulo.
- Build oficial executado; registrar resultado final no relatório/PR.
- Navegador: prévia encontrou primeiro restrição de host por perfil portátil; corrigido com helper oficial de perfil managed-linux. A tentativa seguinte foi bloqueada pela política do navegador. Sem contornar bloqueio; testes visuais atuais,375px e autenticação hospedada permanecem não verificados.
- CorelDRAW e Docker não executados neste ambiente. SVG foi validado por XML e rasterização CairoSVG, sem alegar teste no Corel.

## Implantação e rollback

No serviço privado Linux, checkout do SHA revisado do motor, dependências fixadas em requirements-service.lock, segredo forte em ambiente, uvicorn1worker ou Docker/Compose fornecidos. Proxy HTTPS, limite de upload, saída de rede bloqueada na infraestrutura, logs sem corpos/credenciais. Antes de ativar:health autenticado, PNG real através do Worker hospedado, cancelar/timeout, comparar/baixar, revisão visual nos temas e375px, importar no Corel no Windows. Nenhuma migração de dados VECTOR.

Rollback: manter/desativar `ATLAS_VECTOR_ENABLED`, reverter PRs separadamente e retirar serviço. Pedidos, listas e projetos não dependem do módulo. Nenhuma audiência/permissão de repositório foi alterada.
