export const deploymentModes = ["single", "multi"] as const;

export type DeploymentMode = (typeof deploymentModes)[number];

/**
 * Returns the deployment scope configured for this instance.
 * Invalid, absent, or malformed values deliberately fall back to the safest mode.
 */
export function getDeploymentMode(value = process.env.DEPLOYMENT_MODE): DeploymentMode {
  return value === "multi" ? "multi" : "single";
}
