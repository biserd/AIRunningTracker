import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { publicAssetKeys } from './replit-public-assets.mjs';

const account = '73d71a2bef58f7469ecb48e2b8e84c0e';
const bucket = 'aitracker-main-assets';
const source = 'https://aitracker.run/public-objects/';
const maxBytes = 12 * 1024 * 1024;
const apply = process.argv.includes('--apply');
assert.equal(publicAssetKeys.length, 91);
assert.equal(new Set(publicAssetKeys).size, 91);
const { token } = JSON.parse(execFileSync(process.execPath, [
  'apps/api-cloudflare/node_modules/wrangler/bin/wrangler.js', 'auth', 'token', '--json',
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }));
assert.ok(token, 'Wrangler authentication is required');
const digest = b => createHash('sha256').update(b).digest('hex');
async function bounded(response) {
  if (!response.body) throw new Error('Missing body');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Object exceeds migration limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
let verified = 0; let totalBytes = 0;
for (const key of publicAssetKeys) {
  assert.match(key, /^(shoes|og)\/[a-z0-9-]+\.(jpg|webp|png|avif)$/);
  const src = await fetch(source + key, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!src.ok) throw new Error(`Source ${key}: HTTP ${src.status}`);
  const contentType = src.headers.get('content-type') || '';
  assert.match(contentType, /^image\//, `${key} is not an image`);
  const bytes = await bounded(src);
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/public/${key}`;
  const headers = { Authorization: `Bearer ${token}` };
  let target = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (target.status === 404 && apply) {
    await target.body?.cancel();
    const put = await fetch(url, { method: 'PUT', body: bytes,
      headers: { ...headers, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
      signal: AbortSignal.timeout(30000) });
    if (!put.ok) throw new Error(`Upload ${key}: HTTP ${put.status}`);
    await put.body?.cancel();
    target = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  }
  if (!target.ok) throw new Error(`Destination ${key}: HTTP ${target.status}. Use --apply for missing objects.`);
  assert.equal(digest(await bounded(target)), digest(bytes), `Checksum mismatch: ${key}; existing objects are never overwritten`);
  verified++; totalBytes += bytes.length;
  console.log(JSON.stringify({ key, sha256: digest(bytes), bytes: bytes.length, verified }));
}
console.log(JSON.stringify({ verified, totalBytes, bucket, sourceUnchanged: true }));
