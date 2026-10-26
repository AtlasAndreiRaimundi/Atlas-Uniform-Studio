# ATLAS Uniform Studio — CAL-001
## Calção de Jogo — especificação de implementação

**Estado:** levantamento técnico concluído; implementação/homologação ainda pendentes.  
**Escopo:** calção de JOGO. Não confundir com bermuda, calção de treino ou outros produtos.  
**Princípio:** campos restritos por produto, modelagem e molde; priorizar clareza de fabricação e agrupamento por páginas.

## 1. Catálogo principal

- `productCode: CAL-001`; `category: CALCAO`; `name: CALÇÃO DE JOGO`.
- `mainFabric` restrito a `DRY CALÇÃO` (padrão) e `FLEX` (alternativo, casos específicos). **Ambos permitidos nos nove moldes.** Não mostrar tecidos de CAM-001 nesse campo, mesmo que tenham palavras semelhantes (DRY ≠ DRY CALÇÃO).
- `fit` restrito a `MASCULINO`, `FEMININO`, `INFANTIL`.
- `moldId` depende da modelagem selecionada; não oferecer moldes de outra modelagem.

### 1.1 Nove combinações fit + molde

| ID proposto | Modelagem | Nome do molde | Construção/acabamento |
|---|---|---|---|
| CAL-M01 | Masculino | CALÇÃO 2 (PADRÃO) | 2 partes; barra convencional; filete costurado opcional na barra |
| CAL-M02 | Masculino | CALÇÃO 5 PARTES | 5 partes; barra convencional; filete opcional na barra; alerta de encaixe |
| CAL-M03 | Masculino | CALÇÃO COM RECORTE | Recortes próprios; **sem outros acabamentos opcionais**; tecido do recorte configurável |
| CAL-F01 | Feminino | MOLDE STEIN | 4 partes; viés costurado de fora a fora na barra e lateral; cor identificada; sem opcionais |
| CAL-F02 | Feminino | MOLDE RETO | Equivalente de acabamento ao Masculino 2 Partes; filete opcional |
| CAL-F03 | Feminino | MOLDE ELITE | 4 partes com curvatura; barra comum; pequena abertura em V na lateral; sem costuras opcionais |
| CAL-I01 | Infantil | 2 PARTES (PADRÃO) | Equivalente ao Masculino 2 Partes; filete opcional |
| CAL-I02 | Infantil | MOLDE STEIN | Equivalente ao Stein Feminino: 4 partes, viés costurado na barra e laterais, sem opcionais |
| CAL-I03 | Infantil | CALÇÃO 5 PARTES | Equivalente ao Masculino 5 Partes; filete opcional + alerta de encaixe |

IDs propostos apenas como identificadores de implementação; preservar identificadores já existentes no projeto, se houver.

**Aviso obrigatório para 5 PARTES masculino/infantil:** «Evite artes que dependam do encaixe perfeito de grafismos, linhas ou outros elementos nas laterais e costuras; podem ocorrer desalinhamentos na confecção». Aviso informativo, sem bloquear uso do molde. A interface pode oferecer confirmação de ciência, mas isso não substitui prova técnica.

## 2. Tecidos de recorte, filetes e viés

### 2.1 Recortes
- Somente `CAL-M03` (Masculino COM RECORTE) exibe `sideCutFabric`.
- Opções restritas: `MESMO TECIDO DA PEÇA` (padrão) ou `FLUENCE`.
- FLUENCE é opção de recorte, NÃO automaticamente tecido principal do calção.
- Nos demais oito moldes, ocultar/desabilitar campo; não confundir múltiplos painéis de 5 PARTES/STEIN/ELITE com a opção de tecido de recorte.

### 2.2 Filete costurado
- Permitido **somente**: Masculino 2 Partes, Masculino 5 Partes, Feminino Reto, Infantil 2 Partes, Infantil 5 Partes.
- Acabamento opcional na barra inferior; alternativa barra convencional.
- `filetFabric` deve herdar **o mesmo tecido principal do calção** (`DRY CALÇÃO` ou `FLEX`), sem escolha de tecido independente.
- Cor e grafismo do filete vêm da arte de **sublimação** do desenhista; não criar catálogo de cores obrigatório separado.

### 2.3 Viés do molde Stein
- Feminino/Infantil Stein: viés **fixo** costurado na barra inferior e laterais, de fora a fora.
- Material do viés: `DRY` (distinto do nome `DRY CALÇÃO` do tecido principal).
- Geralmente sublimado; cor e desenho conforme arte-final. **Destacar a cor do viés na anotação técnica**; seta é inserida manualmente pelo arte-finalista.
- Nenhuma costura/acabamento adicional opcional no Stein.
- Não criar seleção de cor pronta de viés não fornecida pela fábrica.

### 2.4 Elite feminino
- Quatro partes curvadas, barra comum, **abertura lateral em V fixa**, sem opção de filete/viés adicionais.

## 3. Grades e especiais

Compartilhar listas autorizadas com CAM-001, mas selecionar conforme `fit`:
- Masculino: `P, M, G, GG, EG, EXG, 4G, 5G, 6G`.
- Feminino: `PP, P, M, G, GG, EG, EXG`.
- Infantil: `TAM 01, TAM 02, TAM 04, TAM 06, TAM 08, TAM 10, TAM 12, TAM 14, TAM 16`.

`specialSize`: permitido em todas modelagens; **até 3 UNIDADES de calções especiais por pedido**; referência por medidas informadas ou peça física; instruções em texto livre digitadas pelo arte-finalista; realçar `TAMANHO ESPECIAL` na lista/resumo/página; não exigir página exclusiva. Limite independente das 3 camisetas especiais do pedido.

## 4. Cós e cordões

- Todos os moldes compartilham o mesmo padrão de cós; faz parte da arte/molde. Cor do cós normalmente segue o calção, porém a arte é soberana; NÃO exigir campo independente de cor.
- Cordão **obrigatório em todos os calções**.
- Catálogo inicial **restrito** de cor do cordão: `PRETO`, `BRANCO`, `AZUL MARINHO`, `VERMELHO`. Não inventar cores adicionais.
- **Cor do cordão pode variar entre peças/modelos dentro de uma página**, sem exigir divisão em páginas diferentes. Registrar a cor por peça/modelo relevante, respeitando identificação visual no pedido.

## 5. Escudos, marcas, nomes, números, etiquetas

### Escudos
- Padrão `SUBLIMADO`, incorporado à arte (não gerar aplicação especial).
- Tipos especiais `TPU ALTO RELEVO` (prensagem térmica) ou `APLIQUE BORDADO` (bordado); permitem múltiplos escudos e `TPU+TPU`, `BORDADO+BORDADO`, `TPU+BORDADO` no mesmo calção.
- Posicionamento livre pelo arte-finalista, anotado manualmente. Cada aplicação especial deve ter controle de produção/quantidade e eventual cobrança.
- INFANTIL: sublimação normal; TPU excepcional (aviso); APLIQUE BORDADO proibido e bloqueado. Reaproveitar a mesma lógica compartilhada da CAM-001.
- Se o mesmo desenho tiver conjuntos distintos de aplicações especiais, separar em páginas diferentes.

### Marca MEINERZ
- Nos calções: **somente SUBLIMADA**, integrada à arte. Não oferecer TPU MEINERZ, nem aplique bordado ou cobrança/aplicação física dessa marca.

### Etiqueta oficial
- Produto CAL-001 não possui opção de etiqueta de produto oficial (TPU, termocolante ou escolha de etiqueta sublimada). Ocultar completamente o campo dessa funcionalidade; não confundir com informação já desenhada na arte.

### Nomes e números
- Opcionais conforme pedido do cliente, sempre **SUBLIMADOS na arte**. Não gerar acabamento/cobrança separada nem campos de método de aplicação; dados de personalização podem continuar na lista dos atletas.

## 6. Bolsos

- **Padrão: SEM BOLSOS**; bolsos são opcionais em moldes compatíveis, sem mudar automaticamente o produto para BERMUDA (bermuda será produto separado).
- NÃO permitir bolsos em `CAL-F01` STEIN FEMININO e `CAL-F03` ELITE FEMININO (confirmado expressamente).
- O Stein Infantil compartilha o molde/estrutura Stein Feminino; a conversa anterior **presumiu** que também não aceita bolsos, mas o usuário não confirmou isso expressamente. Para implementação segura, manter `CAL-I02` como **PENDENTE DE CONFIRMAÇÃO** para bolsos e não inferir compatibilidade sem aprovação. As demais opções foram tratadas como disponíveis na conversa anterior; validar com a fábrica antes de liberar definitivamente.
- Quando calções do mesmo desenho diferirem em presença de bolsos, separar páginas para padronização produtiva.
- **Pendente:** quantidade, construção e localização dos bolsos; não presumir que sempre são dois bolsos laterais.

## 7. Organização em páginas e quantidades

- Cada página deve utilizar **um único molde de calção** e **um único tecido principal**. Mesmo desenho com molde ou tecido alternativo → nova página.
- Acabamentos de calções e aplicações especiais divergentes do mesmo desenho → páginas distintas.
- Cor de cordão pode variar sem criar página nova; nomes, números e tamanhos também variam individualmente.
- Cada página e cada peça possuem quantitativos e grades independentes; preservar origem para fabricação.
- Agrupamento inteligente: sugerir páginas de acordo com padrões e exceções; agrupamento é **sugestão, não execução automática irreversível**. Exemplo aceito de 33 kits: página principal 30 kits, variação de molde 2, variação de aplicação 1. Validar com o arte-finalista antes de finalizar.
- Resumo de produção **por produto e tamanho**, sem categorias distintas de 'kit completo' e 'avulso', no formato:

  CAMISETA  
  P = 5  
  M = 4  
  G = 3  
  CALÇÃO  
  P = 4  
  M = 2  
  G = 1

- Manter diferenciação por modelagem quando necessário para evitar colisões de grades (Masculina P ≠ Feminina P), embora o exemplo visual de resumo seja simplificado.
- Para exibição A4 horizontal do pedido, sempre que possível manter camiseta + calção do **mesmo kit juntos na página**, desde que não violem regras de produção. Preserve vínculos mesmo quando precisar separar páginas.
- Setas/anotações técnicas são MANUAIS, editáveis e reposicionáveis; usar para viés, filetes, recortes, TPU, bordado, e demais detalhes relevantes.

## 8. Kits, atletas e peças avulsas

- Cada atleta pode solicitar camisetas, calções, ambos ou múltiplas unidades diferentes de cada produto; não duplicar atleta para representar quantidade.
- Camiseta e calção do kit podem ter **modelagens e tamanhos diferentes** (ex.: Camiseta Masculina M + Calção Feminino G).
- Se ambos forem numerados dentro do mesmo kit, o **número deve ser igual**, compartilhado pelo registro do atleta e refletido em ambos. Peças avulsas têm nomes/números livres e independentes; ausência de nome/número deve permanecer vazia, nunca criar valor fictício.
- Resumo soma kits e avulsos por produto, tamanho e modelagem; o vínculo do kit fica preservado internamente, mas não exige linha separada de kits no resumo de produção.
- Limite de especiais conta **peças, não kits**: um kit com camiseta especial e calção normal consome 1 unidade especial de camiseta e 0 de calção; ambos especiais consomem uma unidade de cada categoria. Máximo 3 de cada produto no pedido.

## 9. Validações e testes de aceite (CAL-001)

1. Selecionar CAL-001 oferece exclusivamente `DRY CALÇÃO` e `FLEX`; ambos válidos para os 9 moldes.
2. Alternar modelagem apresenta apenas moldes correspondentes; trocar molde elimina acabamento anteriormente selecionado se incompatível.
3. Em `CAL-M03`, campo recorte permite mesmo tecido ou FLUENCE; em todos os outros, campo indisponível.
4. Filete só aparece nos 5 moldes permitidos; material herdado do principal; grafismo via arte; moldes Elite/Stein sem opções adicionais.
5. Ao escolher Stein, `DRY` como viés fixo, destaque de cor e anotação manual; nenhuma opção de viés alternativo inventada.
6. Ao escolher 5 Partes (Masculino/Infantil), exibir aviso de não depender de encaixe perfeito nas costuras.
7. Cós não exige cor; cordão obrigatório, com quatro cores permitidas e variação dentro da página.
8. Escudo infantil bordado bloqueado, TPU infantil exige alerta, escudos sublimados sem adicional.
9. CAL-001 não mostra etiqueta oficial nem TPU MEINERZ.
10. Mesmo molde + tecido diferente exige nova página; molde diferente exige nova página; aplicação especial divergente exige nova página.
11. Kit com camiseta M, calção G e número 10 deve conservar tamanhos independentes e número igual; avulso independente.
12. Resumo soma kits e avulsos, sem quantidade separada por tipo de compra; manter quantitativos por página/peça.
13. Quarto calção tamanho especial no mesmo pedido é bloqueado; não conta camisetas especiais nesse limite.
14. Bolsos padrão desligados; bloqueio expresso para Stein e Elite Femininos; não habilitar bolsos no Stein Infantil sem confirmação.
15. Geração/exportação A4 com setas manuais e identificação técnica correta.

## 10. Pendências não bloqueantes para conclusão do levantamento, mas críticas para homologação do respectivo campo

- Disponibilidade efetiva de bolso no **Stein Infantil** não foi confirmada diretamente; a restrição foi inferida anteriormente.
- Quantidade/posicionamento dos bolsos e demais detalhes de construção não foram definidos.
- Possíveis outras cores de cordão além de quatro citadas não foram fornecidas.
- A expressão 'FLEX em alguns casos' foi esclarecida quanto à compatibilidade (todos os moldes), mas não houve critério comercial adicional para casos de uso; não criar bloqueio novo.
- Não foi definido preço/cobrança de escudos/bolsos nem especificação de maquinário.

**Fim da ficha CAL-001.**
