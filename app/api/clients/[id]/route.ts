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

    const client = await prisma.client.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      client,
    });
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar cliente.",
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

    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    const data = await request.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O nome do cliente é obrigatório.",
        },
        { status: 400 }
      );
    }

    const client = await prisma.client.update({
      where: {
        id: existingClient.id,
      },
      data: {
        name: data.name.trim(),
        companyName: data.companyName?.trim() || null,
        cpfCnpj: data.cpfCnpj?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        contactName: data.contactName?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        active:
          typeof data.active === "boolean"
            ? data.active
            : existingClient.active,
      },
    });

    return NextResponse.json({
      ok: true,
      client,
    });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao atualizar cliente.",
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

    const client = await prisma.client.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    await prisma.client.delete({
      where: {
        id: client.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Cliente excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao excluir cliente.",
      },
      { status: 500 }
    );
  }
}