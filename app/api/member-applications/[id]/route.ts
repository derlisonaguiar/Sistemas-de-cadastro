import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { memberApplicationDecisionSchema, memberApplicationReviewSchema, routeIdSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

async function adminContext(context: Context) {
  const auth = await getAdminApiContext();
  if (auth.response) return { response: auth.response };
  const params = routeIdSchema.safeParse(await context.params);
  if (!params.success) return { response: NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 }) };
  return { auth: auth.auth!, id: params.data.id, response: null };
}

export async function GET(_request: Request, context: Context) {
  const result = await adminContext(context);
  if (result.response) return result.response;
  const application = await prisma.memberApplication.findFirst({ where: { id: result.id, organizationId: result.auth.profile.organizationId } });
  if (!application) return NextResponse.json({ ok: false, message: "Inscrição não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, application });
}

export async function PUT(request: Request, context: Context) {
  try {
    const result = await adminContext(context);
    if (result.response) return result.response;
    const limited = checkRateLimit(request, `application-review:${result.auth.user.id}`, 30, 60_000);
    if (limited) return limited;
    const parsed = await parseJsonRequest(request, memberApplicationReviewSchema);
    if (parsed.response) return parsed.response;
    const current = await prisma.memberApplication.findFirst({ where: { id: result.id, organizationId: result.auth.profile.organizationId } });
    if (!current) return NextResponse.json({ ok: false, message: "Inscrição não encontrada." }, { status: 404 });
    if (current.status !== "PENDING") return NextResponse.json({ ok: false, message: "Esta inscrição já foi analisada." }, { status: 409 });
    const data = parsed.data!;
    if (data.directorateId && !await prisma.directorate.findFirst({ where: { id: data.directorateId, organizationId: current.organizationId } })) return NextResponse.json({ ok: false, message: "Diretoria inválida." }, { status: 400 });
    const position = data.positionId ? await prisma.position.findFirst({ where: { id: data.positionId, organizationId: current.organizationId } }) : null;
    if (data.positionId && !position) return NextResponse.json({ ok: false, message: "Cargo inválido." }, { status: 400 });
    if (position?.directorateId && position.directorateId !== data.directorateId) return NextResponse.json({ ok: false, message: "O cargo não pertence à diretoria selecionada." }, { status: 400 });
    const application = await prisma.memberApplication.update({ where: { id: current.id }, data });
    return NextResponse.json({ ok: true, application, message: "Revisão salva." });
  } catch (error) { return databaseErrorResponse(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const result = await adminContext(context);
    if (result.response) return result.response;
    const limited = checkRateLimit(request, `application-decision:${result.auth.user.id}`, 20, 60_000);
    if (limited) return limited;
    const parsed = await parseJsonRequest(request, memberApplicationDecisionSchema);
    if (parsed.response) return parsed.response;
    const { action, rejectionReason } = parsed.data!;
    const application = await prisma.memberApplication.findFirst({ where: { id: result.id, organizationId: result.auth.profile.organizationId } });
    if (!application) return NextResponse.json({ ok: false, message: "Inscrição não encontrada." }, { status: 404 });
    if (application.status !== "PENDING") return NextResponse.json({ ok: false, message: "Esta inscrição já foi analisada." }, { status: 409 });
    if (action === "REJECT") {
      const updated = await prisma.memberApplication.update({ where: { id: application.id }, data: { status: "REJECTED", rejectionReason: rejectionReason || null, reviewedById: result.auth.user.id, reviewedAt: new Date() } });
      return NextResponse.json({ ok: true, application: updated, message: "Inscrição rejeitada e mantida no histórico." });
    }
    const selectedPosition = application.positionId ? await prisma.position.findFirst({ where: { id: application.positionId, organizationId: application.organizationId } }) : null;
    if (application.positionId && !selectedPosition) return NextResponse.json({ ok: false, message: "Cargo inválido." }, { status: 400 });
    if (application.directorateId && !await prisma.directorate.findFirst({ where: { id: application.directorateId, organizationId: application.organizationId } })) return NextResponse.json({ ok: false, message: "Diretoria inválida." }, { status: 400 });
    if (selectedPosition?.directorateId && selectedPosition.directorateId !== application.directorateId) return NextResponse.json({ ok: false, message: "O cargo não pertence à diretoria selecionada." }, { status: 400 });
    if (selectedPosition?.role === "DIRECTOR" && !application.directorateId) return NextResponse.json({ ok: false, message: "Um Diretor precisa estar vinculado a uma diretoria." }, { status: 400 });
    if (selectedPosition && ["PRESIDENT", "VICE_PRESIDENT", "DIRECTOR"].includes(selectedPosition.role)) {
      const occupied = await prisma.member.findFirst({ where: { organizationId: application.organizationId, status: "ACTIVE", ...(selectedPosition.role === "DIRECTOR" ? { directorateId: application.directorateId } : {}), position: { role: selectedPosition.role } }, select: { fullName: true } });
      if (occupied) return NextResponse.json({ ok: false, message: `O cargo selecionado já está ocupado por ${occupied.fullName}.` }, { status: 409 });
    }
    const duplicate = await prisma.member.findFirst({ where: { organizationId: application.organizationId, OR: [{ cpf: application.cpf }, ...(application.email ? [{ email: application.email }] : []), { userId: application.userId }] }, select: { id: true } });
    if (duplicate) return NextResponse.json({ ok: false, message: "Já existe um membro com o CPF, e-mail ou usuário desta inscrição." }, { status: 409 });
    const profile = await prisma.userProfile.findUnique({ where: { id: application.userId } });
    if (profile) return NextResponse.json({ ok: false, message: "Este usuário já está vinculado a uma organização." }, { status: 409 });
    const approved = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({ data: {
        organizationId: application.organizationId, userId: application.userId,
        fullName: application.fullName, email: application.email, cpf: application.cpf, cpfNeedsReview: false,
        phone: application.phone, photoUrl: application.photoUrl, course: application.course, registration: application.registration,
        nationality: application.nationality, maritalStatus: application.maritalStatus, rg: application.rg, rgIssuer: application.rgIssuer,
        address: application.address, addressNumber: application.addressNumber, neighborhood: application.neighborhood,
        cep: application.cep, city: application.city, state: application.state, status: "ACTIVE",
        directorateId: application.directorateId, positionId: application.positionId,
      } });
      await tx.userProfile.create({ data: { id: application.userId, organizationId: application.organizationId, role: "USER", active: true, name: application.fullName, email: application.email } });
      return tx.memberApplication.update({ where: { id: application.id }, data: { status: "APPROVED", memberId: member.id, reviewedById: result.auth.user.id, reviewedAt: new Date(), rejectionReason: null } });
    });
    return NextResponse.json({ ok: true, application: approved, memberId: approved.memberId, message: "Inscrição aprovada. O membro está ativo." });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return NextResponse.json({ ok: false, message: "A aprovação criaria um registro duplicado." }, { status: 409 });
    return databaseErrorResponse(error);
  }
}
