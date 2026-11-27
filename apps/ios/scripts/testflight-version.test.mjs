import test from 'node:test';
import assert from 'node:assert/strict';
import {assertUploadableVersion, compareMarketingVersions, configuredMarketingVersion, readIOSVersions} from './testflight-version.mjs';

test('reads exactly one numeric marketing version, independently of the build number', () => {
  assert.equal(configuredMarketingVersion("settings:\r\n    CURRENT_PROJECT_VERSION: 43\r\n    MARKETING_VERSION: '1.1'\r\n"), '1.1');
  assert.throws(() => configuredMarketingVersion('MARKETING_VERSION: 1.0\nMARKETING_VERSION: 1.1'));
  assert.throws(() => configuredMarketingVersion('MARKETING_VERSION: next'));
  assert.equal(compareMarketingVersions('1.10', '1.2'), 1);
  assert.equal(compareMarketingVersions('1.0.0', '1.0'), 0);
});

test('App Store Connect version inventory is read-only and distinguishes stores from beta trains', async () => {
  const api = async (method, path) => {
    assert.equal(method, 'GET');
    if (path.startsWith('/v1/apps?')) return {data: [{id: 'app-1', attributes: {bundleId: 'run.aitracker.coach'}}]};
    if (path.includes('/appStoreVersions')) return {data: [
      {attributes: {platform: 'IOS', versionString: '1.0', appVersionState: 'READY_FOR_DISTRIBUTION'}},
      {attributes: {platform: 'IOS', versionString: '1.1', appStoreState: 'PREPARE_FOR_SUBMISSION'}},
      {attributes: {platform: 'MAC_OS', versionString: '3.0', appStoreState: 'READY_FOR_SALE'}},
    ]};
    assert.match(path, /\/preReleaseVersions\?/);
    return {data: [{attributes: {platform: 'IOS', version: '1.0'}}]};
  };
  const report = await readIOSVersions(api);
  assert.deepEqual(report, {appStore: [
    {version: '1.1', states: ['PREPARE_FOR_SUBMISSION']}, {version: '1.0', states: ['READY_FOR_DISTRIBUTION']},
  ], testFlight: ['1.0']});
  assert.throws(() => assertUploadableVersion('1.0.0', report), /must be higher than Apple-approved iOS version 1.0/);
  assert.doesNotThrow(() => assertUploadableVersion('1.1', report));
});
