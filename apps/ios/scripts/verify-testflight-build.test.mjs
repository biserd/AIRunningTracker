import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmUploadReceipt, waitForBuild} from './verify-testflight-build.mjs';

const app = {data: [{id: 'app-1', attributes: {bundleId: 'run.aitracker.coach'}}]};
const train = (id, version, platform = 'IOS') => ({id, type: 'preReleaseVersions', attributes: {version, platform}});
const build = (id, trainID, state) => ({
  id, attributes: {version: '43', processingState: state},
  relationships: {preReleaseVersion: {data: {id: trainID, type: 'preReleaseVersions'}}},
});
test('waits for the exact iOS marketing version and build to finish processing', async () => {
  let reads = 0, waits = 0;
  const api = async (_, path) => {
    if (path.startsWith('/v1/apps?')) return app;
    assert.match(path, /filter%5Bapp%5D=app-1&filter%5Bversion%5D=43&include=preReleaseVersion/);
    reads++;
    const data = [build('wrong-version', 'old', 'VALID'), build('wrong-platform', 'mac', 'VALID')];
    if (reads > 1) data.push(build('build-43', 'ios', reads === 2 ? 'PROCESSING' : 'VALID'));
    return {data, included: [train('old', '1.0'), train('mac', '1.1', 'MAC_OS'), train('ios', '1.1')]};
  };
  assert.deepEqual(await waitForBuild(api, '43', '1.1', {sleep: async () => { waits++; }}), {
    appID: 'app-1', buildID: 'build-43', version: '43', marketingVersion: '1.1', state: 'VALID',
  });
  assert.equal(waits, 2);
});
test('fails on rejected builds and does not call them ready', async () => {
  const api = async (_, path) => path.startsWith('/v1/apps?') ? app : {
    data: [build('bad', 'ios', 'INVALID')], included: [train('ios', '1.1')],
  };
  await assert.rejects(waitForBuild(api, '43', '1.1'), /processing failed: INVALID/);
});
test('does not claim upload or processing success when Apple has no build', async () => {
  const api = async (_, path) => path.startsWith('/v1/apps?') ? app : {data: []};
  await assert.rejects(waitForBuild(api, '43', '1.1', {attempts: 1}), /Could not verify TestFlight 1.1 \(43\) as processed/);
});
test('requires Apple’s successful upload receipt even if altool exited zero', () => {
  const success = 'UPLOAD SUCCEEDED with no errors\nDelivery UUID: 76111388-62c9-4b47-9fc7-9ddd47ee5c60\n';
  assert.doesNotThrow(() => confirmUploadReceipt(success));
  assert.throws(() => confirmUploadReceipt('UPLOAD FAILED with 2 errors\nValidation failed (409) Invalid Pre-Release Train'), /Apple rejected/);
  assert.throws(() => confirmUploadReceipt(success + 'Failed to upload package.'), /Apple rejected/);
  assert.throws(() => confirmUploadReceipt('Transporter finished without a receipt'), /did not return/);
});
