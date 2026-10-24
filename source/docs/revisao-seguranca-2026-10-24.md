# Revisão do MEINERZ Uniform Studio — 24/10/2026

## Resultado e alcance

A aplicação já possui separação de dados por proprietário, consultas SQL parametrizadas, permissões de administrador/fábrica e bloqueio de revisões enviadas ou aceitas. A revisão não encontrou acesso cruzado nos cenários cobertos pelos testes. Isso não equivale a uma certificação de segurança ou a um teste de invasão externo.

Foram revisados os manipuladores de API, serviços de projetos, pedidos, listas, propostas, arquivos e moldes; identidade; tratamento de uploads; respostas HTTP; dependências; e os fluxos de montagem e conferência. Não foram alterados pedidos reais, permissões de usuários nem a audiência pública do site. A autenticação continua sendo fornecida pelo Sites; os cabeçalhos de identidade pressupõem a fronteira de confiança da plataforma.

## Correções incluídas

| Achado | Consequência | Correção |
| --- | --- | --- |
| JSON genérico e uploads multipart dependiam de `Content-Length` para limitar o envio | Uma requisição sem esse cabeçalho podia ser materializada antes de validar o tamanho | Contagem dos bytes efetivamente recebidos; interrupção ao ultrapassar o limite; validação do formato; limite de campos e do texto de metadados |
| Três leitores de JSON tinham implementações diferentes | A proteção podia evoluir em um módulo e ficar esquecida em outro | Leitor compartilhado, preservando os limites de 64 KiB para operações comuns, 10 MiB para listas e 16 MiB para pedidos; multipart geral de 22 MiB e foto de 3 MiB por envio, com limite individual de 2 MiB |
| Limite de comentários era consultado antes de uma inserção separada | Requisições paralelas podiam ultrapassar os 30 comentários por dez minutos/500 por proposta | Contador e inserção na mesma instrução SQL |
| Link de proposta podia ser revogado entre a leitura e a gravação | Um comentário ou aprovação em andamento ainda podia ser registrado após a desativação | A gravação verifica novamente, atomicamente, que a proposta está ativa |
| Proteções de páginas não eram uniformes | Maior exposição de links por Referer, enquadramento externo e cache de páginas privadas | Política de referência sem envio de URL, `nosniff`, CSP para enquadramento/base/formulários/objetos e páginas HTML sem cache; regras equivalentes para HTML estático |
| Dependências com avisos públicos, incluindo componentes do framework | Riscos conhecidos na árvore de software, com aplicabilidade dependente do recurso utilizado | Next 16.4.1; React/DOM/RSC 19.2.8; Vinext 1.2.0; plugin RSC 0.5.37; Vite 8.1.6; Zod direto 4.6.6; atualizações transitivas compatíveis |
| Configuração de overrides aparecia em locais diferentes | O pnpm usava as regras do workspace, não os overrides do package.json | Configuração consolidada no `pnpm-workspace.yaml`, com versões verificadas no lockfile |

A CSP adicionada é uma proteção parcial: permite as iframes internas e incorporação pelo ChatGPT. Ela não é uma política estrita de execução de scripts baseada em nonce. As políticas mais restritivas de arquivos já existentes foram preservadas. Limites de corpo não substituem proteção global contra abuso distribuído.

## Verificação

- 222 testes executados: 221 passaram; um teste opcional de uma planilha de referência local permaneceu ignorado; nenhuma falha.
- Testes novos exercitam limites sem cabeçalho de tamanho, tamanho falso, UTF-8, interrupção de stream, arquivos multipart, limites independentes e cabeçalhos. Um lote de 45 comentários concorrentes confirma o teto de 30. A desativação durante comentário/aprovação é coberta.
- Testes existentes cobrem isolamento entre proprietários, permissões de fábrica/admin, exclusão, concorrência, links revogados, snapshots, integridade de versões, listas e exportação PDF/SVG.
- TypeScript e build de produção passaram.
- Auditoria completa de dependências: de 79 ocorrências (3 críticas) para 4 ocorrências (nenhuma crítica). `pnpm audit --prod`: nenhuma ocorrência conhecida no momento da consulta.
- A classificação `--prod` é do gerenciador: componentes do framework declarados como dependências de desenvolvimento também foram atualizados e avaliados. Não se presume que tudo marcado como `dev` seja irrelevante ao site publicado.
- A auditoria do gerenciador não cobre automaticamente cópias de bibliotecas em `public/vendor`; elas continuam exigindo acompanhamento próprio. ExcelJS usa `uuid.v4` no código examinado.
- A verificação visual no navegador não foi concluída porque a infraestrutura de prévia estava indisponível. Não houve teste de carga ou exploração em produção.

### Alertas residuais na árvore de ferramentas

| Pacote | Aviso | Contexto observado |
| --- | --- | --- |
| esbuild 0.18.20 | GHSA-67mh-4wv8-2f99, moderado | Dependência do gerador de migrações; afeta o servidor de desenvolvimento dessa ferramenta |
| esbuild 0.27.3 | GHSA-g7r4-m6w7-qqqr, baixo | Dependência do Wrangler; aviso específico de Windows |
| uuid 8.3.2 | GHSA-w5hq-g745-h8pq, moderado | Dependência de ExcelJS; o uso encontrado é v4, enquanto o aviso envolve outras funções com buffer fornecido |
| Zod 3.25.76 | GHSA-mrhx-c7xc-m3w5, alto | Dependência do plugin de lint React; Zod direto foi atualizado; não foi imposta uma troca de major incompatível nessa ferramenta |

Esses alertas continuam registrados. A contagem de avisos não comprova exploração nem ausência de outras vulnerabilidades. O gate padrão de sete dias para novas dependências foi mantido; a exceção exata `fast-uri@3.1.9` aplica a correção publicada em 19/10/2026, sem liberar futuras versões automaticamente.

## Prioridades empresariais pendentes

1. **Acesso da equipe:** o site é público e uma conta ChatGPT permite iniciar uma área própria. Isolamento por proprietário não é uma lista de funcionários autorizados. Para uso interno, definir aprovação/convite de usuários e funções. Manter páginas de propostas para clientes requer separar essa autorização do compartilhamento externo; fechar todo o site bloquearia esses links.
2. **Abuso e disponibilidade:** definir quotas e limites persistentes por conta/IP para criação, uploads e operações caras. A proteção de comentários foi corrigida, mas não existe um limitador global distribuído validado nesta revisão. Verificar os controles efetivos da hospedagem.
3. **Backup e retenção:** revisões imutáveis ajudam, mas não substituem backup externo e teste de restauração. Autosaves são retidos sem uma política de expiração; definir retenção de rascunhos preservando revisões liberadas e seus arquivos.
4. **Arquivos externos:** uploads de biblioteca são privados e SVG/PDF/CDR são baixados como anexos com política restritiva. Definir análise antimalware para arquivos recebidos de terceiros. Importação XLSX ocorre no navegador e merece avaliação específica de arquivos compactados muito expansivos.
5. **Identidade de aprovação:** o cliente informa o próprio nome no link compartilhado. Isso registra uma declaração; não verifica a identidade do signatário. Autenticação adicional é necessária se a empresa exigir essa certeza.
6. **Sigilo de moldes:** modelos incorporados em arquivos estáticos são distribuídos ao navegador. Desenhos privados usam APIs com autorização; conteúdo exibido por um link de apresentação pode ser copiado por quem recebe esse link. Avaliar quais moldes podem ser distribuídos.

## Inconsistências e redundâncias do fluxo

| Ponto observado | Recomendação |
| --- | --- |
| DTF, TPU, termocolante e bordado aparecem nas técnicas gerais e nas aplicações por peça | Concentrar aplicações por peça e derivar o resumo geral, evitando duas instruções divergentes |
| “Salvar como novo” copia número, datas, lista e demais dados comerciais, sem vínculo formal com o pedido anterior | Substituir o uso como complemento por uma ação própria, com novo número, datas e conferência; preservar o original |
| “Aprovados” reúne conferidos internamente, enviados e aceitos; aprovação do cliente é outro registro | Manter explícitos os três conceitos: conferência interna, aprovação da arte pelo cliente e aceite da fábrica |
| O seletor do editor retorna até 200 pedidos e até 200 listas, enquanto o acompanhamento pagina o conjunto completo | Paginar também os seletores; o histórico antigo deve continuar encontrável dentro do editor |

Essas mudanças de organização não foram aplicadas nesta revisão de segurança: precisam preservar pedidos históricos e o layout técnico já definido.

## Complemento: forma recomendada

Criar **novo pedido**, vinculado ao ID e à revisão do pedido original, com nome/número próprio e tipo “COMPLEMENTO” ou “COMPLEMENTO COM ALTERAÇÕES”. Copiar as especificações, imagens, enquadramentos e acabamentos. Reiniciar datas operacionais e conferências; não reutilizar envio, aceite ou aprovação. A lista anterior deve ser uma escolha explícita, para não produzir novamente nomes ou quantidades antigos por acidente.

Mostrar “Pedido de origem: … · revisão …” e um campo de alterações; a conferência pode apresentar diferenças de tecido, cor, grade, quantidade e arte. O original permanece preservado. O botão existente “Salvar como novo” não realiza esse processo completo.

## CDR e pacote de produção: forma recomendada

Anexar o **CDR original à revisão do pedido**, com nome, tamanho, hash SHA-256, data e responsável. O PNG/mapa continua atendendo à visualização; o CDR permanece como arquivo editável para o CorelDRAW. A aplicação armazena e entrega o original, sem prometer interpretá-lo, reconstruí-lo ou verificar automaticamente sua equivalência visual.

Ao liberar a revisão, congelar a referência exata ao CDR junto com pedido e lista. Uma troca do arquivo exige nova revisão e conferência. A fábrica autorizada baixa um pacote com PDF do pedido, planilha conferida e CDR; nomes de arquivos identificam pedido e revisão. O pacote corresponde ao snapshot enviado, incluindo pedidos antigos, e não a um arquivo que tenha sido substituído depois.

Manter o CDR em armazenamento privado, com download autenticado e autorização por pedido/revisão, limite de tamanho, nome de armazenamento gerado pelo servidor e download como anexo. Não disponibilizá-lo automaticamente no link público de apresentação. Se houver peças com arquivos distintos, permitir mais de um anexo técnico, identificando peça ou kit.

Complemento e anexos CDR são recomendações para a próxima implementação, não funcionalidades adicionadas nesta revisão.

## Referências primárias

- [OWASP — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP — File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP — CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Vinext — GHSA-8969-277p-8rrm, corrigido em 1.2.0](https://github.com/cloudflare/vinext/security/advisories/GHSA-8969-277p-8rrm)
- [Cloudflare — headers de arquivos estáticos](https://developers.cloudflare.com/workers/static-assets/headers/)
- [pnpm — configuração de resolução e exceções por versão](https://github.com/pnpm/pnpm/blob/main/pnpm/docs/settings/dependency-resolution.md)
