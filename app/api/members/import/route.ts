import { getAdminApiContext } from "@/lib/auth";
import { memberStatusLabels } from "@/lib/member-export";
import { prisma } from "@/lib/prisma";
import { isValidCpf, memberSchema, normalizeTaxId } from "@/lib/validation";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const headers = ["Nome", "CPF", "Curso", "E-mail", "Telefone", "Matrícula", "Diretoria", "Cargo", "Status"];
const key = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("pt-BR");
const statusByLabel = new Map(Object.entries(memberStatusLabels).flatMap(([value, label]) => [[key(value), value], [key(label), value]]));

function isCpfConflict(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error) || error.code !== "P2002" || !("meta" in error)) return false;
  const target = (error.meta as { target?: unknown })?.target;
  return Array.isArray(target) && target.includes("cpf");
}

type ImportMemberData = Omit<ReturnType<typeof memberSchema.parse>, "cpf"> & { cpf: string | null; cpfNeedsReview: boolean };
type ParsedRow = { line: number; fullName: string; data?: ImportMemberData; errors: string[]; warnings: string[] };

async function parseFile(file: File, organizationId: string) {
  const extension = file.name.toLowerCase().split(".").pop();
  if (!file.name || !["csv", "xlsx"].includes(extension || "") || file.size === 0 || file.size > MAX_BYTES) throw new Error("Envie um arquivo CSV ou XLSX de até 5 MB.");
  const fileData = await file.arrayBuffer();
  const workbook = extension === "csv"
    ? XLSX.read(new TextDecoder().decode(fileData), { type: "string", raw: false, FS: new TextDecoder().decode(fileData).split(/\r?\n/, 1)[0]?.includes(";") ? ";" : "," })
    : XLSX.read(fileData, { type: "array", raw: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("A planilha não possui dados.");
  const values = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: false });
  const headerRow = values[0]?.map(key) || [];
  if (headers.some((header) => !headerRow.includes(key(header)))) throw new Error("Use o modelo de importação com todos os cabeçalhos obrigatórios.");
  const records = values.slice(1).filter((row) => row.some((value) => String(value).trim() !== ""));
  if (records.length === 0 || records.length > MAX_ROWS) throw new Error(`A planilha deve conter entre 1 e ${MAX_ROWS} linhas.`);
  const [directorates, positions, existing] = await Promise.all([
    prisma.directorate.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.position.findMany({ where: { organizationId }, select: { id: true, name: true, directorateId: true, role: true } }),
    prisma.member.findMany({ where: { organizationId }, select: { cpf: true, registration: true, email: true } }),
  ]);
  const directorateByName = new Map(directorates.map((item) => [key(item.name), item]));
  const positionByName = new Map(positions.map((item) => [key(item.name), item]));
  const seenCpf = new Set(existing.map((item) => item.cpf).filter(Boolean)); const seenRegistration = new Set(existing.map((item) => key(item.registration)).filter(Boolean)); const seenEmail = new Set(existing.map((item) => key(item.email)).filter(Boolean));
  return records.map((row, index): ParsedRow => {
    const value = (header: string) => String(row[headerRow.indexOf(key(header))] ?? "").trim();
    const errors: string[] = [];
    const warnings: string[] = [];
    const directorateName = value("Diretoria"); const positionName = value("Cargo"); const rawStatus = value("Status");
    const directorate = directorateName ? directorateByName.get(key(directorateName)) : null;
    const position = positionName ? positionByName.get(key(positionName)) : null;
    if (directorateName && !directorate) errors.push("Diretoria inexistente");
    if (positionName && !position) errors.push("Cargo inexistente");
    const status = rawStatus ? statusByLabel.get(key(rawStatus)) : "ACTIVE";
    if (!status) errors.push("Status inválido");
    if (status !== "POS_JR" && position?.directorateId && position.directorateId !== directorate?.id) errors.push("Cargo incompatível com a diretoria");
    const cpf = normalizeTaxId(value("CPF")); const registration = value("Matrícula"); const email = value("E-mail");
    if (cpf && seenCpf.has(cpf)) errors.push("Já existe um membro cadastrado com este CPF."); else if (cpf) seenCpf.add(cpf);
    if (registration && seenRegistration.has(key(registration))) errors.push("Matrícula duplicada"); else if (registration) seenRegistration.add(key(registration));
    if (email && seenEmail.has(key(email))) errors.push("E-mail já cadastrado ou duplicado"); else if (email) seenEmail.add(key(email));
    const cpfNeedsReview = !isValidCpf(cpf);
    if (cpfNeedsReview) warnings.push(cpf ? "CPF inválido — o membro poderá ser importado, mas ficará pendente de correção." : "CPF ausente — o membro poderá ser importado, mas ficará pendente de correção.");
    const result = memberSchema.safeParse({ fullName: value("Nome"), cpf: cpfNeedsReview ? "52998224725" : cpf, course: value("Curso") || null, email: email || null, phone: value("Telefone") || null, registration: registration || null, directorateId: directorate?.id || null, positionId: position?.id || null, status: status || "ACTIVE" });
    if (!result.success) errors.push(...result.error.issues.map((issue) => issue.message));
    return { line: index + 2, fullName: value("Nome"), data: result.success ? { ...result.data, cpf: cpfNeedsReview ? (cpf || null) : result.data.cpf, cpfNeedsReview } : undefined, errors, warnings };
  });
}

async function createRow(organizationId: string, row: ParsedRow) {
  if (!row.data) throw new Error("Dados inválidos.");
  const data = row.data;
  await prisma.$transaction(async (tx) => {
    const position = data.positionId ? await tx.position.findFirst({ where: { id: data.positionId, organizationId } }) : null;
    if (data.positionId && !position) throw new Error("Cargo não encontrado.");
    if (data.status === "ACTIVE" && position?.role && ["PRESIDENT", "VICE_PRESIDENT", "DIRECTOR"].includes(position.role)) {
      const where = position.role === "DIRECTOR" ? { organizationId, status: "ACTIVE" as const, directorateId: data.directorateId, position: { role: "DIRECTOR" as const } } : { organizationId, status: "ACTIVE" as const, position: { role: position.role } };
      if (position.role === "DIRECTOR" && !data.directorateId) throw new Error("Diretor precisa de diretoria.");
      if (await tx.member.findFirst({ where })) throw new Error("Cargo de liderança já ocupado por membro ativo.");
    }
    if (data.cpf && await tx.member.findFirst({ where: { organizationId, cpf: data.cpf }, select: { id: true } })) throw new Error("Já existe um membro cadastrado com este CPF.");
    await tx.member.create({ data: { organizationId, fullName: data.fullName, email: data.email, cpf: data.cpf, cpfNeedsReview: data.cpfNeedsReview, phone: data.phone, course: data.course, registration: data.registration, status: data.status, directorateId: data.directorateId, positionId: data.positionId } });
  });
}

export async function POST(request: Request) {
  try {
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const organization = auth.auth!.organization; if (!organization) return NextResponse.json({ ok: false, message: "Organização não encontrada." }, { status: 404 });
    const form = await request.formData(); const file = form.get("file"); const action = form.get("action");
    if (!(file instanceof File) || !["preview", "confirm"].includes(String(action))) return NextResponse.json({ ok: false, message: "Arquivo ou ação inválidos." }, { status: 400 });
    const rows = await parseFile(file, organization.id);
    const validRows = rows.filter((row) => row.errors.length === 0 && row.data);
    if (action === "preview") return NextResponse.json({ ok: true, preview: { total: rows.length, valid: validRows.length, invalid: rows.length - validRows.length, rows: rows.map((row) => ({ line: row.line, fullName: row.fullName, valid: row.errors.length === 0, errors: row.errors, warnings: row.warnings })) } });
    const failures: { line: number; error: string }[] = []; let imported = 0;
    for (const row of validRows) { try { await createRow(organization.id, row); imported++; } catch (error) { failures.push({ line: row.line, error: isCpfConflict(error) ? "Já existe um membro cadastrado com este CPF." : error instanceof Error ? error.message : "Não foi possível criar o membro." }); } }
    return NextResponse.json({ ok: true, imported, failures, message: `${imported} membro(s) importado(s).` });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Erro ao importar membros." }, { status: 400 }); }
}
