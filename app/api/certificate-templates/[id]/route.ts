import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { certificateTemplateUpdateSchema, idSchema } from "@/lib/validation";
import { certificateAssetIds, certificateLayoutSchema } from "@/lib/certificate-layout";
import { createSignedStorageUrl } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const parsedId = idSchema.safeParse((await params).id); if (!parsedId.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const organizationId = auth.auth!.profile.organizationId;
    const template = await prisma.documentTemplate.findFirst({ where: { id: parsedId.data, organizationId, type: "CERTIFICATE", renderMode: "VISUAL_CERTIFICATE" }, select: { id: true, name: true, description: true, active: true, processingVersion: true, layoutJson: true, updatedAt: true } });
    if (!template) return NextResponse.json({ ok: false, message: "Certificado não encontrado." }, { status: 404 });
    const layout = certificateLayoutSchema.safeParse(template.layoutJson); if (!layout.success) return NextResponse.json({ ok: false, message: "Layout armazenado é inválido." }, { status: 409 });
    const assets = await prisma.certificateAsset.findMany({ where: { organizationId }, select: { id: true, storageRef: true, mimeType: true, width: true, height: true }, orderBy: { createdAt: "desc" }, take: 100 });
    const safeAssets = await Promise.all(assets.map(async ({ storageRef, ...asset }) => ({ ...asset, url: await createSignedStorageUrl(storageRef, 300) })));
    const organization = auth.auth!.organization;
    return NextResponse.json({ ok: true, template: { ...template, layoutJson: layout.data }, assets: safeAssets, preview: { organizationName: organization.name, organizationShortName: organization.shortName || "Empresa Júnior" } });
  } catch (error) { console.error("Erro ao carregar certificado visual:", error); return databaseErrorResponse(error); }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const idResult = idSchema.safeParse((await params).id); if (!idResult.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const parsed = await parseJsonRequest(request, certificateTemplateUpdateSchema); if (parsed.response) return parsed.response;
    const organizationId = auth.auth!.profile.organizationId; const assetIds = certificateAssetIds(parsed.data!.layout);
    const [template, assetCount] = await Promise.all([
      prisma.documentTemplate.findFirst({ where: { id: idResult.data, organizationId, type: "CERTIFICATE", renderMode: "VISUAL_CERTIFICATE" }, select: { id: true } }),
      prisma.certificateAsset.count({ where: { organizationId, id: { in: assetIds } } }),
    ]);
    if (!template) return NextResponse.json({ ok: false, message: "Certificado não encontrado." }, { status: 404 });
    if (assetCount !== assetIds.length) return NextResponse.json({ ok: false, message: "Uma imagem não pertence a esta organização." }, { status: 403 });
    const updated = await prisma.documentTemplate.update({ where: { id: template.id }, data: { name: parsed.data!.name, description: parsed.data!.description, layoutJson: parsed.data!.layout, processingVersion: { increment: 1 } }, select: { id: true, name: true, processingVersion: true, updatedAt: true } });
    return NextResponse.json({ ok: true, template: updated });
  } catch (error) { console.error("Erro ao salvar certificado visual:", error); return databaseErrorResponse(error); }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const idResult = idSchema.safeParse((await params).id); if (!idResult.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const result = await prisma.documentTemplate.deleteMany({ where: { id: idResult.data, organizationId: auth.auth!.profile.organizationId, type: "CERTIFICATE", renderMode: "VISUAL_CERTIFICATE" } });
    if (!result.count) return NextResponse.json({ ok: false, message: "Certificado não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Erro ao excluir certificado visual:", error); return databaseErrorResponse(error); }
}
