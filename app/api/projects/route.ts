import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const projects = await prisma.project.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      projects,
    });
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar projetos.",
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

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        clientId: data.clientId || null,

        name: data.name.trim(),
        description: data.description?.trim() || null,

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
    console.error("Erro ao cadastrar projeto:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao cadastrar projeto.",
      },
      { status: 500 }
    );
  }
}