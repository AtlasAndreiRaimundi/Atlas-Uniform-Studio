# ATLAS Uniform Studio — CAM-001
## Camiseta Sublimada / Transfer — especificação de implementação

**Estado:** levantamento concluído, aguardando implantação e homologação.  
**Prioridade:** impedir combinações inválidas e ambiguidades na ordem de produção.  
**Fonte:** decisões do usuário no levantamento técnico. Este documento é a referência de requisitos, não documentação de código implementado.

## 1. Identidade e catálogos permitidos

- `productCode: CAM-001`, `category: CAMISETA`, `name: CAMISETA SUBLIMADA / TRANSFER`.
- `mainFabric` — **obrigatório, enum restrito**: `DRY`, `ELASTIC`, `MANCHESTER`, `ABSTRAT`, `HIBISCO`, `JACQUARD DIAMOND`, `JACQUARD ELITE`, `SOLUTIO`.
- Não oferecer tecidos de outros produtos só por estarem presentes na biblioteca. Os oito tecidos podem ser combinados com os nove modelos de gola.
- `fit` enum: `MASCULINA`, `BABY LOOK (FEMININA)`, `INFANTIL (UNISSEX)`.
- Grades restringidas por modelagem:
  - MASCULINA: `P, M, G, GG, EG, EXG, 4G, 5G, 6G`.
  - BABY LOOK: `PP, P, M, G, GG, EG, EXG`.
  - INFANTIL: `TAM 01, TAM 02, TAM 04, TAM 06, TAM 08, TAM 10, TAM 12, TAM 14, TAM 16`.
- Tamanho especial: escolha explícita, com **até três UNIDADES de camisetas especiais por pedido inteiro**. Permitir referência `MEDIDAS FORNECIDAS` ou `CAMISETA FÍSICA DE AMOSTRA`; campo livre para descrição; identificação **TAMANHO ESPECIAL** em destaque na própria página e no resumo. Pode coexistir com grade normal na página.

## 2. Corpo, mangas, recortes e barras

- `sleeveCut`: `TRADICIONAL` ou `RAGLAN`, **um único valor por pedido de camisetas**, aplicado a todas as páginas/peças desse pedido. Vale para todas as três modelagens e para manga curta/longa.
- `sleeveLength` por versão de peça: `CURTA` ou `LONGA`.
- Manga CURTA: `BARRA COMUM` ou `FILETE COSTURADO`.
- Manga LONGA: `BARRA COMUM` ou `PUNHO`.
- Se PUNHO, material fixo `RIBANA SUBLIMADA`; não habilitar ribana pronta.
- FILETE da manga curta: sublimado conforme arte. Material selecionável conforme tecido principal: `DRY` ou `MESMO TECIDO DA CAMISETA`. **Para camiseta em ELASTIC, o filete comum é DRY**. Há alternativa excepcional em `RIBANA`, somente por solicitação explícita do cliente; anotar como exceção. Não deixar a alternativa excepcional como padrão.
- `hasSideCut` (recorte lateral): sim/não. Se NÃO, `hemShape=RETA` obrigatório. Se SIM, `hemShape=RETA|ARREDONDADA`. Costura de barra padrão, sem opções extras.
- `sideCutFabric` quando houver recorte lateral: `MESMO TECIDO DA PEÇA` ou `FLUENCE`, independente do tecido principal. `FLUENCE` está permitido como tecido **de recorte**, NÃO automaticamente como tecido principal.
- Quando um mesmo desenho possuir manga CURTA e LONGA, exigir as **duas visualizações na mesma página**, cada uma como peça identificada; a diferença de comprimento não exige separação de página. Ordem das peças livre.
- As diferenças de recortes/filetes do **mesmo desenho** exigem página separada; não misturar alternativas de acabamento para o mesmo design em uma página.

## 3. Modelos de gola: enum restrito e subopções

Todos os modelos de gola podem acompanhar todos os oito tecidos e todas as três modelagens; permanecem os limites próprios de botões e aplicações infantis.

1. `REDONDA` — acabamento `RIBANA` ou `GALÃO`.
2. `V` — material `RIBANA`; construção `V TRADICIONAL` ou `V TRASPASSADA`. **Traspassada é variação da V**, não uma décima gola.
3. `POLO` — material `RIBANA RETILÍNEA PRONTA` ou `SUBLIMADA COM ENTRETELA`; peitilho `1|2|3` botões; se `fit=BABY LOOK|INFANTIL`, permitir **até 2 botões**. Ribana pronta vinculada ao catálogo Polo exclusivo.
4. `BRASIL` — `DRY SUBLIMADO` fixo; sem subopção.
5. `REDONDA COM PEITILHO` — gola de `RIBANA`, peitilho de `DRY`, máximo **2 botões**. Quantidade exata/default não formalmente definido; não inferir regra além do limite.
6. `PRIME` — viés fixo `DRY SUBLIMADO` + ribana `SUBLIMADA` ou `PRONTA` (catálogo compartilhado).
7. `FIELD` — `SUBLIMADA` ou `RIBANA PRONTA` (catálogo compartilhado).
8. `PRESTIGE` — `SUBLIMADA` ou `RIBANA PRONTA` (catálogo compartilhado).
9. `EDGE` — exclusivamente `RIBANA PRONTA` (mesmo catálogo compartilhado de PRIME/FIELD/PRESTIGE; nome definitivo EDGE).

- Mesmo desenho nas versões Masculina/Baby Look/Infantil: **mesma gola**. Se alterar a gola do mesmo desenho, nova página.
- Polo: abertura em **V nas duas laterais inferiores** é um acabamento opcional para modelos Polo compatíveis. Não confundir com gola V nem com recorte no tecido. Não cadastrar como abertura unilateral.

## 4. Ribanas: exibição amigável e referência fabril preservada

### 4.1 Dicionário confirmado

| Código de fábrica | Exibição no ATLAS |
|---|---|
| VERMELHO | VERMELHO |
| MEXICO | AZUL MARINHO |
| BRANCO | BRANCO |
| COLIBRI | AZUL ROYAL |
| TROPICAL | VERDE |
| SOL 1048 | AMARELO |
| PRETO | PRETO |
| LAGE | CINZA |
| UVA | VINHO |
| P-6931 | DOURADO |
| VERDE ESCURO | VERDE ESCURO |
| COLONIAL | AZUL CELESTE |

Nunca descartar `factoryColorRef` ao exibir `displayColorName`. Preservar também ordem das faixas das combinações, incluindo a distinção entre BRANCO+PRETO e PRETO+BRANCO.

### 4.2 Catálogo compartilhado — PRIME, FIELD, PRESTIGE e EDGE

**Combinações em ordem da referência da fábrica (página 1 do PDF):**

| ID | Cor 1 — fábrica | Cor 2 — fábrica | Exibição |
|---|---|---|---|
| 01 | VERMELHO | MEXICO | VERMELHO + AZUL MARINHO |
| 02 | MEXICO | BRANCO | AZUL MARINHO + BRANCO |
| 03 | VERMELHO | BRANCO | VERMELHO + BRANCO |
| 04 | SOL 1048 | PRETO | AMARELO + PRETO |
| 05 | VERDE ESCURO | PRETO | VERDE ESCURO + PRETO |
| 06 | BRANCO | PRETO | BRANCO + PRETO |
| 07 | BRANCO | VERMELHO | BRANCO + VERMELHO |
| 08 | BRANCO | COLIBRI | BRANCO + AZUL ROYAL |
| 09 | VERDE ESCURO | BRANCO | VERDE ESCURO + BRANCO |
| 10 | P-6931 | PRETO | DOURADO + PRETO |
| 11 | P-6931 | BRANCO | DOURADO + BRANCO |
| 12 | PRETO | BRANCO | PRETO + BRANCO |
| 13 | BRANCO | TROPICAL | BRANCO + VERDE |
| 14 | BRANCO | MEXICO | BRANCO + AZUL MARINHO |

**Tiras lisas registradas:** VERMELHO, MEXICO, BRANCO, COLIBRI, TROPICAL, SOL 1048, PRETO, LAGE, UVA e P-6931 (usar equivalências exibidas acima). Não incluir VERDE ESCURO automaticamente nas lisas sem confirmação documental.

### 4.3 Catálogo exclusivo da Polo (página 2 do PDF)

`COLONIAL (AZUL CELESTE)`, `VERMELHO`, `MEXICO (AZUL MARINHO)`, `BRANCO`, `COLIBRI (AZUL ROYAL)`, `TROPICAL (VERDE)`, `SOL 1048 (AMARELO)`, `PRETO`, `LAGE (CINZA)`, `UVA (VINHO)`.

**Nota:** três submodelos de ribana não devem ser criados por duplicação desnecessária: há somente dois catálogos: compartilhado PRIME/FIELD/PRESTIGE/EDGE e exclusivo POLO. Ribana comum da gola Redonda e Ribana da V não receberam catálogo específico de cores nesta etapa; não impor sem confirmação.

## 5. Escudos, marcas, etiquetas e personalização

### Escudos/brasões
- Padrão `SUBLIMADO`: integrado à arte; não lançar adicional.
- Especiais: `TPU ALTO RELEVO` (prensagem térmica), `APLIQUE BORDADO` (bordado). Permitir **várias aplicações físicas por camiseta**, incluindo `TPU+TPU`, `BORDADO+BORDADO`, `TPU+BORDADO`; sem limite quantitativo geral.
- Localização livre definida pelo arte-finalista. Para cada aplicação, registrar tipo, localização/indicação manual e quantidade necessária à produção.
- Infantil: escudo sublimado permitido; `APLIQUE BORDADO` **proibido e bloqueado**; TPU **excepcional**, exibir alerta e exigir registro claro da exceção no pedido. Não confundir advertência de TPU com autorização para bordado infantil.
- Diferenças de aplicação especial entre versões de **mesmo desenho** exigem páginas diferentes. Ex.: versão com TPU na página 1, sem TPU na página 2. Variação infantil sublimada só compartilha página se isso não conflitar com regra de padronização por desenho; caso conflite, separar páginas e preservar vínculo do pedido.

### Marca MEINERZ
- Pode representar fornecedora ou patrocinadora.
- `SUBLIMADA` (na arte) ou `TPU ALTO RELEVO` (produção especial). TPU **uma aplicação por camiseta**; posição livre; **nunca cobrar ao cliente** (R$0,00 em contexto de cobrança). Registrar na produção e calcular quantidade pela quantidade de camisetas.
- Se o mesmo desenho tiver versões com e sem MEINERZ TPU, separar páginas.

### Patrocinadores, nomes e números
- Patrocinadores externos em camisetas de jogo: sempre sublimados.
- Nome/número de atleta: sempre sublimados, quando solicitados. Não gerar aplicações físicas adicionais.

### Etiqueta oficial
- **Opcional**; padrão: nenhuma aplicação especial.
- `SUBLIMADA`: já na arte, não aparece em ADICIONAIS.
- `TPU ALTO RELEVO` ou `TERMOCOLANTE`: **ADICIONAL DE PRODUÇÃO**, com quantidade/posição.
- Região próxima à barra inferior; padrão à **direita de quem olha a frente**, alternativa à esquerda. Distância exata não cadastrada.
- Mesmo desenho com/sem etiqueta física especial ou com tipos diferentes: nova página.

## 6. Ordem de produção, níveis e apresentação

- `order`: cliente/pedido, corte de manga global, limite de especiais, agrupamento de páginas.
- `page/designVariant`: configuração de **tecido, gola, recortes/filetes e aplicações especiais** de um desenho; permitir páginas distintas para versões produtivas do mesmo design. Para uma página contendo peças avulsas de desenhos diferentes, manter a identificação da configuração em cada desenho; não aplicar indevidamente a configuração de um desenho a outro. A regra mais recente é **não misturar alternativas produtivas do mesmo desenho na mesma página**.
- `piece`: fit, grade/tamanho, comprimento de manga, quantidade e personalizações. Diferentes modelagens do mesmo desenho podem aparecer na mesma página quando partilham tecido/gola/recortes/aplicações correspondentes. Manga curta + longa do mesmo desenho: **duas representações na mesma página**.
- Quantidades independentes por peça e página. Manter nome, número, tamanho, peça, origem da página. Resumos de produção por produto/modelagem/tamanho, conforme formato exemplificado:

  CAMISETA  
  P = 5  
  M = 4  
  G = 3

- Todas as setas e anotações técnicas inseridas, movidas e editadas **manualmente**. Indicar principalmente recortes, brasões especiais, filetes, punho, etiquetas. Não criar setas automaticamente.
- Formato e organização do pedido: preservar A4 horizontal existente e integração lista–pedido–apresentação. Não incluir preços/orçamento no layout de produção existente sem requisito novo.

## 7. Kits e peças avulsas — regra compartilhada com CAL-001

- No kit camiseta+calção, tamanhos, modelagens e quantidades **independentes**. Mesmo atleta pode desejar 2 camisetas e 1 calção; quantidade de cada produto arbitrária.
- Se ambos produtos forem numerados no mesmo kit, **número igual**; editar número no atleta atualiza ambos. Se não houver número, permanece vazio. Nomes seguem solicitação, sem impor igualdade não definida.
- Avulsos sem sincronização de nomes/números com outros produtos.
- O resumo SOMA kits completos e avulsos por peça/produto/tamanho, sem seção separada de quantidade de kits; preservar os vínculos internamente.
- Sempre que viável, camiseta e calção do mesmo kit ficam **juntos visualmente na página**. Separar para respeitar incompatibilidades de produção; preservar vínculo do kit.
- Agrupamento inteligente examina especificações e sugere páginas para maioria padronizada e exceções. Requer confirmação do arte-finalista.
- Limites especiais independentes por produto: **até 3 camisetas especiais** e **até 3 calções especiais** por pedido. Conta somente peças realmente especiais, não kits.

## 8. Validações e testes de aceite (CAM-001)

1. Selecionar CAM-001 oferece apenas 8 tecidos. Trocar de produto remove/desabilita seleção inválida.
2. Todos os tecidos permitem as 9 golas; gola Polo pronta usa somente catálogo Polo; Prime/Field/Prestige/Edge prontas usam catálogo compartilhado; Edge não oferece sublimação.
3. Infantil com Polo 3 botões é bloqueado. Baby Look com 3 botões, bloqueado.
4. Trocar para manga longa desabilita filete de manga curta e permite apenas punho de ribana sublimada/barra; manga curta permite barra/filete.
5. Com tecido ELASTIC, filete normal não poderá ser ELASTIC: material DRY; ribana só em fluxo explícito excepcional.
6. Sem recorte lateral não permite barra arredondada; recorte lateral pode usar FLUENCE ou tecido da peça.
7. Um desenho com manga curta e manga longa exige duas peças representadas na mesma página, sem quebrar o corte de manga global.
8. Escudos TPU+bordado múltiplos podem coexistir; bordado infantil bloqueado; TPU infantil exibe alerta; sublimação não cria adicional.
9. Marca MEINERZ TPU = 1 por camiseta, quantidade proporcional e cobrança zero; obrigatória distinção de página quando aplicação difere.
10. Etiqueta sublimada não cria adicional; TPU/termocolante criam; posição padrão direita de quem olha.
11. Quarta camiseta especial no pedido é bloqueada mesmo se em outra página; descrição livre e destaque visual presentes.
12. Ao mudar gola/tecido/recortes/aplicações do mesmo desenho, sugerir/exigir separação; agrupar sem perder quantidades/personalizações.
13. Setas continuam manuais e editáveis; página final/exportada contém identificação técnica correta.

## 9. Pontos não definidos — NÃO INFERIR

- Cor/material da ribana fora dos catálogos de pronta para Redonda/V; regras finas de botões na gola redonda com peitilho além do máximo 2.
- Exatamente quais moldes Polo são compatíveis com abertura lateral em V.
- Requisitos de confirmação humana para aprovação de TPU excepcional infantil (há alerta/identificação; não foi determinado papel de aprovador).
- Distância em milímetros da etiqueta à barra.
- Preços de TPU, bordado e etiqueta, exceto MEINERZ TPU gratuito.
- Regras de compatibilidade eventualmente omitidas ou novas alterações de portfólio.

**Fim da ficha CAM-001.**
