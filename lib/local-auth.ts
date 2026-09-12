import "server-only";
import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "local_session";
const SESSION_DAYS = 14;

export type LocalIdentity = { id: string; email: string; user_metadata: { name?: string; self_enrollment?: boolean } };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const scrypt = promisify(nodeScrypt);
export async function hashPassword(password: string) { const salt = randomBytes(16); const hash = await scrypt(password, salt, 64) as Buffer; return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`; }
export async function verifyPassword(password: string, stored: string) { try { const [, saltHex, hashHex] = stored.split("$"); const actual = await scrypt(password, Buffer.from(saltHex, "hex"), 64) as Buffer; return timingSafeEqual(actual, Buffer.from(hashHex, "hex")); } catch { return false; } }

export async function getSessionIdentity(): Promise<LocalIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return { id: session.user.id, email: session.user.email, user_metadata: { name: session.user.name || undefined, self_enrollment: session.user.selfEnrollment } };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);
  await prisma.authSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: Date) {
  return { name: SESSION_COOKIE, value: token, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt } };
}

export function expiredSessionCookie() {
  return { name: SESSION_COOKIE, value: "", options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 } };
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
