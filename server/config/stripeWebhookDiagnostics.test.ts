import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripeWebhookFailure } from './stripeWebhookDiagnostics';

test('webhook diagnostics expose only bounded classifications', () => {
  assert.equal(stripeWebhookFailure(new Error('No managed webhook found with UUID: private')), 'managed_webhook_missing');
  assert.equal(stripeWebhookFailure(new Error('No signatures found matching secret payload')), 'signature_rejected');
  assert.equal(stripeWebhookFailure(new Error('connection is insecure (try using sslmode=require)')), 'database_tls');
  assert.equal(stripeWebhookFailure(Object.assign(new Error('private query'), {code:'42P01'})), 'database_42P01');
  assert.equal(stripeWebhookFailure(new Error('private provider details sk_live_secret')), 'processing_failed');
  assert.equal(stripeWebhookFailure({code:'private-secret'}), 'processing_failed');
});
