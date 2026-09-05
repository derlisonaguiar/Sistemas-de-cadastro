import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAdminApiContext();
    if (auth.response) return auth.response;
    const limited = checkRateLimit(request, "reset-user-password", 5, 60_000);
    if (limited) return limited;
    const { id } = await context.params;
    const target = await prisma.userProfile.findFirst({ where: { id, organizationId: auth.auth!.profile.organizationId } });
    if (!target) return NextResponse.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(target.id);
    if (error || !data.user.email) return internalErrorResponse();
    // Trusted configured origin, never a caller-supplied redirect or email.
    if (!process.env.APP_URL) return NextResponse.json({ ok: false,
      message: "Configure APP_URL no servidor e autorize /redefinir-senha nas URLs de redirecionamento do Supabase." }, { status: 503 });
    const redirectTo = new URL("/redefinir-senha", process.env.APP_URL).toString();
    const result = await admin.auth.resetPasswordForEmail(data.user.email, { redirectTo });
    if (result.error) return NextResponse.json({ ok: false, message: "Não foi possível enviar o e-mail de recuperação." }, { status: 502 });
    return NextResponse.json({ ok: true, message: "E-mail de recuperação enviado." });
  } catch { return internalErrorResponse(); }
}
