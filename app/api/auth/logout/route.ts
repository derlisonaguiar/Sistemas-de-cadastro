import { NextResponse } from "next/server";
import { destroyCurrentSession, expiredSessionCookie } from "@/lib/local-auth";

export async function POST() {
  await destroyCurrentSession();
  const response = NextResponse.json({ ok: true });
  const cookie = expiredSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
