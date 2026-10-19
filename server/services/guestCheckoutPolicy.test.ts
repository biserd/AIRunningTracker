import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guestCheckoutDetails } from './guestCheckoutPolicy';

const complete = {
  status: 'complete', mode: 'subscription',
  metadata: { app: 'aitracker', guestCheckout: 'true' },
  customer: 'cus_123', subscription: 'sub_123',
  customer_details: { email: ' Runner@Example.com ' },
};

test('guest checkout uses the email collected by Stripe', () => {
  assert.deepEqual(guestCheckoutDetails(complete, 'aitracker'), {
    customerId: 'cus_123', subscriptionId: 'sub_123', email: 'runner@example.com',
  });
});

test('incomplete, unrelated and non-subscription sessions cannot be claimed', () => {
  for (const change of [
    { status: 'open' }, { mode: 'payment' },
    { metadata: { app: 'another-app', guestCheckout: 'true' } },
    { metadata: { app: 'aitracker' } },
  ]) assert.throws(() => guestCheckoutDetails({ ...complete, ...change }, 'aitracker'));
});

test('missing Stripe customer, subscription or checkout email cannot be claimed', () => {
  for (const change of [
    { customer: null }, { subscription: null },
    { customer_details: { email: null } },
    { customer_details: { email: 'not-an-email' } },
  ]) assert.throws(() => guestCheckoutDetails({ ...complete, ...change }, 'aitracker'));
});
