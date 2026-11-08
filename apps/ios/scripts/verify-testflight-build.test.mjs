import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForBuild} from './verify-testflight-build.mjs';

const app = {data: [{id: 'app-1', attributes: {bundleId: 'run.aitracker.coach'}}]};
test('waits for the exact uploaded build to finish processing', async () => {
  let reads = 0, waits = 0;
  const api = async (_, path) => {
    if (path.startsWith('/v1/apps?')) return app;
    assert.match(path, /filter%5Bapp%5D=app-1&filter%5Bversion%5D=42/);
    reads++;
    return {data: reads === 1 ? [] : [{id: 'build-42', attributes: {version: '42', processingState: reads === 2 ? 'PROCESSING' : 'VALID'}}]};
  };
  assert.deepEqual(await waitForBuild(api, '42', {sleep: async () => { waits++; }}), {appID: 'app-1', buildID: 'build-42', version: '42', state: 'VALID'});
  assert.equal(waits, 2);
});
test('fails on rejected builds and does not call them ready', async () => {
  const api = async (_, path) => path.startsWith('/v1/apps?') ? app : {data: [{id: 'bad', attributes: {version: '42', processingState: 'INVALID'}}]};
  await assert.rejects(waitForBuild(api, '42'), /processing failed: INVALID/);
});
test('reports processing pending when the build does not appear', async () => {
  const api = async (_, path) => path.startsWith('/v1/apps?') ? app : {data: []};
  await assert.rejects(waitForBuild(api, '42', {attempts: 1}), /uploaded, but Apple processing is still pending/);
});
