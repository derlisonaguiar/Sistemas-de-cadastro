import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, parseJsonRequest } from "@/lib/api";
import { linkInvitationSchema } from "@/lib/validation";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(request, "invite-consume", 10, 60_000);
    if (limited) return limited;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 }
      );
    }

    const existingProfile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (existingProfile) {
      return NextResponse.json(
        { ok: false, message: "Usuário já vinculado a uma organização." },
        { status: 409 }
      );
    }

    const parsed = await parseJsonRequest(request, linkInvitationSchema);
    if (parsed.response) return parsed.response;
    const { token } = parsed.data!;

    const email = user.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { ok: false, message: "A conta autenticada não possui e-mail." },
        { status: 403 }
      );
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (
      !invitation ||
      invitation.usedAt ||
      invitation.expiresAt <= new Date() ||
      invitation.email.toLowerCase() !== email
    ) {
      return NextResponse.json(
        { ok: false, message: "Convite inválido ou expirado." },
        { status: 403 }
      );
    }

    const profile = await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.userInvitation.updateMany({
        where: { id: invitation.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_USED");

      return transaction.userProfile.create({
        data: {
          id: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        select: { id: true, organizationId: true, role: true },
      });
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_ALREADY_USED") {
      return NextResponse.json(
        { ok: false, message: "Convite já utilizado." },
        { status: 409 }
      );
    }
    console.error("Erro ao vincular usuário:", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao vincular usuário." },
      { status: 500 }
    );
  }
}
