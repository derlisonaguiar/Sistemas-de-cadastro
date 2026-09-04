# Sistema de Gestão para Empresa Júnior

Sistema web para gerenciamento administrativo de uma Empresa Júnior, desenvolvido inicialmente para a **BS Engenharia / Brainstorm Engenharia**.

O sistema centraliza informações de membros, cargos, diretorias, documentos, clientes, projetos e configurações da organização.

## Tecnologias

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM 6.12
- Python
- docxtpl
- python-docx
- Pillow

## Funcionalidades atuais

- Configuração da organização
- Identidade visual
- Cadastro de membros
- Diretorias e cargos
- Regras para Presidente, Vice-Presidente e Diretores
- Perfil detalhado do membro
- Dashboard administrativo
- Upload de modelos DOCX
- Análise de variáveis em templates
- Geração automática de documentos
- Inserção automática de logo
- Registro de documentos emitidos
- Documentos vinculados aos membros
- Autenticação com Supabase Auth
- Autorização administrativa por perfil `ADMIN`
- Isolamento de dados por organização
- Convites com uso único para vincular contas a organizações
- Validação centralizada de payloads com Zod
- Proteção CSRF por origem e limitação de tentativas em operações sensíveis
- Headers de segurança e regras de liderança protegidas no banco
- Arquivos sensíveis em bucket privado do Supabase Storage com URLs assinadas temporárias
- Modelos DOCX e PDF com validação binária, detecção determinística e revisão de campos
- Sintaxe DOCX restrita a placeholders permitidos, com sandbox Jinja na geração

## Estrutura simplificada

```text
app/
├── admin/
└── api/

document_engine/
├── analyze_template.py
└── generate_document.py

prisma/
├── schema.prisma
└── migrations/

public/
└── uploads/
```

## Rodando localmente

Instale as dependências:

```bash
npm install
```

Instale as dependências Python:

```bash
python -m pip install python-docx docxtpl pillow
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Se houver alterações no banco:

```bash
npx prisma migrate dev
```

### Terminal 1

Inicie o Prisma Postgres:

```bash
npx prisma dev
```

### Terminal 2

Inicie o Next.js:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Área administrativa:

```text
http://localhost:3000/admin
```

## Variáveis de ambiente

Exemplo de `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/banco"
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
SUPABASE_SERVICE_ROLE_KEY="chave-service-role-somente-no-servidor"
SUPABASE_PRIVATE_BUCKET="private-documents"
SUPABASE_PUBLIC_ASSETS_BUCKET="public-assets"
MAX_TEMPLATE_UPLOAD_BYTES="10485760"
CERTIFICATE_IMAGE_MAX_BYTES="8388608"
PYTHON_EXECUTABLE="python"
```

Não publique o arquivo `.env`.

Crie os buckets executando `supabase/storage-setup.sql` no SQL Editor do Supabase. A variável
`SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor e nunca deve receber prefixo `NEXT_PUBLIC_`.

Para revisar a migração dos arquivos legados sem alterar dados:

```bash
npm run migrate:storage
```

Depois de revisar o relatório, execute explicitamente `npm run migrate:storage -- --apply`. O script
nunca apaga os arquivos originais em `public/uploads`.

## Documentos

A geração de documentos utiliza templates DOCX com variáveis como:

```text
{{ member.fullName }}
{{ member.cpf }}
{{ organization.name }}
{{ representative.fullName }}
{{ system.currentDate }}
```

A rota principal de geração é:

```text
POST /api/documents/generate
```

Os templates e documentos gerados ficam no bucket privado `private-documents`. Downloads de
arquivos sensíveis usam URLs assinadas temporárias; arquivos legados em `/uploads` continuam
compatíveis durante a transição.

### Certificados visuais

Em **Documentos → Modelos → Certificados visuais**, administradores podem criar layouts A4 em
paisagem ou retrato com textos, variáveis permitidas, imagens PNG/JPEG, linhas e retângulos. O
editor usa Konva no navegador, mas o PDF oficial é renderizado no servidor com `pdf-lib`, salvo no
bucket privado e registrado no histórico de `Document`. Cada documento guarda a versão e um
snapshot do layout usado na geração.

## Status

Projeto em desenvolvimento.

### Próximos passos

- Histórico de membros
- Participação em projetos
- Gestão completa de clientes
- Gestão completa de projetos
- Gestão de contratos
- Upload de documentos assinados
- Renderização final de modelos PDF overlay
- Envio por e-mail
- Integração com Google Drive
- Portal do membro

## Observação

O projeto pode utilizar dados reais durante o desenvolvimento.

Não publique arquivos `.env`, bancos, documentos gerados, uploads ou dados pessoais em repositórios públicos.
