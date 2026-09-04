import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { createSignedStorageUrl } from "@/lib/storage";

export async function GET() {
  try {
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const templates =
      await prisma.documentTemplate.findMany({
        where: {
          organizationId: organization.id,
          renderMode: { not: "VISUAL_CERTIFICATE" },
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          active: true,
          sourceType: true,
          renderMode: true,
          processingStatus: true,
          originalFileName: true,
          originalFileUrl: true,
          createdAt: true,
          updatedAt: true,
          fields: {
            select: {
              id: true,
              key: true,
              label: true,
              type: true,
              mappedPath: true,
              required: true,
              confidence: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const safeTemplates = await Promise.all(templates.map(async (template) => ({
      ...template,
      originalFileUrl: template.originalFileUrl
        ? await createSignedStorageUrl(template.originalFileUrl)
        : null,
    })));

    return NextResponse.json({
      ok: true,
      templates: safeTemplates,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar modelos de documento:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao buscar modelos de documento.",
      },
      {
        status: 500,
      }
    );
  }
}
