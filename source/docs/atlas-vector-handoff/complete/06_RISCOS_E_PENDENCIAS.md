# Riscos reais e o que **não** pode ser tratado como pronto

## Bloqueadores críticos do motor 1.9.3

1. **PALETA HARDCODED**: `trace_multicolor_experimental.py` define `PALETTE = [[11,65,137],[237,174,60],[254,254,254]]`, e `HEX` com azul/dourado/branco do Rosario. O motor não é, ainda, um vetorizador genérico de cores. **Obrigatório parametrizar ou automatizar a segmentação antes de liberar upload universal.**
2. **TÍTULO HARDCODED**: saída cria `<title>ATLAS VECTOR 1.9 Rosario Central — ...</title>`. Remover a menção a clube e parametrizar título neutro. Não publicar marcas de terceiros no sistema.
3. **BUSCA CUSTOSA**: modo `--full` usa busca multiproposta e pode demorar exageradamente em imagens maiores. Não habilitar por padrão na web, limitar tempo e validar recursos; alternativa rápida deve ser a padrão inicial com qualidade testada.
4. **FRESTAS**: `atlas_fill_guard.py` corrige via caminhos de apoio, mas não implementa borda compartilhada entre cores. Pode mascarar falhas visuais ou recortes legítimos, portanto criar regressão específica.
5. **BAIXA RESOLUÇÃO**: estrelas e letras de 150 px perdem detalhes; `reference_assist.py` melhora quando já há SVG maior da **mesma arte**, não reconstrói magicamente de PNG pequeno. **Não pedir upload de SVG de referência neste MVP**; apenas sinalizar a limitação.
6. **SEM SERVIÇO DE PRODUÇÃO CONFIRMADO**: o motor Python existe no GitHub, mas não se verificou implantação, endpoint, fila ou conectividade com Cloudflare. Entrega do UI isolado sem backend é parcial.
7. **MENUS DUPLICADOS**: `source/public/studio-navigation.js` é fonte dos itens, porém `source/public/organizador.html` contém snapshot HTML. Precisará auditoria para não mostrar menus diferentes.
8. **SEGURANÇA DO SVG**: um SVG é documento ativo potencial; validar e esterilizar antes de servir. `Content-Disposition: attachment` e sandbox/CSP são defesa em profundidade.
9. **PROPRIEDADE**: ambos os repositórios são privados. Sem copiar o motor para outro repo, sem abrir licença pública, sem incluir logos de clubes nos testes versionados.
10. **CUSTO E DESEMPENHO**: CPU, memória e hospedagem do serviço Python podem exigir recursos que não são gratuitos. Não assumir custo zero sem medir a implantação concreta.

## Conclusão operacional

A nova página poderá ser apresentada como **ATLAS VECTOR (BETA)** quando estiver isolada e segura. O botão `Vetorizar imagem` só ficará ativo para usuários do beta **após** vencer os bloqueadores 1, 2, 6 e 8, e passar nos testes de 05.

Se uma etapa for inviável no ambiente, o Work deve parar antes de publicar, mostrar o impedimento real e preservar todos os módulos existentes.
