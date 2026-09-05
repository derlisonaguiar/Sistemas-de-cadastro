import { getReadApiContext } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { parseJsonRequest } from "@/lib/api";
import { contractSchema } from "@/lib/validation";

export async function GET() {
  try {
    const authContext = await getReadApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    const contracts = await prisma.contract.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        client: true,
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      contracts,
    });
  } catch (error) {
    console.error("Erro ao buscar contratos:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar contratos.",
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

    const parsed = await parseJsonRequest(request, contractSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

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

    const contract = await prisma.contract.create({
      data: {
        organizationId: organization.id,
        clientId: data.clientId,
        projectId: data.projectId || null,

        title: data.title.trim(),
        description: data.description?.trim() || null,
        contractNumber: data.contractNumber?.trim() || null,

        value:
          data.value !== undefined &&
          data.value !== null
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
    console.error("Erro ao cadastrar contrato:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao cadastrar contrato.",
      },
      { status: 500 }
    );
  }
}
