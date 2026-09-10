import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api";
import { createOrganizationBackup } from "@/lib/backup";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await getAdminApiContext(); if (auth.response) return auth.response;
  const limited = checkRateLimit(request, `backup-export:${auth.auth!.user.id}`, 3, 60_000); if (limited) return limited;
  const body = await request.json().catch(() => null); if (!body?.confirm) return NextResponse.json({ ok: false, message: "Confirmação necessária para gerar o backup." }, { status: 400 });
  try {
    const organizationId = auth.auth!.organization.id; const backup = await createOrganizationBackup(organizationId);
    await (prisma as any).$transaction(async (tx: any) => { await tx.backupSettings.upsert({ where: { organizationId }, create: { organizationId, lastBackupAt: new Date(), lastBackupById: auth.auth!.user.id }, update: { lastBackupAt: new Date(), lastBackupById: auth.auth!.user.id } }); await tx.backupAudit.create({ data: { organizationId, userId: auth.auth!.user.id, operation: "EXPORT", summary: backup.manifest.counts } }); });
    return new NextResponse(new Uint8Array(backup.buffer).buffer as ArrayBuffer, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="backup-${organizationId}-${new Date().toISOString().slice(0, 10)}.zip"` } });
  } catch { return NextResponse.json({ ok: false, message: "Não foi possível gerar o backup." }, { status: 500 }); }
}
