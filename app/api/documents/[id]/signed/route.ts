import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { routeIdSchema } from "@/lib/validation";
import { validatePdf } from "@/lib/file-security";
import { uploadPrivateObject, removeStorageObject } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let uploaded: string | null = null;
  try {
    const auth = await getAdminApiContext();
    if (auth.response) return auth.response;
    const limited = checkRateLimit(request, "signed-upload", 10, 60_000);
    if (limited) return limited;
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false }, { status: 400 });
    const organizationId = auth.auth!.profile.organizationId;
    const where = { id: params.data.id, organizationId };
    const document = await prisma.document.findFirst({ where });
    if (!document) return NextResponse.json({ ok: false }, { status: 404 });
    if (document.signedFile) return NextResponse.json({ ok: false, message: "Documento assinado já enviado." }, { status: 409 });
    if (!document.generatedDocxUrl && !document.generatedPdfUrl && !document.fileUrl) {
      return NextResponse.json({ ok: false, message: "O documento precisa possuir um arquivo original." }, { status: 400 });
    }
    let buffer: Buffer;
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) throw new Error("SIZE");
      buffer = Buffer.from(await file.arrayBuffer());
      validatePdf(buffer, file);
      const pdf = await PDFDocument.load(buffer);
      if (!pdf.getPageCount()) throw new Error("EMPTY");
    } catch {
      return NextResponse.json({ ok: false, message: "Envie um PDF válido, não criptografado, de até 10 MB." }, { status: 400 });
    }
    uploaded = await uploadPrivateObject(`organizations/${organizationId}/documents/${document.id}/signed/${randomUUID()}.pdf`, buffer, "application/pdf");
    // Conditional update prevents concurrent uploads from replacing the first signed file.
    const result = await prisma.document.updateMany({
      where: { ...where, signedFile: null },
      data: { signedFile: uploaded, signedAt: new Date(), status: "SIGNED" },
    });
    if (!result.count) {
      await removeStorageObject(uploaded);
      uploaded = null;
      return NextResponse.json({ ok: false, message: "Documento alterado durante o envio. Recarregue a página." }, { status: 409 });
    }
    uploaded = null;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    if (uploaded) await removeStorageObject(uploaded).catch(() => undefined);
    return internalErrorResponse();
  }
}
