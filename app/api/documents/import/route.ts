import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse } from "@/lib/api";
import { DocumentImportError, importDocument } from "@/lib/document-import";
import { importDocumentSchema, readImportForm } from "@/lib/document-import-validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const auth = await getAdminApiContext();
    if (auth.response) return auth.response;
    const { profile, user } = auth.auth!;
    const limited = checkRateLimit(request, `document-import:${user.id}`, 10, 60_000);
    if (limited) return limited;
    let form: FormData;
    try { form = await readImportForm(request); }
    catch { return NextResponse.json({ ok: false, message: "Envie um arquivo de até 10 MB e os dados do documento." }, { status: 400 }); }
    const file = form.get("file");
    let metadata: unknown;
    try { metadata = JSON.parse(String(form.get("metadata"))); } catch { metadata = null; }
    const parsed = importDocumentSchema.safeParse(metadata);
    if (!(file instanceof File) || !parsed.success || [...form.keys()].some((key) => !["file", "metadata"].includes(key))) {
      return NextResponse.json({ ok: false, message: "Dados inválidos. Revise arquivo, data, status e vínculos." }, { status: 400 });
    }
    const document = await importDocument(profile.organizationId, user.id, parsed.data, file);
    return NextResponse.json({ ok: true, document }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentImportError) return NextResponse.json({ ok: false, message: error.message, duplicate: error.duplicate }, { status: error.status });
    return internalErrorResponse();
  }
}
