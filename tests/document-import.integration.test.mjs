import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import { PDFDocument } from 'pdf-lib';
import PizZip from 'pizzip';
import { loadSource } from './helpers/load-source.mjs';
dotenv.config({ quiet: true });

test('real PostgreSQL and private Storage: imports, signed file, duplicate, links and rollback', async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  const storage = loadSource('lib/storage.ts', { 'server-only': {} });
  const references = [];
  await db.connect();
  try {
    await db.query('BEGIN');
    const org = randomUUID(), other = randomUUID(), member = randomUUID(), client = randomUUID(), project = randomUUID(), contract = randomUUID(), foreign = randomUUID();
    for (const id of [org, other]) await db.query('INSERT INTO "Organization" (id, name, "updatedAt") VALUES ($1, $2, now())', [id, 'Teste transacional de importação']);
    await db.query('INSERT INTO "Member" (id, "organizationId", "fullName", "updatedAt") VALUES ($1,$2,$3,now()), ($4,$5,$3,now())', [member, org, 'Teste de importação', foreign, other]);
    await db.query('INSERT INTO "Client" (id,"organizationId",name,"updatedAt") VALUES ($1,$2,$3,now())', [client,org,'Cliente de teste']);
    await db.query('INSERT INTO "Project" (id,"organizationId","clientId",name,"updatedAt") VALUES ($1,$2,$3,$4,now())', [project,org,client,'Projeto de teste']);
    await db.query('INSERT INTO "Contract" (id,"organizationId","clientId","projectId",title,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())', [contract,org,client,project,'Contrato de teste']);
    const generated = randomUUID();
    await db.query('INSERT INTO "Document" (id,"organizationId",title,type,"updatedAt") VALUES ($1,$2,$3,$4,now())', [generated,org,'Compatibilidade geração','OTHER']);
    assert.equal((await db.query('SELECT origin FROM "Document" WHERE id=$1', [generated])).rows[0].origin, 'GENERATED');
    const adapter = {
      $queryRaw: async (_strings, key) => (await db.query('SELECT 1 FROM pg_advisory_xact_lock(hashtextextended($1,0))', [key])).rows,
      document: {
        findMany: async ({ where }) => (await db.query('SELECT id,title,"fileUrl","signedFile","generatedDocxUrl","generatedPdfUrl" FROM "Document" WHERE "organizationId"=$1 AND (origin=$2 OR ("fileUrl" IS NOT NULL AND "signedFile" IS NOT NULL)) ORDER BY "createdAt",id', [where.organizationId, 'GENERATED'])).rows,
        findFirst: async ({ where }) => (await db.query('SELECT id,title FROM "Document" WHERE "organizationId"=$1 AND "importedFileHash"=$2 ORDER BY "createdAt", id LIMIT 1', [where.organizationId,where.importedFileHash])).rows[0] || null,
        create: async ({ data }) => {
          const columns = Object.keys(data); const values = columns.map(key => key === 'importLinks' ? JSON.stringify(data[key]) : data[key]);
          return (await db.query(`INSERT INTO "Document" (${columns.map(key => '"'+key+'"').join(',')},"updatedAt") VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')},now()) RETURNING id`, values)).rows[0];
        },
      },
    };
    for (const [name,table] of [['member','Member'],['client','Client'],['project','Project'],['contract','Contract']]) adapter[name] = { findFirst: async ({ where }) => (await db.query(`SELECT * FROM "${table}" WHERE id=$1 AND "organizationId"=$2`, [where.id,where.organizationId])).rows[0] || null };
    adapter.$transaction = async callback => {
      await db.query('SAVEPOINT import_request');
      try { const result = await callback(adapter); await db.query('RELEASE SAVEPOINT import_request'); return result; }
      catch (error) { await db.query('ROLLBACK TO SAVEPOINT import_request'); await db.query('RELEASE SAVEPOINT import_request'); throw error; }
    };
    const service = loadSource('lib/document-import.ts', {
      '@/lib/prisma': { prisma: adapter },
      '@/lib/storage': { ...storage, uploadPrivateObject: async (...args) => { const ref = await storage.uploadPrivateObject(...args); references.push(ref); return ref; } },
    });
    const { importDocumentSchema } = loadSource('lib/document-import-validation.ts');
    const input = importDocumentSchema.parse({ title: 'Importação PDF', type: 'OTHER', documentDate: '2019-06-12', status: 'ISSUED', signed: false, memberId: member, clientId: client, projectId: project, contractId: contract, organizationDocument: true });
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = await pdf.save(); const file = new File([bytes], 'anterior.pdf', { type: 'application/pdf' });
    const result = await service.importDocument(org, 'test-admin', input, file);
    const row = (await db.query('SELECT * FROM "Document" WHERE id=$1', [result.id])).rows[0];
    assert.equal(row.origin,'IMPORTED'); assert.equal(row.generatedPdfUrl,null); assert.equal(row.generatedDocxUrl,null);
    for (const key of ['memberId','clientId','projectId','contractId']) assert.equal((await db.query(`SELECT id FROM "Document" WHERE "organizationId"=$1 AND "${key}"=$2`,[org,input[key]])).rowCount,1);
    await assert.rejects(service.importDocument(org,'test-admin',input,file),error=>error.status===409);
    await assert.rejects(service.importDocument(org,'test-admin',{...input,memberId:foreign},file),error=>error.status===400);
    const signedUrl = await storage.createSignedStorageUrl(row.fileUrl,60);
    const response = await fetch(signedUrl); assert.equal(response.status,200); assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(bytes));
    const parsed = storage.parseStorageReference(row.fileUrl);
    const publicResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${parsed.bucket}/${parsed.path}`); assert.notEqual(publicResponse.status,200);
    const zip = new PizZip(); zip.file('[Content_Types].xml','<Types/>'); zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>');
    const signed = await service.importDocument(org,'test-admin',{...input,title:'DOCX já assinado',signed:true,status:'SIGNED'},new File([zip.generate({type:'nodebuffer'})],'assinado.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
    const signedRow = (await db.query('SELECT * FROM "Document" WHERE id=$1',[signed.id])).rows[0];
    assert.ok(signedRow.signedFile); assert.ok(signedRow.signedAt); assert.equal(signedRow.fileUrl,null); assert.equal(signedRow.generatedDocxUrl,null); assert.equal(signedRow.origin,'IMPORTED');
    const signedResponse = await fetch(await storage.createSignedStorageUrl(signedRow.signedFile,60)); assert.equal(signedResponse.status,200);
  } finally {
    await db.query('ROLLBACK'); await db.end();
    for (const ref of references) await storage.removeStorageObject(ref);
  }
});
