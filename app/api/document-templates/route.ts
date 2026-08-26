import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const organization =
      await prisma.organization.findFirst();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organização não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const templates =
      await prisma.documentTemplate.findMany({
        where: {
          organizationId: organization.id,
        },
        include: {
          fields: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      ok: true,
      templates,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar modelos de documento:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao buscar modelos de documento.",
      },
      {
        status: 500,
      }
    );
  }
}