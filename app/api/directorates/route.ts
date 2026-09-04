import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { parseJsonRequest } from "@/lib/api";
import { directorateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    const directorates = await prisma.directorate.findMany({
      where: {
        organizationId: organization.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      directorates,
    });
  } catch (error) {
    console.error("Erro ao buscar diretorias:", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao buscar diretorias." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;

    const parsed = await parseJsonRequest(request, directorateSchema);
    if (parsed.response) return parsed.response;
    const data = parsed.data!;

    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        { ok: false, message: "O nome da diretoria é obrigatório." },
        { status: 400 }
      );
    }

    const directorate = await prisma.directorate.create({
      data: {
        organizationId: organization.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });

    return NextResponse.json({
      ok: true,
      directorate,
    });
  } catch (error) {
    console.error("Erro ao cadastrar diretoria:", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao cadastrar diretoria." },
      { status: 500 }
    );
  }
}
