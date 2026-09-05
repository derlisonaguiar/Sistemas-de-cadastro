import "server-only";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "USER"]),
}).strict();
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
}).strict().refine(value => value.name !== undefined || value.role !== undefined || value.active !== undefined);

export class UserManagementError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

// All changes serialize on the organization row; recheck the actor after obtaining the lock.
export async function withOrganizationAdmin<T>(actorId: string, organizationId: string,
  action: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
    const actor = await tx.userProfile.findUnique({ where: { id: actorId } });
    if (!actor?.active || actor.role !== "ADMIN" || actor.organizationId !== organizationId) {
      throw new AuthError("FORBIDDEN");
    }
    return action(tx);
  });
}

export async function updateOrganizationUser(actorId: string, organizationId: string, id: string,
  changes: z.infer<typeof updateUserSchema>) {
  return withOrganizationAdmin(actorId, organizationId, async tx => {
    const target = await tx.userProfile.findFirst({ where: { id, organizationId } });
    if (!target) throw new UserManagementError("Usuário não encontrado.", 404);
    if (target.active && target.role === "ADMIN" && (changes.active === false || changes.role === "USER")) {
      const admins = await tx.userProfile.count({ where: { organizationId, active: true, role: "ADMIN" } });
      if (admins <= 1) throw new UserManagementError("O último ADMIN ativo não pode ser desativado ou rebaixado.");
    }
    return tx.userProfile.update({ where: { id }, data: changes });
  });
}
