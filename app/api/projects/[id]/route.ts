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

    const project = await prisma.project.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        client: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          message: "Projeto não encontrado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      project,
    });
  } catch (error) {
    console.error("Erro ao buscar projeto:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar projeto.",
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

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        {
          ok: false,
          message: "Projeto não encontrado.",
        },
        { status: 404 }
      );
    }

    const data = await request.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O nome do projeto é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (data.clientId) {
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
    }

    const project = await prisma.project.update({
      where: {
        id: existingProject.id,
      },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        clientId: data.clientId || null,
        startDate: data.startDate
          ? new Date(data.startDate)
          : null,
        endDate: data.endDate
          ? new Date(data.endDate)
          : null,
        status: data.status || "PLANNING",
        budget:
          data.budget !== undefined &&
          data.budget !== null &&
          data.budget !== ""
            ? data.budget
            : null,
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json({
      ok: true,
      project,
    });
  } catch (error) {
    console.error("Erro ao atualizar projeto:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao atualizar projeto.",
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

    const project = await prisma.project.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          message: "Projeto não encontrado.",
        },
        { status: 404 }
      );
    }

    await prisma.project.delete({
      where: {
        id: project.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Projeto excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir projeto:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao excluir projeto.",
      },
      { status: 500 }
    );
  }
}