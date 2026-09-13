import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servePublicAsset } from '../container/public-assets';

const metadata = {
  key: 'public/shoes/example.jpg', version: '1', size: 3, etag: 'abc', httpEtag: '"abc"',
  uploaded: new Date(), httpMetadata: { contentType: 'image/jpeg' },
  customMetadata: { internal: 'must not be exposed' }, storageClass: 'Standard', checksums: { toJSON: () => ({}) },
  writeHttpMetadata(headers: Headers) { headers.set('Content-Type', 'image/jpeg'); },
};
function fakeBucket() {
  const reads: string[] = [];
  return {
    reads,
    async head(key: string) { reads.push(key); return metadata; },
    async get(key: string) {
      reads.push(key);
      const response = new Response('abc');
      return { ...metadata, body: response.body!, bodyUsed: false,
        arrayBuffer: () => response.arrayBuffer(), bytes: async () => new Uint8Array(await response.arrayBuffer()), text: () => response.text(),
        json: <T>() => response.json() as Promise<T>, blob: () => response.blob() };
    },
  };
}
test('public image reads stream content and keep metadata private', async () => {
  const bucket = fakeBucket();
  const response = await servePublicAsset(new Request('https://example.com/public-objects/shoes/example.jpg'), bucket);
  assert.equal(response?.status, 200);
  assert.equal(await response?.text(), 'abc');
  assert.equal(response?.headers.get('content-type'), 'image/jpeg');
  assert.equal(response?.headers.get('internal'), null);
  assert.deepEqual(bucket.reads, ['public/shoes/example.jpg']);
});
test('HEAD, conditional reads and missing objects have predictable responses', async () => {
  const head = await servePublicAsset(new Request('https://example.com/public-objects/og/example.jpg', { method: 'HEAD' }), fakeBucket());
  assert.equal(await head?.text(), '');
  assert.equal(head?.headers.get('content-length'), '3');
  const cached = await servePublicAsset(new Request('https://example.com/public-objects/og/example.jpg', { headers: { 'If-None-Match': 'W/"abc"' } }), fakeBucket());
  assert.equal(cached?.status, 304);
  const missing = await servePublicAsset(new Request('https://example.com/public-objects/og/missing.jpg'), { get: async () => null, head: async () => null });
  assert.equal(missing?.status, 404);
});
test('private keys, encoded traversal and mutations never query the bucket', async () => {
  const bucket = fakeBucket();
  for (const path of ['private/file.jpg', 'shoes/%2e%2e%2fprivate.jpg', 'og/file.html', 'shoes/nested/file.jpg']) {
    assert.equal((await servePublicAsset(new Request(`https://example.com/public-objects/${path}`), bucket))?.status, 404);
  }
  assert.equal((await servePublicAsset(new Request('https://example.com/public-objects/shoes/a.jpg', { method: 'PUT' }), bucket))?.status, 405);
  assert.equal(await servePublicAsset(new Request('https://example.com/objects/uploads/private'), bucket), null);
  assert.deepEqual(bucket.reads, []);
});
