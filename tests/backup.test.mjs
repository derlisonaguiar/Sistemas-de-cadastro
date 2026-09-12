import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(mocks) {
  const source = ts.transpileModule(readFileSync(new URL("../lib/backup.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)((name) => mocks[name] || require(name), module, module.exports);
  return module.exports;
}
function db() {
  const rows = {
    directorate: [],
    position: [],
    member: [],
    client: [],
    project: [],
    contract: [],
    documentTemplate: [],
    documentTemplateField: [],
    certificateAsset: [],
    document: [],
    documentDelivery: [],
  };
  const model = (name) => ({
    findMany: async () => rows[name],
    findUnique: async ({ where }) => rows[name].find((row) => row.id === where.id) || null,
    create: async ({ data }) => {
      rows[name].push(data);
      return data;
    },
    deleteMany: async () => {
      rows[name] = [];
    },
  });
  const prisma = {
    organization: {
      findUnique: async () => ({ id: "org", name: "Org", primaryColor: "#000000" }),
      update: async () => null,
    },
    member: model("member"),
    directorate: model("directorate"),
    position: model("position"),
    client: model("client"),
    project: model("project"),
    contract: model("contract"),
    documentTemplate: { ...model("documentTemplate"), findMany: async () => [] },
    certificateAsset: model("certificateAsset"),
    document: { ...model("document"), findMany: async () => [] },
    $transaction: async (callback) =>
      callback({
        organization: { update: async () => null },
        ...Object.fromEntries(Object.keys(rows).map((name) => [name, model(name)])),
      }),
  };
  return { prisma, rows };
}
test("gera backup e valida manifesto sem segredos", async () => {
  const state = db();
  state.prisma.organization.findUnique = async () => ({
    id: "org",
    name: "Org",
    primaryColor: "#000000",
    entryCodeHash: "segredo",
  });
  const backup = load({ "server-only": {}, "@/lib/prisma": { prisma: state.prisma } });
  const generated = await backup.createOrganizationBackup("org");
  const parsed = backup.parseBackup(generated.buffer);
  assert.equal(parsed.manifest.version, 1);
  assert.equal(parsed.manifest.organization.id, "org");
  assert.equal("entryCodeHash" in parsed.data.organization, false);
});
test("bloqueia backup inválido", () => {
  const backup = load({ "server-only": {}, "@/lib/prisma": { prisma: db().prisma } });
  assert.throws(() => backup.parseBackup(Buffer.from("inválido")));
});
test("bloqueia checksum inválido", () => {
  const backup = load({ "server-only": {}, "@/lib/prisma": { prisma: db().prisma } });
  const zip = new (require("pizzip"))();
  const data = {
    organization: { id: "org" },
    members: [],
    directorates: [],
    positions: [],
    clients: [],
    projects: [],
    contracts: [],
    templates: [],
    templateFields: [],
    certificateAssets: [],
    documents: [],
    documentDeliveries: [],
  };
  zip.file(
    "manifest.json",
    JSON.stringify({ version: 1, organization: { id: "org" }, checksums: { "data.json": "checksum-incorreto" } })
  );
  zip.file("data.json", JSON.stringify(data));
  assert.throws(() => backup.parseBackup(zip.generate({ type: "nodebuffer" })));
});
test("mesclar não duplica e mantém isolamento da organização", async () => {
  const state = db();
  state.rows.member.push({ id: "member-1", organizationId: "org" });
  const backup = load({ "server-only": {}, "@/lib/prisma": { prisma: state.prisma } });
  const data = {
    organization: { id: "org", name: "Org" },
    directorates: [],
    positions: [],
    members: [
      { id: "member-1", organizationId: "org", fullName: "Existente" },
      { id: "member-2", organizationId: "org", fullName: "Novo" },
    ],
    clients: [],
    projects: [],
    contracts: [],
    templates: [],
    templateFields: [],
    certificateAssets: [],
    documents: [],
    documentDeliveries: [],
  };
  const result = await backup.applyBackup("org", data, "MERGE");
  assert.equal(result.inserted, 1);
  assert.equal(result.skipped, 1);
  await assert.rejects(() => backup.applyBackup("outra", data, "MERGE"));
});
test("restauração exige confirmação na rota", () => {
  const source = readFileSync(new URL("../app/api/backup/import/route.ts", import.meta.url), "utf8");
  assert.match(source, /confirmation.*RESTAURAR/);
});
