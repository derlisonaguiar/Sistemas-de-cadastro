import { NextResponse } from "next/server";
import { authErrorResponse, getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse, parseJsonRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, withOrganizationAdmin } from "@/lib/user-management";

export async function GET() {
  try {
    const context = await getAdminApiContext();
    if (context.response) return context.response;
    const profiles = await prisma.userProfile.findMany({
      where: { organizationId: context.auth!.profile.organizationId }, orderBy: { createdAt: "asc" },
    });
    const admin = createAdminClient();
    const users = await Promise.all(profiles.map(async profile => {
      if (profile.email && profile.name) return profile;
      const { data, error } = await admin.auth.admin.getUserById(profile.id);
      if (error) throw error;
      return { ...profile, email: data.user.email ?? null,
        name: profile.name || data.user.user_metadata?.name || data.user.user_metadata?.full_name || null };
    }));
    return NextResponse.json({ ok: true, users, currentUserId: context.auth!.user.id },
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
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name },
    });
    if (error || !data.user) return NextResponse.json({ ok: false,
      message: "Não foi possível criar a conta. Verifique o e-mail e os requisitos da senha." }, { status: 400 });
    try {
      const profile = await withOrganizationAdmin(context.auth!.user.id, context.auth!.profile.organizationId,
        tx => tx.userProfile.create({ data: { id: data.user.id,
          organizationId: context.auth!.profile.organizationId, name, email, role } }));
      return NextResponse.json({ ok: true, user: profile }, { status: 201 });
    } catch (error) {
      // Supabase Auth and Prisma cannot share a transaction: compensate the new Auth account.
      const cleanup = await admin.auth.admin.deleteUser(data.user.id);
      if (cleanup.error) console.error("Falha ao compensar criação Auth; conta sem perfil:", data.user.id);
      throw error;
    }
  } catch (error) { return authErrorResponse(error) || internalErrorResponse(); }
}
