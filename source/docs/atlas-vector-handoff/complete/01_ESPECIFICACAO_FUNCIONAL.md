# Especificação funcional — ATLAS VECTOR (BETA)

## Propósito e navegação

- Localização: menu lateral **Ferramentas**, imediatamente depois de **Criador de planilha**.
- Texto do item: `ATLAS VECTOR (BETA)`; `id:'atlas-vector'`, rota `/ferramentas/atlas-vector`.
- Acesso: exige login como as demais ferramentas. Seguir a autorização atual do Uniform Studio; não tornar endpoint de backend público.
- A página é **independente** de Simulador, Planilha, Pedidos, Apresentações e Biblioteca. O item do menu pode ficar visível aos usuários autenticados do site para testes; se for usado apenas por administradores no primeiro deploy, condicionar *tanto* a navegação quanto os endpoints por feature flag/permissão validada no servidor.

## Textos aprovados (PT-BR)

- Breadcrumb: `FERRAMENTAS / ATLAS VECTOR`.
- Título: `ATLAS VECTOR` + identificação visual **BETA**.
- Subtítulo: `Converta imagens em vetores SVG. Ferramenta experimental: alguns resultados podem exigir acabamento manual.`
- Área de upload: `Arraste uma imagem aqui ou selecione um arquivo`.
- Aviso privacidade: `Os arquivos são usados apenas para gerar este resultado e não são adicionados aos seus projetos.`
- Botão principal: `Vetorizar imagem`.
- Botão final: `Baixar SVG editável`.
- Limpar: `Nova imagem`.
- Indisponível: `O motor ATLAS VECTOR está temporariamente indisponível. Nenhuma imagem foi processada.`
- Carregando: `Processando a imagem…` com indicação de que o tempo depende da complexidade; não inventar porcentagem.
- Erro recuperável: `Não foi possível vetorizar este arquivo. Tente outra imagem ou ajuste as opções.` com diagnóstico seguro e sem stack trace.
- Aviso baixa definição: `A imagem tem baixa resolução; letras e detalhes pequenos podem precisar de correção manual.`

## Fluxo único — cinco estados

**Vazio** → exibir upload, limites e aviso BETA. `Vetorizar imagem` bloqueado sem seleção.  
**Pronto** → carregar localmente visualização original, exibir dimensões e tamanho, validar extensão/assinatura do conteúdo; controles relevantes ativos.  
**Processando** → bloquear ações de envio duplicado; botão de cancelar se cancelamento real for suportado; sem indicador enganoso; opção de retornar ao upload sem deixar recurso órfão.  
**Resultado** → renderizar comparativo Original × SVG (zoom e fundo quadriculado), exibir aviso BETA e link `Baixar SVG editável`, permitir ajuste e nova geração.  
**Erro** → mostrar causa compreensível, preservar imagem no navegador para nova tentativa, sem download de arquivo inexistente.

## Layout desktop / celular

- Usar cores, tipografia, sidebar e tokens de tema **existentes** no site. Não criar sistema paralelo de temas.
- Cabeçalho + título BETA; bloco upload; bloco pequeno de configurações; comparador original e vetor (lado a lado no desktop, empilhados no celular); barra de ações.
- Exibir transparência em padrão quadriculado; permitir alternar para fundo claro e escuro apenas na **prévia**, sem alterar o SVG.
- Exibir dimensões originais, tamanho, modo escolhido e contagem de objetos/nós **somente quando calculados realmente**; não exibir porcentagem de qualidade sintética.
- Navegação por teclado, foco visível, `aria-live` para erros e andamento; no celular nenhuma coluna ultrapassa a largura da tela; evitar redimensionar SVG com estilos que criem clipping.

## Parâmetros com garantia de realidade

Na primeira entrega, **somente mostrar controles que alterem comprovadamente o resultado do motor**:

| Controle | Comportamento pretendido | Condição para habilitar |
|---|---|---|
| Modo de traçado | `Fiel` (padrão) ou `Simplificado (experimental)` | Implementar e testar ambos; não trocar apenas rótulo |
| Corrigir frestas | ligado por padrão | Reutilizar `atlas_fill_guard.py` com provas de que não há vazamentos externos |
| Quantidade de cores | não mostrar no MVP se paleta ainda for fixa | Só após segmentação multicolor genérica e validação |
| Sensibilidade | não mostrar até ter efeito real no caminho usado | Ligar à parametrização efetiva e testar regressões |
| Ajuste manual de nós | **fora do escopo** | Futuro editor separado |

Se o backend ainda não oferecer modo fiel + simplificado adequados, restringir a **um único modo padrão verdadeiro**. A palavra `BETA` não justifica botões inertes.

## Arquivos aceitos

- Entrada confiável MVP: PNG RGB/RGBA de logo; JPEG e WEBP somente depois de normalização + testes de assinatura, dimensões, EXIF e alpha. Imagens com múltiplos frames são rejeitadas ou normalizadas de forma documentada.
- Limites iniciais *propostos*: até 5 MiB de arquivo e 4 milhões de pixels, largura/altura entre 8 e 4096 px. Confirmar limites reais de CPU/memória da hospedagem e ajustar o menor valor antes de disponibilizar.
- Imagens JPEG são opacas. Não prometer remover fundo automaticamente.
- Entrada SVG não faz parte desta versão; a ferramenta foi pensada para raster→vetor.
- Saída: **SVG original em XML com `<path>` e/ou primitivas editáveis, transparência do escudo preservada quando existir, sem `<image>` incorporado, sem scripts, sem referências remotas e sem travas explícitas**. O CorelDRAW pode agrupar formas durante a importação, sem que isso seja um bloqueio do arquivo.
- Nome de download seguro, por exemplo: `atlas-vector-resultado.svg`; nunca usar nome fornecido pelo cliente sem sanitização.
- O arquivo final não deve ser salvo no perfil, biblioteca, projeto, R2 permanente ou listas. Armazenamento transitório de processamento deve ser eliminado no fim da solicitação ou por TTL curto verificável.

## Não objetivos

- Sem botão `Aplicar no uniforme` ou `Salvar na biblioteca`.
- Sem sincronização com projetos, pastas, orçamento ou apresentações.
- Sem galeria, compartilhamento, histórico de conversões ou banco de logos.
- Sem dependência de APIs pagas e sem VTracer como motor principal.
- Sem falsa promessa de fidelidade 100% em logos pequenos.
