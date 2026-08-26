import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request
) {
  try {
    const organization =
      await prisma.organization.findFirst();

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

    const url =
      new URL(request.url);

    const memberId =
      url.searchParams.get(
        "memberId"
      );

    const documents =
      await prisma.document.findMany({
        where: {
          organizationId:
            organization.id,

          ...(memberId
            ? {
                memberId,
              }
            : {}),
        },

        include: {
          template: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },

          member: {
            select: {
              id: true,
              fullName: true,
            },
          },

          client: {
            select: {
              id: true,
              name: true,
            },
          },

          project: {
            select: {
              id: true,
              name: true,
            },
          },

          contract: {
            select: {
              id: true,
              title: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      ok: true,
      documents,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar documentos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Erro ao buscar documentos.",
      },
      {
        status: 500,
      }
    );
  }
}