import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionIdentity } from "@/lib/local-auth";
import { OrganizationContextError, resolveSessionOrganization } from "@/lib/organization-context";

export type AuthFailure = "UNAUTHORIZED" | "PROFILE_REQUIRED" | "FORBIDDEN";

export class AuthError extends Error {
  constructor(public readonly code: AuthFailure) {
    super(code);
    this.name = "AuthError";
  }
}

export async function getAuthenticatedUser() {
  return getSessionIdentity();
}

export function isAdministrativeRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export async function getAuthenticatedProfile() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile?.active) return null;
  const organization = await resolveSessionOrganization(profile.organizationId);
  return { user, profile, organization };
}

export async function requireAuthenticatedProfile() {
  const user = await getAuthenticatedUser();
  if (!user) throw new AuthError("UNAUTHORIZED");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) throw new AuthError("PROFILE_REQUIRED");
  if (!profile.active) throw new AuthError("FORBIDDEN");
  const organization = await resolveSessionOrganization(profile.organizationId);
  return { user, profile, organization };
}

export async function requireAdminProfile() {
  const result = await requireAuthenticatedProfile();
  if (!isAdministrativeRole(result.user.role) && !isAdministrativeRole(result.profile.role))
    throw new AuthError("FORBIDDEN");
  return result;
}

/** Authorizes access to the administrative UI, including global SUPERADMINs without an organization profile. */
export async function requireAdministrativeAccess() {
  const user = await getAuthenticatedUser();
  if (!user) throw new AuthError("UNAUTHORIZED");
  if (user.role === "SUPERADMIN") return { user, profile: null, organization: null };
  return requireAdminProfile();
}

export function authErrorResponse(error: unknown) {
  if (error instanceof OrganizationContextError) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 503 });
  }
  if (!(error instanceof AuthError)) return null;

  if (error.code === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: false,
      message:
        error.code === "PROFILE_REQUIRED" ? "Usuário sem vínculo com uma organização." : "Acesso não autorizado.",
    },
    { status: 403 }
  );
}

export async function getAdminApiContext() {
  try {
    return { auth: await requireAdminProfile(), response: null };
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return { auth: null, response };
    throw error;
  }
}

export async function getReadApiContext() {
  try {
    return { auth: await requireAuthenticatedProfile(), response: null };
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return { auth: null, response };
    throw error;
  }
}
