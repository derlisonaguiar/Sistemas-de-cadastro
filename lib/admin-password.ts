import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/local-auth";

export async function verifyAdminPassword(user: { id: string; email?: string }, password: string) {
  const localUser = await prisma.authUser.findUnique({ where: { id: user.id }, select: { passwordHash: true, active: true } });
  return Boolean(localUser?.active && await verifyPassword(password, localUser.passwordHash));
}
