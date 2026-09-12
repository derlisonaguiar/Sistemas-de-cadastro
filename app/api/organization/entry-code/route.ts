import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { createOrganizationEntryCode } from "@/lib/organization-entry-code";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/api";

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if (context.response) return context.response;
  const limited = checkRateLimit(request, `organization-entry-code:${context.auth!.user.id}`, 10, 60 * 60_000);
  if (limited) return limited;
  const entryCode = createOrganizationEntryCode();
  await prisma.organization.update({ where: { id: context.auth!.organization.id }, data: { entryCodeHash: entryCode.hash } });
  return NextResponse.json({ ok: true, entryCode: entryCode.code });
}
