import { NextResponse } from "next/server";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "auth-login", 5, 15 * 60_000);
  if (limited) return limited;

  const parsed = await parseJsonRequest(request, loginSchema);
  if (parsed.response) return parsed.response;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data!);
  if (error) {
    return NextResponse.json(
      { ok: false, message: "E-mail ou senha inválidos." },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}
