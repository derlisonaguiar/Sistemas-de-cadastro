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
        {
          status: 404,
        }
      );
    }

    const members = await prisma.member.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        directorate: true,
        position: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      members,
    });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar membros.",
      },
      {
        status: 500,
      }
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
        {
          status: 404,
        }
      );
    }

    const data = await request.json();

    const fullName = data.fullName?.toString().trim() || "";

    if (!fullName) {
      return NextResponse.json(
        {
          ok: false,
          message: "O nome completo é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const status = data.status || "ACTIVE";

    let selectedDirectorate = null;

    if (data.directorateId) {
      selectedDirectorate = await prisma.directorate.findFirst({
        where: {
          id: data.directorateId,
          organizationId: organization.id,
        },
      });

      if (!selectedDirectorate) {
        return NextResponse.json(
          {
            ok: false,
            message: "Diretoria inválida.",
          },
          {
            status: 400,
          }
        );
      }
    }

    let selectedPosition = null;

    if (data.positionId) {
      selectedPosition = await prisma.position.findFirst({
        where: {
          id: data.positionId,
          organizationId: organization.id,
        },
      });

      if (!selectedPosition) {
        return NextResponse.json(
          {
            ok: false,
            message: "Cargo inválido.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Regras de ocupação de cargos de liderança.
     * As regras abaixo valem somente para membros ATIVOS.
     */
    if (selectedPosition && status === "ACTIVE") {
      /*
       * PRESIDENTE
       */
      if (selectedPosition.role === "PRESIDENT") {
        const existingPresident = await prisma.member.findFirst({
          where: {
            organizationId: organization.id,
            status: "ACTIVE",
            position: {
              role: "PRESIDENT",
            },
          },
          include: {
            position: true,
          },
        });

        if (existingPresident) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `Não foi possível cadastrar este membro. ` +
                `A organização já possui um Presidente ativo: ${existingPresident.fullName}. ` +
                `Para cadastrar um novo Presidente, altere primeiro o cargo ou o status do Presidente atual.`,
            },
            {
              status: 409,
            }
          );
        }
      }

      /*
       * VICE-PRESIDENTE
       */
      if (selectedPosition.role === "VICE_PRESIDENT") {
        const existingVicePresident = await prisma.member.findFirst({
          where: {
            organizationId: organization.id,
            status: "ACTIVE",
            position: {
              role: "VICE_PRESIDENT",
            },
          },
          include: {
            position: true,
          },
        });

        if (existingVicePresident) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `Não foi possível cadastrar este membro. ` +
                `A organização já possui um Vice-Presidente ativo: ${existingVicePresident.fullName}. ` +
                `Para cadastrar um novo Vice-Presidente, altere primeiro o cargo ou o status do Vice-Presidente atual.`,
            },
            {
              status: 409,
            }
          );
        }
      }

      /*
       * DIRETOR
       *
       * Cada diretoria pode possuir somente um diretor ativo.
       */
      if (selectedPosition.role === "DIRECTOR") {
        if (!selectedDirectorate) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "Não foi possível cadastrar este membro. Um Diretor precisa estar vinculado a uma diretoria.",
            },
            {
              status: 400,
            }
          );
        }

        const existingDirector = await prisma.member.findFirst({
          where: {
            organizationId: organization.id,
            status: "ACTIVE",
            directorateId: selectedDirectorate.id,
            position: {
              role: "DIRECTOR",
            },
          },
          include: {
            directorate: true,
            position: true,
          },
        });

        if (existingDirector) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `Não foi possível cadastrar este membro. ` +
                `A diretoria "${selectedDirectorate.name}" já possui um Diretor ativo: ${existingDirector.fullName}. ` +
                `Cada diretoria pode possuir apenas um Diretor ativo.`,
            },
            {
              status: 409,
            }
          );
        }
      }
    }

    const member = await prisma.member.create({
      data: {
        organizationId: organization.id,

        fullName,

        email: data.email?.trim() || null,
        cpf: data.cpf?.trim() || null,
        phone: data.phone?.trim() || null,

        course: data.course?.trim() || null,
        registration: data.registration?.trim() || null,

        nationality: data.nationality?.trim() || null,
        maritalStatus: data.maritalStatus?.trim() || null,
        rg: data.rg?.trim() || null,
        rgIssuer: data.rgIssuer?.trim() || null,

        address: data.address?.trim() || null,
        addressNumber: data.addressNumber?.trim() || null,
        neighborhood: data.neighborhood?.trim() || null,
        cep: data.cep?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,

        entryDate: data.entryDate
          ? new Date(data.entryDate)
          : null,

        exitDate: data.exitDate
          ? new Date(data.exitDate)
          : null,

        status,

        directorateId: data.directorateId || null,
        positionId: data.positionId || null,
      },

      include: {
        directorate: true,
        position: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Membro cadastrado com sucesso.",
        member,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Erro ao cadastrar membro:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao cadastrar membro.",
      },
      {
        status: 500,
      }
    );
  }
}