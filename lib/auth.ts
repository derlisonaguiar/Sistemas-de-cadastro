import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile =
    await prisma.userProfile.findUnique({
      where: {
        id: user.id,
      },

      include: {
        organization: true,
      },
    });

  if (!profile) {
    return null;
  }

  return {
    user,
    profile,
    organization: profile.organization,
  };
}

export async function requireAuthenticatedProfile() {
  const result =
    await getAuthenticatedProfile();

  if (!result) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  return result;
}

export async function requireAdminProfile() {
  const result =
    await requireAuthenticatedProfile();

  if (
    result.profile.role !==
    "ADMIN"
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  return result;
}