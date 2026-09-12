import { redirect } from "next/navigation";
import InitialSetupForm from "@/components/InitialSetupForm";
import { getDeploymentMode } from "@/lib/deployment-mode";
import { isInitialSetupRequired } from "@/lib/setup";

export default async function SetupPage() {
  if (getDeploymentMode() !== "single" || !(await isInitialSetupRequired())) redirect("/admin");

  return <InitialSetupForm />;
}
