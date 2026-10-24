# Importação do código-fonte real

## Estado atual
O repositório contém documentação e ferramenta de integridade, **mas ainda não contém o código-fonte efetivo do site publicado**. Uma URL pública permite observar a aplicação, mas não fornece necessariamente o projeto original, seus módulos, banco de dados ou rotinas de backend.

## Procedimento seguro
1. Acessar **a ferramenta/ambiente onde o site foi criado**, com a conta proprietária, e localizar a opção de exportar o projeto (código completo) ou conectar GitHub. Não presumir que uma opção exista.
2. Se a plataforma oferecer integração GitHub, selecionar este repositório privado apenas após revisar o conteúdo a sincronizar.
3. Alternativamente exportar o projeto completo e verificar antes da importação: arquivos de código, configurações sem segredos, dependências, artefatos/licenças de terceiros e histórico disponível.
4. Retirar senhas, tokens, credenciais, dados pessoais, arquivos de clientes e materiais corporativos confidenciais.
5. Commitar os arquivos após revisão; executar o projeto em ambiente local ou de teste para verificar correspondência com o site.
6. Anotar commit/tag, dependências, testes e limitações no CHANGELOG.
7. Gerar pacote ZIP final da release, calcular SHA-256 do ZIP exato e armazenar **a cópia exata** de forma segura, fora de artefatos temporários de CI.

## O que a automação já faz
O workflow `.github/workflows/integridade.yml` gera um manifesto SHA-256 dos arquivos rastreados e presentes no checkout a cada push na branch main. Salva o manifesto nos artefatos da execução por 90 dias. **Não importa código do site, não publica releases, não prova data de criação anterior e não registra software no INPI.**

## Próxima verificação necessária
Identificar como o projeto do site é hospedado, onde seu código está armazenado e qual é o método autorizado de exportação. Evitar reconstruir o código por cópia da interface pública, pois isso não recupera o sistema original.
