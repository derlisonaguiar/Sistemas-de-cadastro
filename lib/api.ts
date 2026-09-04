import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

export async function parseJsonRequest<T>(request: Request, schema: ZodType<T>) {
  try {
    const result = schema.safeParse(await request.json());
    if (result.success) return { data: result.data, response: null };
    return {
      data: null,
      response: NextResponse.json(
        { ok: false, message: "Dados inválidos.", issues: z.flattenError(result.error).fieldErrors },
        { status: 400 }
      ),
    };
  } catch {
    return {
      data: null,
      response: NextResponse.json({ ok: false, message: "JSON inválido." }, { status: 400 }),
    };
  }
}

export function internalErrorResponse() {
  return NextResponse.json(
    { ok: false, message: "Erro interno do servidor." },
    { status: 500 }
  );
}

export function databaseErrorResponse(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  if (["P2002", "P2003", "P2004", "P2014"].includes(code)) {
    return NextResponse.json(
      { ok: false, message: "Conflito com dados ou regras existentes." },
      { status: 409 }
    );
  }
  return internalErrorResponse();
}

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();

export function checkRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const key = `${scope}:${address}`;
  const now = Date.now();
  const current = rateStore.get(key);

  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  current.count += 1;
  return null;
}
