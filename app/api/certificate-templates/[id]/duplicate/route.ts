import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { databaseErrorResponse } from "@/lib/api";
import { idSchema } from "@/lib/validation";
import { certificateLayoutSchema } from "@/lib/certificate-layout";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const parsed = idSchema.safeParse((await params).id); if (!parsed.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const source = await prisma.documentTemplate.findFirst({ where: { id: parsed.data, organizationId: auth.auth!.profile.organizationId, type: "CERTIFICATE", renderMode: "VISUAL_CERTIFICATE" } });
    if (!source) return NextResponse.json({ ok: false, message: "Certificado não encontrado." }, { status: 404 });
    const layout = certificateLayoutSchema.safeParse(source.layoutJson);
    if (!layout.success) return NextResponse.json({ ok: false, message: "Layout armazenado é inválido." }, { status: 409 });
    const template = await prisma.documentTemplate.create({ data: { organizationId: source.organizationId, name: `${source.name} (cópia)`.slice(0, 200), description: source.description, type: "CERTIFICATE", content: "", sourceType: "VISUAL", renderMode: "VISUAL_CERTIFICATE", processingStatus: "READY", layoutJson: layout.data }, select: { id: true, name: true } });
    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (error) { console.error("Erro ao duplicar certificado visual:", error); return databaseErrorResponse(error); }
}
