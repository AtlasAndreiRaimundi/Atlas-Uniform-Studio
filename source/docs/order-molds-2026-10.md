# Modelos para apresentações e pedidos — outubro de 2026

Os seis GLBs enviados pelo proprietário foram instalados com identificadores novos. Os mapas antigos e os projetos que os utilizam permanecem intactos. O catálogo do simulador não foi alterado.

| Molde | Identificador | Painéis de desenho |
| --- | --- | --- |
| KIT ELITE 27 | kit-elite-27 | 19 |
| KIT RAGLAN BÁSICO | kit-raglan-basico | 11 |
| KIT NORMAL BÁSICO | kit-normal-basico | 13 |
| KIT RAGLAN ELITE | kit-raglan-elite | 16 |
| KIT FIELD RAGLAN | kit-field-raglan | 13 |
| POLO | polo | 10 |

## Uso

Selecione o molde ao criar uma apresentação. Baixe seu mapa SVG, desenhe na camada `ARTE_DESENHE_AQUI`, oculte `GUIAS_OCULTAR_ANTES_DE_EXPORTAR` e exporte a página inteira em PNG 4096 × 4096, sem recortar ou reposicionar os painéis. Envie o PNG à apresentação e vincule a apresentação ao pedido. Os cinco conjuntos usam a categoria `conjunto`; a polo usa a categoria de peça superior `camiseta`, com nome POLO.

Os mapas agrupam corpo e recortes, golas, mangas e filetes, e calção e cós. Cada painel possui nome e número. O SVG de conferência usa cores e números para verificar a correspondência entre mapa e modelo. As proporções originais dos painéis foram preservadas, inclusive diferenças existentes entre lados.

## Preparação e rastreabilidade

Arquivos em `public/assets/molds/<identificador>/`:

- `source.glb`: fonte preparada, com superfícies externas e detalhes necessários, sem imagens incorporadas nem iluminação da cena de origem.
- `model.glb`: mesma geometria preparada; UV0 organizado para o mapa, UV1 preservando o UV original do tecido.
- `template.svg`: mapa editável com contornos reais e guias removíveis.
- `proof.svg`: mapa colorido de conferência.
- `descriptor.json`: painéis, regiões, escala, orientação e hashes.
- `preparation.json`: nome do arquivo enviado, SHA-256 original, nomes das partes e detalhes decorativos.

Os GLBs originais enviados não são redistribuídos como assets estáticos: contêm texturas incorporadas e excedem limites de tamanho do importador. Seus hashes identificam os arquivos de entrada. A preparação remove faces internas duplicadas e espessuras; não simplifica os triângulos das superfícies externas. Na polo, botões e costuras mantêm geometria e transformações e ficam fora da aplicação da arte. O colarinho usa a superfície superior visível.

Para reproduzir a importação com os seis arquivos originais:

```sh
python scripts/prepare-order-molds.py /caminho/dos/arquivos
node scripts/install-order-molds.mjs
node --test tests/templates.test.mjs
```

O primeiro comando requer Python e NumPy somente para preparação offline. Não há novas dependências no site. O gerador online e seus limites de segurança permanecem inalterados.

## Validação

Os testes carregam todos os modelos com o GLTFLoader usado no visualizador, verificam os vínculos de projeto, hashes, posições, normais, índices, transformações, UVs originais, aplicação matemática do atlas e ausência de sobreposição entre regiões. A revisão visual dos seis mapas foi feita no navegador. O ambiente de conferência não disponibiliza WebGL; a aparência final iluminada no navegador requer conferência em uma máquina com aceleração gráfica.

## Versões somente camiseta

Cada kit publicado também possui uma opção `CAMISETA ...` na criação de apresentação, agrupada em “Camisetas e peças avulsas”. Os kits permanecem em “Kits completos — camiseta e calção”. As versões incluem EDGE 2027, ELITE 27, RAGLAN BÁSICO, NORMAL BÁSICO, RAGLAN ELITE e FIELD RAGLAN.

As versões só com camiseta possuem mapa editável e prova próprios, sem calção e cós. Compartilham a geometria e os UVs imutáveis do kit: o visualizador remove a outra peça antes de calcular o enquadramento, criar materiais e exportar imagens ou vídeos. O espaço vazio do mapa deve ser mantido na exportação de 4096 × 4096. Não se deve aplicar o mapa de camiseta ao kit completo.

Geração: `node scripts/create-shirt-variants.mjs`. Os projetos existentes e o simulador não são alterados.

## Troca de molde na apresentação

O campo “Molde da apresentação” permite alternar modelos sem sair do editor. A escolha passa a fazer parte da mesma revisão quando o usuário salva o projeto. Luz, nome e cliente são mantidos. Arte é reutilizada somente entre variantes explícitas do mesmo atlas, por exemplo kit e camiseta do mesmo kit. Trocas entre moldes distintos deixam a peça limpa para receber a arte correspondente; a arte anterior é guardada como arquivo na memória da sessão e pode ser recuperada voltando ao molde anterior antes de fechar o editor. Detalhes de câmera de um molde incompatível são removidos para evitar apontar para regiões erradas.

O salvamento valida propriedade, revisão e publicação do novo molde. Molde e arte são atualizados juntos, sem reaproveitar miniatura ou mapa incompatíveis. Falhas não removem os arquivos anteriores. Clientes e propostas não recebem o seletor. Apresentações compartilhadas recarregam o modelo quando uma nova revisão salva muda o molde.

## Polos com e sem recorte V

A polo original (`polo`) passou a ser identificada como **POLO COM RECORTE V**, mantendo modelo, UVs, identificador e projetos existentes. O novo arquivo `polo sem recorte v.glb` está disponível separadamente como **POLO SEM RECORTE V** (`polo-sem-recorte-v`), com dez painéis, 74.640 triângulos de tecido e mapas próprios. Botões e costuras permanecem separados da arte, e o hash do GLB enviado está registrado em `preparation.json` e no descritor. As duas opções aparecem na criação de apresentação e no seletor de troca de molde do editor. Não compartilham mapas de desenho.

Reprodução da nova importação:

```sh
python scripts/prepare-order-molds.py /caminho/dos/arquivos polo-sem-recorte-v
node scripts/install-order-molds.mjs polo-sem-recorte-v
node scripts/name-polo-variants.mjs
```

## Linha de Passeio Prime

Os arquivos `CONJUNTO PRIME + BERMUDA PASSEIO.glb` e `BERMUDA PASSEIO.glb` originam três opções:

| Opção | ID | Painéis | Peças do pedido |
| --- | --- | --- | --- |
| Kit de Passeio Prime | kit-passeio-prime | 17 | Camiseta + Bermuda |
| Camiseta Gola Prime | kit-passeio-prime-camiseta | 9 | Camiseta |
| Bermuda de Passeio | bermuda-passeio | 8 | Bermuda |

A camiseta é uma variante explícita do kit: compartilha seu atlas, omite a bermuda antes do enquadramento e possui SVG próprio. A bermuda avulsa usa o arquivo separado enviado pelo proprietário, com atlas próprio; não reaproveite nele o mapa do conjunto. Costuras decorativas ficam fora da aplicação da arte. Frente, costas, mangas, filetes, partes da gola Prime, cós e vistas dos bolsos são identificados nos mapas.

O kit declara explicitamente `garments: ["Camiseta", "Bermuda"]`, evitando a antiga inferência de que todo conjunto com “passeio” no nome seria polo + bermuda. A seleção de apresentações usa o grupo genérico “Kits completos”. Modelos antigos e simulador são preservados.

Reprodução:

```sh
python scripts/prepare-order-molds.py /caminho/dos/arquivos kit-passeio-prime
node scripts/install-order-molds.mjs kit-passeio-prime
python scripts/prepare-order-molds.py /caminho/dos/arquivos bermuda-passeio
node scripts/install-order-molds.mjs bermuda-passeio
node scripts/create-shirt-variants.mjs
```

## Coleções Jogo e Passeio; combinações com bermuda

A criação de apresentação, o seletor do editor e a biblioteca do administrador separam **Jogo** e **Passeio**. A classificação usa `line` no descritor e identificadores estáveis para modelos antigos, mantendo a coleção após renomear. O ADM pode usar **Renomear / editar** para mudar nome, categoria e linha, sem alterar geometria, UVs ou vínculos de projetos. Somente o administrador pode salvar essas alterações.

Foram compostos oito kits de passeio adicionais: polos com e sem recorte V, Edge 2027, Elite 27, Raglan Básico, Normal Básico, Raglan Elite e Field Raglan, sempre com a bermuda de passeio. As seis camisetas recebem versões avulsas na aba Passeio, com mapas correspondentes aos novos kits. As polos avulsas existentes continuam disponíveis. O Prime com bermuda mantém seu kit anterior. Os modelos e mapas originais de jogo permanecem intactos.

As composições aplicam as transformações de cena de origem e escalas uniformes por peça para apresentar o conjunto, alinhando cintura e barra sem deformar as peças. O atlas reúne regiões independentes de camiseta/polo e bermuda. O UV original de tecido permanece em UV1. Os descritores registram IDs e SHA-256 dos componentes, transformações e regiões. Esse ajuste de apresentação não redefine medidas de fabricação.

Reprodução das composições: `node scripts/compose-passeio-kits.mjs`; versões avulsas correspondentes: `node scripts/create-shirt-variants.mjs passeio`.

Os calções originais de jogo permanecem como versões sem recorte. Depois do envio de CALÇÃO DE JOGO COM RECORTE.glb, foram adicionadas seis combinações com os recortes reais do arquivo, preservando as duas versões e os projetos existentes. O simulador não foi alterado.

Validação: carregamento GLTF de cada composição, limites de arquivo e UVs, regiões sem sobreposição, numeração com detalhes decorativos, vínculos de projeto, autorização de renomeação, persistência da linha e troca das abas. A separação Jogo/Passeio foi conferida no navegador com o seletor real em uma tela de teste isolada, removida antes da publicação. Foram inspecionadas projeções da geometria composta; a renderização WebGL final permanece sem conferência visual neste ambiente.

## Calção de jogo com recorte e seis kits adicionais

O arquivo `CALÇÃO DE JOGO COM RECORTE.glb` gerou o modelo avulso `calcao-jogo-com-recorte`, com dez painéis e 4.078 triângulos de tecido. Foram mantidos quatro componentes do cós, quatro partes principais de frente/costas e os dois recortes laterais. O avatar de exibição, suas texturas, esqueleto e animações foram removidos; a geometria estática do calção e suas transformações foram preservadas. O SHA-256 do arquivo enviado está registrado na preparação.

As camisetas Edge 2027, Elite 27, Raglan Básico, Normal Básico, Raglan Elite e Field Raglan têm novas versões de kit com esse calção. Os descritores declaram `line: jogo`, `bottomVariant: com-recorte` e as peças Camiseta + Calção. A seleção distingue com/sem recorte por metadados, inclusive depois de renomear. Os seis kits anteriores com calção sem recorte continuam publicados.

Reprodução:

```sh
python scripts/prepare-order-molds.py /caminho/dos/arquivos calcao-jogo-com-recorte
node scripts/install-order-molds.mjs calcao-jogo-com-recorte
node scripts/compose-passeio-kits.mjs jogo
```

Renomear um kit fixa sua composição física no descritor; trocar um nome para uma expressão contendo Passeio não muda automaticamente camiseta/calção para polo/bermuda.

## 28/10/2026 — Calção 5 Partes e encaixe visual dos kits

- Arquivo do proprietário: CALÇÃO DE JOGO 5 PARTES(1).glb. Preparado como `calcao-jogo-5-partes`, nove painéis: cinco partes do corpo (duas frentes, duas costas e pala traseira) e quatro do cós. Geometria externa e UVs originais preservados; materiais e luz exportada substituídos pelo padrão neutro.
- Disponível avulso na linha Jogo e em seis kits com as camisetas de jogo existentes. Mapas SVG com contornos reais e guias identificadas, mantendo a classificação 5 partes separada de com/sem recorte.
- O visualizador aplica uma translação vertical ao calção inteiro quando necessário, antes de enquadrar o modelo. Considera a barra curva de frente/costas e busca sobreposição de 7% da altura do corpo; kits já encaixados mantêm a posição. Não muda os arquivos GLB antigos, escala, UVs ou arte; versões somente camiseta não recebem o ajuste. A mesma cena alimenta fotos e vídeo. Reabrir uma apresentação reaplica o encaixe. Miniaturas já salvas continuam até novo salvamento.
- Testes carregam todos os kits reais, verificam a sobreposição, idempotência, pais transformados e preservação de posições locais da geometria/UVs.
- Validação desta revisão: 365 testes aprovados, um pulado, zero falhas; TypeScript aprovado. Mapa revisado em projeção 2D. A prévia gerenciada falhou na inicialização do servidor; renderização WebGL no navegador não foi validada nesta rodada.
- A publicação omite `cloth-input.glb`, intermediários do gerador sem referência em execução. Arquivos canônicos `model.glb` e `source.glb` e a cópia de origem no repositório são mantidos.

## 28/10/2026 — Proporção das bermudas nos kits de passeio

- Corrige os nove kits que usam bermuda de passeio (incluindo as duas polos): escala uniforme de 90% ao redor do cós e sobreposição mínima do cós de 11% da altura do corpo da camiseta. A proporção anterior se baseava na largura da barra, deixando a bermuda grande em relação à polo.
- Ajuste somente na cena de apresentação, antes do enquadramento; alcança imagens e vídeos. Bolsos, cós e partes da bermuda recebem a mesma transformação. Camisetas, botões e costuras das mangas, kits de jogo e bermuda avulsa preservados. Arquivos GLB, UVs, mapas e arte não são regravados. A escala é aplicada uma única vez por malha, inclusive se o alinhamento for chamado novamente.
- Reabrir aplica o ajuste; miniaturas já salvas atualizam no próximo salvamento.
- Validação: 366 testes aprovados e um pulado; regressão com os nove kits reais verifica redução uniforme, subida do cós nas polos, preservação das camisetas e idempotência. Comparação de projeções geométricas em frente/lado. Prévia gerenciada indisponível por servidor preso na inicialização; renderização WebGL final não verificada no navegador.

## 28/10/2026 — Subida adicional das bermudas

- A pedido do proprietário, sobe as bermudas dos nove kits de passeio mais aproximadamente 10 cm em relação ao encaixe da v82, mantendo a escala de 90%. Aplica-se ao conjunto inferior inteiro, inclusive cós e bolsos, uma única vez por carregamento.
- Como os GLBs têm escalas de exportação diferentes, a posição visual usa como referência um corpo de camiseta de 70 cm: acréscimo de 10/70 da altura do corpo. É um ajuste de apresentação, sem alterar medidas de fabricação, GLBs, UVs ou mapas. Jogos e peças avulsas preservados.
- Quatro testes direcionados aprovados; comparação do deslocamento contra o encaixe anterior e verificação de que chamadas repetidas não acumulam subida. Prévia WebGL permanece indisponível neste ambiente; validação geométrica automatizada.
