import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {appleAPI, appIdentifier} from './prepare-testflight-signing.mjs';

export async function waitForBuild(api, version, {attempts = 30, sleep = ms => new Promise(done => setTimeout(done, ms))} = {}) {
  if (!/^\d+$/.test(version)) throw new Error('Invalid TestFlight build number');
  const apps = await api('GET', '/v1/apps?filter%5BbundleId%5D=' + appIdentifier);
  const app = apps.data?.find(item => item.attributes?.bundleId === appIdentifier);
  if (!app) throw new Error('RunAnalytics was not found in App Store Connect');
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await api('GET', `/v1/builds?filter%5Bapp%5D=${encodeURIComponent(app.id)}&filter%5Bversion%5D=${version}&limit=200`);
    const build = response.data?.find(item => item.attributes?.version === version);
    const state = build?.attributes?.processingState;
    if (state === 'VALID') return {appID: app.id, buildID: build.id, version, state};
    if (state === 'FAILED' || state === 'INVALID') throw new Error(`TestFlight build ${version} processing failed: ${state}`);
    if (attempt + 1 < attempts) await sleep(30000);
  }
  throw new Error(`TestFlight build ${version} was uploaded, but Apple processing is still pending. Check App Store Connect before distributing.`);
}

async function main() {
  const result = await waitForBuild(appleAPI(process.env), process.env.GITHUB_RUN_NUMBER);
  const message = `TestFlight build ${result.version}: ${result.state}. App Store Connect build ID: ${result.buildID}.`;
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
