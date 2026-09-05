import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { positionSchema, routeIdSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

    const parsed = await parseJsonRequest(request, positionSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O nome do cargo é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (data.directorateId && !await prisma.directorate.findFirst({
      where: { id: data.directorateId, organizationId: organization.id }, select: { id: true },
    })) {
      return NextResponse.json({ ok: false, message: "Diretoria inválida para esta organização." }, { status: 400 });
    }

    const role = data.role;

    const position = await prisma.position.update({
      where: {
        id: existingPosition.id,
      },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        role,
        directorateId: data.directorateId === undefined ? existingPosition.directorateId : data.directorateId,
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
    return databaseErrorResponse(error);
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
