# Pack de apresentações · 12/11/2026

17 GLBs fornecidos pelo proprietário. Os originais permanecem preservados; o catálogo usa cópias sem manequim/texturas de exportação, mantendo coordenadas, índices, normais e UVs das superfícies externas. Botões e pespontos presentes são preservados como detalhes sem painéis de arte.

## Seleção

KIT → Modelagem (Normal/Raglan) → Gola → Com/Sem recorte → Variante, quando houver → Calção 2 partes. A classificação da manga considera a geometria, inclusive arquivos sem “Raglan” no nome. A variante FAIXA fica separada. O KIT EDGE anterior permanece disponível e conserva seu atlas.

## Desenhar no Corel

Baixe o SVG no projeto ou no administrador de moldes. A página tem 4096 × 4096 px, grupos de corpo/recortes, golas, mangas/filetes e calção/cós. Desenhe no grupo ARTE_DESENHE_AQUI. Oculte GUIAS_OCULTAR_ANTES_DE_EXPORTAR e exporte a página inteira para PNG, mantendo 4096 × 4096. O SVG de conferência usa cores e números para verificar cada painel.

## Reproduzir

Execute `python scripts/prepare-presentation-pack.py PASTA_DOS_ORIGINAIS` e `node scripts/install-presentation-pack.mjs`. O processamento offline aceita as três malhas de aproximadamente 228 mil triângulos, sem simplificá-las; os limites do upload online continuam em 200 mil. Execute os testes de presentation-pack e templates antes de publicar.

Os modelos preparados completos ficam versionados no repositório nativo do Site. O espelho GitHub restaura os GLBs pelos endereços de apresentação imutáveis, com SHA-256 registrado em presentation-pack-remote-assets.json. Mapas SVG, descritores e scripts são mantidos no código-fonte.

| Origem | Modelagem | Gola | Recorte | Variante |
|---|---|---|---|---|
| KIT - POLO REDONDA - BASICO.glb | NORMAL | POLO REDONDA | Sem | Padrão |
| KIT BASICO NORMAL - CALÇAO BASICO.glb | NORMAL | REDONDA | Sem | Padrão |
| KIT BASICO NORMAL - GOLA BRASIL - CALÇAO BASICO.glb | NORMAL | BRASIL | Sem | Padrão |
| KIT BASICO RAGLAN - CALÇAO BASICO.glb | RAGLAN | REDONDA | Sem | Padrão |
| KIT BASICO RAGLAN GOLA BRASIL - CALÇAO BASICO.glb | RAGLAN | BRASIL | Sem | Padrão |
| KIT BASICO RAGLAN V - CALÇAO BASICO.glb | RAGLAN | V | Sem | Padrão |
| KIT ELITE RAGLAN- SEM RECORTES - CALÇÃO BASICO.glb | RAGLAN | ELITE | Sem | Padrão |
| KIT ELITE- ARREDONDADO - CALÇÃO BASICO.glb | RAGLAN | ELITE ARREDONDADA | Com | Padrão |
| KIT ELITE- ARREDONDADO FAIXA - CALÇÃO BASICO.glb | RAGLAN | ELITE ARREDONDADA | Com | FAIXA |
| KIT FIELD COM RECORTE - CALÇÃO 2 PARTES.glb | RAGLAN | FIELD | Com | Padrão |
| KIT FIELD SEM RECORTE RECORTE RAGLAN - CALÇÃO 2 PARTES.glb | RAGLAN | FIELD | Sem | Padrão |
| KIT GOLA 27 - COM RECORTE - CALÇÃO BÁSICO.glb | NORMAL | GOLA 27 | Com | Padrão |
| KIT GOLA V RAGLAN TRASPASSADA - CALÇÃO BASICO.glb | RAGLAN | V TRASPASSADA | Sem | Padrão |
| KIT GOLA V RAGLAN TRASPASSADA COM RECORTE - CALÇÃO BASICO.glb | RAGLAN | V TRASPASSADA | Com | Padrão |
| KIT POLO - CALÇÃO BASICO.glb | NORMAL | POLO | Sem | Padrão |
| KIT POLO - RETRO - CALÇÃO BASICO.glb | NORMAL | POLO RETRÔ | Sem | Padrão |
| KIT PRESTIGE RAGLAN - CALÇÃO BASICO.glb | RAGLAN | PRESTIGE | Sem | Padrão |
