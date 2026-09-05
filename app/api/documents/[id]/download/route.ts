import { getReadApiContext } from "@/lib/auth";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createSignedStorageUrl } from "@/lib/storage";
import { routeIdSchema } from "@/lib/validation";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getReadApiContext();
    if (auth.response) return auth.response;
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false }, { status: 400 });
    const document = await prisma.document.findFirst({ where: { id: params.data.id, organizationId: auth.auth!.profile.organizationId } });
    if (!document) return NextResponse.json({ ok: false }, { status: 404 });
    const variant = new URL(request.url).searchParams.get("variant") || "original";
    if (!["original", "signed"].includes(variant)) return NextResponse.json({ ok: false }, { status: 400 });
    const reference = variant === "signed" ? document.signedFile : document.fileUrl || document.generatedPdfUrl || document.generatedDocxUrl;
    if (!reference) return NextResponse.json({ ok: false, message: "Arquivo não encontrado." }, { status: 404 });
    return NextResponse.redirect(await createSignedStorageUrl(reference, 300), { status: 307, headers: { "Cache-Control": "private, no-store" } });
  } catch { return internalErrorResponse(); }
}
