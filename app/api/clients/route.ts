import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { parseJsonRequest } from "@/lib/api";
import { clientSchema } from "@/lib/validation";

export async function GET() {
  try {
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    const clients = await prisma.client.findMany({
      where: {
        organizationId: organization.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      clients,
    });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar clientes.",
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

    const parsed = await parseJsonRequest(request, clientSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "O nome do cliente é obrigatório.",
        },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        organizationId: organization.id,
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
            : true,
      },
    });

    return NextResponse.json({
      ok: true,
      client,
    });
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao cadastrar cliente.",
      },
      { status: 500 }
    );
  }
}
