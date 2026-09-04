import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { parseJsonRequest } from "@/lib/api";
import { directorateSchema, routeIdSchema } from "@/lib/validation";

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
        { ok: false, message: "Organização não encontrada." },
        { status: 404 }
      );
    }

    const existingDirectorate = await prisma.directorate.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingDirectorate) {
      return NextResponse.json(
        { ok: false, message: "Diretoria não encontrada." },
        { status: 404 }
      );
    }

    const parsed = await parseJsonRequest(request, directorateSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        { ok: false, message: "O nome da diretoria é obrigatório." },
        { status: 400 }
      );
    }

    const directorate = await prisma.directorate.update({
      where: {
        id: existingDirectorate.id,
      },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        active:
          typeof data.active === "boolean"
            ? data.active
            : existingDirectorate.active,
      },
    });

    return NextResponse.json({
      ok: true,
      directorate,
    });
  } catch (error) {
    console.error("Erro ao atualizar diretoria:", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao atualizar diretoria." },
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
        { ok: false, message: "Organização não encontrada." },
        { status: 404 }
      );
    }

    const directorate = await prisma.directorate.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        members: true,
      },
    });

    if (!directorate) {
      return NextResponse.json(
        { ok: false, message: "Diretoria não encontrada." },
        { status: 404 }
      );
    }

    if (directorate.members.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Não é possível excluir uma diretoria que possui membros vinculados. Desative-a primeiro.",
        },
        { status: 409 }
      );
    }

    await prisma.directorate.delete({
      where: {
        id: directorate.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Diretoria excluída com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir diretoria:", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao excluir diretoria." },
      { status: 500 }
    );
  }
}
