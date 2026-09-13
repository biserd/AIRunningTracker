import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { handleApi } from '../src/http-api';

const env: Env = {
  HYPERDRIVE: { connectionString: 'unused', host: 'localhost', ip: '127.0.0.1', port: 5432, user: 'test', password: 'test', database: 'test', connect() { throw new Error('Unexpected database connection'); } },
  JWT_SIGNING_SECRET: 'independent-test-key-not-used-in-production-123',
  AUTH_LIMITER: { limit: async () => ({ success: true }) },
  READ_LIMITER: { limit: async () => ({ success: true }) },
};
let reads = 0;
const store = {
  profile: async () => { reads++; return { id: 42 }; },
  login: async () => ({ user: { id: 42, email: 'test@example.test', firstName: '', lastName: '', subscriptionPlan: 'free', subscriptionStatus: 'active' }, token: 'test' }),
  activity: async () => null,
  activities: async () => ({ items: [], nextBeforeId: null }),
};
async function authorization() {
  const token = await new SignJWT({ userId: 42, email: 'test@example.test' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(env.JWT_SIGNING_SECRET));
  return { Authorization: `Bearer ${token}` };
}

test('missing or invalid authentication never queries runner data', async () => {
  reads = 0;
  const cases: Record<string, string>[] = [{}, { Authorization: 'Bearer invalid' }, { 'X-User-Id': '42' }];
  for (const headers of cases) {
    assert.equal((await handleApi(new Request('https://staging.test/api/user', { headers }), env, store)).status, 401);
  }
  assert.equal(reads, 0);
});
test('valid session works; other-owner activity is indistinguishable from missing', async () => {
  const headers = await authorization();
  assert.equal((await handleApi(new Request('https://staging.test/api/user', { headers }), env, store)).status, 200);
  assert.equal((await handleApi(new Request('https://staging.test/api/activities/17', { headers }), env, store)).status, 404);
});
test('pagination rejects caller-supplied identities and unsupported parameters', async () => {
  const response = await handleApi(new Request('https://staging.test/api/activities?userId=7', { headers: await authorization() }), env, store);
  assert.equal(response.status, 400);
});
test('login rejects oversized or malformed JSON and cross-origin forms', async () => {
  for (const body of ['{', JSON.stringify({ email: 'test@example.test', password: 'x'.repeat(5000) })]) {
    const response = await handleApi(new Request('https://staging.test/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }), env, store);
    assert.equal(response.status, 400);
  }
  assert.equal((await handleApi(new Request('https://staging.test/api/auth/login', { method: 'POST', headers: { Origin: 'https://other.test' } }), env, store)).status, 403);
});
test('login is rate limited before credentials are read', async () => {
  const response = await handleApi(new Request('https://staging.test/api/auth/login', { method: 'POST' }), { ...env, AUTH_LIMITER: { limit: async () => ({ success: false }) } }, store);
  assert.equal(response.status, 429);
});
test('production actions remain unavailable even with a valid session', async () => {
  for (const path of ['/api/stripe/checkout', '/api/webhooks/strava', '/mcp', '/api/auth/register']) {
    assert.equal((await handleApi(new Request('https://staging.test'+path, { method: 'POST', headers: await authorization() }), env, store)).status, 503);
  }
});
test('database errors cannot leak into responses', async () => {
  const response = await handleApi(new Request('https://staging.test/api/user', { headers: await authorization() }), env, { ...store, profile: async () => { throw new Error('postgresql://private:secret@host/user'); } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'SERVICE_UNAVAILABLE' });
});
