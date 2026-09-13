import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { migrationReadiness } from '../container/readiness';

test('migration readiness requires a verified session and current database admin authorization', async () => {
  const signingSecret = 'test-only-secret-'.repeat(3);
  let reads = 0;
  let providerCalls = 0;
  const deps = { signingSecret, limit: async () => true, inspect: async () => { reads++; throw new Error('FORBIDDEN'); }, providers: async () => { providerCalls++; return []; } };
  const url = 'https://staging.test/api/admin/migration/readiness';
  assert.equal((await migrationReadiness(new Request(url), deps))?.status, 401);
  assert.equal(reads, 0);
  const token = await new SignJWT({ userId: 1, email: 'test@example.test' }).setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(signingSecret));
  const request = () => new Request(url, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await migrationReadiness(request(), deps))?.status, 403);
  assert.equal(providerCalls, 0);
  const response = await migrationReadiness(request(), { ...deps, inspect: async () => ({ queueTable: false, pushKeys: true, campaignsEnabled: false }) });
  assert.equal(response?.headers.get('cache-control'), 'no-store');
  assert.equal((await response?.json() as { cutoverReady: boolean }).cutoverReady, false);
  assert.equal((await migrationReadiness(request(), { ...deps, limit: async () => false }))?.status, 429);
  const failed = await migrationReadiness(request(), { ...deps, inspect: async () => { throw new Error('secret database password'); } });
  assert.equal(failed?.status, 503);
  assert.ok(!(await failed!.text()).includes('password'));
});

test('controlled email test requires POST, same origin, session and fresh admin access', async () => {
  let sent=0;
  const origin='https://aitracker-api-staging.biser-d.workers.dev';
  const deps={signingSecret:'test-only-secret-'.repeat(3),limit:async()=>true,
    inspect:async()=>{throw new Error('FORBIDDEN');},testEmail:async()=>{sent++;return true;}};
  const url=origin+'/api/admin/migration/test-email';
  assert.equal((await migrationReadiness(new Request(url),deps))?.status,405);
  assert.equal((await migrationReadiness(new Request(url,{method:'POST'}),deps))?.status,403);
  assert.equal((await migrationReadiness(new Request(url,{method:'POST',headers:{origin}}),deps))?.status,401);
  const token=await new SignJWT({userId:1,email:'test@example.test'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(deps.signingSecret));
  assert.equal((await migrationReadiness(new Request(url,{method:'POST',headers:{origin,authorization:`Bearer ${token}`}}),deps))?.status,403);
  assert.equal(sent,0);
});
