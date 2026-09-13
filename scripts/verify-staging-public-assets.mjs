import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { publicAssetKeys } from './replit-public-assets.mjs';

const staging = 'https://aitracker-api-staging.biser-d.workers.dev';
const source = 'https://aitracker.run';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function read(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, url);
  assert.match(response.headers.get('content-type') || '', /^image\//, url);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    assert.ok(size <= 12 * 1024 * 1024, 'Unexpectedly large image');
    chunks.push(chunk);
  }
  return { response, bytes: Buffer.concat(chunks) };
}
let verified = 0;
for (const key of publicAssetKeys) {
  const path = `/public-objects/${key}`;
  const [original, migrated] = await Promise.all([read(source + path), read(staging + path)]);
  assert.equal(digest(migrated.bytes), digest(original.bytes), path);
  assert.equal(migrated.response.headers.get('x-robots-tag'), 'noindex, nofollow');
  verified++;
}
const path = '/public-objects/og/chrome-extension.jpg';
const head = await fetch(staging + path, { method: 'HEAD' });
assert.equal(head.status, 200);
assert.ok(Number(head.headers.get('content-length')) > 0);
const cached = await fetch(staging + path, { headers: { 'If-None-Match': head.headers.get('etag') } });
assert.equal(cached.status, 304);
for (const path of ['/public-objects/private/file.jpg', '/public-objects/shoes/%2e%2e%2fprivate.jpg']) {
  assert.equal((await fetch(staging + path)).status, 404);
}
console.log(JSON.stringify({ staging, verified, conditionalReads: 'pass', privatePaths: 'blocked' }));
