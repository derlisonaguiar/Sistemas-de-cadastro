import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const bucket = process.env.SUPABASE_PRIVATE_BUCKET || "private-documents";
const root = process.cwd();
const report = [];

if (!process.env.DATABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function migrate(table, id, organizationId, column, reference, destination) {
  if (!reference?.startsWith("/uploads/")) return;
  const source = path.resolve(root, "public", reference.replace(/^\/+/, ""));
  if (!source.startsWith(path.resolve(root, "public", "uploads") + path.sep)) throw new Error("Caminho legado inválido.");
  try {
    const data = await fs.readFile(source);
    report.push({ table, id, column, source, destination, size: data.length, action: apply ? "uploaded" : "dry-run" });
    if (!apply) return;
    const { error } = await supabase.storage.from(bucket).upload(destination, data, { upsert: false });
    if (error) throw error;
    const nextReference = `storage://${bucket}/${destination}`;
    if (table === "DocumentTemplate" && column === "originalFileUrl") {
      await database.query('UPDATE "DocumentTemplate" SET "originalFileUrl" = $1 WHERE id = $2 AND "organizationId" = $3',
        [nextReference, id, organizationId]);
    } else if (table === "Document" && column === "generatedDocxUrl") {
      await database.query('UPDATE "Document" SET "generatedDocxUrl" = $1 WHERE id = $2 AND "organizationId" = $3',
        [nextReference, id, organizationId]);
    } else if (table === "Document" && column === "generatedPdfUrl") {
      await database.query('UPDATE "Document" SET "generatedPdfUrl" = $1 WHERE id = $2 AND "organizationId" = $3',
        [nextReference, id, organizationId]);
    } else if (table === "Document" && column === "fileUrl") {
      await database.query('UPDATE "Document" SET "fileUrl" = $1 WHERE id = $2 AND "organizationId" = $3',
        [nextReference, id, organizationId]);
    } else {
      throw new Error("Destino de migração não permitido.");
    }
  } catch (error) {
    report.push({ table, id, column, source, destination, action: "error", error: error instanceof Error ? error.message : "unknown" });
  }
}

try {
  await database.connect();
  const templates = await database.query('SELECT id, "organizationId", "originalFileUrl" FROM "DocumentTemplate"');
  for (const row of templates.rows) {
    const extension = path.extname(row.originalFileUrl || "") || ".docx";
    await migrate("DocumentTemplate", row.id, row.organizationId, "originalFileUrl", row.originalFileUrl,
      `organizations/${row.organizationId}/templates/${row.id}/original${extension}`);
  }
  const documents = await database.query('SELECT id, "organizationId", "generatedDocxUrl", "generatedPdfUrl", "fileUrl" FROM "Document"');
  for (const row of documents.rows) {
    await migrate("Document", row.id, row.organizationId, "generatedDocxUrl", row.generatedDocxUrl,
      `organizations/${row.organizationId}/documents/${row.id}/generated.docx`);
    await migrate("Document", row.id, row.organizationId, "generatedPdfUrl", row.generatedPdfUrl,
      `organizations/${row.organizationId}/documents/${row.id}/generated.pdf`);
    const extension = path.extname(row.fileUrl || "") || ".bin";
    await migrate("Document", row.id, row.organizationId, "fileUrl", row.fileUrl,
      `organizations/${row.organizationId}/documents/${row.id}/signed${extension}`);
  }
} finally {
  await database.end().catch(() => undefined);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", originalsDeleted: false, report }, null, 2));
}
