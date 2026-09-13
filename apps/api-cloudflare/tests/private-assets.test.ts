import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privateAssets } from '../container/private-assets';

test('private storage authenticates before bucket access and blocks cross-runner paths', async () => {
  let reads = 0;
  const bucket = { get: async () => { reads++; return null; }, head: async () => { reads++; return null; }, put: async () => { throw new Error('Unexpected write'); } };
  const path = 'https://example.com/objects/uploads/1/00000000-0000-4000-8000-000000000000';
  const allowed = async () => true;
  assert.equal((await privateAssets(new Request(path), bucket, async () => null, true, allowed))?.status, 401);
  assert.equal((await privateAssets(new Request(path), bucket, async () => 2, true, allowed))?.status, 404);
  assert.equal(reads, 0);
  assert.equal((await privateAssets(new Request(path), bucket, async () => 1, true, async () => false))?.status, 429);
  assert.equal(reads, 0);
  assert.equal((await privateAssets(new Request(path), bucket, async () => 1, true, allowed))?.status, 404);
  assert.equal(reads, 1);
});

test('upload setup returns a runner-owned URL without tokens and staging cannot upload', async () => {
  const bucket = { get: async () => null, head: async () => null, put: async () => { throw new Error('Unexpected write'); } };
  const create = (size = 100) => new Request('https://example.com/api/uploads/request-url', {
    method:'POST', headers:{ origin:'https://example.com','Content-Type':'application/json' },
    body:JSON.stringify({ name:'run.png',size,contentType:'image/png',userId:999 }),
  });
  assert.equal((await privateAssets(create(),bucket,async () => 1,false,async () => true))?.status,503);
  const result = await privateAssets(create(),bucket,async () => 1,true,async () => true);
  const data = await result?.json() as {uploadURL:string;objectPath:string};
  assert.match(data.objectPath,/^\/objects\/uploads\/1\/[a-f0-9-]{36}$/);
  assert.equal(new URL(data.uploadURL).search,'');
  assert.equal((await privateAssets(create(20*1024*1024),bucket,async () => 1,true,async () => true))?.status,400);
  const cross = new Request('https://example.com/api/uploads/request-url',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'});
  assert.equal((await privateAssets(cross,bucket,async () => 1,true,async () => true))?.status,403);
});
