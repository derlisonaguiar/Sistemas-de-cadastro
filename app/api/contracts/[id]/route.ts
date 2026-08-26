import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { id } = await context.params;

    const organization = await prisma.organization.findFirst();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        { status: 404 }
      );
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        client: true,
        project: true,
      },
    });

    if (!contract) {
      return NextResponse.json(
        {
          ok: false,
          message: "Contrato não encontrado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      contract,
    });
  } catch (error) {
    console.error("Erro ao buscar contrato:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar contrato.",
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
    const { id } = await context.params;

    const organization = await prisma.organization.findFirst();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        { status: 404 }
      );
    }

    const existingContract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingContract) {
      return NextResponse.json(
        {
          ok: false,
          message: "Contrato não encontrado.",
        },
        { status: 404 }
      );
    }

    const data = await request.json();

    if (!data.title || !data.title.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O título do contrato é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (!data.clientId) {
      return NextResponse.json(
        {
          ok: false,
          message: "O cliente é obrigatório.",
        },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        organizationId: organization.id,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cliente inválido.",
        },
        { status: 400 }
      );
    }

    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          organizationId: organization.id,
        },
      });

      if (!project) {
        return NextResponse.json(
          {
            ok: false,
            message: "Projeto inválido.",
          },
          { status: 400 }
        );
      }
    }

    const contract = await prisma.contract.update({
      where: {
        id: existingContract.id,
      },
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        contractNumber: data.contractNumber?.trim() || null,
        clientId: data.clientId,
        projectId: data.projectId || null,

        value:
          data.value !== undefined &&
          data.value !== null &&
          data.value !== ""
            ? data.value
            : null,

        startDate: data.startDate
          ? new Date(data.startDate)
          : null,

        endDate: data.endDate
          ? new Date(data.endDate)
          : null,

        status: data.status || "DRAFT",

        signatureDate: data.signatureDate
          ? new Date(data.signatureDate)
          : null,

        notes: data.notes?.trim() || null,
      },
      include: {
        client: true,
        project: true,
      },
    });

    return NextResponse.json({
      ok: true,
      contract,
    });
  } catch (error) {
    console.error("Erro ao atualizar contrato:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao atualizar contrato.",
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
    const { id } = await context.params;

    const organization = await prisma.organization.findFirst();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        { status: 404 }
      );
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!contract) {
      return NextResponse.json(
        {
          ok: false,
          message: "Contrato não encontrado.",
        },
        { status: 404 }
      );
    }

    await prisma.contract.delete({
      where: {
        id: contract.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Contrato excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir contrato:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao excluir contrato.",
      },
      { status: 500 }
    );
  }
}