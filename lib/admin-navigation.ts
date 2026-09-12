import type { DeploymentMode } from "@/lib/deployment-mode";

export type AdminNavigationState = {
  isGlobalAdministration: boolean;
  showOrganizationModules: boolean;
};

/** Computes administrative navigation visibility without reading session or database state. */
export function resolveAdminNavigation({
  deploymentMode,
  isSuperadmin,
  hasOrganization,
}: {
  deploymentMode: DeploymentMode;
  isSuperadmin: boolean;
  hasOrganization: boolean;
}): AdminNavigationState {
  const isGlobalAdministration = deploymentMode === "multi" && isSuperadmin;

  return {
    isGlobalAdministration,
    showOrganizationModules: hasOrganization && !isGlobalAdministration,
  };
}
