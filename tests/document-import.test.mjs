import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFName } from 'pdf-lib';
import PizZip from 'pizzip';
import { loadSource } from './helpers/load-source.mjs';

const validation = loadSource('lib/document-import-validation.ts');
const metadata = (extra = {}) => validation.importDocumentSchema.parse({ title: 'Documento anterior', type: 'OTHER', documentDate: '2020-03-04', status: 'ISSUED', signed: false, ...extra });
async function pdfFile() {
  const pdf = await PDFDocument.create(); pdf.addPage();
  return new File([await pdf.save()], 'arquivo.pdf', { type: 'application/pdf' });
}
function docxFile(extra = {}) {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Documento anterior</w:t></w:r></w:p></w:body></w:document>');
  for (const [name, text] of Object.entries(extra)) zip.file(name, text);
  return new File([zip.generate({ type: 'nodebuffer' })], 'arquivo.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function harness({ foreign, mismatch, failWrite, existingBytes } = {}) {
  const records = [], uploads = [], removed = [], lookups = [];
  let tail = Promise.resolve();
  const db = {
    $queryRaw: async () => [{ '?column?': 1 }],
    document: {
      findMany: async () => existingBytes ? [{ id: "generated-existing", title: "Documento gerado existente", generatedPdfUrl: "storage://private/generated.pdf" }] : [],
      findFirst: async ({ where }) => records.find(d => d.organizationId === where.organizationId && d.importedFileHash === where.importedFileHash) || null,
      create: async ({ data }) => { if (failWrite) throw new Error('DB'); records.push(data); return { id: data.id }; },
    },
  };
  for (const entity of ['member', 'client', 'project', 'contract']) db[entity] = { findFirst: async ({ where }) => {
    lookups.push({ entity, where }); if (foreign === entity) return null;
    return { id: where.id, clientId: mismatch ? 'wrong' : 'client', projectId: 'project' };
  } };
  db.$transaction = async (callback) => {
    const previous = tail; let release; tail = new Promise(resolve => { release = resolve; });
    await previous; try { return await callback(db); } finally { release(); }
  };
  const service = loadSource('lib/document-import.ts', {
    '@/lib/prisma': { prisma: db },
    '@/lib/storage': {
      uploadPrivateObject: async (...args) => { uploads.push(args); return 'storage://private-documents/' + args[0]; },
      downloadStorageObject: async () => existingBytes || null,
      removeStorageObject: async (ref) => { removed.push(ref); },
    },
  });
  return { ...service, records, uploads, removed, lookups, db };
}

test('imports PDF and DOCX using private paths and immutable audit metadata', async () => {
  for (const file of [await pdfFile(), docxFile()]) {
    const h = harness(); await h.importDocument('org', 'admin', metadata(), file);
    const row = h.records[0];
    assert.equal(row.origin, 'IMPORTED'); assert.equal(row.importedById, 'admin');
    assert.equal(row.documentDate.toISOString(), '2020-03-04T00:00:00.000Z');
    assert.equal(row.importedFileHash, createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'));
    assert.match(h.uploads[0][0], /^organizations\/org\/documents\/[a-f0-9-]+\/imported\.(pdf|docx)$/);
    assert.match(row.fileUrl, /^storage:\/\/private-documents\//); assert.equal(row.generatedDocxUrl, undefined); assert.equal(row.generatedPdfUrl, undefined);
  }
});
test('supports each entity and compatible combined links, Organization and general documents', async () => {
  for (const links of [{ memberId: 'member' }, { clientId: 'client' }, { projectId: 'project' }, { contractId: 'contract' }, { clientId: 'client', projectId: 'project', contractId: 'contract' }, { organizationDocument: true }, {}]) {
    const h = harness(); await h.importDocument('org', 'admin', metadata(links), await pdfFile());
    for (const [key, value] of Object.entries(links)) assert.equal(h.records[0][key], value);
    for (const check of h.lookups) assert.equal(check.where.organizationId, 'org');
    assert.deepEqual(h.records[0].importLinks, { memberId: null, clientId: null, projectId: null, contractId: null, organizationDocument: false, ...links });
  }
});
test('already signed PDF and DOCX have signedFile and signedAt, no fabricated original', async () => {
  for (const file of [await pdfFile(), docxFile()]) {
    const h = harness(); await h.importDocument('org', 'admin', metadata({ signed: true, status: 'SIGNED' }), file);
    const row = h.records[0]; assert.ok(row.signedFile); assert.ok(row.signedAt); assert.equal(row.fileUrl, null); assert.equal(row.generatedDocxUrl, undefined); assert.equal(row.generatedPdfUrl, undefined); assert.equal(row.signatureDate, undefined);
  }
});
test('SHA-256 duplicates block by default regardless of filename; explicit reason permits copy', async () => {
  const h = harness(); const file = await pdfFile(); await h.importDocument('org', 'admin', metadata(), file);
  const renamed = new File([await file.arrayBuffer()], 'outro.pdf', { type: 'application/pdf' });
  await assert.rejects(h.importDocument('org', 'admin', metadata(), renamed), e => e.status === 409 && e.duplicate.id === h.records[0].id);
  assert.equal(h.uploads.length, 1);
  await h.importDocument('org', 'admin', metadata({ duplicateOfId: h.records[0].id, duplicateReason: 'Cópia para outro vínculo administrativo' }), renamed);
  assert.equal(h.records.length, 2); assert.equal(h.records[1].duplicateOfId, h.records[0].id); assert.ok(h.records[1].duplicateReason);
  await h.importDocument('other-org', 'admin2', metadata(), file); assert.equal(h.records.length, 3);
});
test('simultaneous identical imports result in one document', async () => {
  const h = harness(); const file = await pdfFile(); const results = await Promise.allSettled([h.importDocument('org', 'admin', metadata(), file), h.importDocument('org', 'admin', metadata(), file)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(h.records.length, 1);
});
test('foreign IDs and incompatible combinations fail before storage upload', async () => {
  for (const foreign of ['member', 'client', 'project', 'contract']) {
    const h = harness({ foreign }); await assert.rejects(h.importDocument('org', 'admin', metadata({ [foreign + 'Id']: foreign }), await pdfFile()), e => e.status === 400); assert.equal(h.uploads.length, 0);
  }
  const h = harness({ mismatch: true }); await assert.rejects(h.importDocument('org', 'admin', metadata({ clientId: 'client', projectId: 'project' }), await pdfFile()), e => e.status === 400);
});
test('database failure cleans only the newly uploaded file', async () => {
  const h = harness({ failWrite: true }); await assert.rejects(h.importDocument('org', 'admin', metadata(), await pdfFile())); assert.equal(h.records.length, 0); assert.equal(h.removed.length, 1); assert.ok(h.removed[0].endsWith(h.uploads[0][0]));
});
test('rejects spoofed file signatures, MIME, unsafe PDF actions, DOCX external resources and macros', async () => {
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.catalog.set(PDFName.of('OpenAction'), pdf.context.obj({ S: 'JavaScript', JS: 'app.alert(1)' }));
  for (const file of [new File(['fake'], 'fake.pdf', { type: 'application/pdf' }), new File([await (await pdfFile()).arrayBuffer()], 'x.pdf', { type: 'text/plain' }), new File([await pdf.save()], 'unsafe.pdf'), docxFile({ 'word/_rels/document.xml.rels': '<Relationship TargetMode="External" Target="https://bad.example"/>' }), docxFile({ 'word/vbaProject.bin': 'macro' })]) {
    await assert.rejects(validation.validateImportedFile(file));
  }
});
test('validates real date, status, reason and rejects client-supplied organization', () => {
  for (const extra of [{ documentDate: '2025-02-30' }, { status: 'SIGNED', signed: false }, { organizationId: 'evil' }, { duplicateOfId: 'id', duplicateReason: 'short' }]) assert.throws(() => metadata(extra));
});
test('multipart parser enforces actual bytes without Content-Length', async () => {
  const body = new Uint8Array(validation.MAX_IMPORT_BYTES + 65537);
  await assert.rejects(validation.readImportForm(new Request('https://app.example/api/documents/import', { method: 'POST', body })));
});
test('list filters preserve organization and support every link, origin, status, type, date', () => {
  const { documentWhere } = loadSource('lib/document-filters.ts');
  for (const key of ['memberId', 'clientId', 'projectId', 'contractId']) assert.deepEqual(documentWhere('org', { [key]: 'id' }), { organizationId: 'org', [key]: 'id' });
  const where = documentWhere('org', { origin: 'IMPORTED', type: 'OTHER', status: 'SIGNED', documentDate: '2020-03-04' });
  assert.equal(where.organizationId, 'org'); assert.equal(where.origin, 'IMPORTED'); assert.equal(where.type, 'OTHER'); assert.equal(where.status, 'SIGNED'); assert.equal(where.OR.length, 2);
});
test('download uses temporary signed URL and blocks IDOR/missing original', async () => {
  for (const variant of ['original', 'signed', 'foreign', 'no-original']) {
    const calls = [];
    const { GET } = loadSource('app/api/documents/[id]/download/route.ts', {
      '@/lib/auth': { getAdminApiContext: async () => ({ auth: { profile: { organizationId: 'org' } } }) },
      '@/lib/validation': { routeIdSchema: { safeParse: (data) => ({ success: true, data }) } },
      '@/lib/prisma': { prisma: { document: { findFirst: async ({ where }) => { assert.equal(where.organizationId, 'org'); return variant === 'foreign' ? null : { fileUrl: variant === 'no-original' ? null : 'storage://private/original', signedFile: 'storage://private/signed' }; } } } },
      '@/lib/storage': { createSignedStorageUrl: async (...args) => { calls.push(args); return 'https://storage.example/signed?token=temporary'; } },
    });
    const r = await GET(new Request('https://app.example/api/documents/id/download?variant=' + (variant === 'signed' ? 'signed' : 'original')), { params: Promise.resolve({ id: 'id' }) });
    if (variant === 'foreign' || variant === 'no-original') { assert.equal(r.status, 404); assert.equal(calls.length, 0); }
    else { assert.equal(r.status, 307); assert.equal(calls[0][1], 300); assert.equal(calls[0][0], 'storage://private/' + variant); assert.match(r.headers.get('location'), /signed\?token=/); }
  }
});

test('DOCX cannot hide external resources in XML character references', async () => {
  await assert.rejects(validation.validateImportedFile(docxFile({ 'word/_rels/document.xml.rels': '<Relationship TargetMode="&#69;xternal" Target="https://bad.example"/>' })));
});

test('import endpoint enforces ADMIN, organization from profile, metadata validation and rate limit', async () => {
  const calls = [];
  let denied = true;
  const { POST } = loadSource('app/api/documents/import/route.ts', {
    '@/lib/auth': { getAdminApiContext: async () => denied ? { response: Response.json({ ok: false }, { status: 403 }) } : { auth: { user: { id: 'route-admin' }, profile: { organizationId: 'profile-org' } } } },
    '@/lib/document-import': { DocumentImportError: class extends Error {}, importDocument: async (...args) => { calls.push(args); return { id: 'new-document' }; } },
  });
  const request = async (extra = {}, ip = 'test-import') => {
    const body = new FormData(); body.set('file', await pdfFile()); body.set('metadata', JSON.stringify({ ...metadata(), ...extra }));
    return new Request('https://app.example/api/documents/import', { method: 'POST', headers: { 'x-real-ip': ip }, body });
  };
  assert.equal((await POST(await request())).status, 403); assert.equal(calls.length, 0);
  denied = false;
  assert.equal((await POST(await request({ organizationId: 'foreign' }, 'invalid'))).status, 400);
  assert.equal((await POST(await request())).status, 201); assert.equal(calls[0][0], 'profile-org'); assert.equal(calls[0][1], 'route-admin');
  for (let i = 0; i < 9; i++) assert.equal((await POST(await request())).status, 201);
  assert.equal((await POST(await request())).status, 429);
});

test('document listing includes imported and generated files with signed URLs', async () => {
  const { GET } = loadSource('app/api/documents/route.ts', {
    '@/lib/auth': { getAdminApiContext: async () => ({ auth: { organization: { id: 'org' }, profile: { organizationId: 'org' } } }) },
    '@/lib/prisma': { prisma: { document: { findMany: async ({ where }) => {
      assert.deepEqual(where, { organizationId: 'org', clientId: 'client' });
      return [{ id: 'imported', origin: 'IMPORTED', fileUrl: 'storage://private/imported', signedFile: null }, { id: 'generated', origin: 'GENERATED', generatedDocxUrl: 'storage://private/generated' }];
    } } } },
    '@/lib/storage': { createSignedStorageUrl: async () => 'https://storage.example/signed?temporary=1' },
  });
  const response = await GET(new Request('https://app.example/api/documents?clientId=client')); assert.equal(response.status, 200);
  const { documents } = await response.json(); assert.equal(documents.length, 2); assert.equal(documents[0].origin, 'IMPORTED'); assert.equal(documents[1].origin, 'GENERATED');
  assert.match(documents[0].fileUrl, /^https:\/\/storage.example\/signed/); assert.match(documents[1].generatedDocxUrl, /^https:\/\/storage.example\/signed/);
});

test('import also detects identical bytes in preexisting generated documents', async () => {
  const file = await pdfFile(); const h = harness({ existingBytes: Buffer.from(await file.arrayBuffer()) });
  await assert.rejects(h.importDocument('org', 'admin', metadata(), file), e => e.status === 409 && e.duplicate.id === 'generated-existing');
  assert.equal(h.uploads.length, 0);
  await h.importDocument('org', 'admin', metadata({ duplicateOfId: 'generated-existing', duplicateReason: 'Vincular cópia histórica a outra entidade' }), file);
  assert.equal(h.records[0].origin, 'IMPORTED'); assert.equal(h.records[0].duplicateOfId, 'generated-existing');
});

test('existing CSRF protection rejects cross-origin document imports', async () => {
  const { proxy } = loadSource('proxy.ts', { '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) } }) } });
  const { NextRequest } = await import('next/server.js');
  const response = await proxy(new NextRequest('https://app.example/api/documents/import', { method: 'POST', headers: { host: 'app.example', origin: 'https://foreign.example' } }));
  assert.equal(response.status, 403);
});
