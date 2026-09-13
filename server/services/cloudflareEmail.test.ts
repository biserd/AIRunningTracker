import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareEmailTransport } from './cloudflareEmail';

const config = { accountId: 'a'.repeat(32), token: 'test-only-token', from: 'RunAnalytics <hello@aitracker.run>' };
const email = { to: 'runner@example.com', subject: 'Your run', html: '<p>Your run</p>', text: 'Your run',
  headers: { 'List-Unsubscribe': '<https://aitracker.run/api/marketing/unsubscribe?token=test>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };

test('preserves sender, HTML, text and unsubscribe headers', async () => {
  const transport = new CloudflareEmailTransport(config, async (url, init) => {
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/email/sending/send`);
    assert.deepEqual(JSON.parse(String(init?.body)), { ...email, from: { address: 'hello@aitracker.run', name: 'RunAnalytics' } });
    return Response.json({ success: true, result: { queued: [email.to] } });
  });
  assert.deepEqual(await transport.send(email), { success: true });
});
test('permanent bounce and empty acceptance fail closed', async () => {
  for (const result of [{ permanent_bounces: [email.to] }, {}, { delivered: ['another@example.com'] }]) {
    const transport = new CloudflareEmailTransport(config, async () => Response.json({ success: true, result }));
    assert.equal((await transport.send(email)).success, false);
  }
});
test('only explicit rate limits are retried', async () => {
  let calls = 0;
  const transport = new CloudflareEmailTransport(config, async () => {
    calls++;
    return calls === 1 ? new Response('', { status: 429 }) : Response.json({ success: true, result: { delivered: [email.to] } });
  }, async () => {});
  assert.equal((await transport.send(email)).success, true);
  assert.equal(calls, 2);
});
test('uncertain network outcomes are not retried or leaked', async () => {
  let calls = 0;
  const transport = new CloudflareEmailTransport(config, async () => { calls++; throw new Error(config.token); });
  assert.deepEqual(await transport.send(email), { success: false, error: 'cloudflare_email_outcome_unknown' });
  assert.equal(calls, 1);
});
test('missing credentials never falls back to Resend', async () => {
  const transport = new CloudflareEmailTransport({ from: config.from }, async () => { throw new Error('must not send'); });
  assert.equal(transport.isConfigured(), false);
  assert.equal((await transport.send(email)).error, 'cloudflare_email_not_configured');
});
