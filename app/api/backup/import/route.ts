import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api";
import { applyBackup, parseBackup } from "@/lib/backup";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getAdminApiContext(); if (auth.response) return auth.response;
  const limited = checkRateLimit(request, `backup-import:${auth.auth!.user.id}`, 3, 60_000); if (limited) return limited;
  try {
    const form = await request.formData(); const file = form.get("file"); const action = String(form.get("action"));
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_BYTES || !file.name.toLowerCase().endsWith(".zip")) return NextResponse.json({ ok: false, message: "Envie um backup ZIP de até 25 MB." }, { status: 400 });
    const parsed = parseBackup(Buffer.from(await file.arrayBuffer())); const organizationId = auth.auth!.organization.id;
    if (parsed.manifest.organization.id !== organizationId) return NextResponse.json({ ok: false, message: "Este backup pertence a outra organização." }, { status: 403 });
    if (action === "preview") return NextResponse.json({ ok: true, manifest: parsed.manifest, summary: parsed.summary });
    if (action !== "merge" && action !== "restore") return NextResponse.json({ ok: false, message: "Ação inválida." }, { status: 400 });
    if (action === "restore" && form.get("confirmation") !== "RESTAURAR") return NextResponse.json({ ok: false, message: "Digite RESTAURAR para confirmar a restauração completa." }, { status: 400 });
    const result = await applyBackup(organizationId, parsed.data, action === "restore" ? "RESTORE" : "MERGE");
    await (prisma as any).backupAudit.create({ data: { organizationId, userId: auth.auth!.user.id, operation: action === "restore" ? "RESTORE" : "MERGE", summary: result } });
    return NextResponse.json({ ok: true, result });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Backup inválido." }, { status: 400 }); }
}
