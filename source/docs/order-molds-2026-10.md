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
