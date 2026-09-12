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
  if (await isInitialSetupRequired()) {
    const profile = await prisma.userProfile.findUnique({ where: { id: identity.id }, select: { id: true } });
    if (!profile && !identity.selfEnrollment) return "/setup";
    return "/inscricao";
  }

  const profile = await prisma.userProfile.findUnique({ where: { id: identity.id }, select: { role: true } });
  if (!profile) {
    const application = await prisma.memberApplication.findUnique({
      where: { userId: identity.id },
      select: { id: true },
    });
    if (application || identity.selfEnrollment) return "/inscricao";
  }

  if (requestedNext === "/inscricao") return "/inscricao";
  if (getDeploymentMode() === "multi") return "/admin";
  if (isAdministrativeRole(identity.role) || isAdministrativeRole(profile?.role)) return "/admin";
  return "/admin";
}
