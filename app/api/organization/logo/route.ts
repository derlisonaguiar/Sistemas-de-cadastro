import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

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

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Formato de imagem não permitido.",
        },
        {
          status: 400,
        }
      );
    }

    const maxSize =
      2 * 1024 * 1024;

    if (
      file.size > maxSize
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "A imagem deve ter no máximo 2 MB.",
        },
        {
          status: 400,
        }
      );
    }

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

    const extension =
      path
        .extname(file.name)
        .toLowerCase();

    const fileName =
      `organization-document-logo-${Date.now()}${extension}`;

    const bytes =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(bytes);

    const uploadsDirectory =
      path.join(
        process.cwd(),
        "public",
        "uploads"
      );

    const uploadPath =
      path.join(
        uploadsDirectory,
        fileName
      );

    await writeFile(
      uploadPath,
      buffer
    );

    const documentLogoUrl =
      `/uploads/${fileName}`;

    const updatedOrganization =
      await prisma.organization.update({
        where: {
          id:
            organization.id,
        },

        data: {
          documentLogoUrl,
        },
      });

    return NextResponse.json({
      ok: true,

      message:
        "Logo para documentos atualizada com sucesso.",

      documentLogoUrl,

      organization:
        updatedOrganization,
    });
  } catch (error) {
    console.error(
      "Erro ao enviar logo para documentos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao enviar logo para documentos.",
      },
      {
        status: 500,
      }
    );
  }
}