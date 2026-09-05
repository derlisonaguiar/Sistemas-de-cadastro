import { getReadApiContext } from "@/lib/auth";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { positionSchema } from "@/lib/validation";

export async function GET() {
  try {
    const authContext = await getReadApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    const positions = await prisma.position.findMany({
      where: {
        organizationId: organization.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      positions,
    });
  } catch (error) {
    console.error("Erro ao buscar cargos:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar cargos.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

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

    const position = await prisma.position.create({
      data: {
        organizationId: organization.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        role,
        directorateId: data.directorateId || null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Cargo cadastrado com sucesso.",
        position,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao cadastrar cargo:", error);
    return databaseErrorResponse(error);
  }
}
