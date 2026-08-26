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
PYTHON_EXECUTABLE="python"
```

Não publique o arquivo `.env`.

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

Os documentos gerados ficam, durante o desenvolvimento, em:

```text
public/uploads/generated-documents/
```

## Status

Projeto em desenvolvimento.

### Próximos passos

- Histórico de membros
- Participação em projetos
- Gestão completa de clientes
- Gestão completa de projetos
- Gestão de contratos
- Upload de documentos assinados
- Geração de PDF
- Envio por e-mail
- Integração com Google Drive
- Controle de permissões
- Portal do membro

## Observação

O projeto pode utilizar dados reais durante o desenvolvimento.

Não publique arquivos `.env`, bancos, documentos gerados, uploads ou dados pessoais em repositórios públicos.