import {appendFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {appleAPI} from './prepare-testflight-signing.mjs';
import {compareMarketingVersions, findAppID} from './testflight-version.mjs';

export function confirmUploadReceipt(log) {
  if (/\bUPLOAD FAILED\b|\bFailed to upload package\.|\bValidation failed \(\d+\)|\bERROR: \[altool\b/i.test(log)) {
    throw new Error('Apple rejected the TestFlight upload; see the preceding altool errors');
  }
  if (!/^UPLOAD SUCCEEDED with no errors[ \t\r]*$/m.test(log) ||
      !/^Delivery UUID: [\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}[ \t\r]*$/im.test(log)) {
    throw new Error('altool did not return an Apple upload success receipt; check App Store Connect before retrying');
  }
}

export async function waitForBuild(api, version, marketingVersion, {attempts = 30, sleep = ms => new Promise(done => setTimeout(done, ms))} = {}) {
  if (!/^\d+$/.test(version)) throw new Error('Invalid TestFlight build number');
  compareMarketingVersions(marketingVersion, marketingVersion);
  const appID = await findAppID(api);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await api('GET', `/v1/builds?filter%5Bapp%5D=${encodeURIComponent(appID)}&filter%5Bversion%5D=${version}&include=preReleaseVersion&limit=200`);
    const trains = new Set(response.included?.filter(item => item.type === 'preReleaseVersions' &&
      item.attributes?.platform === 'IOS' && item.attributes.version === marketingVersion).map(item => item.id));
    const build = response.data?.find(item => item.attributes?.version === version &&
      trains.has(item.relationships?.preReleaseVersion?.data?.id));
    const state = build?.attributes?.processingState;
    if (state === 'VALID') return {appID, buildID: build.id, version, marketingVersion, state};
    if (state === 'FAILED' || state === 'INVALID') throw new Error(`TestFlight ${marketingVersion} (${version}) processing failed: ${state}`);
    if (attempt + 1 < attempts) await sleep(30000);
  }
  throw new Error(`Could not verify TestFlight ${marketingVersion} (${version}) as processed. Check App Store Connect before retrying or distributing.`);
}

async function main() {
  if (process.argv[2] === '--receipt') {
    confirmUploadReceipt(readFileSync(process.argv[3], 'utf8'));
    return;
  }
  const result = await waitForBuild(appleAPI(process.env), process.env.GITHUB_RUN_NUMBER, process.env.EXPECTED_MARKETING_VERSION);
  const message = `TestFlight ${result.marketingVersion} (${result.version}): ${result.state}. App Store Connect build ID: ${result.buildID}.`;
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
