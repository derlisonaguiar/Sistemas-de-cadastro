import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { memberApplicationSchema } from "@/lib/validation";
import { OrganizationContextError, resolveAutoEnrollmentOrganization } from "@/lib/organization-context";

async function context() {
  const user = await getAuthenticatedUser();
  if (!user) return { response: NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 }) };
  return { user, response: null };
}

export async function GET() {
  const auth = await context();
  if (auth.response) return auth.response;
  const application = await prisma.memberApplication.findUnique({ where: { userId: auth.user!.id } });
  return NextResponse.json({ ok: true, application });
}

export async function POST(request: Request) {
  try {
    const auth = await context();
    if (auth.response) return auth.response;
    const limited = checkRateLimit(request, `member-application:${auth.user!.id}`, 5, 60 * 60_000);
    if (limited) return limited;
    const parsed = await parseJsonRequest(request, memberApplicationSchema);
    if (parsed.response) return parsed.response;
    const existing = await prisma.memberApplication.findUnique({ where: { userId: auth.user!.id }, select: { id: true } });
    if (existing) return NextResponse.json({ ok: false, message: "Você já possui uma inscrição." }, { status: 409 });
    const profile = await prisma.userProfile.findUnique({ where: { id: auth.user!.id }, select: { id: true } });
    if (profile) return NextResponse.json({ ok: false, message: "Esta conta já possui acesso à organização." }, { status: 409 });
    const organization = await resolveAutoEnrollmentOrganization();
    const data = parsed.data!;
    const member = await prisma.member.findFirst({ where: { organizationId: organization.id, cpf: data.cpf }, select: { id: true } });
    if (member) return NextResponse.json({ ok: false, message: "Este CPF já está cadastrado como membro." }, { status: 409 });
    const application = await prisma.memberApplication.create({ data: { ...data, organizationId: organization.id, userId: auth.user!.id } });
    return NextResponse.json({ ok: true, application, message: "Inscrição enviada. Aguarde a análise da administração." }, { status: 201 });
  } catch (error) {
    if (error instanceof OrganizationContextError) return NextResponse.json({ ok: false, message: error.message }, { status: 503 });
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return NextResponse.json({ ok: false, message: "Já existe uma inscrição ou membro com estes dados." }, { status: 409 });
    return databaseErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await context();
    if (auth.response) return auth.response;
    const limited = checkRateLimit(request, `member-application-edit:${auth.user!.id}`, 10, 60 * 60_000);
    if (limited) return limited;
    const parsed = await parseJsonRequest(request, memberApplicationSchema);
    if (parsed.response) return parsed.response;
    const current = await prisma.memberApplication.findUnique({ where: { userId: auth.user!.id } });
    if (!current) return NextResponse.json({ ok: false, message: "Inscrição não encontrada." }, { status: 404 });
    if (current.status !== "PENDING") return NextResponse.json({ ok: false, message: "Somente inscrições pendentes podem ser alteradas." }, { status: 409 });
    const member = await prisma.member.findFirst({ where: { organizationId: current.organizationId, cpf: parsed.data!.cpf }, select: { id: true } });
    if (member) return NextResponse.json({ ok: false, message: "Este CPF já está cadastrado como membro." }, { status: 409 });
    const application = await prisma.memberApplication.update({ where: { id: current.id }, data: parsed.data! });
    return NextResponse.json({ ok: true, application, message: "Inscrição atualizada." });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return NextResponse.json({ ok: false, message: "Este CPF já possui uma inscrição." }, { status: 409 });
    return databaseErrorResponse(error);
  }
}
