import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";

const allowedMappedPaths = [
  "",
  "member.fullName",
  "member.email",
  "member.cpf",
  "member.phone",
  "member.course",
  "member.registration",
  "member.directorate.name",
  "member.position.name",

  "organization.name",
  "organization.shortName",
  "organization.cnpj",
  "organization.email",
  "organization.phone",
  "organization.website",
  "organization.address",
  "organization.city",
  "organization.state",

  "client.name",
  "client.companyName",
  "client.cpfCnpj",
  "client.email",
  "client.phone",
  "client.contactName",
  "client.address",

  "project.name",
  "project.description",
  "project.startDate",
  "project.endDate",
  "project.budget",

  "contract.title",
  "contract.contractNumber",
  "contract.value",
  "contract.startDate",
  "contract.endDate",

  "system.currentDate",
  "manual",
];

const allowedFieldTypes = [
  "TEXT",
  "NUMBER",
  "DATE",
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "CURRENCY",
  "BOOLEAN",
];

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const template =
      await prisma.documentTemplate.findUnique({
        where: {
          id,
        },
        include: {
          fields: {
            orderBy: {
              createdAt: "asc",
            },
          },
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

    return NextResponse.json({
      ok: true,
      template,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar modelo de documento:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao buscar modelo de documento.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const fieldId =
      body.fieldId?.toString() || "";

    if (!fieldId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Campo do modelo não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const template =
      await prisma.documentTemplate.findUnique({
        where: {
          id,
        },
      });

    if (!template) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Modelo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const field =
      await prisma.documentTemplateField.findFirst({
        where: {
          id: fieldId,
          templateId: id,
        },
      });

    if (!field) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Campo do modelo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const updateData: {
      label?: string;
      type?: any;
      required?: boolean;
      mappedPath?: string | null;
    } = {};

    if (body.label !== undefined) {
      const label =
        body.label?.toString().trim() || "";

      if (!label) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "O nome do campo não pode ficar vazio.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.label = label;
    }

    if (body.type !== undefined) {
      const type =
        body.type?.toString() || "";

      if (!allowedFieldTypes.includes(type)) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Tipo de campo inválido.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.type = type;
    }

    if (body.required !== undefined) {
      updateData.required =
        Boolean(body.required);
    }

    if (body.mappedPath !== undefined) {
      const mappedPath =
        body.mappedPath?.toString() || "";

      if (
        !allowedMappedPaths.includes(mappedPath)
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Fonte de dados inválida.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.mappedPath =
        mappedPath || null;
    }

    const updatedField =
      await prisma.documentTemplateField.update({
        where: {
          id: field.id,
        },
        data: updateData,
      });

    return NextResponse.json({
      ok: true,
      message:
        "Campo atualizado com sucesso.",
      field: updatedField,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar campo do modelo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao atualizar campo do modelo.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const template =
      await prisma.documentTemplate.findUnique({
        where: {
          id,
        },
        include: {
          documents: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!template) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Modelo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Os documentos gerados permanecem
     * no histórico.
     *
     * Como a relação Document.template
     * usa onDelete: SetNull, ao apagar
     * o modelo os documentos continuam
     * existindo, apenas sem referência
     * ao template removido.
     */
    await prisma.documentTemplate.delete({
      where: {
        id,
      },
    });

    /*
     * Tenta remover o DOCX original
     * do disco.
     *
     * Se o arquivo já não existir,
     * isso não impede a exclusão do
     * registro no banco.
     */
    if (template.originalFileUrl) {
      try {
        const relativePath =
          template.originalFileUrl.replace(
            /^\/+/,
            ""
          );

        const absolutePath =
          path.join(
            process.cwd(),
            "public",
            relativePath
          );

        await fs.unlink(absolutePath);
      } catch (fileError) {
        console.warn(
          "Modelo excluído do banco, mas não foi possível remover o arquivo físico:",
          fileError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "Modelo excluído com sucesso.",
      linkedDocuments:
        template.documents.length,
    });
  } catch (error) {
    console.error(
      "Erro ao excluir modelo de documento:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao excluir modelo de documento.",
      },
      {
        status: 500,
      }
    );
  }
}