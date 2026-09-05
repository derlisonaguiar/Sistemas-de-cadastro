import { getReadApiContext } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { documentFiltersSchema, documentWhere } from "@/lib/document-filters";
import { createSignedStorageUrl } from "@/lib/storage";

export async function GET(
  request: Request
) {
  try {
    const authContext = await getReadApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

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

    const url =
      new URL(request.url);

    const parsed = documentFiltersSchema.safeParse(Object.fromEntries([...url.searchParams.entries()].filter(([, value]) => value !== "")));
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Filtros inválidos." }, { status: 400 });

    const documents =
      await prisma.document.findMany({
        where: documentWhere(authContext.auth!.profile.organizationId, parsed.data),

        select: {
          id: true,
          title: true,
          origin: true,
          documentDate: true,
          organizationDocument: true,
          fileUrl: true,
          signedFile: true,
          signedAt: true,
          type: true,
          status: true,
          description: true,
          generatedDocxUrl: true,
          generatedPdfUrl: true,
          issueDate: true,
          signatureDate: true,
          createdAt: true,
          template: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },

          member: {
            select: {
              id: true,
              fullName: true,
            },
          },

          client: {
            select: {
              id: true,
              name: true,
            },
          },

          project: {
            select: {
              id: true,
              name: true,
            },
          },

          contract: {
            select: {
              id: true,
              title: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const safeDocuments = await Promise.all(documents.map(async (document) => ({
      ...document,
      fileUrl: document.fileUrl ? await createSignedStorageUrl(document.fileUrl) : null,
      signedFile: document.signedFile ? await createSignedStorageUrl(document.signedFile) : null,
      generatedDocxUrl: document.generatedDocxUrl
        ? await createSignedStorageUrl(document.generatedDocxUrl)
        : null,
      generatedPdfUrl: document.generatedPdfUrl
        ? await createSignedStorageUrl(document.generatedPdfUrl)
        : null,
    })));

    return NextResponse.json({
      ok: true,
      documents: safeDocuments,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar documentos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao buscar documentos.",
      },
      {
        status: 500,
      }
    );
  }
}
