import { getAdminApiContext } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const settingsSchema = z.object({ frequency: z.enum(["MANUAL", "DAILY", "WEEKLY", "MONTHLY"]), destination: z.literal("LOCAL") }).strict();

export async function GET() {
  const auth = await getAdminApiContext(); if (auth.response) return auth.response;
  const prisma = (await import("@/lib/prisma")).prisma as any;
  const organizationId = auth.auth!.organization.id;
  const [settings, lastOperation] = await Promise.all([prisma.backupSettings.findUnique({ where: { organizationId } }), prisma.backupAudit.findFirst({ where: { organizationId }, orderBy: { createdAt: "desc" } })]);
  const days = settings?.frequency === "DAILY" ? 1 : settings?.frequency === "WEEKLY" ? 7 : settings?.frequency === "MONTHLY" ? 30 : 0;
  const nextBackup = days ? new Date((settings?.lastBackupAt || new Date()).getTime() + days * 86_400_000) : null;
  return NextResponse.json({ ok: true, settings, lastOperation, nextBackup, automaticPending: settings?.frequency && settings.frequency !== "MANUAL" });
}

export async function PUT(request: Request) {
  const auth = await getAdminApiContext(); if (auth.response) return auth.response;
  const body = settingsSchema.safeParse(await request.json()); if (!body.success) return NextResponse.json({ ok: false, message: "Configuração inválida." }, { status: 400 });
  const prisma = (await import("@/lib/prisma")).prisma as any;
  const settings = await prisma.backupSettings.upsert({ where: { organizationId: auth.auth!.organization.id }, create: { organizationId: auth.auth!.organization.id, ...body.data }, update: body.data });
  return NextResponse.json({ ok: true, settings });
}
