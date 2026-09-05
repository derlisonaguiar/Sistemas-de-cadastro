# Gerenciamento de usuários

## Fluxo

Em Configurações → Usuários, um ADMIN informa nome, e-mail, senha inicial (12 a 128 caracteres) e ADMIN/USER. POST /api/users valida o ADMIN ativo e o corpo estrito; organizationId não é aceito no payload. O Supabase Auth cria a conta com e-mail confirmado e o backend cria o UserProfile na organização do ADMIN. A senha não é persistida no perfil nem devolvida pela API. Se a criação do perfil falhar, o backend tenta remover apenas a conta Auth recém-criada; uma falha nessa compensação registra o ID para intervenção, e a conta continua sem acesso por não ter perfil.

A listagem usa somente os perfis da organização. Nome/e-mail de ADMIN antigos são obtidos no Auth quando ainda não existem no perfil. Ativação e role são alteradas sob bloqueio da linha da organização no PostgreSQL, com nova validação do ADMIN após adquirir o bloqueio. O último ADMIN ativo não pode ser desativado/rebaixado, inclusive em requisições simultâneas. Não foi introduzida exclusão de contas.

## Permissões

- ADMIN ativo: acesso completo e gestão de usuários da própria organização.
- USER ativo: dashboard e consulta de membros, clientes, projetos, contratos e documentos existentes (incluindo download). Dados auxiliares da própria organização, cargos e diretorias podem ser consultados pelas APIs usadas nessas telas.
- USER não acessa Configurações, usuários, modelos, criação, edição, importação ou geração. Layouts de servidor protegem as páginas administrativas; todas as APIs de alteração mantêm validação ADMIN no próprio handler.
- Perfil inativo: acesso negado no servidor mesmo com sessão Auth existente. Ativar/desativar refere-se ao acesso ao sistema via UserProfile; não apaga a conta Supabase Auth.
- Papel e organização vêm do banco, nunca de user_metadata ou de valores enviados pelo navegador.

## Recuperação de senha

O ADMIN solicita o envio de recuperação na linha do usuário. O servidor resolve a conta dentro da organização e usa exclusivamente o e-mail registrado no Auth. O link de uso único/expiração do Supabase leva a /redefinir-senha. A página valida a sessão de recuperação, remove o fragmento da barra de endereço, mantém a sessão apenas em memória e permite salvar a nova senha. Ao terminar, encerra a sessão de recuperação. O ADMIN não recebe o link nem a senha nova.

Configuração necessária no ambiente:

- SUPABASE_SERVICE_ROLE_KEY somente no servidor (já configurada no ambiente verificado).
- Desenvolvimento: APP_URL=http://localhost:3000 no arquivo .env local (não versionado).
- Produção: definir APP_URL nas variáveis de ambiente da hospedagem, com a origem pública real do sistema. A variável do ambiente tem precedência sobre .env. Não há URL de fallback no código; o endpoint retorna 503 com orientação se APP_URL estiver ausente.
- Os links são construídos no servidor com new URL("/redefinir-senha", process.env.APP_URL). A URL local existe apenas na configuração do ambiente.
- No Supabase Auth, autorizar APP_URL/redefinir-senha em Redirect URLs, manter o template de recuperação com ConfirmationURL e configurar entrega de e-mail/SMTP.
- Reiniciar a aplicação após alterar variáveis de ambiente.

Não foram enviados e-mails reais nos testes. A entrega e o link final dependem da URL e configuração do Supabase acima.

## Migration e compatibilidade

20260905200000_user_management aplicada no banco configurado. Renomeia apenas UserRole.MEMBER para USER (inclusive convites existentes), acrescenta name/email opcionais e active=true aos perfis. ADMIN existentes permanecem ADMIN e ativos. PositionRole.MEMBER é independente e permanece inalterado. Prisma e cliente mantidos em 6.12.0; package.json e lockfile não foram alterados.

## Verificação

- 8 testes de usuários: autorização, inatividade, organização, validação, último ADMIN, compensação Auth, proteção das APIs e recuperação.
- 24 testes locais existentes de membros/importação: passaram; dois mocks de leitura foram adaptados ao novo helper de consulta.
- 12 testes de segurança de arquivos/certificados: passaram.
- 3 testes de integração PostgreSQL/Storage: passaram, incluindo bloqueio real contra alterações concorrentes do último ADMIN. Registros temporários removidos.
- ESLint dos arquivos novos e centrais de autorização: passou.
- Build de produção: passou.
- Não foi executado um teste visual com contas reais; criação Auth e recuperação foram verificadas com mocks, e concorrência/perfis com PostgreSQL real.

## Arquivos alterados ou adicionados

- app/admin/clientes/[id]/editar/layout.tsx
- app/admin/clientes/novo/layout.tsx
- app/admin/configuracoes/layout.tsx
- app/admin/configuracoes/usuarios/page.tsx
- app/admin/contratos/[id]/editar/layout.tsx
- app/admin/contratos/novo/layout.tsx
- app/admin/documentos/[id]/editar/layout.tsx
- app/admin/documentos/gerar/layout.tsx
- app/admin/documentos/importar/layout.tsx
- app/admin/documentos/modelos/layout.tsx
- app/admin/documentos/novo/layout.tsx
- app/admin/membros/[id]/editar/layout.tsx
- app/admin/membros/novo/layout.tsx
- app/admin/projetos/[id]/editar/layout.tsx
- app/admin/projetos/novo/layout.tsx
- app/api/users/[id]/reset-password/route.ts
- app/api/users/[id]/route.ts
- app/api/users/route.ts
- app/redefinir-senha/page.tsx
- components/AccessProvider.tsx
- components/AdminGuard.tsx
- lib/supabase/admin.ts
- lib/user-management.ts
- prisma/migrations/20260905200000_user_management/migration.sql
- tests/user-management.integration.test.mjs
- tests/user-management.test.mjs
- app/admin/clientes/[id]/page.tsx
- app/admin/clientes/page.tsx
- app/admin/contratos/[id]/page.tsx
- app/admin/contratos/page.tsx
- app/admin/documentos/[id]/page.tsx
- app/admin/documentos/gerar/page.tsx
- app/admin/documentos/page.tsx
- app/admin/layout.tsx
- app/admin/membros/[id]/page.tsx
- app/admin/membros/page.tsx
- app/admin/page.tsx
- app/admin/projetos/[id]/page.tsx
- app/admin/projetos/page.tsx
- app/api/auth/login/route.ts
- app/api/clients/[id]/route.ts
- app/api/clients/route.ts
- app/api/contracts/[id]/route.ts
- app/api/contracts/route.ts
- app/api/directorates/route.ts
- app/api/documents/[id]/download/route.ts
- app/api/documents/[id]/route.ts
- app/api/documents/route.ts
- app/api/members/[id]/route.ts
- app/api/members/route.ts
- app/api/organization/route.ts
- app/api/positions/route.ts
- app/api/projects/[id]/route.ts
- app/api/projects/route.ts
- components/AdminSidebar.tsx
- components/documents/EntityDocuments.tsx
- lib/auth.ts
- lib/validation.ts
- prisma/schema.prisma
- tests/document-import.test.mjs
- docs/user-management.md
