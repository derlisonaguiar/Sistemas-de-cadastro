import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAdminApiContext();
    if (auth.response) return auth.response;
    const limited = checkRateLimit(request, "reset-user-password", 5, 60_000);
    if (limited) return limited;
    const { id } = await context.params;
    const target = await prisma.userProfile.findFirst({
      where: { id, organizationId: auth.auth!.profile.organizationId },
    });
    if (!target) return NextResponse.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });
    return NextResponse.json(
      { ok: false, message: "Recuperação de senha aguarda a configuração de um serviço de e-mail local." },
      { status: 501 }
    );
  } catch {
    return internalErrorResponse();
  }
}
