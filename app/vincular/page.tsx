import LinkAccountForm from "@/components/LinkAccountForm";
import { getDeploymentMode } from "@/lib/deployment-mode";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isInitialSetupRequired } from "@/lib/setup";
import { getAuthenticatedUser } from "@/lib/auth";
import { resolvePostLoginDestination } from "@/lib/post-login";

export default async function LinkAccountPage() {
  const user = await getAuthenticatedUser();
  if (getDeploymentMode() === "single" && await isInitialSetupRequired() && user) {
    if (await resolvePostLoginDestination({ id: user.id, role: user.role, selfEnrollment: user.user_metadata.self_enrollment === true }) === "/setup") redirect("/setup");
  }
  const canCreateOrganization =
    getDeploymentMode() === "multi" ||
    (await prisma.organization.count({ take: 1 })) === 0;

  return <LinkAccountForm canCreateOrganization={canCreateOrganization} />;
}
