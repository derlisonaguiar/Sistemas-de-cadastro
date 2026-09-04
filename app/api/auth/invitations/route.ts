import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { invitationSchema } from "@/lib/validation";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(request, "invite-create", 10, 60_000);
    if (limited) return limited;
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const auth = authContext.auth!;
    const parsed = await parseJsonRequest(request, invitationSchema);
    if (parsed.response) return parsed.response;
    const { email, role } = parsed.data!;

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const invitation = await prisma.userInvitation.create({
      data: {
        organizationId: auth.profile.organizationId,
        email,
        role,
        tokenHash: hashToken(token),
        expiresAt,
        createdById: auth.user.id,
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    });

    return NextResponse.json(
      { ok: true, invitation, token },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar convite de acesso:", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao criar convite de acesso." },
      { status: 500 }
    );
  }
}
