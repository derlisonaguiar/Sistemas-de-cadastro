import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import mammoth from "mammoth";

import fs from "fs/promises";
import path from "path";

import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type FieldType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "CPF"
  | "CNPJ"
  | "EMAIL"
  | "PHONE"
  | "ADDRESS"
  | "CURRENCY"
  | "BOOLEAN";

type PythonAnalysis = {
  ok: boolean;
  ready: boolean;

  file?: string;

  totalFields?: number;

  fields?: string[];

  validFields?: string[];

  unknownFields?: string[];

  error?: string;
};

type DetectedField = {
  key: string;
  label: string;
  type: FieldType;
  mappedPath: string;
  detectedValue: string;
  context: string;
  confidence: number;
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getContext(
  text: string,
  key: string,
  radius = 100
) {
  const normalizedText =
    normalizeText(text);

  const possiblePlaceholders = [
    `{{ ${key} }}`,
    `{{${key}}}`,
    `{{ ${key}}}`,
    `{{${key} }}`,
  ];

  let index = -1;
  let foundPlaceholder = "";

  for (const placeholder of possiblePlaceholders) {
    index =
      normalizedText.indexOf(
        placeholder
      );

    if (index !== -1) {
      foundPlaceholder =
        placeholder;

      break;
    }
  }

  if (index === -1) {
    return key;
  }

  const start = Math.max(
    0,
    index - radius
  );

  const end = Math.min(
    normalizedText.length,
    index +
      foundPlaceholder.length +
      radius
  );

  return normalizedText
    .slice(start, end)
    .trim();
}

function getFieldLabel(
  key: string
) {
  const labels: Record<
    string,
    string
  > = {
    // Organização
    "organization.name":
      "Nome da organização",

    "organization.shortName":
      "Nome curto da organização",

    "organization.cnpj":
      "CNPJ da organização",

    "organization.email":
      "E-mail da organização",

    "organization.phone":
      "Telefone da organização",

    "organization.website":
      "Site da organização",

    "organization.address":
      "Endereço da organização",

    "organization.city":
      "Cidade da organização",

    "organization.state":
      "Estado da organização",

    "organization.logoImage":
      "Logo da organização",

    // Representante
    "representative.position":
      "Cargo do representante",

    "representative.fullName":
      "Nome completo do representante",

    "representative.email":
      "E-mail do representante",

    "representative.phone":
      "Telefone do representante",

    "representative.nationality":
      "Nacionalidade do representante",

    "representative.maritalStatus":
      "Estado civil do representante",

    "representative.course":
      "Curso do representante",

    "representative.rg":
      "RG do representante",

    "representative.rgIssuer":
      "Órgão expedidor do representante",

    "representative.cpf":
      "CPF do representante",

    // Membro
    "member.fullName":
      "Nome completo do membro",

    "member.email":
      "E-mail do membro",

    "member.cpf":
      "CPF do membro",

    "member.phone":
      "Telefone do membro",

    "member.course":
      "Curso do membro",

    "member.registration":
      "Matrícula do membro",

    "member.directorate.name":
      "Diretoria do membro",

    "member.position.name":
      "Cargo do membro",

    "member.nationality":
      "Nacionalidade do membro",

    "member.maritalStatus":
      "Estado civil do membro",

    "member.rg":
      "RG do membro",

    "member.rgIssuer":
      "Órgão expedidor do RG do membro",

    "member.address":
      "Endereço do membro",

    "member.addressNumber":
      "Número do endereço",

    "member.neighborhood":
      "Bairro do membro",

    "member.cep":
      "CEP do membro",

    "member.city":
      "Cidade do membro",

    "member.state":
      "Estado do membro",

    // Cliente
    "client.name":
      "Nome do cliente",

    "client.companyName":
      "Razão social do cliente",

    "client.cpfCnpj":
      "CPF/CNPJ do cliente",

    "client.email":
      "E-mail do cliente",

    "client.phone":
      "Telefone do cliente",

    "client.contactName":
      "Pessoa de contato",

    "client.address":
      "Endereço do cliente",

    // Projeto
    "project.name":
      "Nome do projeto",

    "project.description":
      "Descrição do projeto",

    "project.startDate":
      "Data de início do projeto",

    "project.endDate":
      "Data de término do projeto",

    "project.budget":
      "Orçamento do projeto",

    // Contrato
    "contract.title":
      "Título do contrato",

    "contract.contractNumber":
      "Número do contrato",

    "contract.value":
      "Valor do contrato",

    "contract.startDate":
      "Data de início do contrato",

    "contract.endDate":
      "Data de término do contrato",

    // Sistema
    "system.currentDate":
      "Data atual",
  };

  return (
    labels[key] ||
    key
      .split(".")
      .pop()
      ?.replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      ) ||
    key
  );
}

function getFieldType(
  key: string
): FieldType {
  const value =
    key.toLowerCase();

  if (
    value.endsWith(".cpf")
  ) {
    return "CPF";
  }

  if (
    value.includes("cnpj") ||
    value.includes("cpfcnpj")
  ) {
    return "CNPJ";
  }

  if (
    value.includes("email")
  ) {
    return "EMAIL";
  }

  if (
    value.includes("phone")
  ) {
    return "PHONE";
  }

  /*
   * addressNumber não deve ser
   * tratado como endereço completo.
   */
  if (
    value.endsWith(".address")
  ) {
    return "ADDRESS";
  }

  if (
    value.includes("date") ||
    value.includes("currentdate")
  ) {
    return "DATE";
  }

  if (
    value.includes("value") ||
    value.includes("budget")
  ) {
    return "CURRENCY";
  }

  return "TEXT";
}

function createDetectedField(
  key: string,
  extractedText: string
): DetectedField {
  return {
    key,

    label:
      getFieldLabel(key),

    type:
      getFieldType(key),

    /*
     * O Python já validou que o
     * campo existe no sistema.
     *
     * Portanto não existe mais
     * mapeamento manual.
     */
    mappedPath: key,

    detectedValue:
      `{{ ${key} }}`,

    context:
      getContext(
        extractedText,
        key
      ),

    confidence: 1,
  };
}

async function analyzeWithPython(
  templatePath: string
): Promise<PythonAnalysis> {
  const analyzerPath =
    path.join(
      process.cwd(),
      "document_engine",
      "analyze_template.py"
    );

  try {
    await fs.access(
      analyzerPath
    );
  } catch {
    throw new Error(
      "O analisador Python não foi encontrado em document_engine/analyze_template.py."
    );
  }

  const pythonExecutable =
    process.env.PYTHON_EXECUTABLE ||
    "python";

  const {
    stdout,
    stderr,
  } = await execFileAsync(
    pythonExecutable,
    [
      analyzerPath,
      "--template",
      templatePath,
    ],
    {
      cwd: process.cwd(),

      windowsHide: true,

      maxBuffer:
        5 * 1024 * 1024,
    }
  );

  if (stderr?.trim()) {
    console.warn(
      "Aviso do analisador Python:",
      stderr.trim()
    );
  }

  const output =
    stdout.trim();

  if (!output) {
    throw new Error(
      "O analisador Python não retornou nenhum resultado."
    );
  }

  try {
    return JSON.parse(
      output
    ) as PythonAnalysis;
  } catch {
    console.error(
      "Resposta recebida do Python:",
      output
    );

    throw new Error(
      "Não foi possível interpretar a resposta do analisador Python."
    );
  }
}

export async function POST(
  request: Request
) {
  let storedFilePath:
    | string
    | null = null;

  try {
    const organization =
      await prisma.organization.findFirst();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Organização não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const name =
      formData
        .get("name")
        ?.toString()
        .trim() || "";

    const description =
      formData
        .get("description")
        ?.toString()
        .trim() || null;

    const type =
      formData
        .get("type")
        ?.toString() ||
      "OTHER";

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Arquivo não enviado.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O nome do modelo é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      path
        .extname(file.name)
        .toLowerCase();

    /*
     * Neste novo fluxo, o motor
     * automático trabalha somente
     * com modelos DOCX.
     */
    if (
      extension !== ".docx"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Envie um modelo no formato DOCX.",
        },
        {
          status: 400,
        }
      );
    }

    const maxFileSize =
      10 * 1024 * 1024;

    if (
      file.size >
      maxFileSize
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O arquivo deve ter no máximo 10 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const uploadsDirectory =
      path.join(
        process.cwd(),
        "public",
        "uploads",
        "document-templates"
      );

    await fs.mkdir(
      uploadsDirectory,
      {
        recursive: true,
      }
    );

    const safeOriginalName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    const storedFileName =
      `${Date.now()}-${safeOriginalName}`;

    storedFilePath =
      path.join(
        uploadsDirectory,
        storedFileName
      );

    /*
     * O Python precisa analisar
     * um arquivo físico.
     */
    await fs.writeFile(
      storedFilePath,
      buffer
    );

    /*
     * --------------------------------
     * ANÁLISE AUTOMÁTICA COM PYTHON
     * --------------------------------
     */

    const analysis =
      await analyzeWithPython(
        storedFilePath
      );

    if (
      analysis.error
    ) {
      await fs.unlink(
        storedFilePath
      ).catch(() => {});

      storedFilePath = null;

      return NextResponse.json(
        {
          ok: false,
          message:
            analysis.error,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !analysis.fields ||
      analysis.fields.length === 0
    ) {
      await fs.unlink(
        storedFilePath
      ).catch(() => {});

      storedFilePath = null;

      return NextResponse.json(
        {
          ok: false,
          message:
            "Nenhuma variável {{ campo }} foi encontrada no documento.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      analysis.unknownFields &&
      analysis.unknownFields.length >
        0
    ) {
      const unknownFields =
        analysis.unknownFields;

      await fs.unlink(
        storedFilePath
      ).catch(() => {});

      storedFilePath = null;

      return NextResponse.json(
        {
          ok: false,

          message:
            `O modelo possui ${unknownFields.length} campo(s) não reconhecido(s).`,

          unknownFields,
        },
        {
          status: 400,
        }
      );
    }

    if (!analysis.ready) {
      await fs.unlink(
        storedFilePath
      ).catch(() => {});

      storedFilePath = null;

      return NextResponse.json(
        {
          ok: false,
          message:
            "O modelo ainda não está pronto para uso.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Mammoth continua sendo útil
     * somente para guardar uma
     * representação textual do modelo
     * no banco.
     *
     * A validação oficial agora é
     * feita pelo Python.
     */
    const mammothResult =
      await mammoth.extractRawText({
        buffer,
      });

    const extractedText =
      mammothResult.value.trim();

    const detectedFields =
      analysis.fields.map(
        (key) =>
          createDetectedField(
            key,
            extractedText
          )
      );

    const originalFileUrl =
      `/uploads/document-templates/${storedFileName}`;

    /*
     * Modelo já entra ativo e pronto.
     * Não existe revisão manual
     * obrigatória.
     */
    const template =
      await prisma.documentTemplate.create({
        data: {
          organizationId:
            organization.id,

          name,

          description,

          type: type as any,

          content:
            extractedText,

          extractedText,

          originalFileUrl,

          originalFileName:
            file.name,

          originalMimeType:
            file.type || null,

          originalFileSize:
            file.size,

          active: true,

          fields: {
            create:
              detectedFields.map(
                (field) => ({
                  key:
                    field.key,

                  label:
                    field.label,

                  type:
                    field.type,

                  mappedPath:
                    field.mappedPath,

                  detectedValue:
                    field.detectedValue,

                  context:
                    field.context,

                  confidence:
                    field.confidence,
                })
              ),
          },
        },

        include: {
          fields: true,
        },
      });

    storedFilePath = null;

    return NextResponse.json({
      ok: true,

      ready: true,

      message:
        `Modelo pronto para uso. ${template.fields.length} campos automáticos reconhecidos.`,

      template,

      analysis: {
        totalFields:
          analysis.totalFields,

        fields:
          analysis.fields,

        unknownFields: [],
      },
    });
  } catch (error) {
    /*
     * Se ocorreu um erro depois de
     * salvar o arquivo, mas antes de
     * cadastrar o modelo, removemos
     * o arquivo órfão.
     */
    if (storedFilePath) {
      await fs.unlink(
        storedFilePath
      ).catch(() => {});
    }

    console.error(
      "Erro ao salvar modelo:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao salvar modelo de documento.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}