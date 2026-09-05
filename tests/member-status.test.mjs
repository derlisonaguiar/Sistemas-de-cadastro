import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) throw new Error('Unexpected dependency: ' + name);
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const api = load('lib/api.ts');
const { z } = require('zod');
function setup({ denied = false, found = true, valid = true, failure = false } = {}) {
  const writes = [], passwords = [], lookups = [];
  const route = load('app/api/members/[id]/route.ts', {
    '@/lib/api': api,
    '@/lib/validation': { routeIdSchema: z.object({ id: z.string().regex(/^[a-z0-9-]+$/) }) },
    '@/lib/auth': { getAdminApiContext: async () => denied ? { response: Response.json({ ok: false }, { status: 403 }) } : { auth: { user: { id: 'admin', email: 'admin@example.com' }, profile: { organizationId: 'org' } } } },
    '@/lib/prisma': { prisma: { member: { findFirst: async (args) => { lookups.push(args); return found ? { id: 'member' } : null; } } } },
    '@/lib/admin-password': { verifyAdminPassword: async (...args) => { passwords.push(args); return valid; } },
    '@/lib/member-update': { updateMember: async (args) => { writes.push(args); if (failure) throw { code: 'P2004' }; return { id: 'member', status: args.data.status, directorate: null, position: null }; } },
  });
  const ip = Math.random().toString();
  return { writes, passwords, lookups, call: (body = { status: 'POS_JR', password: 'test-only' }) => route.PATCH(new Request('https://example.com/api/members/member', { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: 'member' }) }) };
}
test('ADMIN status update scopes read and atomic write to profile organization, writes only status', async () => {
  const h = setup(); assert.equal((await h.call()).status, 200);
  assert.deepEqual(h.lookups[0].where, { id: 'member', organizationId: 'org' });
  assert.deepEqual(h.writes, [{ where: { id: 'member', organizationId: 'org' }, data: { status: 'POS_JR' } }]);
  assert.equal(h.passwords[0][0].id, 'admin');
});
test('non ADMIN, foreign member and wrong password never write', async () => {
  for (const [options, status] of [[{ denied: true }, 403], [{ found: false }, 404], [{ valid: false }, 401]]) {
    const h = setup(options); const r = await h.call(); assert.equal(r.status, status); assert.equal(h.writes.length, 0);
    if (status === 401) assert.deepEqual(await r.json(), { ok: false, message: 'Não foi possível confirmar a alteração.' });
  }
});
test('reject invalid status, missing password and injected organization', async () => {
  for (const body of [{ status: 'INVALID', password: 'x' }, { status: 'ACTIVE' }, { status: 'ACTIVE', password: 'x', organizationId: 'foreign' }]) {
    const h = setup(); assert.equal((await h.call(body)).status, 400); assert.equal(h.writes.length, 0); assert.equal(h.passwords.length, 0);
  }
});
test('rate limit blocks sixth password attempt', async () => {
  const h = setup({ valid: false }); for (let i = 0; i < 5; i++) assert.equal((await h.call()).status, 401);
  assert.equal((await h.call()).status, 429); assert.equal(h.passwords.length, 5);
});
test('existing database business-rule conflict returns generic conflict', async () => {
  const h = setup({ failure: true }); assert.equal((await h.call()).status, 409);
});
test('Supabase verifies authenticated user identity without persisting session or exposing errors', async () => {
  for (const outcome of ['success', 'wrong-user', 'error', 'throw']) {
    let options;
    const { verifyAdminPassword } = load('lib/admin-password.ts', {
      '@supabase/supabase-js': { createClient: (_url, _key, config) => { options = config; return { auth: { signInWithPassword: async (credentials) => {
        assert.deepEqual(credentials, { email: 'admin@example.com', password: 'test-only' });
        if (outcome === 'throw') throw new Error('private auth details');
        return { data: { user: { id: outcome === 'wrong-user' ? 'other' : 'admin' } }, error: outcome === 'error' ? { message: 'private auth details' } : null };
      } } }; } },
    });
    assert.equal(await verifyAdminPassword({ id: 'admin', email: 'admin@example.com' }, 'test-only'), outcome === 'success');
    assert.deepEqual(options.auth, { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  }
});
test('existing proxy rejects cross-origin PATCH', async () => {
  const { proxy } = load('proxy.ts', { '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) } }) } });
  const { NextRequest } = require('next/server');
  const response = await proxy(new NextRequest('https://example.com/api/members/member', { method: 'PATCH', headers: { host: 'example.com', origin: 'https://foreign.example' } }));
  assert.equal(response.status, 403);
});

