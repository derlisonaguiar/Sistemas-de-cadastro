import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, databaseErrorResponse } from "@/lib/api";
import { validateImageUpload } from "@/lib/file-security";
import { createSignedStorageUrl, removeStorageObject, uploadPrivateObject } from "@/lib/storage";

const MAX_IMAGE_BYTES = Number(process.env.CERTIFICATE_IMAGE_MAX_BYTES || 8 * 1024 * 1024);

export async function POST(request: Request) {
  let storageRef: string | null = null;
  try {
    const limited = checkRateLimit(request, "certificate-image", 20, 60_000); if (limited) return limited;
    const auth = await getAdminApiContext(); if (auth.response) return auth.response;
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ ok: false, message: "Imagem inválida ou acima do limite." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    let safe;
    try { safe = validateImageUpload(buffer, file); }
    catch { return NextResponse.json({ ok: false, message: "Imagem inválida." }, { status: 400 }); }
    if (safe.mime === "image/webp") return NextResponse.json({ ok: false, message: "Use PNG ou JPEG no editor de certificados." }, { status: 400 });
    const organizationId = auth.auth!.profile.organizationId; const id = randomUUID();
    storageRef = await uploadPrivateObject(`organizations/${organizationId}/certificate-assets/${id}/image${safe.extension}`, buffer, safe.mime);
    const asset = await prisma.certificateAsset.create({ data: { id, organizationId, storageRef, mimeType: safe.mime, size: file.size, width: safe.width, height: safe.height }, select: { id: true, mimeType: true, width: true, height: true } });
    return NextResponse.json({ ok: true, asset: { ...asset, url: await createSignedStorageUrl(storageRef, 300) } }, { status: 201 });
  } catch (error) {
    if (storageRef) await removeStorageObject(storageRef).catch(() => undefined);
    console.error("Erro ao enviar imagem de certificado:", error); return databaseErrorResponse(error);
  }
}
