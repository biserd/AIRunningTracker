import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripeDatabaseConfig } from './stripeDatabase';

test('Cloudflare Stripe pool requires verified TLS even when the URL has no SSL option', () => {
  for (const suffix of ['', '?sslmode=disable', '?sslmode=require', '?sslcert=x&sslkey=y&sslrootcert=z']) {
    const config = stripeDatabaseConfig(`postgresql://test:test@db.example/test${suffix}`, true);
    assert.deepEqual(config.ssl, {rejectUnauthorized:true});
    assert.equal(new URL(config.connectionString!).search, '');
    assert.equal(config.max, 2);
    assert.equal(config.connectionTimeoutMillis, 10_000);
  }
});
test('non-Cloudflare Stripe connection behavior stays unchanged', () => {
  const connectionString = 'postgresql://test:test@localhost/test';
  assert.deepEqual(stripeDatabaseConfig(connectionString, false), {connectionString,max:2});
});
