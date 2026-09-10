import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks) {
  const source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)((name) => mocks[name] || require(name), module, module.exports);
  return module.exports;
}

function setup(existingCpfs = []) {
  const created = [];
  const memberSchema = { safeParse: (value) => value.fullName && value.cpf?.length === 11 ? { success: true, data: value } : { success: false, error: { issues: [{ message: "Dados inválidos." }] } } };
  const member = {
    findMany: async () => existingCpfs.map((cpf) => ({ cpf, registration: null, email: null })),
    findFirst: async ({ where }) => where.cpf && existingCpfs.includes(where.cpf) ? { id: "existing" } : null,
    create: async ({ data }) => { created.push(data); existingCpfs.push(data.cpf); return data; },
  };
  const route = load("app/api/members/import/route.ts", {
    "@/lib/auth": { getAdminApiContext: async () => ({ auth: { organization: { id: "org" } } }) },
    "@/lib/member-export": { memberStatusLabels: { ACTIVE: "Ativo", INACTIVE: "Inativo", LEAVE: "Afastado", ALUMNI: "Egresso", POS_JR: "Pós-Jr" } },
    "@/lib/prisma": { prisma: { directorate: { findMany: async () => [] }, position: { findMany: async () => [] }, member, $transaction: async (callback) => callback({ member, position: { findFirst: async () => null } }) } },
    "@/lib/validation": { memberSchema, normalizeTaxId: (value) => value.replace(/\D/g, ""), isValidCpf: (value) => value === "52998224725" },
  });
  return { created, async preview(csv) { const form = new FormData(); form.set("action", "preview"); form.set("file", new Blob([csv], { type: "text/csv" }), "membros.csv"); return route.POST(new Request("http://localhost/api/members/import", { method: "POST", body: form })); }, async confirm(csv) { const form = new FormData(); form.set("action", "confirm"); form.set("file", new Blob([csv], { type: "text/csv" }), "membros.csv"); return route.POST(new Request("http://localhost/api/members/import", { method: "POST", body: form })); } };
}

const header = "Nome,CPF,Curso,E-mail,Telefone,Matrícula,Diretoria,Cargo,Status\n";
test("importa CPF válido sem pendência", async () => {
  const h = setup(); const response = await h.confirm(`${header}Ana,52998224725,,,,,,,Ativo`); assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  assert.deepEqual(h.created[0].cpfNeedsReview, false);
});
test("prévia e importação permitem CPF inválido com pendência", async () => {
  const h = setup(); const csv = `${header}Ana,123,,,,,,,Ativo`;
  const preview = await (await h.preview(csv)).json(); assert.equal(preview.preview.valid, 1); assert.match(preview.preview.rows[0].warnings[0], /CPF inválido/);
  await h.confirm(csv); assert.deepEqual(h.created[0].cpfNeedsReview, true);
});
test("importa CPF ausente com pendência", async () => {
  const h = setup(); await h.confirm(`${header}Ana,,,,,,,,Ativo`);
  assert.equal(h.created[0].cpf, null); assert.equal(h.created[0].cpfNeedsReview, true);
});
test("bloqueia CPF existente e repetido na planilha", async () => {
  const existing = setup(["52998224725"]); const preview = await (await existing.preview(`${header}Ana,52998224725,,,,,,,Ativo`)).json(); assert.equal(preview.preview.valid, 0);
  const repeated = setup(); const repeatedPreview = await (await repeated.preview(`${header}Ana,52998224725,,,,,,,Ativo\nBia,52998224725,,,,,,,Ativo`)).json(); assert.equal(repeatedPreview.preview.valid, 1); assert.match(repeatedPreview.preview.rows[1].errors[0], /Já existe um membro/);
});
test("edição remove a pendência ao salvar CPF manual válido", () => {
  const source = readFileSync(new URL("../app/api/members/[id]/route.ts", import.meta.url), "utf8");
  assert.match(source, /cpfNeedsReview:\s*false/);
});
