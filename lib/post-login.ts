import "server-only";

import { isAdministrativeRole } from "@/lib/auth";
import { getDeploymentMode } from "@/lib/deployment-mode";
import { prisma } from "@/lib/prisma";
import { isInitialSetupRequired } from "@/lib/setup";

type PostLoginIdentity = {
  id: string;
  role: string;
  selfEnrollment: boolean;
};

export async function resolvePostLoginDestination(identity: PostLoginIdentity, requestedNext?: "/inscricao") {
  if (getDeploymentMode() === "multi") return requestedNext || "/admin";

  if (await isInitialSetupRequired()) {
    const profile = await prisma.userProfile.findUnique({ where: { id: identity.id }, select: { id: true } });
    if (!profile && !identity.selfEnrollment) return "/setup";
    return "/inscricao";
  }

  if (requestedNext === "/inscricao") return "/inscricao";
  const profile = await prisma.userProfile.findUnique({ where: { id: identity.id }, select: { role: true } });
  if (isAdministrativeRole(identity.role) || isAdministrativeRole(profile?.role)) return "/admin";
  return "/admin";
}
