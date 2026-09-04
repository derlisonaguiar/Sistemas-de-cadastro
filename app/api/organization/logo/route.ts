import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api";
import { validateImageUpload } from "@/lib/file-security";
import { uploadPublicObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  try {
    const limited = checkRateLimit(request, "organization-logo", 5, 60_000);
    if (limited) return limited;
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

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

    const buffer = Buffer.from(await file.arrayBuffer());
    let safeImage;
    try { safeImage = validateImageUpload(buffer, file); }
    catch { return NextResponse.json({ ok: false, message: "Imagem inválida ou com dimensões inseguras." }, { status: 400 }); }
    const documentLogoUrl = await uploadPublicObject(
      `organizations/${organization.id}/assets/document-logo${safeImage.extension}`,
      buffer,
      safeImage.mime
    );

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
