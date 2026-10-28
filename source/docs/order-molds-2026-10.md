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
