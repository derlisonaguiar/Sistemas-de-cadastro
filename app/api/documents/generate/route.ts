import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse, parseJsonRequest } from "@/lib/api";
import { documentGenerationSchema } from "@/lib/validation";
import { createSignedStorageUrl, downloadStorageObject, removeStorageObject, uploadPrivateObject } from "@/lib/storage";

import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type PythonResult = {
  ok: boolean;
  output?: string;
  error?: string;
};

function formatDate(
  value: Date | string | null | undefined
) {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getLocalPublicPath(
  url: string | null | undefined
) {
  if (!url) {
    return null;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return null;
  }

  if (!url.startsWith("/uploads/")) return null;
  const relativePath = url.replace(/^\/+/, "");
  const resolved = path.resolve(process.cwd(), "public", relativePath);
  const root = path.resolve(process.cwd(), "public", "uploads") + path.sep;
  if (!resolved.startsWith(root)) return null;

  return path.join(
    process.cwd(),
    "public",
    relativePath
  );
}

async function fileExists(
  filePath: string | null
) {
  if (!filePath) {
    return false;
  }

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateWithPython(
  templatePath: string,
  outputPath: string,
  dataPath: string,
  logoPath: string | null
) {
  const generatorPath = path.join(
    process.cwd(),
    "document_engine",
    "generate_document.py"
  );

  if (!(await fileExists(generatorPath))) {
    throw new Error(
      "Motor Python de documentos não encontrado."
    );
  }

  const pythonExecutable =
    process.env.PYTHON_EXECUTABLE || "python";

  const args = [
    generatorPath,
    "--template",
    templatePath,
    "--output",
    outputPath,
    "--data",
    dataPath,
  ];

  if (logoPath) {
    args.push(
      "--logo",
      logoPath
    );
  }

  const {
    stdout,
    stderr,
  } = await execFileAsync(
    pythonExecutable,
    args,
    {
      cwd: process.cwd(),
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    }
  );

  if (stderr?.trim()) {
    console.warn(
      "Aviso do motor Python:",
      stderr.trim()
    );
  }

  const output = stdout.trim();

  if (!output) {
    throw new Error(
      "O motor Python não retornou resultado."
    );
  }

  const lines = output
    .split(/\r?\n/)
    .filter(Boolean);

  let result: PythonResult | null = null;

  for (
    let index = lines.length - 1;
    index >= 0;
    index--
  ) {
    try {
      result = JSON.parse(lines[index]);
      break;
    } catch {
      continue;
    }
  }

  if (!result) {
    console.error(
      "Saída do Python:",
      output
    );

    throw new Error(
      "Não foi possível interpretar o resultado do motor Python."
    );
  }

  if (!result.ok) {
    throw new Error(
      result.error ||
        "Erro ao gerar documento no Python."
    );
  }

  return result;
}

export async function POST(
  request: Request
) {
  let temporaryDataPath: string | null = null;
  let workingDirectory: string | null = null;
  let generatedStorageRef: string | null = null;

  try {
    const limited = checkRateLimit(request, "document-generate", 10, 60_000);
    if (limited) return limited;
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organizationId = authContext.auth!.profile.organizationId;

    const parsed = await parseJsonRequest(request, documentGenerationSchema);
    if (parsed.response) return parsed.response;
    const { templateId, memberId, manualValues } = parsed.data!;
    const representativeId = parsed.data!.representativeId || "";

    if (!templateId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Modelo não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (!memberId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Membro não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const template =
      await prisma.documentTemplate.findFirst({
        where: {
          id: templateId,
          organizationId,
        },

        include: {
          fields: true,
          organization: true,
        },
      });

    if (!template) {
      return NextResponse.json(
        {
          ok: false,
          message: "Modelo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (!template.active) {
      return NextResponse.json(
        {
          ok: false,
          message: "Este modelo está inativo.",
        },
        {
          status: 400,
        }
      );
    }

    if (!template.originalFileUrl) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O modelo não possui arquivo DOCX original.",
        },
        {
          status: 400,
        }
      );
    }

    if (template.sourceType !== "DOCX" || template.processingStatus !== "READY") {
      return NextResponse.json(
        { ok: false, message: "Este modelo ainda não está pronto para geração DOCX." },
        { status: 400 }
      );
    }

    const member =
      await prisma.member.findFirst({
        where: {
          id: memberId,
          organizationId:
            template.organizationId,
        },

        include: {
          directorate: true,
          position: true,
        },
      });

    if (!member) {
      return NextResponse.json(
        {
          ok: false,
          message: "Membro não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const templateUsesRepresentative =
      template.fields.some((field) =>
        field.key.startsWith(
          "representative."
        )
      );

    let representative:
      | typeof member
      | null = null;

    if (templateUsesRepresentative) {
      if (!representativeId) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Selecione o representante da organização.",
          },
          {
            status: 400,
          }
        );
      }

      representative =
        await prisma.member.findFirst({
          where: {
            id: representativeId,
            organizationId:
              template.organizationId,
            status: "ACTIVE",
          },

          include: {
            directorate: true,
            position: true,
          },
        });

      if (!representative) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Representante não encontrado ou inativo.",
          },
          {
            status: 400,
          }
        );
      }

      const role =
        representative.position?.role;

      if (
        role !== "PRESIDENT" &&
        role !== "VICE_PRESIDENT"
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "O representante precisa ser Presidente ou Vice-Presidente ativo.",
          },
          {
            status: 400,
          }
        );
      }
    }

    workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "document-generation-"));
    let templatePath = getLocalPublicPath(template.originalFileUrl);

    if (!templatePath) {
      const storedTemplate = await downloadStorageObject(template.originalFileUrl);
      if (storedTemplate) {
        templatePath = path.join(workingDirectory, "template.docx");
        await fs.writeFile(templatePath, storedTemplate);
      }
    }

    if (
      !templatePath ||
      !(await fileExists(templatePath))
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Arquivo DOCX do modelo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const selectedLogoUrl =
      template.organization
        .documentLogoUrl ||
      template.organization
        .logoUrl ||
      null;

    let logoPath = getLocalPublicPath(selectedLogoUrl);

    if (!logoPath && selectedLogoUrl) {
      const storedLogo = await downloadStorageObject(selectedLogoUrl);
      if (storedLogo) {
        logoPath = path.join(workingDirectory, "logo");
        await fs.writeFile(logoPath, storedLogo);
      }
    }

    if (
      logoPath &&
      !(await fileExists(logoPath))
    ) {
      console.warn(
        "Logo cadastrada não foi encontrada no disco:",
        logoPath
      );

      logoPath = null;
    }

    const sourceData = {
      organization: {
        id:
          template.organization.id,

        name:
          template.organization.name,

        shortName:
          template.organization
            .shortName || "",

        legalName:
          template.organization
            .legalName || "",

        tradeName:
          template.organization
            .tradeName || "",

        cnpj:
          template.organization
            .cnpj || "",

        email:
          template.organization
            .email || "",

        phone:
          template.organization
            .phone || "",

        website:
          template.organization
            .website || "",

        address:
          template.organization
            .address || "",

        addressNumber:
          template.organization
            .addressNumber || "",

        neighborhood:
          template.organization
            .neighborhood || "",

        cep:
          template.organization
            .cep || "",

        addressComplement:
          template.organization
            .addressComplement || "",

        city:
          template.organization
            .city || "",

        state:
          template.organization
            .state || "",

        stateCode:
          template.organization
            .stateCode || "",

        documentHeaderText:
          template.organization
            .documentHeaderText || "",

        logoImage: "",
      },

      member: {
        id:
          member.id,

        fullName:
          member.fullName,

        email:
          member.email || "",

        cpf:
          member.cpf || "",

        phone:
          member.phone || "",

        course:
          member.course || "",

        registration:
          member.registration || "",

        nationality:
          member.nationality || "",

        maritalStatus:
          member.maritalStatus || "",

        rg:
          member.rg || "",

        rgIssuer:
          member.rgIssuer || "",

        address:
          member.address || "",

        addressNumber:
          member.addressNumber || "",

        neighborhood:
          member.neighborhood || "",

        cep:
          member.cep || "",

        city:
          member.city || "",

        state:
          member.state || "",

        entryDate:
          formatDate(member.entryDate),

        exitDate:
          formatDate(member.exitDate),

        status:
          member.status,

        directorate: {
          name:
            member.directorate?.name ||
            "",
        },

        position: {
          name:
            member.position?.name ||
            "",
        },
      },

      representative:
        representative
          ? {
              id:
                representative.id,

              fullName:
                representative.fullName,

              email:
                representative.email ||
                "",

              cpf:
                representative.cpf ||
                "",

              phone:
                representative.phone ||
                "",

              course:
                representative.course ||
                "",

              registration:
                representative.registration ||
                "",

              nationality:
                representative.nationality ||
                "",

              maritalStatus:
                representative.maritalStatus ||
                "",

              rg:
                representative.rg ||
                "",

              rgIssuer:
                representative.rgIssuer ||
                "",

              address:
                representative.address ||
                "",

              addressNumber:
                representative.addressNumber ||
                "",

              neighborhood:
                representative.neighborhood ||
                "",

              cep:
                representative.cep ||
                "",

              city:
                representative.city ||
                "",

              state:
                representative.state ||
                "",

              directorate:
                representative.directorate
                  ?.name || "",

              position:
                representative.position
                  ?.name || "",
            }
          : {},

      client: {
        name: "", companyName: "", cpfCnpj: "", email: "", phone: "", contactName: "", address: "",
      },

      project: {
        name: "", description: "", startDate: "", endDate: "", budget: "",
      },

      contract: {
        title: "", contractNumber: "", value: "", startDate: "", endDate: "",
      },

      system: {
        currentDate:
          new Intl.DateTimeFormat(
            "pt-BR"
          ).format(
            new Date()
          ),
      },

      manual:
        manualValues,
    };

    const generatedDirectory = workingDirectory;
    const temporaryDirectory = workingDirectory;

    const timestamp =
      Date.now();

    const generatedFileName = "generated.docx";

    const generatedFilePath =
      path.join(
        generatedDirectory,
        generatedFileName
      );

    temporaryDataPath =
      path.join(
        temporaryDirectory,
        `${timestamp}-data.json`
      );

    await fs.writeFile(
      temporaryDataPath,
      JSON.stringify(
        sourceData,
        null,
        2
      ),
      "utf8"
    );

    await generateWithPython(
      templatePath,
      generatedFilePath,
      temporaryDataPath,
      logoPath
    );

    await fs
      .unlink(
        temporaryDataPath
      )
      .catch(() => {});

    temporaryDataPath = null;

    if (
      !(await fileExists(
        generatedFilePath
      ))
    ) {
      throw new Error(
        "O Python terminou, mas o documento não foi criado."
      );
    }

    const documentId = randomUUID();
    generatedStorageRef = await uploadPrivateObject(
      `organizations/${template.organizationId}/documents/${documentId}/generated.docx`,
      await fs.readFile(generatedFilePath),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    const document =
      await prisma.document.create({
        data: {
          id: documentId,
          organizationId:
            template.organizationId,

          templateId:
            template.id,

          memberId:
            member.id,

          title:
            `${template.name} - ${member.fullName}`,

          type:
            template.type,

          status:
            "ISSUED",

          issueDate:
            new Date(),

          content:
            JSON.stringify({
              organization:
                sourceData.organization,

              member:
                sourceData.member,

              representative:
                sourceData.representative,

              system:
                sourceData.system,

              manual:
                sourceData.manual,

              _representativeId:
                representative?.id ||
                null,

              _representativeName:
                representative
                  ?.fullName ||
                null,

              _logoSource:
                selectedLogoUrl,
            }),

          generatedDocxUrl: generatedStorageRef,
        },
      });

    const storedGeneratedReference = generatedStorageRef;
    generatedStorageRef = null;

    console.log(
      "Documento gerado pelo Python:",
      {
        documentId:
          document.id,

        member:
          member.fullName,

        template:
          template.name,

        logo:
          selectedLogoUrl ||
          "sem logo",

        issueDate:
          document.issueDate,
      }
    );

    return NextResponse.json({
      ok: true,

      message:
        "Documento gerado com sucesso.",

      document: {
        ...document,
        generatedDocxUrl: await createSignedStorageUrl(storedGeneratedReference),
      },

      generatedDocxUrl: await createSignedStorageUrl(storedGeneratedReference),

      logoUsed:
        selectedLogoUrl,
    });
  } catch (error) {
    if (generatedStorageRef) {
      await removeStorageObject(generatedStorageRef).catch(() => undefined);
    }
    if (temporaryDataPath) {
      await fs
        .unlink(
          temporaryDataPath
        )
        .catch(() => {});
    }

    console.error(
      "Erro ao gerar documento:",
      error
    );

    return internalErrorResponse();
  } finally {
    if (workingDirectory) {
      await fs.rm(workingDirectory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
