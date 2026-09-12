import { NextResponse } from "next/server";
import { getDeploymentMode } from "@/lib/deployment-mode";
import { isInitialSetupRequired } from "@/lib/setup";
export async function GET() { return NextResponse.json({ ok: true, showCreateOrganization: getDeploymentMode() === "single" && await isInitialSetupRequired() }); }
