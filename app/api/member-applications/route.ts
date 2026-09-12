import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAdminApiContext();
  if (auth.response) return auth.response;
  const applications = await prisma.memberApplication.findMany({
    where: { organizationId: auth.auth!.profile.organizationId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ ok: true, applications });
}
