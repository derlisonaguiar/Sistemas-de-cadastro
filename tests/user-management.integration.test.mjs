import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import { loadSource } from './helpers/load-source.mjs';
dotenv.config({ quiet: true });

test('PostgreSQL row lock serializes concurrent ADMIN changes and preserves last active ADMIN', async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 15000 });
  const organizationId = randomUUID(), first = randomUUID(), second = randomUUID();
  try {
    await pool.query('INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$2,now())', [organizationId, 'Teste de concorrência de usuários']);
    for (const id of [first, second]) await pool.query('INSERT INTO "UserProfile" (id,"organizationId",role,"updatedAt") VALUES ($1,$2,\'ADMIN\',now())', [id, organizationId]);
    const prisma = { $transaction: async action => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await action({
          $queryRaw: async (_sql, org) => client.query('SELECT id FROM "Organization" WHERE id=$1 FOR UPDATE', [org]),
          userProfile: {
            findUnique: async ({ where }) => (await client.query('SELECT * FROM "UserProfile" WHERE id=$1', [where.id])).rows[0],
            findFirst: async ({ where }) => (await client.query('SELECT * FROM "UserProfile" WHERE id=$1 AND "organizationId"=$2', [where.id, where.organizationId])).rows[0],
            count: async ({ where }) => Number((await client.query('SELECT count(*) FROM "UserProfile" WHERE "organizationId"=$1 AND role=$2 AND active=$3', [where.organizationId, where.role, where.active])).rows[0].count),
            update: async ({ where, data }) => (await client.query('UPDATE "UserProfile" SET role=COALESCE($2::"UserRole",role),active=COALESCE($3,active) WHERE id=$1 RETURNING *', [where.id, data.role ?? null, data.active ?? null])).rows[0],
          },
        });
        await client.query('COMMIT'); return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    } };
    const { updateOrganizationUser } = loadSource('lib/user-management.ts', {
      'server-only': {}, '@/lib/prisma': { prisma }, '@/lib/auth': { AuthError: class extends Error {} },
    });
    const outcomes = await Promise.allSettled([
      updateOrganizationUser(first, organizationId, first, { role: 'USER' }),
      updateOrganizationUser(second, organizationId, second, { active: false }),
    ]);
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    assert.match(outcomes.find(result => result.status === 'rejected').reason.message, /último ADMIN/);
    const rows = (await pool.query('SELECT * FROM "UserProfile" WHERE "organizationId"=$1', [organizationId])).rows;
    assert.equal(rows.filter(row => row.active && row.role === 'ADMIN').length, 1);
  } finally {
    await pool.query('DELETE FROM "Organization" WHERE id=$1', [organizationId]);
    await pool.end();
  }
});
