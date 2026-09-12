import { NextResponse } from "next/server";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { signupSchema } from "@/lib/validation";
import { createSession, hashPassword, sessionCookie } from "@/lib/local-auth";
import { prisma } from "@/lib/prisma";
import { OrganizationEntryCodeError, resolveOrganizationEntryCode } from "@/lib/organization-entry-code";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "auth-signup", 5, 15 * 60_000);
  if (limited) return limited;
  const parsed = await parseJsonRequest(request, signupSchema);
  if (parsed.response) return parsed.response;
  const { name, username, email, password, entryCode } = parsed.data!;
  try {
    await resolveOrganizationEntryCode(entryCode);
    const user = await prisma.authUser.create({
      data: {
        email,
        username,
        name,
        passwordHash: await hashPassword(password),
        selfEnrollment: true,
        role: "USER",
      },
    });
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true, requiresConfirmation: false, message: "Conta criada com sucesso." }, { status: 201 });
    const cookie = sessionCookie(session.token, session.expiresAt); response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    if (error instanceof OrganizationEntryCodeError) return NextResponse.json({ ok: false, message: error.message }, { status: 403 });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, message: "Este e-mail ou usuário já está em uso." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "Não foi possível criar a conta." }, { status: 500 });
  }
}
