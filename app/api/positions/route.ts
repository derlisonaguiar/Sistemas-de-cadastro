import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const VALID_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "DIRECTOR",
  "MANAGER",
  "MEMBER",
  "OTHER",
];

export async function GET() {
  try {
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
      : "OTHER";

    const position = await prisma.position.create({
      data: {
        organizationId: organization.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        role,
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

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao cadastrar cargo.",
      },
      { status: 500 }
    );
  }
}