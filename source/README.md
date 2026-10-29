# ATLAS UNIFORM STUDIO

Estúdio de apresentação de uniformes: projetos por conta, arte 2D aplicada ao
modelo real do CLO, ajustes de visualização e apresentação por link estável.
Interface em grafite com detalhes discretos em dourado. Marcações lineares
de quadra de futsal aparecem como marca d’água no login, no painel de
projetos/administração e ao fundo da interface do estúdio. O SVG é local,
estático e decorativo, com opacidade baixa, máscaras de suavização e sem
eventos de ponteiro. Os traços ficam atrás do uniforme e dos controles.

## Fluxo

1. Entre com a conta ChatGPT. A plataforma fornece a identidade e o e-mail.
2. Defina a assinatura profissional em seu perfil.
3. Use **Nova pasta** para organizar por cliente ou equipe. Dentro dela, crie
   projetos com nome e cliente opcional; projetos sem pasta também são aceitos.
4. Desenhe no SVG do molde, exporte a página inteira em PNG quadrado
   (4096 × 4096 recomendado) e use **Carregar mapa completo**.
5. Ajuste iluminação/fundo e use **Salvar projeto**. A imagem original é
   armazenada em R2; nome, cliente, ajustes e revisão ficam em D1.
6. Em **Exportar → Link do cliente**, crie uma proposta desta versão. A cópia enviada fica preservada
   para comparação, comentários na peça e aprovação. Somente o designer altera a arte.
7. Use **Exportar → Imagem** para baixar quatro vistas em PNG em linha de 4096 × 2304 px ou uma grade
   de 2400 × 3000 px com frente,
   costas, lateral esquerda e lateral direita, logo Meinerz, nome do projeto
   e assinatura do designer. A captura usa o modelo e o material atuais com
   luz, contraste e fundo escolhidos. Alterações são salvas antes de exportar.
   **Outros formatos** inclui o ângulo atual, redes sociais, PDF e pacote completo.
8. Troque o mapa e salve o projeto. Use **Adicionar versão atual** para incluir a
   revisão no mesmo link da proposta sem substituir as opções anteriores. Links
   livres antigos (`/p/`) continuam mostrando a revisão atual a cada 30 segundos.

A publicação preserva a audiência pública configurada no Site. Projetos e
pastas exigem autenticação por conta; links de apresentação concedem acesso
somente à peça ou proposta correspondente. A autenticação disponível nesta
hospedagem é Sign in with ChatGPT; não há senha própria ou envio de códigos por
e-mail feito pelo aplicativo.

## Pastas de projetos

**Meus projetos** reúne as pastas e os projetos sem pasta; a entrada lateral
duplicada **Apresentações** foi substituída pelos filtros **Todos / Com link**.
O filtro reconhece links livres e propostas ativas. Dentro de uma pasta, os
filtros e a busca atuam nos seus modelos. Na raiz, a busca também encontra
projetos guardados em pastas, mostrando seu contexto.

**Nova pasta** aceita um nome livre de até 100 caracteres e abre a pasta criada.
O projeto novo seleciona essa pasta como destino. O menu de cada projeto
oferece **Mover para pasta**, inclusive voltar para fora das pastas. Pastas
podem ser renomeadas ou removidas; remover a pasta mantém os projetos e arquivos na raiz.
O retorno do editor leva à pasta atual do projeto.

Pastas persistem em D1 por identidade estável, com nomes únicos por conta.
A referência opcional `projects.folder_id` tem `ON DELETE SET NULL` e índice
por proprietário/pasta. A migration é aditiva; projetos existentes ficam sem
pasta. Mover não altera arte, revisão, data de edição, links ou aprovações.
As rotas `/api/project-folders` e `/api/projects/:id/folder` usam os mesmos
controles de identidade e origem das demais mutações privadas.

## Contas e arquivos

- `profiles.user_id` e `projects.owner_id` usam o identificador estável recebido
  do servidor, nunca um e-mail ou identificador enviado pelo navegador.
- Cada consulta/mutação privada exige identidade e filtro por proprietário.
- Uploads não têm URLs R2 públicas. A leitura acontece em rotas autorizadas.
- Links usam tokens aleatórios de 256 bits, estáveis durante as revisões,
  revogáveis. A exclusão do projeto invalida seu link livre e remove seus arquivos
  de edição. Cópias já enviadas em propostas permanecem no histórico; desative
  o link correspondente em Propostas para encerrar o acesso.
- A API de apresentação só implementa GET e não devolve e-mail ou ID do dono.
- Versão otimista impede que uma aba antiga sobrescreva uma revisão recente.
- Novos arquivos são gravados antes da atualização da linha. Falhas de gravação
  removem os novos arquivos e preservam a arte anterior. Após o commit, arquivos
  substituídos são removidos. Falhas de limpeza podem deixar objetos sem uso,
  mas nenhuma rota concede acesso a eles.
- Projetos novos começam como rascunho e exigem arte salva antes de compartilhar.
- Uma apresentação visualizável pode ser capturada pelo visitante; o modo de
  cliente restringe edição, não equivale a DRM do arquivo.
- Salvar atualiza a revisão de edição. Exportar um pacote ou enviar uma proposta
  preserva uma cópia imutável da revisão; não há restauração completa de um
  projeto antigo, cobrança ou planos nesta etapa.

## Simulador preservado

O GLB original possui 71.405 triângulos e dez painéis. O atlas acompanha o código:
não há seleção de painel, recorte, importação de JSON ou interpretação por IA.
Uma única imagem original é compartilhada por todos os materiais. Cada revisão
substitui a imagem inteira mantendo os UVs. O molde aprovado continua como opção padrão
enquanto estiver publicado na biblioteca.
Outros modelos são cadastrados pelo administrador. O arquivo original contém
camiseta, sem calção.

Contrato `camiseta-teste-clo-v1`: primitivas 2 frente, 7 costas, 8 manga ESQ,
9 manga DIR, 6 punho ESQ, 5 punho DIR, 1 gola ESQ, 0 gola DIR, 4 recorte ESQ,
3 recorte DIR. ESQ/DIR seguem os lados vistos pela frente no mapa do usuário.
O modo original preserva UVs originais; arte usa o atlas e o relevo do tecido
continua com TEXCOORD_1. Nenhuma parte é redesenhada, girada ou espelhada.

A referência atual usa luzes neutras e exposição reduzida para preservar tons claros. Contraste
atua apenas no canvas 3D. Fundos, presets e cor personalizada continuam
disponíveis. A exportação PNG compõe o fundo e os ajustes sobre a peça. A capa
salva do projeto é uma imagem reduzida da apresentação atual, quando WebGL está
disponível. A prévia neutra do molde deriva da geometria original.

## Desenvolvimento e publicação

Vinext/React em Cloudflare Workers, integração `sites()` preservada, D1 `DB` e
R2 `BUCKET`. `public/` preserva o simulador em ES modules e Three.js 0.180.0 local,
sem CDN durante o uso. O código anteriormente estático foi migrado mantendo o
mesmo projeto de hospedagem, URL e audiência.

- `npm test`: geometria, 1.739 pontos do SVG, atlas compartilhado, lados,
  iluminação, pixels da exportação, isolamento de contas, persistência,
  links/revogação/exclusão e conflitos de revisão.
- `npm run typecheck`: TypeScript.
- Build/publicação seguem o helper do Sites e o lockfile pnpm.
- `npm run db:generate`: gere migrations após alterar `db/schema.ts`.
- Aplique localmente cada migration pendente conforme o README do starter.
  A publicação aplica separadamente as migrations no D1 hospedado.
- Preview supervisionado: `sites-preview start /workspace/sites/uniforme-studio-andrei`.
  A autenticação simulada permanece desativada no perfil managed-linux.

A conferência da GPU exige um navegador com WebGL. O ambiente de QA atual
não disponibiliza WebGL nem identidade de usuário no preview. Os testes do
serviço usam SQLite real com o mesmo SQL e um bucket em memória. A apresentação
anônima foi conferida com D1 e R2 locais; os dados de QA não são publicados.


## Marca e autoria

ATLAS UNIFORM STUDIO, criado por **Andrei Raimundi**. O wordmark da referência
é exibido preservando seus pixels, com a área “ESPORTES” fora do enquadramento.
Chakra Petch em peso 700 nos títulos e 400 nos textos: arquivos locais, sem CDN,
com a licença OFL em `public/fonts/OFL.txt`. A assinatura dos designers nos
projetos continua independente dos créditos de criação da plataforma.

## Administração de moldes

`/admin/molds` usa a identidade estável do proprietário configurada no segredo
`ADMIN_USER_ID`. A permissão é verificada no servidor tanto na página quanto em
todos os endpoints administrativos; nomes, e-mails e campos enviados pelo
cliente não conferem esse acesso. Sem configuração, o acesso é negado.

Fluxo: enviar GLB, gerar o mapa, conferir o SVG e a prévia 3D numerada, confirmar
e publicar. Novos modelos entram em rascunho. Apenas publicados aparecem para
criar projetos. O GLB original, o modelo com atlas, o SVG e o mapa de conferência
ficam em R2. O cadastro e o descritor do molde ficam na tabela D1 `templates`.
O envio é transacional do ponto de vista do cadastro: falhas de gravação limpam
os objetos enviados e não criam um molde parcial.

O **KIT EDGE 2027**, solicitado pelo proprietário, também acompanha a publicação
em `lib/installed-templates.mjs` e `public/assets/molds/kit-edge-2027/`. O GLB
de origem tinha 39,1 MiB e três superfícies por painel. A versão preparada
mantém os vértices, normais, índices e UVs das 19 superfícies externas, com
185.891 triângulos e 94.655 vértices; o interior utiliza o material do simulador.
O mapa tem 4096 × 4096, com SVG editável, guia PNG e conferência colorida.
Esse registro aparece no catálogo e permite criar projetos imediatamente;
renomear, arquivar, excluir e restaurar usam os mesmos controles administrativos.
As alterações ficam no D1 e prevalecem sobre o registro incluído na publicação.
Nenhum seed é gravado em migration e nenhuma permissão de acesso é ampliada.

O mapa organizado usa `kit-edge-2027-mapa-v2`, com nomes anatômicos informados
pelo proprietário: corpo e recortes na parte superior, golas ao lado, mangas e
filetes na segunda faixa, e calções e cós embaixo. Os números originais P01–P19
acompanham os nomes. `scripts/layout-kit-edge-2027.mjs` reproduz a distribuição,
atualiza o atlas UV0 e gera SVG e conferência. Posições, normais, índices e UV1
permanecem iguais. O cadastro anterior fica arquivado para manter os mapas das
artes já salvas; novos projetos usam a versão organizada.

Em `kit-edge-2027-mapa-v3`, o filete P07 foi igualado ao P08 no atlas: ambos
têm 633,156 × 33,340 pixels. A diferença vinha da densidade de UV do GLB de
origem; as superfícies 3D dos dois filetes têm área praticamente igual.
`scripts/equalize-kit-edge-trims.mjs` ajusta somente o contorno e os UV0 do P07,
com a escala por eixo em `panels[].atlasScale`. Geometria e UV1 permanecem
idênticos. O catálogo oferece a revisão atual; v1 e v2 continuam disponíveis
para projetos salvos em seus respectivos mapas.

`lib/template-generator.mjs` lê geometria e UV0 do GLB, separa ilhas conectadas
usando posição e UV, extrai seus contornos e organiza retângulos sem rotação,
espelhamento ou escala desigual. Todas as partes usam a mesma escala de UV.
A malha mantém posições, normais e índices; os UVs originais vão para UV1 e o
atlas gerado fica em UV0. As texturas originais e os relevos de tecido continuam
com os UVs de origem no visualizador. O GLB pronto é carregado pelo mesmo
GLTFLoader do simulador. Nenhuma imagem de arte de cliente é redesenhada.

Requisitos deste importador: GLB 2.0 estático, malha triangulada, um conjunto de
UVs de origem (UV0), texturas incorporadas, até 20 MB, 200 mil triângulos, 250 mil
vértices e 128 ilhas. Arquivos sem UVs, animados, com recursos externos, Draco,
Meshopt, quantização ou contornos/UVs ambíguos são rejeitados com orientação.
O importador organiza UVs existentes; não cria uma planificação correta para
malhas sem UVs. Os painéis recebem números, sem adivinhar frente, costas ou
lados a partir da aparência. A prévia colorida permite identificar cada número.

O SVG usa `FUNDO_MANTER_4096`, `ARTE_DESENHE_AQUI` e
`GUIAS_OCULTAR_ANTES_DE_EXPORTAR`. O PNG disponível no painel é um guia; o SVG
permite desenhar e ocultar os guias no Corel antes de exportar o mapa inteiro.
É um mapa para aplicação visual, sem margem de costura ou escala de corte.

Cada projeto guarda o ID do molde escolhido na criação. O corpo de atualização
de um projeto não troca esse ID. O modelo e o atlas de um cadastro são fixos;
para outra modelagem, o administrador cadastra outra versão. Arquivar um molde
retira-o da lista de novos projetos e preserva todos os projetos já vinculados,
seus arquivos e links. O atlas do molde original aprovado não foi alterado.

**Editar dados** permite renomear o molde e mudar seu tipo. O nome novo aparece
no catálogo e no título do SVG gerado. **Trocar GLB** abre o envio de uma nova
versão em rascunho, com seu próprio atlas, preservando os projetos da versão
anterior. **Excluir** envia o cadastro para a **Lixeira**; os arquivos ficam
disponíveis para os projetos e links existentes. É possível restaurar o molde:
versões importadas retornam a rascunho para nova conferência. O molde original
também pode ser renomeado ou enviado à lixeira sem alterar sua geometria.

Os testes adicionais verificam os 10 painéis e 1.739 pontos de contorno do GLB
real, todos os vértices do atlas, geometria e UVs originais, múltiplas ilhas,
GLTFLoader, isolamento do administrador, rascunhos/publicação, arquivos,
seleção do modelo por projeto, arquivamento e falhas com limpeza dos uploads.
A prévia administrativa autenticada e a aparência com GPU exigem conferência
na conta do proprietário; o navegador de QA atual não recebe identidade nem
WebGL. Os registros de QA locais não são publicados.

## Organizador de pedidos

**Organizar planilhas**, em `/organizador`, começa em **Criar manualmente** e
também aceita texto e arquivos XLSX, CSV, TSV e TXT (10 MB; 5.000 itens).
O formulário segue o template de Andrei com seis campos: **Tipo, Nome,
Número, Tam. Camiseta, Tam. Calção, Quantidade**. Não existe coluna Adicional.
Tipo significa Linha, Goleiro, Torcida, Comissão Téc., Staff ou Outro; a peça
é escolhida à parte: Kit, **Kit - Jaqueta + Calça**, Camiseta, Polo, Jaqueta,
Calça, Colete, Regata ou Calção. Modelo e cor são opcionais, com detalhes por
item quando necessário.

Os códigos de tamanho vêm do template: P, M, G, EG, EXG, BLP, BLM, TAM10,
TAM12, ESP1 etc., além de PP. O resumo exibe peça → Masculina / Baby Look /
Infantil → `P=2`, `TAM10=3`. Um **Kit** foi definido explicitamente como
camiseta + calção; o **Kit - Jaqueta + Calça** contém uma jaqueta e uma calça.
Ambos os tamanhos são obrigatórios e independentes. Cada kit conta as duas
peças nas grades correspondentes. Os rótulos do formulário e as colunas do
Excel acompanham as peças; listas mistas usam os títulos combinados.
Peças avulsas contam somente sua categoria. Não se inventa o tamanho faltante
de um kit. Cor e modelo diferentes têm resumos distintos.

Importações no template identificam camisetas avulsas, calções avulsos e kits
pelas colunas de tamanho preenchidas. Listas antigas com um tamanho único e
Peça / kit continuam legíveis; um kit antigo sem o tamanho do calção precisa
ser completado. Nomes e números podem ficar vazios, `07` é preservado como
texto, e quantidade ausente usa 1. Trechos desconhecidos e campos inválidos
exigem conferência; duplicatas são mantidas. Abas ocultas Tamanhos e Tipos
não viram itens. O ajuste de colunas fica recolhido quando o reconhecimento
funciona. Adicionar, editar, excluir e substituir por importação têm desfazer.

O botão **Exportar planilha** aparece no topo da ferramenta e junto à lista;
ambos baixam o mesmo Excel `.xlsx` e indicam quando a exportação está em andamento.
Os botões ficam liberados com itens válidos e sem preenchimento pendente.
O Excel tem **Pedido**, com as seis colunas na ordem do template, **Resumo**
no formato de texto solicitado e listas ocultas para seleção de tipos e
tamanhos. **Dados do pedido** é incluída somente se produtos, modelos ou cores
exigirem contexto que não cabe nas seis colunas; a reimportação usa essa aba
sem contar a apresentação e o resumo novamente. Há modelo em branco para
download e botão **Copiar resumo**, inclusive para WhatsApp.

O processamento é local no navegador, sem salvar pedidos na conta. Baixe o
Excel para guardar o trabalho; há aviso ao sair com alterações não exportadas.
Um item em preenchimento deve ser adicionado, salvo ou descartado antes da
exportação. ExcelJS 4.4.0 permanece local em `public/vendor/exceljs/`.
Testes conferem bytes XLSX, releitura, colunas, grades, quantidades e proteção
contra contagem duplicada. `ORDER_REFERENCE_XLSX` permite conferir o template
original em um teste adicional, sem copiar anexos do usuário para o Site.

## Exportação de quatro vistas

`public/four-view-export.js` enquadra a caixa completa do molde nas quatro
câmeras com a mesma distância e escala. ESQ/DIR seguem a vista de frente
do mapa aprovado. Cada render é copiado imediatamente para a composição
antes de reutilizar o buffer WebGL. O wordmark usa o mesmo recorte de pixels
do cabeçalho do site, sem ESPORTES. A arte não passa por geração de imagem.

A transação de captura é síncrona e restaura tamanho, pixel ratio, viewport,
scissor e render target em `finally`, inclusive após falhas. A câmera ao vivo,
OrbitControls, rotação automática, materiais, UVs e luzes não são alterados.
A barra de atalhos de frente, costas e laterais foi removida do visualizador
livre. A exportação das quatro vistas continua disponível.
A codificação PNG ocorre depois de restaurar o visualizador. Não há novos
uploads, alteração de dados ou chamada ao servidor durante a exportação.

Os testes conferem as quatro direções, enquadramento de todas as quinas do
molde em diferentes proporções, escala comum, restauração após erro,
composição de pixels, contraste, logo, nomes e resolução. A captura 3D
real exige conferência em um navegador com WebGL; o navegador de QA deste
ambiente não disponibiliza GPU.


## Apresentações, propostas e biblioteca por cliente

O botão **Exportar** abre um painel com três escolhas: **Imagem**, **Vídeo
girando** e **Link do cliente**. Quatro vistas em PNG é o padrão, com uma prévia
reduzida e um botão principal. Outros formatos (WhatsApp, Instagram, ângulo
atual, PDF e ZIP) ficam recolhidos. Resolução, PNG/JPG, composições salvas e
detalhes ficam em Ajustes avançados. O vídeo aceita 6, 10 ou 15 segundos.
A aba **Cliente** concentra propostas, observações e arquivos da pasta. Os links
livres antigos continuam válidos e a apresentação do cliente permanece sem
controles de edição.

Imagens, PDF, pacote e vídeo salvam alterações e usam a referência de uma
versão congelada antes de gerar o arquivo. O PDF avulso contém a composição
de quatro vistas e a ficha de aprovação; o PDF do pacote inclui também os
detalhes salvos. Depois de criar um link, o botão principal passa a Copiar
link. Alterações no projeto invalidam o atalho para o link anterior no painel,
preservando o histórico da proposta enviada.

As composições Meinerz (estúdio, quadra e claro) aplicam luz e fundo. Uma composição
pessoal guarda também o contraste, a câmera e o formato em linha ou grade, sempre
com a logo Meinerz. Os registros ficam em D1 por conta. Os detalhes são próprios
do projeto: aproxime a região desejada e salve um enquadramento nomeado, até oito.
Eles ficam disponíveis na apresentação do cliente e nas páginas do pacote.

O material do tecido usa a imagem somente nas faces externas. As faces
internas têm cor base cinza claro (`#d0d0d0`, convertido de sRGB para o espaço
linear) e iluminação física, aplicada no shader antes
do cálculo da luz (`public/fabric-interior.js`). Não há outro mapa, outra
malha, novas coordenadas de textura ou manequim; a câmera mantém a liberdade
de rotação. O acabamento vale para arte, neutro, conferência e material
original, no estúdio, nos links e nas exportações. Materiais PBR e unlit do
GLTF são aceitos. O molde de referência tem faces orientadas para fora,
verificadas com raios externos e internos nos testes sem GPU. A aparência
final do acabamento ainda exige conferência em um navegador com WebGL.

A iluminação de referência usa luzes brancas neutras, exposição 0,9 e
`NeutralToneMapping`, reduzindo o clareamento e a perda de cor nas áreas claras.
Luz ambiente, principal, preenchimento e reflexos foram equilibrados no mesmo
perfil para projetos existentes, links e exportações. Os controles percentuais
continuam relativos a essa referência; **Padrão** restaura os ajustes de luz.
Os pixels da arte e as coordenadas do mapa permanecem intactos.

O ZIP contém a composição de quatro vistas, as quatro imagens individuais,
WhatsApp em 1080 × 1440, Instagram em 1080 × 1080, os detalhes cadastrados, um PDF
para aprovação e um manifesto com a referência da versão. O PDF é um arquivo real,
com páginas para a composição, cada detalhe e conferência da aprovação. As imagens
mantêm as proporções; não há redesenho da arte, transformação de UVs ou IA.
Pacote e vídeo usam a arte aplicada, mesmo se a prévia estiver no modo neutro
ou de conferência, e restauram esse modo ao terminar. O navegador gera os
arquivos com JSZip 3.10.2 e pdf-lib 1.17.1 locais e licenciados.
O último arquivo gerado continua acessível pelo link de download da aba Entrega.

O vídeo faz uma volta de dez segundos em 1080 × 1080, com captura a 24 fps,
fundo, contraste e logo. Uma câmera independente se move; o molde e os materiais
não mudam. MP4 é usado quando suportado, com WebM como alternativa anunciada pelo
navegador; a extensão segue o contêiner real. A gravação pode ser cancelada e é
interrompida ao ocultar a aba. Os streams e o estado de renderização são limpos
inclusive em falhas. Não há conversão de vídeo no servidor.

### Versões enviadas e aprovação

`proposal_versions` conserva uma cópia em R2 da imagem original, seus dados de
molde, apresentação, detalhes, designer, número da revisão e data. Uma restrição
única por projeto/revisão impede duplicação. Alterar ou excluir o projeto de
edição não muda essa cópia. Os arquivos de geometria dos moldes continuam fixos.

**Propostas e retornos** permite selecionar até oito projetos com arte salva ou
acrescentar uma revisão a uma proposta existente. O endereço `/proposta/<token>`
usa token aleatório de 256 bits. A apresentação oferece uma opção ou comparação
de duas, com seletores identificados. A troca da opção em análise limpa a marcação
e a confirmação de aprovação para não carregar decisões entre versões.

O cliente marca um ponto obtido por raycast na geometria, informa seu nome e a
observação. Ponto, painel, câmera, opção e data são armazenados juntos. A câmera
salva permite voltar à região. Os pedidos permanecem pendentes até o proprietário
marcar **ALTERADO**, com data, identidade interna do designer e opção de reabrir.
O servidor verifica a propriedade antes de aceitar essa mudança; o token do
cliente não confere permissão de edição da arte ou do status.

A aprovação exige a declaração explícita da versão selecionada. O primeiro nome
informado e a data ficam preservados por proposta/opção, e uma revisão nova não
herda aprovação. Trata-se do registro do nome declarado pelo cliente, sem
verificação de identidade ou certificado de assinatura. A tela informa isso.
Desativar a proposta bloqueia novas leituras, arquivos, comentários e aprovações,
preservando o histórico para o designer. O token de uma proposta não abre versões
que pertencem somente a outra. Comentários têm limites de tamanho e frequência.

### Pastas de projetos

Cada pasta em **Meus projetos** reúne somente os modelos daquele cliente ou
equipe. Ao abrir a pasta, os projetos aparecem diretamente, com busca, ordenação
e filtros **Todos** e **Com link**. Crie, renomeie e remova pastas, ou mova
projetos entre elas. Remover a pasta devolve os projetos à raiz.

A interface de arquivos e cores foi removida, incluindo o atalho no editor.
Endereços antigos com `tab=files` abrem os modelos da pasta. `/biblioteca` e
`acervo.html?tab=library` continuam redirecionando para **Meus projetos**.

Os dados antigos de arquivos e paletas e suas APIs são mantidos por
compatibilidade. Esta alteração não remove registros, imagens ou versões.

### Verificação desta etapa

Os testes usam SQLite com todas as migrations e verificam isolamento das contas,
preservação dos arquivos após revisão/exclusão, associação de comentários e
aprovações à opção correta, status exclusivo do dono, limite de oito opções,
revogação e limpeza após falha de gravação. A exportação usa Canvas nativo para
conferir PNGs, grade, ZIP e leitura do PDF gerado. Um gravador simulado verifica
conclusão, cancelamento, limpeza de tracks e preservação da câmera.

No navegador, foram conferidos os formulários, composições, detalhes, comparação,
aprovação da opção de QA, marcação de status e largura móvel de 375 px. Interfaces
privadas usaram dados de demonstração locais; suas rotas continuam exigindo a
identidade real. O preview não tem WebGL, portanto raycast sobre o molde real e
aparência/codec do vídeo exigem conferência com GPU. Os fixtures de interface
são removidos antes de empacotar e os registros locais não são publicados.

A audiência da hospedagem continua privada. Os links de proposta estão
implementados, mas o acesso de clientes externos depende de liberar a audiência
ou conceder acesso a esses clientes pelo compartilhamento do Site.


## ATLAS VECTOR BETA — atualização29/10/2026

Pacote técnico completo e implementação de gateway/serviço em branch de revisão. Vetorização real pelo motor ATLAS; a ativação web permanece bloqueada até configurar serviço Python externo e validar o fluxo hospedado. Consulte [relatório](docs/atlas-vector-beta.md).
