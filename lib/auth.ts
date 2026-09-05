import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthFailure = "UNAUTHORIZED" | "PROFILE_REQUIRED" | "FORBIDDEN";

export class AuthError extends Error {
  constructor(public readonly code: AuthFailure) {
    super(code);
    this.name = "AuthError";
  }
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

export async function getAuthenticatedProfile() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });

  return profile?.active ? { user, profile, organization: profile.organization } : null;
}

export async function requireAuthenticatedProfile() {
  const user = await getAuthenticatedUser();
  if (!user) throw new AuthError("UNAUTHORIZED");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });

  if (!profile) throw new AuthError("PROFILE_REQUIRED");
  if (!profile.active) throw new AuthError("FORBIDDEN");
  return { user, profile, organization: profile.organization };
}

export async function requireAdminProfile() {
  const result = await requireAuthenticatedProfile();
  if (result.profile.role !== "ADMIN") throw new AuthError("FORBIDDEN");
  return result;
}

export function authErrorResponse(error: unknown) {
  if (!(error instanceof AuthError)) return null;

  if (error.code === "UNAUTHORIZED") {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message:
        error.code === "PROFILE_REQUIRED"
          ? "Usuário sem vínculo com uma organização."
          : "Acesso não autorizado.",
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
