# Brainstorm Engenharia

Sistema administrativo multiempresa em Next.js 16, TypeScript, Tailwind, Prisma 6.12.0 e Supabase Cloud.

## Instalação

Use Node.js 22.23 ou compatível e Python 3.11. Execute:

```sh
npm ci
python -m pip install -r document_engine/requirements.txt
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
npm run dev
```

O banco é o PostgreSQL do Supabase. Não execute prisma dev, migrate reset ou db push contra o banco compartilhado. O Prisma permanece na versão 6.12.0 do lockfile. Use npm ci para reproduzir as versões.

## Variáveis de ambiente

Configure no .env local e no gerenciador de secrets da hospedagem. Nomes, sem valores:

- DATABASE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_PRIVATE_BUCKET
- SUPABASE_PUBLIC_ASSETS_BUCKET
- MAX_TEMPLATE_UPLOAD_BYTES
- CERTIFICATE_IMAGE_MAX_BYTES
- PYTHON_EXECUTABLE

DIRECT_DATABASE_URL existe no ambiente atual, mas não é consumida pelo prisma.config.ts. DATABASE_URL deve permitir conexão e migrations. Nunca exponha service_role no navegador.

## Supabase, Auth e isolamento

Configure Supabase Auth, as URLs de redirecionamento do ambiente e um UserProfile vinculado à Organization. O identificador do perfil corresponde ao usuário Auth. Somente ADMIN acessa as APIs administrativas; MEMBER recebe 403, e requisições sem sessão recebem 401. As páginas administrativas redirecionam visitantes para login. As consultas e os vínculos enviados são filtrados pela organização do perfil autenticado.

Login usa Supabase Auth; cookies de sessão são atualizados pelo proxy. Novos vínculos usam convites com token armazenado como hash, validade e uso único. A chave de serviço não substitui a autorização por perfil nas APIs.

## Storage

Execute supabase/storage-setup.sql no projeto correto. O bucket private-documents é privado e aceita DOCX, PDF, PNG e JPEG. Não adicione políticas de leitura pública para ele. public-assets contém somente identidade visual pública da organização.

Templates, imagens de certificados, documentos gerados e PDFs assinados usam Storage. O banco armazena referências storage://; downloads privados recebem URLs assinadas de 300 segundos. URLs assinadas são credenciais temporárias: não registre nem compartilhe indiscriminadamente. Arquivos privados legados não são devolvidos como URLs permanentes.

Para arquivos legados, execute npm run migrate:storage, revise o relatório e então npm run migrate:storage -- --apply. O script não apaga os originais locais; remova-os da pasta pública antes de publicar, após conferir a migração. O proxy bloqueia /uploads com 404, inclusive para arquivos existentes. Não sirva public/uploads diretamente por CDN ou servidor estático. .env, uploads locais e temporários estão ignorados no Git. Foram encontrados 20 arquivos locais nesta revisão; sua migração está pendente da chave de serviço.

## Motor Python e documentos

O servidor chama document_engine por execFile, sem shell, com timeout e diretório temporário por operação. As dependências estão em document_engine/requirements.txt. O filesystem temporário não é persistência; resultados são enviados ao Supabase.

DOCX aceita placeholders da allowlist document_engine/allowed_fields.json. Blocos, chamadas e filtros Jinja são rejeitados. A geração usa sandbox, StrictUndefined e escape XML. Termos e declarações são gerados em DOCX. Representante é exigido quando o modelo usa seus campos e deve ser Presidente ou Vice-Presidente ativo. Sem esses campos, a geração pode ocorrer sem representante.

PDF textual pode ser enviado e analisado. PDF_OVERLAY permanece pendente: não há renderização final confiável nem OCR implementado. A geração desses modelos é bloqueada. Conversão geral DOCX para PDF também não está implementada.

## Certificados e assinados

O editor Konva cria layouts A4 com textos, variáveis, imagens PNG/JPEG, linhas e retângulos. pdf-lib gera o certificado oficial no servidor. O registro guarda versão e snapshot do layout e PDF privado.

Na página do documento, Enviar assinado aceita PDF não criptografado de até 10 MB. O arquivo vai para um novo objeto privado; signedFile e signedAt ficam separados dos campos originais. signedAt registra o momento do upload, não prova a data de assinatura. O original nunca é sobrescrito pelo upload. Um segundo envio retorna 409, inclusive em concorrência. O sistema armazena o PDF sem regravá-lo; não verifica autenticidade de assinatura digital.

## Segurança e operação

Há validação Zod, autorização ADMIN, filtro por organização, CSRF por origem, headers de segurança, validação MIME e magic bytes, limites de ZIP e uploads, sandbox de templates e limite de execução Python. React escapa os textos apresentados; não há renderização HTML arbitrária de templates. A validação de arquivo não equivale a antivírus.

O rate limiting atual é em memória por processo, adequado para desenvolvimento. Em produção distribuída use Redis/KV ou equivalente; configure um proxy confiável que sobrescreva os headers de IP e host. Também limite o corpo HTTP no proxy de entrada, antes do processamento multipart. Não foi adicionada infraestrutura nesta etapa.

GET /api/health/db executa SELECT 1 e retorna somente conectividade; não comprova Auth, Storage ou Python. Proteja a conexão ao banco, configure backups e teste restauração antes do uso de dados reais.

## Verificação

```sh
npm audit
npm run build
npm run test:security
python -m unittest discover -s tests -p 'test_*.py'
npm run lint
npx prisma migrate status
```

Os testes locais não substituem os cenários com ADMIN, MEMBER, duas organizações, Storage real e geração ponta a ponta. Nesta etapa a ausência de SUPABASE_SERVICE_ROLE_KEY e de contas/sessões de teste impede concluir esses cenários. Não considerar produção aprovada apenas pelo build.

## Deploy

Não há provedor de deploy confirmado no projeto. O motor atual exige Node e Python no mesmo ambiente, dependências Python instaladas, inclusão de document_engine no artefato e subprocessos permitidos. Um servidor/container com esses requisitos pode executar npm run build e npm start; configure os secrets e use Supabase para persistência.

A Vercel oferece runtimes Node e Python separados. Isso não comprova que uma rota Next Node consiga chamar o interpretador e pacotes Python deste projeto por execFile. Se a hospedagem for Vercel, document_engine deve rodar em serviço separado, com integração autenticada ainda pendente. Essa adaptação não foi implementada aqui. Consulte [runtimes Vercel](https://vercel.com/docs/functions/runtimes) e [runtime Python](https://vercel.com/docs/functions/runtimes/python).

Não dependa de uploads locais nem de filesystem persistente. Antes de produção: validar contas e isolamento reais, Storage privado, todos os documentos e assinados, e executar os testes no ambiente de hospedagem escolhido.
