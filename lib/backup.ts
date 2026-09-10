import "server-only";
import { createHash } from "node:crypto";
import PizZip from "pizzip";
import { prisma } from "@/lib/prisma";

const VERSION = 1;
const MAX_ENTRIES = 4;
const MAX_UNCOMPRESSED = 25 * 1024 * 1024;
type BackupData = Record<string, unknown>;

const checksum = (value: string) => createHash("sha256").update(value).digest("hex");
const counts = (data: BackupData) => Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, (value as unknown[]).length]));

export async function createOrganizationBackup(organizationId: string) {
  const database = prisma as any;
  const [organization, members, directorates, positions, clients, projects, contracts, templates, assets, documents] = await Promise.all([
    database.organization.findUnique({ where: { id: organizationId } }), database.member.findMany({ where: { organizationId } }), database.directorate.findMany({ where: { organizationId } }), database.position.findMany({ where: { organizationId } }), database.client.findMany({ where: { organizationId } }), database.project.findMany({ where: { organizationId } }), database.contract.findMany({ where: { organizationId } }), database.documentTemplate.findMany({ where: { organizationId }, include: { fields: true } }), database.certificateAsset.findMany({ where: { organizationId } }), database.document.findMany({ where: { organizationId }, include: { deliveries: true } }),
  ]);
  if (!organization) throw new Error("Organização não encontrada.");
  const deliveries = documents.flatMap((document: any) => document.deliveries.map((delivery: any) => ({ ...delivery, documentId: document.id })));
  const data = { organization, members, directorates, positions, clients, projects, contracts, templates: templates.map((template: any) => ({ ...template, fields: undefined })), templateFields: templates.flatMap((template: any) => template.fields), certificateAssets: assets, documents: documents.map((document: any) => ({ ...document, deliveries: undefined })), documentDeliveries: deliveries };
  const dataJson = JSON.stringify(data);
  const manifest = { version: VERSION, createdAt: new Date().toISOString(), organization: { id: organization.id, name: organization.name }, schema: "prisma", files: ["data.json"], checksums: { "data.json": checksum(dataJson) }, counts: counts(data) };
  const zip = new PizZip(); zip.file("manifest.json", JSON.stringify(manifest)); zip.file("data.json", dataJson);
  return { buffer: zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer, manifest };
}

export function parseBackup(buffer: Buffer) {
  if (buffer.length === 0 || buffer.length > MAX_UNCOMPRESSED) throw new Error("Arquivo de backup inválido ou muito grande.");
  let zip: PizZip; try { zip = new PizZip(buffer); } catch { throw new Error("Arquivo de backup inválido."); }
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ENTRIES || entries.some((entry) => entry.name.includes("..") || entry.name.startsWith("/") || entry.name.startsWith("\\"))) throw new Error("Estrutura de backup inválida.");
  const manifestFile = zip.file("manifest.json"); const dataFile = zip.file("data.json");
  if (!manifestFile || !dataFile) throw new Error("Manifesto ou dados ausentes.");
  const uncompressedSize = (dataFile as typeof dataFile & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (typeof uncompressedSize === "number" && uncompressedSize > MAX_UNCOMPRESSED) throw new Error("Conteúdo de backup muito grande.");
  let manifest: any; let data: BackupData; const dataJson = dataFile.asText();
  if (Buffer.byteLength(dataJson) > MAX_UNCOMPRESSED) throw new Error("Conteúdo de backup muito grande.");
  try { manifest = JSON.parse(manifestFile.asText()); data = JSON.parse(dataJson); } catch { throw new Error("Conteúdo de backup inválido."); }
  if (manifest?.version !== VERSION || !manifest.organization?.id || manifest.checksums?.["data.json"] !== checksum(dataJson)) throw new Error("Versão ou integridade do backup inválida.");
  return { manifest, data, summary: counts(data) };
}

const withoutTimestamps = (record: any) => { const { createdAt, updatedAt, ...data } = record; return data; };

export async function applyBackup(organizationId: string, data: BackupData, mode: "MERGE" | "RESTORE") {
  const database = prisma as any;
  const sourceOrganization = data.organization as any;
  if (!sourceOrganization || sourceOrganization.id !== organizationId) throw new Error("O backup pertence a outra organização.");
  const summary = { inserted: 0, skipped: 0, conflicts: [] as string[] };
  await database.$transaction(async (tx: any) => {
    if (mode === "RESTORE") {
      await tx.document.deleteMany({ where: { organizationId } }); await tx.documentTemplate.deleteMany({ where: { organizationId } }); await tx.contract.deleteMany({ where: { organizationId } }); await tx.project.deleteMany({ where: { organizationId } }); await tx.client.deleteMany({ where: { organizationId } }); await tx.member.deleteMany({ where: { organizationId } }); await tx.position.deleteMany({ where: { organizationId } }); await tx.directorate.deleteMany({ where: { organizationId } }); await tx.certificateAsset.deleteMany({ where: { organizationId } });
      const organizationData = withoutTimestamps(sourceOrganization); delete organizationData.id;
      await tx.organization.update({ where: { id: organizationId }, data: organizationData });
    }
    const modelByCollection: Record<string, string> = { directorates: "directorate", positions: "position", members: "member", clients: "client", projects: "project", contracts: "contract", templates: "documentTemplate", templateFields: "documentTemplateField", certificateAssets: "certificateAsset", documents: "document", documentDeliveries: "documentDelivery" };
    for (const collection of ["directorates", "positions", "members", "clients", "projects", "contracts", "templates", "templateFields", "certificateAssets", "documents", "documentDeliveries"] as const) for (const record of (data[collection] as any[] || [])) {
      const model = tx[modelByCollection[collection]]; const existing = await model.findUnique({ where: { id: record.id } });
      if (existing) { summary.skipped++; summary.conflicts.push(`${collection}:${record.id}`); continue; }
      try { await model.create({ data: withoutTimestamps(record) }); summary.inserted++; } catch { summary.skipped++; summary.conflicts.push(`${collection}:${record.id}`); }
    }
  });
  return summary;
}
