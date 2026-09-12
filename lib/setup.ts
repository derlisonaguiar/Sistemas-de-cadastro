import "server-only";

import { getDeploymentMode } from "@/lib/deployment-mode";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { initialSetupSchema } from "@/lib/validation";
import { createOrganizationEntryCode } from "@/lib/organization-entry-code";
import { hashPassword } from "@/lib/local-auth";

export class SetupError extends Error {
  constructor(
    message: string,
    public readonly status: 403 | 409
  ) {
    super(message);
    this.name = "SetupError";
  }
}

export async function isInitialSetupRequired() {
  if (getDeploymentMode() !== "single") return false;
  return (await prisma.organization.count({ take: 1 })) === 0;
}

export async function completeInitialSetup(data: z.infer<typeof initialSetupSchema>) {
  if (getDeploymentMode() !== "single") {
    throw new SetupError("O setup inicial está disponível somente no modo single.", 403);
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(482910537)`;
    if (await transaction.organization.count({ take: 1 })) {
      throw new SetupError("O setup inicial já foi concluído.", 409);
    }

    const entryCode = createOrganizationEntryCode();
    const {
      adminName,
      adminUsername,
      adminEmail,
      adminPassword,
      adminEmailConfirmation: _adminEmailConfirmation,
      adminPasswordConfirmation: _adminPasswordConfirmation,
      ...organizationData
    } = data;
    const user = await transaction.authUser.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        name: adminName,
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
      },
    });
    const organization = await transaction.organization.create({
      data: { ...organizationData, entryCodeHash: entryCode.hash },
    });
    const profile = await transaction.userProfile.create({
      data: { id: user.id, organizationId: organization.id, role: "ADMIN", email: adminEmail, name: adminName },
      select: { id: true, organizationId: true, role: true },
    });

    return { user, organization, profile, entryCode: entryCode.code };
  });
}
