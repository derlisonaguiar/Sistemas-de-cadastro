import { z } from "zod";
import PizZip from "pizzip";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFStream } from "pdf-lib";
import { validateTemplateUpload } from "./file-security";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const optionalId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).nullable().default(null);
export const documentTypes = ["VOLUNTEER_TERM", "TERMINATION_TERM", "CERTIFICATE", "DECLARATION", "CONTRACT", "PROJECT", "CLIENT", "OTHER"] as const;
export const documentStatuses = ["DRAFT", "PENDING", "SIGNED", "ISSUED", "ARCHIVED", "CANCELED"] as const;
export const importDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(documentTypes),
  description: z.string().trim().max(3000).default(""),
  documentDate: z.iso.date(),
  status: z.enum(documentStatuses),
  signed: z.boolean(),
  memberId: optionalId, clientId: optionalId, projectId: optionalId, contractId: optionalId,
  organizationDocument: z.boolean().default(false),
  duplicateOfId: optionalId,
  duplicateReason: z.string().trim().max(1000).default(""),
}).strict().refine((data) => data.status !== "SIGNED" || data.signed, {
  message: "Marque o arquivo como já assinado.", path: ["signed"],
}).refine((data) => !data.signed || ["SIGNED", "ARCHIVED", "CANCELED"].includes(data.status), {
  message: "Arquivo assinado deve ter status Assinado, Arquivado ou Cancelado.", path: ["status"],
}).refine((data) => !data.duplicateOfId || data.duplicateReason.length >= 10, {
  message: "Informe uma justificativa de pelo menos 10 caracteres.", path: ["duplicateReason"],
});

export async function validateImportedFile(file: File) {
  const result = await validateTemplateUpload(file, MAX_IMPORT_BYTES);
  if (result.safe.kind === "PDF") {
    const pdf = await PDFDocument.load(result.buffer, { throwOnInvalidObject: true });
    if (!pdf.getPageCount()) throw new Error("EMPTY_PDF");
    // Inspect parsed objects, including compressed objects and escaped PDF names.
    const forbidden = new Set(["JavaScript", "JS", "Launch", "EmbeddedFiles", "EmbeddedFile", "RichMedia", "XFA", "OpenAction", "AA", "SubmitForm", "ImportData", "GoToR"]);
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      const visit = (value: unknown, seen = new Set<unknown>(), depth = 0) => {
        if (depth > 40) throw new Error("PDF_TOO_DEEP");
        if (!value || seen.has(value)) return;
        seen.add(value);
        if (value instanceof PDFName && forbidden.has(value.decodeText())) throw new Error("UNSAFE_PDF");
        if (value instanceof PDFDict) for (const [key, child] of value.entries()) { visit(key, seen, depth + 1); visit(child, seen, depth + 1); }
        if (value instanceof PDFArray) for (const child of value.asArray()) visit(child, seen, depth + 1);
        if (value instanceof PDFStream) visit(value.dict, seen, depth + 1);
      };
      visit(object);
    }
  } else {
    const zip = new PizZip(result.buffer);
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      if (/vbaProject|(?:^|\/)embeddings\/|activeX\/|\.bin$/i.test(entry.name)) throw new Error("UNSAFE_DOCX");
      if (/\.(xml|rels)$/i.test(entry.name)) {
        const xml = entry.asText().replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_match, code: string) => {
          const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : parseInt(code, 10);
          if (point > 0x10ffff) throw new Error("INVALID_XML");
          return String.fromCodePoint(point);
        });
        if (/\x00|<!DOCTYPE|<!ENTITY|macroEnabled|oleObject|altChunk|TargetMode\s*=\s*["']External|\bDDE(?:AUTO)?\b/i.test(xml)) throw new Error("UNSAFE_DOCX");
      }
    }
  }
  return result;
}

// Bound the actual multipart body, including requests without Content-Length.
export async function readImportForm(request: Request) {
  const max = MAX_IMPORT_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > max) throw new Error("SIZE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > max) { await reader.cancel(); throw new Error("SIZE"); }
    chunks.push(chunk.value);
  }
  return new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
}
