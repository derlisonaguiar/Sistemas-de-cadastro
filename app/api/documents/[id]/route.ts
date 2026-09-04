import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { parseJsonRequest } from "@/lib/api";
import { documentSchema, routeIdSchema } from "@/lib/validation";
import { createSignedStorageUrl } from "@/lib/storage";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const { id } = params.data;

    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        { status: 404 }
      );
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        member: true,
        client: true,
        project: true,
        contract: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          ok: false,
          message: "Documento não encontrado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      document: {
        ...document,
        fileUrl: document.fileUrl ? await createSignedStorageUrl(document.fileUrl) : null,
        generatedDocxUrl: document.generatedDocxUrl ? await createSignedStorageUrl(document.generatedDocxUrl) : null,
        generatedPdfUrl: document.generatedPdfUrl ? await createSignedStorageUrl(document.generatedPdfUrl) : null,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar documento:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar documento.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const { id } = params.data;

    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        { status: 404 }
      );
    }

    const existingDocument = await prisma.document.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        {
          ok: false,
          message: "Documento não encontrado.",
        },
        { status: 404 }
      );
    }

    const parsed = await parseJsonRequest(request, documentSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

    if (!data.title || !data.title.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O título do documento é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (!data.type) {
      return NextResponse.json(
        {
          ok: false,
          message: "O tipo do documento é obrigatório.",
        },
        { status: 400 }
      );
    }

    const relatedChecks = await Promise.all([
      data.memberId
        ? prisma.member.count({ where: { id: data.memberId, organizationId: organization.id } })
        : Promise.resolve(1),
      data.clientId
        ? prisma.client.count({ where: { id: data.clientId, organizationId: organization.id } })
        : Promise.resolve(1),
      data.projectId
        ? prisma.project.count({ where: { id: data.projectId, organizationId: organization.id } })
        : Promise.resolve(1),
      data.contractId
        ? prisma.contract.count({ where: { id: data.contractId, organizationId: organization.id } })
        : Promise.resolve(1),
    ]);

    if (relatedChecks.some((count) => count !== 1)) {
      return NextResponse.json(
        { ok: false, message: "Vínculo inválido para esta organização." },
        { status: 400 }
      );
    }

    const document = await prisma.document.update({
      where: {
        id: existingDocument.id,
      },
      data: {
        title: data.title.trim(),
        type: data.type,
        status: data.status || "DRAFT",

        memberId: data.memberId || null,
        clientId: data.clientId || null,
        projectId: data.projectId || null,
        contractId: data.contractId || null,

        description: data.description?.trim() || null,

        issueDate: data.issueDate
          ? new Date(data.issueDate)
          : null,

        signatureDate: data.signatureDate
          ? new Date(data.signatureDate)
          : null,
      },
      include: {
        member: true,
        client: true,
        project: true,
        contract: true,
      },
    });

    return NextResponse.json({
      ok: true,
      document,
    });
  } catch (error) {
    console.error("Erro ao atualizar documento:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao atualizar documento.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const { id } = params.data;

    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        { status: 404 }
      );
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          ok: false,
          message: "Documento não encontrado.",
        },
        { status: 404 }
      );
    }

    await prisma.document.delete({
      where: {
        id: document.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Documento excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir documento:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao excluir documento.",
      },
      { status: 500 }
    );
  }
}
