import assert from 'node:assert/strict';
const origin = process.env.TEST_BASE_URL || 'http://localhost:3000';
for (const [path, init, status] of [
  ['/admin', {}, 307],
  ['/api/documents', {}, 401],
  ['/uploads/test.pdf', {}, 404],
  ['/api/documents/test/signed', { method: 'POST', headers: { origin } }, 401],
  ['/api/auth/login', { method: 'POST', headers: { origin: 'https://invalid.example', 'content-type': 'application/json' }, body: '{}' }, 403],
  ['/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, 403],
  ['/api/health/db', {}, 200],
]) {
  const response = await fetch(origin + path, { ...init, redirect: 'manual' });
  assert.equal(response.status, status, path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  if (path === '/admin') assert.equal(new URL(response.headers.get('location'), origin).pathname, '/login');
  console.log('PASS', init.method || 'GET', path, response.status);
}
for (let i = 0; i < 6; i++) {
  const response = await fetch(origin + '/api/auth/login', {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.123' }, body: '{}',
  });
  assert.equal(response.status, i < 5 ? 400 : 429);
}
console.log('PASS login rate limit 429 (invalid payloads; no real login attempted)');
