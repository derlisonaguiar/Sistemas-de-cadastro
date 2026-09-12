import { NextResponse } from "next/server";
import { authErrorResponse, getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse, parseJsonRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createUserSchema, withOrganizationAdmin } from "@/lib/user-management";
import { hashPassword } from "@/lib/local-auth";

export async function GET() {
  try {
    const context = await getAdminApiContext();
    if (context.response) return context.response;
    const profiles = await prisma.userProfile.findMany({
      where: { organizationId: context.auth!.profile.organizationId }, orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ok: true, users: profiles, currentUserId: context.auth!.user.id },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch { return internalErrorResponse(); }
}

export async function POST(request: Request) {
  try {
    const context = await getAdminApiContext();
    if (context.response) return context.response;
    const limited = checkRateLimit(request, "create-user", 10, 60_000);
    if (limited) return limited;
    const parsed = await parseJsonRequest(request, createUserSchema);
    if (parsed.response) return parsed.response;
    const { name, email, password, role } = parsed.data!;
    try {
      const profile = await withOrganizationAdmin(context.auth!.user.id, context.auth!.profile.organizationId,
        async tx => {
          const user = await tx.authUser.create({ data: { email, name, passwordHash: await hashPassword(password) } });
          return tx.userProfile.create({ data: { id: user.id, organizationId: context.auth!.profile.organizationId, name, email, role } });
        });
      return NextResponse.json({ ok: true, user: profile }, { status: 201 });
    } catch (error) { throw error; }
  } catch (error) { return authErrorResponse(error) || internalErrorResponse(); }
}
