import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const port = 8794;
const child = spawn(process.execPath, ['dist/index.js'], {
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    NODE_ENV: 'production', APP_PLATFORM: 'cloudflare', APP_ENV: 'staging', APP_ROLE: 'web',
    PORT: String(port), COACH_MULTI_RUNNER_PILOT_ENABLED: 'false',
    DATABASE_URL: 'postgresql://test:test@127.0.0.1:6543/test',
    JWT_SIGNING_SECRET: randomBytes(48).toString('hex'),
    EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2: randomBytes(48).toString('hex'),
    OPENAI_API_KEY: 'disabled-in-migration-staging',
  },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let output = '';
child.stdout.on('data', data => { output = (output + data).slice(-20000); });
child.stderr.on('data', data => { output = (output + data).slice(-20000); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) })).ok;
    } catch {}
    if (ready) break;
    await delay(1000);
  }
  assert.ok(ready, `Startup did not complete: ${output}`);
  for (const path of ['/auth', '/tools/race-predictor']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.match(await response.text(), /<html/);
  }
  const blocked = await fetch(`http://127.0.0.1:${port}/api/stripe/webhook/test`, { method: 'POST' });
  assert.equal(blocked.status, 503);
  assert.doesNotMatch(output, /Starting job processor|Starting drip|Stripe sync initialized/);
  console.log('PASS: full app starts without Replit, public pages render, staging callbacks and job processing are disabled.');
} finally {
  child.kill();
}
