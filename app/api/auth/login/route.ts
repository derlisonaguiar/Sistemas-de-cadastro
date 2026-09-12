import { NextResponse } from "next/server";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { createSession, sessionCookie, verifyPassword } from "@/lib/local-auth";
import { resolvePostLoginDestination } from "@/lib/post-login";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "auth-login", 5, 15 * 60_000);
  if (limited) return limited;

  const parsed = await parseJsonRequest(request, loginSchema);
  if (parsed.response) return parsed.response;

  const { identifier, password, next } = parsed.data!;
  const user = await prisma.authUser.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
  if (!user || !user.active || !await verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, message: "E-mail ou senha inválidos." },
      { status: 401 }
    );
  }
  const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
  if (profile && !profile.active) {
    return NextResponse.json({ ok: false, message: "Acesso desativado. Contate o administrador." }, { status: 403 });
  }
  const session = await createSession(user.id);
  const destination = await resolvePostLoginDestination(user, next);
  const response = NextResponse.json({ ok: true, destination });
  const cookie = sessionCookie(session.token, session.expiresAt); response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
