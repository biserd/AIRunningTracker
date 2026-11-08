// Runs only on the trusted TestFlight runner. Private keys and profiles never enter artifacts/logs.
import {sign, X509Certificate} from 'node:crypto';
import {readFileSync, writeFileSync, appendFileSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

export const appIdentifier = 'run.aitracker.coach';
export const widgetIdentifier = appIdentifier + '.runwidget';
const serialKey = value => String(value).replace(/^0+/, '').toUpperCase();

export function appleToken(env, now = Math.floor(Date.now() / 1000)) {
  for (const key of ['APP_STORE_CONNECT_KEY_ID', 'APP_STORE_CONNECT_ISSUER_ID', 'APP_STORE_CONNECT_PRIVATE_KEY']) {
    if (!env[key]) throw new Error('Missing signing configuration: ' + key);
  }
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const message = encode({alg: 'ES256', kid: env.APP_STORE_CONNECT_KEY_ID, typ: 'JWT'}) + '.' +
    encode({iss: env.APP_STORE_CONNECT_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1'});
  return message + '.' + sign('sha256', Buffer.from(message), {key: env.APP_STORE_CONNECT_PRIVATE_KEY, dsaEncoding: 'ieee-p1363'}).toString('base64url');
}

export function appleAPI(env, request = fetch) {
  return async (method, path, body) => {
    if (!path.startsWith('/v1/') || path.includes('://')) throw new Error('Invalid Apple API path');
    const response = await request('https://api.appstoreconnect.apple.com' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: {Authorization: 'Bearer ' + appleToken(env), 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      // Apple error details can include request content. Print status/code only.
      const error = await response.json().catch(() => ({}));
      throw new Error(`Apple signing request ${method} ${path.split('?')[0]} failed: HTTP ${response.status} (${error.errors?.[0]?.code || 'UNKNOWN'}).`);
    }
    return response.json();
  };
}

export async function createProfiles(api, serial, release, now = Date.now()) {
  if (!/^[\w-]{1,100}$/.test(release)) throw new Error('Invalid release identifier');
  const certificateResponse = await api('GET', '/v1/certificates?filter%5BserialNumber%5D=' + encodeURIComponent(serial) + '&limit=200');
  const certificate = certificateResponse.data?.find(item => serialKey(item.attributes?.serialNumber) === serialKey(serial) &&
    ['DISTRIBUTION', 'IOS_DISTRIBUTION'].includes(item.attributes?.certificateType) && Date.parse(item.attributes.expirationDate) > now + 3600000);
  if (!certificate) throw new Error('The installed Apple Distribution certificate is missing or expired. No signing profiles were changed.');

  const bundles = await api('GET', '/v1/bundleIds?filter%5Bidentifier%5D=' + appIdentifier + '&limit=200');
  const app = bundles.data?.find(item => item.attributes?.identifier === appIdentifier);
  if (!app) throw new Error('The existing RunAnalytics app identifier was not found. Refusing to create a replacement.');
  const capabilities = await api('GET', '/v1/bundleIds/' + app.id + '/bundleIdCapabilities?limit=200');
  for (const type of ['PUSH_NOTIFICATIONS', 'ASSOCIATED_DOMAINS', 'HEALTHKIT']) {
    if (!capabilities.data?.some(item => item.attributes?.capabilityType === type)) {
      await api('POST', '/v1/bundleIdCapabilities', {data: {type: 'bundleIdCapabilities', attributes: {capabilityType: type}, relationships: {bundleId: {data: {type: 'bundleIds', id: app.id}}}}});
    }
  }
  const widgetBundles = await api('GET', '/v1/bundleIds?filter%5Bidentifier%5D=' + widgetIdentifier + '&limit=200');
  let widget = widgetBundles.data?.find(item => item.attributes?.identifier === widgetIdentifier);
  if (!widget) {
    const created = await api('POST', '/v1/bundleIds', {data: {type: 'bundleIds', attributes: {identifier: widgetIdentifier, name: 'RunAnalytics Run Widget', platform: 'IOS'}}});
    widget = created.data;
  }
  if (widget?.attributes?.identifier !== widgetIdentifier) throw new Error('Apple returned an unexpected widget identifier');

  const result = [];
  for (const [kind, bundle] of [['app', app], ['widget', widget]]) {
    const response = await api('POST', '/v1/profiles', {data: {
      type: 'profiles', attributes: {name: `RunAnalytics TestFlight ${kind} ${release}`, profileType: 'IOS_APP_STORE'},
      relationships: {bundleId: {data: {type: 'bundleIds', id: bundle.id}}, certificates: {data: [{type: 'certificates', id: certificate.id}]}},
    }});
    const profile = response.data?.attributes;
    if (!profile?.uuid || !profile.profileContent || profile.profileState !== 'ACTIVE' || Date.parse(profile.expirationDate) <= now) throw new Error('Apple did not return an active signing profile');
    result.push({kind, identifier: bundle.attributes.identifier, ...profile});
  }
  return result;
}

async function main() {
  const env = process.env;
  if (!env.RUNNER_TEMP || !env.GITHUB_ENV || !env.SIGNING_CERTIFICATE_PATH) throw new Error('TestFlight runner configuration is missing');
  const certificate = new X509Certificate(readFileSync(env.SIGNING_CERTIFICATE_PATH));
  const release = `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  const profiles = await createProfiles(appleAPI(env), certificate.serialNumber, release);
  const folder = join(env.RUNNER_TEMP, 'runanalytics-profiles');
  mkdirSync(folder, {recursive: true, mode: 0o700});
  const bindings = {};
  for (const profile of profiles) {
    if (!/^[0-9A-Fa-f-]{36}$/.test(profile.uuid)) throw new Error('Invalid signing profile UUID');
    const path = join(folder, profile.kind + '.mobileprovision');
    writeFileSync(path, Buffer.from(profile.profileContent, 'base64'), {mode: 0o600});
    const xml = execFileSync('/usr/bin/security', ['cms', '-D', '-i', path]);
    const check = JSON.parse(execFileSync('python3', ['-c', 'import plistlib,json,sys; p=plistlib.loads(sys.stdin.buffer.read()); e=p["Entitlements"]; print(json.dumps({"team":p["TeamIdentifier"][0],"app":e["application-identifier"],"health":e.get("com.apple.developer.healthkit"),"domains":e.get("com.apple.developer.associated-domains"),"push":e.get("aps-environment")}))'], {input: xml, encoding: 'utf8'}));
    if (check.team !== 'DB5JRGGB6A' || check.app !== 'DB5JRGGB6A.' + profile.identifier) throw new Error('Signing profile is for the wrong app/team');
    if (profile.kind === 'app' && (check.health !== true || !check.domains || check.push !== 'production')) throw new Error('App signing profile is missing HealthKit, associated domains, or production push');
    const install = join(env.HOME, 'Library/MobileDevice/Provisioning Profiles');
    mkdirSync(install, {recursive: true, mode: 0o700});
    writeFileSync(join(install, profile.uuid + '.mobileprovision'), Buffer.from(profile.profileContent, 'base64'), {mode: 0o600});
    appendFileSync(env.GITHUB_ENV, `RUNANALYTICS_${profile.kind.toUpperCase()}_PROFILE=${profile.uuid}\n`);
    bindings[profile.identifier] = profile.uuid;
  }
  const exportOptions = {method: 'app-store-connect', destination: 'export', signingStyle: 'manual', teamID: 'DB5JRGGB6A', signingCertificate: 'Apple Distribution', manageAppVersionAndBuildNumber: false, testFlightInternalTestingOnly: false, provisioningProfiles: bindings};
  const exported = execFileSync('python3', ['-c', 'import plistlib,json,sys; sys.stdout.buffer.write(plistlib.dumps(json.load(sys.stdin)))'], {input: JSON.stringify(exportOptions)});
  writeFileSync(join(env.RUNNER_TEMP, 'RunAnalytics-ExportOptions.plist'), exported, {mode: 0o600});
  console.log('Prepared and validated App Store profiles for RunAnalytics and its Run Widget. No certificates were created or revoked.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
