import "server-only";

import { getDeploymentMode } from "@/lib/deployment-mode";
import { prisma } from "@/lib/prisma";

export class OrganizationContextError extends Error {
  constructor(
    message: string,
    public readonly code: "SETUP_REQUIRED" | "INCONSISTENT" | "PROFILE_ORGANIZATION_NOT_FOUND" = "INCONSISTENT"
  ) {
    super(message);
    this.name = "OrganizationContextError";
  }
}

/** Resolves the organization available to an ADMIN or USER session. */
export async function resolveSessionOrganization(profileOrganizationId: string) {
  if (getDeploymentMode() === "multi") {
    const organization = await prisma.organization.findUnique({ where: { id: profileOrganizationId } });
    if (!organization) {
      throw new OrganizationContextError(
        "A organização vinculada ao perfil não foi encontrada.",
        "PROFILE_ORGANIZATION_NOT_FOUND"
      );
    }
    return organization;
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (organizations.length === 0) {
    throw new OrganizationContextError("A instalação ainda não possui uma organização configurada.", "SETUP_REQUIRED");
  }
  if (organizations.length > 1) {
    throw new OrganizationContextError(
      "A instalação está em modo single, mas possui mais de uma organização configurada."
    );
  }
  return organizations[0];
}

/** Resolves the organization that may receive an auto-enrollment request. */
export async function resolveAutoEnrollmentOrganization() {
  const organizations = await prisma.organization.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (organizations.length === 0) {
    throw new OrganizationContextError(
      "A autoinscrição não está disponível porque ainda não existe uma organização configurada.",
      "SETUP_REQUIRED"
    );
  }

  if (getDeploymentMode() === "single") {
    if (organizations.length > 1) {
      throw new OrganizationContextError(
        "A autoinscrição não está disponível porque o modo single possui mais de uma organização configurada."
      );
    }
    return organizations[0];
  }

  if (organizations.length > 1) {
    throw new OrganizationContextError(
      "A autoinscrição não está disponível porque é necessário selecionar uma organização com segurança."
    );
  }

  return organizations[0];
}
