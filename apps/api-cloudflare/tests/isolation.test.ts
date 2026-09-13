import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index';

test('health is liveness only, not a claim of migration readiness', async () => {
  const response = await worker.fetch(new Request('https://staging.example/health'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', environment: 'staging', migrationReady: false });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(await (await worker.fetch(new Request('https://staging.example/health', { method: 'HEAD' }))).text(), '');
});

test('private APIs and webhooks fail closed without reflecting secrets', async () => {
  for (const path of ['/api/user', '/api/activities', '/api/stripe/webhook/test', '/api/webhooks/strava', '/mcp', '/']) {
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const response = await worker.fetch(new Request(`https://staging.example${path}?token=private`, { method, headers: { Authorization: 'Bearer private' } }));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
      assert.ok(!(await response.text()).includes('private'));
    }
  }
});

test('staging configuration permits only the explicitly approved Neon binding', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.name, 'aitracker-api-staging');
  assert.deepEqual(config.routes, []);
  assert.deepEqual(config.hyperdrive, [
    { binding: 'HYPERDRIVE', id: 'a75ea8f13ccd4939bb0178b798e1ffc8' },
  ]);
  assert.doesNotMatch(JSON.stringify(config), /postgres(?:ql)?:\/\//);
  for (const key of ['d1_databases', 'send_email', 'queues', 'triggers', 'services', 'assets', 'vars']) {
    assert.equal(config[key], undefined, `${key} requires an explicit reviewed staging integration`);
  }
  const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"].*server\//);
  assert.deepEqual(config.secrets.required, ['JWT_SIGNING_SECRET']);
  assert.equal(config.ratelimits.length, 2);
});
