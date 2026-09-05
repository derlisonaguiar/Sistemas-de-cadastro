import { createHash, randomUUID } from "node:crypto";
import type { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadPrivateObject, removeStorageObject, downloadStorageObject } from "@/lib/storage";
import { importDocumentSchema, validateImportedFile } from "@/lib/document-import-validation";

export class DocumentImportError extends Error {
  constructor(public status: number, message: string, public duplicate?: { id: string; title: string }) { super(message); }
}

type Links = { memberId?: string | null; clientId?: string | null; projectId?: string | null; contractId?: string | null };
export async function validateDocumentLinks(db: Prisma.TransactionClient, organizationId: string, links: Links) {
  const [member, client, project, contract] = await Promise.all([
    links.memberId ? db.member.findFirst({ where: { id: links.memberId, organizationId }, select: { id: true } }) : null,
    links.clientId ? db.client.findFirst({ where: { id: links.clientId, organizationId }, select: { id: true } }) : null,
    links.projectId ? db.project.findFirst({ where: { id: links.projectId, organizationId }, select: { id: true, clientId: true } }) : null,
    links.contractId ? db.contract.findFirst({ where: { id: links.contractId, organizationId }, select: { id: true, clientId: true, projectId: true } }) : null,
  ]);
  if ((links.memberId && !member) || (links.clientId && !client) || (links.projectId && !project) || (links.contractId && !contract)) {
    throw new DocumentImportError(400, "Vínculo inválido para esta organização.");
  }
  if ((client && project?.clientId && project.clientId !== client.id) ||
      (client && contract && contract.clientId !== client.id) ||
      (project && contract?.projectId && contract.projectId !== project.id) ||
      (project?.clientId && contract && project.clientId !== contract.clientId)) {
    throw new DocumentImportError(400, "Cliente, projeto e contrato selecionados possuem vínculos incompatíveis.");
  }
}

export async function importDocument(organizationId: string, importedById: string, input: z.infer<typeof importDocumentSchema>, file: File) {
  let validated: Awaited<ReturnType<typeof validateImportedFile>>;
  try { validated = await validateImportedFile(file); }
  catch { throw new DocumentImportError(400, "Envie um PDF ou DOCX seguro, válido e não criptografado, de até 10 MB."); }
  const { buffer, safe } = validated;
  const hash = createHash("sha256").update(buffer).digest("hex");
  let uploaded: string | null = null;
  try {
    return await prisma.$transaction(async (tx) => {
      // Serialize imports of the same bytes within this organization, including
      // duplicate confirmation, so concurrent requests cannot bypass detection.
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${organizationId + ":" + hash}, 0))`;
      await validateDocumentLinks(tx, organizationId, input);
      let duplicate = await tx.document.findFirst({
        where: { organizationId, importedFileHash: hash },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, title: true },
      });
      if (!duplicate) {
        // Older generated files predate import hashes. Compare their bytes without
        // rewriting them or changing generation. Also inspect later signed copies
        // of imported originals, whose bytes differ from the original import hash.
        const existingFiles = await tx.document.findMany({
          where: { organizationId, OR: [
            { origin: "GENERATED" },
            { origin: "IMPORTED", fileUrl: { not: null }, signedFile: { not: null } },
          ] },
          select: { id: true, title: true, fileUrl: true, signedFile: true, generatedDocxUrl: true, generatedPdfUrl: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        for (const existing of existingFiles) {
          const references = [...new Set([existing.fileUrl, existing.signedFile, existing.generatedDocxUrl, existing.generatedPdfUrl].filter((ref): ref is string => !!ref))];
          for (const reference of references) {
            const bytes = await downloadStorageObject(reference);
            if (bytes && createHash("sha256").update(bytes).digest("hex") === hash) {
              duplicate = { id: existing.id, title: existing.title };
              break;
            }
          }
          if (duplicate) break;
        }
      }
      if (duplicate && (input.duplicateOfId !== duplicate.id || input.duplicateReason.length < 10)) {
        throw new DocumentImportError(409, "Este arquivo já existe na organização. Abra o documento existente ou justifique uma nova importação.", duplicate);
      }
      if (!duplicate && input.duplicateOfId) throw new DocumentImportError(409, "A confirmação de duplicidade não corresponde a este arquivo. Envie novamente.");
      const id = randomUUID();
      uploaded = await uploadPrivateObject(`organizations/${organizationId}/documents/${id}/imported${safe.extension}`, buffer, safe.mime);
      const links = { memberId: input.memberId, clientId: input.clientId, projectId: input.projectId, contractId: input.contractId };
      const now = new Date();
      return tx.document.create({ data: {
        id, organizationId, ...links, title: input.title, type: input.type, description: input.description || null,
        status: input.status, origin: "IMPORTED", documentDate: new Date(input.documentDate + "T00:00:00Z"),
        organizationDocument: input.organizationDocument,
        fileUrl: input.signed ? null : uploaded, signedFile: input.signed ? uploaded : null,
        // signedAt records receipt of the signed file, not an invented signature date.
        signedAt: input.signed ? now : null,
        importedAt: now, importedById, importedFileHash: hash,
        importedFileName: file.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255), importedMimeType: safe.mime, importedFileSize: buffer.length,
        importLinks: { ...links, organizationDocument: input.organizationDocument },
        duplicateOfId: duplicate?.id || null, duplicateReason: duplicate ? input.duplicateReason : null,
      }, select: { id: true } });
    }, { maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    // Only remove this request's new object when the database write did not commit.
    if (uploaded) await removeStorageObject(uploaded).catch(() => undefined);
    throw error;
  }
}
