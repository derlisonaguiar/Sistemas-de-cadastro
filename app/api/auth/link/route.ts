import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/api";
import { createLocalOrganizationSchema, linkInvitationSchema } from "@/lib/validation";

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

    const email = user.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { ok: false, message: "A conta autenticada não possui e-mail." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const createOrganization = createLocalOrganizationSchema.safeParse(body);
    if (createOrganization.success) {
      const profile = await prisma.$transaction(async (transaction) => {
        const stillUnlinked = await transaction.userProfile.findUnique({ where: { id: user.id }, select: { id: true } });
        if (stillUnlinked) throw new Error("PROFILE_ALREADY_LINKED");
        const organization = await transaction.organization.create({ data: { name: createOrganization.data.organizationName } });
        return transaction.userProfile.create({ data: { id: user.id, organizationId: organization.id, role: "ADMIN", email, name: user.user_metadata?.name || null }, select: { id: true, organizationId: true, role: true } });
      });
      return NextResponse.json({ ok: true, profile });
    }

    const parsed = linkInvitationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Informe um convite válido ou o nome da organização." }, { status: 400 });
    const { token } = parsed.data;

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
    if (error instanceof Error && error.message === "PROFILE_ALREADY_LINKED") return NextResponse.json({ ok: false, message: "Usuário já vinculado a uma organização." }, { status: 409 });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ ok: false, message: "Usuário já vinculado a uma organização." }, { status: 409 });
    console.error("Erro ao vincular usuário:", error);
    return NextResponse.json(
      { ok: false, message: "Erro ao vincular usuário." },
      { status: 500 }
    );
  }
}
