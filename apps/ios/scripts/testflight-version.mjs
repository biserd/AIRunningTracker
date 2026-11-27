import {appendFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {appleAPI, appIdentifier} from './prepare-testflight-signing.mjs';

const versionPattern = /^\d{1,9}\.\d{1,9}(?:\.\d{1,9})?$/;
const closed = new Set([
  'ACCEPTED', 'APPROVED', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE',
  'PROCESSING_FOR_APP_STORE', 'READY_FOR_SALE', 'READY_FOR_DISTRIBUTION',
  'PREORDER_READY_FOR_SALE', 'DEVELOPER_REMOVED_FROM_SALE', 'REMOVED_FROM_SALE', 'REPLACED_WITH_NEW_VERSION',
]);

export function compareMarketingVersions(a, b) {
  if (![a, b].every(version => typeof version === 'string' && versionPattern.test(version))) {
    throw new Error('Invalid iOS marketing version');
  }
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0);
    if (delta) return Math.sign(delta);
  }
  return 0;
}

export function configuredMarketingVersion(project) {
  const values = [...project.matchAll(/^\s*MARKETING_VERSION:[ \t]*['"]?(\d+(?:\.\d+){1,2})['"]?[ \t]*\r?$/gm)];
  if (values.length !== 1 || !versionPattern.test(values[0][1])) {
    throw new Error('Expected one explicit MARKETING_VERSION in apps/ios/project.yml');
  }
  return values[0][1];
}

export async function findAppID(api) {
  const apps = await api('GET', '/v1/apps?filter%5BbundleId%5D=' + encodeURIComponent(appIdentifier));
  const app = apps.data?.find(item => item.attributes?.bundleId === appIdentifier);
  if (!app?.id) throw new Error('Run Analytics was not found in App Store Connect');
  return app.id;
}

export async function readIOSVersions(api) {
  const appID = await findAppID(api);
  const base = `/v1/apps/${encodeURIComponent(appID)}`;
  const [store, beta] = await Promise.all([
    api('GET', base + '/appStoreVersions?filter%5Bplatform%5D=IOS&limit=200'),
    api('GET', base + '/preReleaseVersions?limit=200'),
  ]);
  if (![store, beta].every(report => Array.isArray(report.data) && !report.links?.next)) {
    throw new Error('Could not confirm the complete iOS version list in App Store Connect');
  }
  const appStore = store.data.map(record => record.attributes).filter(item => item?.platform === 'IOS')
    .map(item => ({version: item.versionString, states: [item.appVersionState, item.appStoreState].filter(Boolean)}))
    .sort((a, b) => compareMarketingVersions(b.version, a.version));
  const testFlight = beta.data.map(record => record.attributes).filter(item => item?.platform === 'IOS')
    .map(item => item.version).sort((a, b) => compareMarketingVersions(b, a));
  if (appStore.some(row => !versionPattern.test(row.version) || !row.states.length) ||
      testFlight.some(version => !versionPattern.test(version))) {
    throw new Error('Unexpected iOS version information from App Store Connect');
  }
  return {appStore, testFlight};
}

export function assertUploadableVersion(version, {appStore}) {
  const closedVersion = appStore.find(row => row.states.some(state => closed.has(state)) &&
    compareMarketingVersions(version, row.version) <= 0);
  if (closedVersion) {
    throw new Error(`MARKETING_VERSION ${version} must be higher than Apple-approved iOS version ${closedVersion.version}; incrementing the build alone will not work`);
  }
}

async function main() {
  const version = configuredMarketingVersion(readFileSync(new URL('../project.yml', import.meta.url), 'utf8'));
  const versions = await readIOSVersions(appleAPI(process.env));
  const report = JSON.stringify({configured: version, ...versions}, null, 2);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```json\n' + report + '\n```\n');
  if (process.env.VERSION_AUDIT_ONLY === 'true') return;
  assertUploadableVersion(version, versions);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `marketing_version=${version}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
