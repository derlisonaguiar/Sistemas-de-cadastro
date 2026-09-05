import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { memberSchema, routeIdSchema } from "@/lib/validation";

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
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const { id } = params.data;

    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

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

    const member =
      await prisma.member.findFirst({
        where: {
          id,
          organizationId: organization.id,
        },
        include: {
          directorate: true,
          position: true,
        },
      });

    if (!member) {
      return NextResponse.json(
        {
          ok: false,
          message: "Membro não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      member,
    });
  } catch (error) {
    console.error("Erro ao buscar membro:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Erro ao buscar membro.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const { id } = params.data;

    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

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

    const existingMember =
      await prisma.member.findFirst({
        where: {
          id,
          organizationId: organization.id,
        },
      });

    if (!existingMember) {
      return NextResponse.json(
        {
          ok: false,
          message: "Membro não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const parsed = await parseJsonRequest(request, memberSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

    const fullName =
      data.fullName?.toString().trim() || "";

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

    const status =
      data.status || "ACTIVE";

    let selectedDirectorate = null;

    if (data.directorateId) {
      selectedDirectorate =
        await prisma.directorate.findFirst({
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
      selectedPosition =
        await prisma.position.findFirst({
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

    if (status !== "POS_JR" && selectedPosition?.directorateId && selectedPosition.directorateId !== data.directorateId) {
      return NextResponse.json({ ok: false, message: "O cargo não pertence à diretoria selecionada." }, { status: 400 });
    }

    /*
     * Regras de exclusividade.
     *
     * O próprio membro é ignorado,
     * para que ele possa salvar seus
     * dados sem bloquear a si mesmo.
     */
    if (
      selectedPosition &&
      status === "ACTIVE"
    ) {
      /*
       * PRESIDENTE
       */
      if (
        selectedPosition.role ===
        "PRESIDENT"
      ) {
        const existingPresident =
          await prisma.member.findFirst({
            where: {
              organizationId: organization.id,
              id: {
                not: existingMember.id,
              },
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
                `Não foi possível atualizar este membro. ` +
                `A organização já possui um Presidente ativo: ${existingPresident.fullName}. ` +
                `Para definir outro Presidente, altere primeiro o cargo ou o status do Presidente atual.`,
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
      if (
        selectedPosition.role ===
        "VICE_PRESIDENT"
      ) {
        const existingVicePresident =
          await prisma.member.findFirst({
            where: {
              organizationId: organization.id,
              id: {
                not: existingMember.id,
              },
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
                `Não foi possível atualizar este membro. ` +
                `A organização já possui um Vice-Presidente ativo: ${existingVicePresident.fullName}. ` +
                `Para definir outro Vice-Presidente, altere primeiro o cargo ou o status do Vice-Presidente atual.`,
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
       * Cada diretoria pode ter apenas
       * um Diretor ativo.
       */
      if (
        selectedPosition.role ===
        "DIRECTOR"
      ) {
        if (!selectedDirectorate) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "Não foi possível atualizar este membro. Um Diretor ativo precisa estar vinculado a uma diretoria.",
            },
            {
              status: 400,
            }
          );
        }

        const existingDirector =
          await prisma.member.findFirst({
            where: {
              organizationId: organization.id,
              id: {
                not: existingMember.id,
              },
              status: "ACTIVE",
              directorateId:
                selectedDirectorate.id,
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
                `Não foi possível atualizar este membro. ` +
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

    const member =
      await prisma.member.update({
        where: {
          id: existingMember.id,
        },
        data: {
          fullName,

          email:
            data.email?.trim() || null,

          cpf:
            data.cpf?.trim() || null,

          phone:
            data.phone?.trim() || null,

          nationality:
            data.nationality?.trim() || null,

          maritalStatus:
            data.maritalStatus?.trim() || null,

          rg:
            data.rg?.trim() || null,

          rgIssuer:
            data.rgIssuer?.trim() || null,

          course:
            data.course?.trim() || null,

          registration:
            data.registration?.trim() || null,

          address:
            data.address?.trim() || null,

          addressNumber:
            data.addressNumber?.trim() || null,

          neighborhood:
            data.neighborhood?.trim() || null,

          cep:
            data.cep?.trim() || null,

          city:
            data.city?.trim() || null,

          state:
            data.state?.trim() || null,

          entryDate:
            data.entryDate
              ? new Date(data.entryDate)
              : null,

          exitDate:
            data.exitDate
              ? new Date(data.exitDate)
              : null,

          status,

          directorateId:
            data.directorateId || null,

          positionId:
            data.positionId || null,
        },
        include: {
          directorate: true,
          position: true,
        },
      });

    return NextResponse.json({
      ok: true,
      message: "Membro atualizado com sucesso.",
      member,
    });
  } catch (error) {
    console.error("Erro ao atualizar membro:", error);
    return databaseErrorResponse(error);
  }
}
