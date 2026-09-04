import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { certificateGenerateSchema, idSchema } from "@/lib/validation";
import { certificateAssetIds, certificateLayoutSchema } from "@/lib/certificate-layout";
import { renderCertificatePdf, type CertificateImage } from "@/lib/certificate-renderer";
import { createSignedStorageUrl, downloadStorageObject, removeStorageObject, uploadPrivateObject } from "@/lib/storage";

const text = (value: unknown) => value == null ? "" : String(value);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("pt-BR").format(value) : "";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let storageRef: string | null = null;
  try {
    const limited = checkRateLimit(request, "certificate-generate", 10, 60_000); if (limited) return limited;
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const templateId = idSchema.safeParse((await params).id); if (!templateId.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const parsed = await parseJsonRequest(request, certificateGenerateSchema); if (parsed.response) return parsed.response;
    const organizationId = auth.auth!.profile.organizationId;
    const [template, member, representative] = await Promise.all([
      prisma.documentTemplate.findFirst({ where: { id: templateId.data, organizationId, active: true, type: "CERTIFICATE", renderMode: "VISUAL_CERTIFICATE" }, select: { id: true, name: true, layoutJson: true, processingVersion: true } }),
      prisma.member.findFirst({ where: { id: parsed.data!.memberId, organizationId }, include: { directorate: { select: { name: true } }, position: { select: { name: true } } } }),
      parsed.data!.representativeId ? prisma.member.findFirst({ where: { id: parsed.data!.representativeId, organizationId }, include: { position: { select: { name: true } } } }) : Promise.resolve(null),
    ]);
    if (!template) return NextResponse.json({ ok: false, message: "Certificado não encontrado." }, { status: 404 });
    if (!member) return NextResponse.json({ ok: false, message: "Membro não encontrado." }, { status: 404 });
    if (parsed.data!.representativeId && !representative) return NextResponse.json({ ok: false, message: "Representante não encontrado." }, { status: 404 });
    const layout = certificateLayoutSchema.safeParse(template.layoutJson); if (!layout.success) return NextResponse.json({ ok: false, message: "Layout do certificado é inválido." }, { status: 409 });
    const assetIds = certificateAssetIds(layout.data);
    const assets = await prisma.certificateAsset.findMany({ where: { organizationId, id: { in: assetIds } }, select: { id: true, storageRef: true, mimeType: true, width: true, height: true } });
    if (assets.length !== assetIds.length) return NextResponse.json({ ok: false, message: "Uma imagem do certificado não está disponível." }, { status: 409 });
    const images = new Map<string, CertificateImage>();
    await Promise.all(assets.map(async (asset) => { const bytes = await downloadStorageObject(asset.storageRef); if (!bytes) throw new Error("ASSET_NOT_FOUND"); images.set(asset.id, { bytes, mimeType: asset.mimeType as "image/png" | "image/jpeg", width: asset.width, height: asset.height }); }));
    const organization = auth.auth!.organization;
    const values: Record<string, string> = {
      "organization.name": organization.name, "organization.shortName": organization.shortName || "",
      "member.fullName": member.fullName, "member.email": member.email || "", "member.cpf": member.cpf || "",
      "member.phone": member.phone || "", "member.course": member.course || "", "member.registration": member.registration || "",
      "member.nationality": member.nationality || "", "member.maritalStatus": member.maritalStatus || "", "member.rg": member.rg || "",
      "member.rgIssuer": member.rgIssuer || "", "member.address": member.address || "", "member.addressNumber": member.addressNumber || "",
      "member.neighborhood": member.neighborhood || "", "member.cep": member.cep || "", "member.city": member.city || "", "member.state": member.state || "",
      "member.directorate.name": member.directorate?.name || "", "member.position.name": member.position?.name || "",
      "representative.fullName": representative?.fullName || "", "representative.email": representative?.email || "", "representative.cpf": representative?.cpf || "",
      "representative.phone": representative?.phone || "", "representative.course": representative?.course || "", "representative.nationality": representative?.nationality || "",
      "representative.maritalStatus": representative?.maritalStatus || "", "representative.rg": representative?.rg || "", "representative.rgIssuer": representative?.rgIssuer || "",
      "representative.position": representative?.position?.name || "", "system.currentDate": date(new Date()),
      "organization.cnpj": text(organization.cnpj), "organization.email": text(organization.email), "organization.phone": text(organization.phone),
      "organization.website": text(organization.website), "organization.address": text(organization.address), "organization.city": text(organization.city), "organization.state": text(organization.state),
    };
    const pdf = await renderCertificatePdf(layout.data, values, images); const documentId = randomUUID();
    storageRef = await uploadPrivateObject(`organizations/${organizationId}/documents/${documentId}/generated.pdf`, pdf, "application/pdf");
    const document = await prisma.document.create({ data: { id: documentId, organizationId, templateId: template.id, memberId: member.id, title: `${template.name} - ${member.fullName}`.slice(0, 200), type: "CERTIFICATE", status: "ISSUED", issueDate: new Date(), generatedPdfUrl: storageRef, templateLayoutVersion: template.processingVersion, templateLayoutSnapshot: layout.data }, select: { id: true, title: true, status: true, createdAt: true } });
    return NextResponse.json({ ok: true, document, downloadUrl: await createSignedStorageUrl(storageRef, 300) }, { status: 201 });
  } catch (error) {
    if (storageRef) await removeStorageObject(storageRef).catch(() => undefined);
    console.error("Erro ao gerar certificado visual:", error); return databaseErrorResponse(error);
  }
}
