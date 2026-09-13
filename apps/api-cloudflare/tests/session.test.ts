import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { verifyRunnerSession } from '../src/session';

const secret = 'test-only-independent-session-secret-123456789';
async function token(payload = {}, key = secret, expiry = '1h') {
  return new SignJWT({ userId: 42, email: 'runner@example.test', ...payload })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(expiry)
    .sign(new TextEncoder().encode(key));
}

test('accepts legacy application session claims and freezes identity', async () => {
  const session = await verifyRunnerSession(await token(), secret);
  assert.equal(session.userId, 42);
  assert.ok(Object.isFrozen(session));
});

test('rejects other token purposes, invalid identities and signatures', async () => {
  for (const claims of [{ purpose: 'magic-link' }, { purpose: 'email-magic-link' },
    { scope: 'mcp:profile.read' }, { userId: '42' }, { userId: -1 }, { userId: 1.5 }, { email: null }]) {
    await assert.rejects(verifyRunnerSession(await token(claims), secret), /UNAUTHORIZED/);
  }
  await assert.rejects(verifyRunnerSession(await token({}, secret, '-1s'), secret), /UNAUTHORIZED/);
  await assert.rejects(verifyRunnerSession(await token({}, 'other-test-secret-of-sufficient-length'), secret), /UNAUTHORIZED/);
  await assert.rejects(verifyRunnerSession('malformed', secret), /UNAUTHORIZED/);
  await assert.rejects(verifyRunnerSession(await token(), 'short'), /UNAUTHORIZED/);
});
