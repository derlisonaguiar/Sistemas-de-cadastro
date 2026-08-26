import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const VALID_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "DIRECTOR",
  "MANAGER",
  "MEMBER",
  "OTHER",
];

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

    const existingPosition = await prisma.position.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingPosition) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cargo não encontrado.",
        },
        { status: 404 }
      );
    }

    const data = await request.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O nome do cargo é obrigatório.",
        },
        { status: 400 }
      );
    }

    const role = VALID_ROLES.includes(data.role)
      ? data.role
      : existingPosition.role;

    const position = await prisma.position.update({
      where: {
        id: existingPosition.id,
      },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        role,
        active:
          typeof data.active === "boolean"
            ? data.active
            : existingPosition.active,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Cargo atualizado com sucesso.",
      position,
    });
  } catch (error) {
    console.error("Erro ao atualizar cargo:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao atualizar cargo.",
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

    const position = await prisma.position.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        members: true,
      },
    });

    if (!position) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cargo não encontrado.",
        },
        { status: 404 }
      );
    }

    if (position.members.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Não é possível excluir este cargo porque existem membros vinculados a ele. Desative o cargo ou altere primeiro o cargo desses membros.",
        },
        { status: 409 }
      );
    }

    await prisma.position.delete({
      where: {
        id: position.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Cargo excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir cargo:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao excluir cargo.",
      },
      { status: 500 }
    );
  }
}