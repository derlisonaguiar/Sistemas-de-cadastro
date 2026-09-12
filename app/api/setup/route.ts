import { NextResponse } from "next/server";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { completeInitialSetup, SetupError } from "@/lib/setup";
import { initialSetupSchema } from "@/lib/validation";
import { createSession, sessionCookie } from "@/lib/local-auth";

export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(request, "initial-setup", 5, 60 * 60_000);
    if (limited) return limited;
    const parsed = await parseJsonRequest(request, initialSetupSchema);
    if (parsed.response) return parsed.response;
    const result = await completeInitialSetup(parsed.data!);
    const session = await createSession(result.user.id);
    const response = NextResponse.json({ ok: true, organization: result.organization, profile: result.profile, entryCode: result.entryCode }, { status: 201 });
    const cookie = sessionCookie(session.token, session.expiresAt); response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    if (error instanceof SetupError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    const technicalError = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error), stack: undefined };
    console.error("Erro técnico ao concluir o setup inicial:", technicalError);
    return NextResponse.json({ ok: false, message: "Não foi possível concluir o setup inicial." }, { status: 500 });
  }
}
