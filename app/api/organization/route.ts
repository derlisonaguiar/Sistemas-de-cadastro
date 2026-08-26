import { NextResponse } from "next/server";

import {
  getAuthenticatedProfile,
  requireAdminProfile,
} from "@/lib/auth";

import { prisma } from "@/lib/prisma";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: "Não autenticado.",
    },
    {
      status: 401,
    }
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: "Acesso não autorizado.",
    },
    {
      status: 403,
    }
  );
}

export async function GET() {
  try {
    const auth =
      await getAuthenticatedProfile();

    if (!auth) {
      return unauthorizedResponse();
    }

    const organization =
      await prisma.organization.findUnique({
        where: {
          id:
            auth.organization.id,
        },

        select: {
          id: true,
          name: true,
          shortName: true,
          legalName: true,
          tradeName: true,

          logoUrl: true,
          documentLogoUrl: true,
          faviconUrl: true,

          primaryColor: true,
          secondaryColor: true,

          cnpj: true,
          email: true,
          phone: true,
          website: true,

          address: true,
          addressNumber: true,
          neighborhood: true,
          cep: true,
          addressComplement: true,
          city: true,
          state: true,
          stateCode: true,

          documentHeaderText: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Organização não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      organization,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar organização:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao buscar organização.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Criação de organização não disponível nesta rota.",
    },
    {
      status: 405,
    }
  );
}

export async function PUT(
  request: Request
) {
  try {
    let auth;

    try {
      auth =
        await requireAdminProfile();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "UNAUTHORIZED"
      ) {
        return unauthorizedResponse();
      }

      if (
        error instanceof Error &&
        error.message === "FORBIDDEN"
      ) {
        return forbiddenResponse();
      }

      throw error;
    }

    const data =
      await request.json();

    const organization =
      await prisma.organization.findUnique({
        where: {
          id:
            auth.organization.id,
        },
      });

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Organização não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const updatedOrganization =
      await prisma.organization.update({
        where: {
          id:
            organization.id,
        },

        data: {
          name:
            data.name
              ?.toString()
              .trim() ||
            organization.name,

          shortName:
            data.shortName
              ?.toString()
              .trim() ||
            null,

          legalName:
            data.legalName
              ?.toString()
              .trim() ||
            null,

          tradeName:
            data.tradeName
              ?.toString()
              .trim() ||
            null,

          primaryColor:
            data.primaryColor
              ?.toString()
              .trim() ||
            organization.primaryColor,

          secondaryColor:
            data.secondaryColor
              ?.toString()
              .trim() ||
            organization.secondaryColor,

          cnpj:
            data.cnpj
              ?.toString()
              .trim() ||
            null,

          email:
            data.email
              ?.toString()
              .trim() ||
            null,

          phone:
            data.phone
              ?.toString()
              .trim() ||
            null,

          website:
            data.website
              ?.toString()
              .trim() ||
            null,

          address:
            data.address
              ?.toString()
              .trim() ||
            null,

          addressNumber:
            data.addressNumber
              ?.toString()
              .trim() ||
            null,

          neighborhood:
            data.neighborhood
              ?.toString()
              .trim() ||
            null,

          cep:
            data.cep
              ?.toString()
              .trim() ||
            null,

          addressComplement:
            data.addressComplement
              ?.toString()
              .trim() ||
            null,

          city:
            data.city
              ?.toString()
              .trim() ||
            null,

          state:
            data.state
              ?.toString()
              .trim() ||
            null,

          stateCode:
            data.stateCode
              ?.toString()
              .trim()
              .toUpperCase()
              .slice(0, 2) ||
            null,

          documentHeaderText:
            data.documentHeaderText
              ?.toString()
              .trim() ||
            null,
        },

        select: {
          id: true,
          name: true,
          shortName: true,
          legalName: true,
          tradeName: true,

          logoUrl: true,
          documentLogoUrl: true,
          faviconUrl: true,

          primaryColor: true,
          secondaryColor: true,

          cnpj: true,
          email: true,
          phone: true,
          website: true,

          address: true,
          addressNumber: true,
          neighborhood: true,
          cep: true,
          addressComplement: true,
          city: true,
          state: true,
          stateCode: true,

          documentHeaderText: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      ok: true,
      message:
        "Organização atualizada com sucesso.",
      organization:
        updatedOrganization,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar organização:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao atualizar organização.",
      },
      {
        status: 500,
      }
    );
  }
}