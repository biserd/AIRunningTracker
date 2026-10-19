import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './authCore';
import type { AuthStore } from './authStore';

const auth = new AuthService({} as AuthStore, 'guest-checkout-test-secret-with-at-least-32-characters');

test('an emailed-link redemption can mint a short-lived claim proof', () => {
  const proof = auth.generateCheckoutClaimProof({ id: 42, email: 'Runner@Example.com' });
  assert.ok(proof);
  assert.deepEqual(auth.verifyCheckoutClaimProof(proof), { userId: 42, email: 'runner@example.com' });
});

test('a normal session token or missing email is not a checkout claim proof', () => {
  assert.equal(auth.generateCheckoutClaimProof({ id: 42, email: null }), null);
  assert.equal(auth.verifyCheckoutClaimProof('invalid-token'), null);
  const session = auth.generateToken({ id: 42, email: 'runner@example.com' } as Parameters<typeof auth.generateToken>[0]);
  assert.equal(auth.verifyCheckoutClaimProof(session), null);
});
