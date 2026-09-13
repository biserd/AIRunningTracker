import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { sessionUserId } from './sessionClaims';

test('existing sessions remain valid and purpose-specific tokens cannot become sessions', () => {
  const key = randomBytes(48).toString('hex');
  const sign = (payload: object) => jwt.sign(payload, key, { expiresIn: '7d' });
  assert.equal(sessionUserId(sign({ userId: 42, email: 'runner@example.com' }), key), 42);
  for (const purpose of ['magic-link','email-magic-link','mcp-access','upload']) {
    assert.equal(sessionUserId(sign({ userId: 42, purpose }), key), null);
  }
  for (const userId of ['42', 0, -1, 1.2]) assert.equal(sessionUserId(sign({ userId }), key), null);
  assert.equal(sessionUserId(jwt.sign({ userId:42 },key),key),null);
  assert.equal(sessionUserId(sign({ userId:42 }),randomBytes(48).toString('hex')),null);
  assert.equal(sessionUserId(jwt.sign({userId:42},key,{expiresIn:-1}),key),null);
});
