import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ quiet: true });

test('diretoria, cargo, Pós-Jr, histórico, documentos e exclusividade no PostgreSQL real', async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  await db.connect();
  try {
    await db.query('BEGIN');
    const org = randomUUID(), otherOrg = randomUUID(), dir = randomUUID(), otherDir = randomUUID();
    for (const id of [org, otherOrg]) await db.query('INSERT INTO "Organization" (id, name, "updatedAt") VALUES ($1, $2, now())', [id, 'Teste transacional Pós-Jr']);
    for (const [id, organizationId] of [[dir, org], [otherDir, otherOrg]]) {
      await db.query('INSERT INTO "Directorate" (id, "organizationId", name, "updatedAt") VALUES ($1, $2, $3, now())', [id, organizationId, 'Diretoria Teste']);
    }
    async function rejects(sql, values, code) {
      await db.query('SAVEPOINT expected_error');
      await assert.rejects(db.query(sql, values), (error) => error.code === code);
      await db.query('ROLLBACK TO SAVEPOINT expected_error');
      await db.query('RELEASE SAVEPOINT expected_error');
    }
    const insertPosition = 'INSERT INTO "Position" (id, "organizationId", "directorateId", name, role, "updatedAt") VALUES ($1, $2, $3, $4, $5, now())';
    const insertMember = 'INSERT INTO "Member" (id, "organizationId", "directorateId", "positionId", "fullName", "updatedAt") VALUES ($1, $2, $3, $4, $5, now())';
    await rejects(insertPosition, [randomUUID(), org, otherDir, 'Invalido', 'MEMBER'], '23514');
    for (const role of ['DIRECTOR', 'PRESIDENT', 'VICE_PRESIDENT']) {
      const position = randomUUID(), first = randomUUID(), second = randomUUID(), document = randomUUID();
      await db.query(insertPosition, [position, org, dir, role, role]);
      await db.query(insertMember, [first, org, dir, position, 'Membro Teste']);
      await db.query('INSERT INTO "Document" (id, "organizationId", "memberId", title, type, "updatedAt") VALUES ($1, $2, $3, $4, $5, now())', [document, org, first, 'Histórico preservado', 'DECLARATION']);
      await rejects(insertMember, [second, org, dir, position, 'Sucessor Teste'], '23505');
      await rejects(insertMember, [randomUUID(), otherOrg, otherDir, position, 'Outra organização'], '23514');
      await rejects(insertMember, [randomUUID(), org, null, position, 'Sem diretoria vinculada'], '23514');
      const departed = (await db.query('UPDATE "Member" SET status = $2 WHERE id = $1 RETURNING *', [first, 'POS_JR'])).rows[0];
      assert.equal(departed.positionId, null);
      assert.equal(departed.directorateId, null);
      assert.ok(departed.exitDate);
      assert.equal(departed.membershipHistory.length, 1);
      assert.equal(departed.membershipHistory[0].positionRole, role);
      assert.equal(departed.membershipHistory[0].directorateName, 'Diretoria Teste');
      await db.query(insertMember, [second, org, dir, position, 'Sucessor Teste']);
      const unchanged = (await db.query('UPDATE "Member" SET "fullName" = $2, "positionId" = $3, "directorateId" = $4 WHERE id = $1 RETURNING *', [first, 'Pós-Jr consultável', position, dir])).rows[0];
      assert.equal(unchanged.positionId, null);
      assert.equal(unchanged.directorateId, null);
      assert.deepEqual(unchanged.membershipHistory, departed.membershipHistory);
      assert.equal((await db.query('SELECT id FROM "Document" WHERE id = $1 AND "memberId" = $2', [document, first])).rowCount, 1);
      await db.query('UPDATE "Member" SET status = $2 WHERE id = $1', [second, 'POS_JR']);
      await db.query('UPDATE "Member" SET status = $2, "positionId" = $3, "directorateId" = $4 WHERE id = $1', [first, 'ACTIVE', position, dir]);
      const again = (await db.query('UPDATE "Member" SET status = $2 WHERE id = $1 RETURNING "membershipHistory"', [first, 'POS_JR'])).rows[0];
      assert.equal(again.membershipHistory.length, 2);
      await db.query('DELETE FROM "Position" WHERE id = $1', [position]);
      assert.equal((await db.query('SELECT "membershipHistory" FROM "Member" WHERE id = $1', [first])).rows[0].membershipHistory[0].positionName, role);
    }
    assert.equal((await db.query('SELECT id FROM "Member" WHERE "organizationId" = $1 AND status = $2', [org, 'POS_JR'])).rowCount, 6);
  } finally {
    await db.query('ROLLBACK');
    await db.end();
  }
});
