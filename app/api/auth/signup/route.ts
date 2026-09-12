import { NextResponse } from "next/server";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { signupSchema } from "@/lib/validation";
import { createSession, hashPassword, sessionCookie } from "@/lib/local-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "auth-signup", 5, 15 * 60_000);
  if (limited) return limited;
  const parsed = await parseJsonRequest(request, signupSchema);
  if (parsed.response) return parsed.response;
  const { name, email, password } = parsed.data!;
  try {
    const user = await prisma.authUser.create({ data: { email, name, passwordHash: await hashPassword(password), selfEnrollment: true } });
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true, requiresConfirmation: false, message: "Conta criada com sucesso." }, { status: 201 });
    const cookie = sessionCookie(session.token, session.expiresAt); response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ ok: false, message: "Este e-mail já está em uso." }, { status: 409 });
    return NextResponse.json({ ok: false, message: "Não foi possível criar a conta." }, { status: 500 });
  }
}
