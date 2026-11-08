// Runs only on the trusted TestFlight runner. Private keys and profiles never enter artifacts/logs.
import {sign, X509Certificate} from 'node:crypto';
import {readFileSync, writeFileSync, appendFileSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

export const appIdentifier = 'run.aitracker.coach';
export const widgetIdentifier = appIdentifier + '.runwidget';
const fingerprintKey = value => String(value).replaceAll(':', '').toUpperCase();

export function suppliedProfiles(env) {
  const app = env.IOS_PROVISIONING_PROFILE, widget = env.IOS_WIDGET_PROVISIONING_PROFILE;
  if (!app || !widget) throw new Error('Both app and widget distribution profiles must be supplied');
  return [{kind: 'app', identifier: appIdentifier, profileContent: app}, {kind: 'widget', identifier: widgetIdentifier, profileContent: widget}];
}

export function validateProfile(check, kind, fingerprint, now = Date.now()) {
  const identifier = kind === 'app' ? appIdentifier : kind === 'widget' ? widgetIdentifier : null;
  if (!identifier || check.team !== 'DB5JRGGB6A' || check.app !== 'DB5JRGGB6A.' + identifier) throw new Error('Signing profile is for the wrong app/team');
  if (!/^[0-9A-Fa-f-]{36}$/.test(check.uuid) || !Number.isFinite(check.expires) || check.expires <= now) throw new Error('Signing profile is invalid or expired');
  if (!check.certificates?.some(value => fingerprintKey(value) === fingerprintKey(fingerprint))) throw new Error('Signing profile does not include the installed distribution certificate');
  if (check.development || check.devices || check.allDevices) throw new Error('An App Store distribution profile is required');
  const domainsAllowed = check.domains === '*' || (Array.isArray(check.domains) && check.domains.some(domain => domain === '*' || domain === 'applinks:new.aitracker.run'));
  if (kind === 'app' && (check.health !== true || !domainsAllowed || check.push !== 'production')) throw new Error('App signing profile is missing HealthKit, associated domains, or production push');
  return check.uuid;
}

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
      const parameter = error.errors?.[0]?.source?.parameter;
      const source = typeof parameter === 'string' && /^[a-zA-Z0-9_[\].-]{1,80}$/.test(parameter) ? `; parameter ${parameter}` : '';
      throw new Error(`Apple signing request ${method} ${path.split('?')[0]} failed: HTTP ${response.status} (${error.errors?.[0]?.code || 'UNKNOWN'}${source}).`);
    }
    return response.json();
  };
}

async function main() {
  const env = process.env;
  if (!env.RUNNER_TEMP || !env.GITHUB_ENV || !env.SIGNING_CERTIFICATE_PATH) throw new Error('TestFlight runner configuration is missing');
  const certificate = new X509Certificate(readFileSync(env.SIGNING_CERTIFICATE_PATH));
  const profiles = suppliedProfiles(env);
  const folder = join(env.RUNNER_TEMP, 'runanalytics-profiles');
  mkdirSync(folder, {recursive: true, mode: 0o700});
  const bindings = {};
  for (const profile of profiles) {
    const path = join(folder, profile.kind + '.mobileprovision');
    writeFileSync(path, Buffer.from(profile.profileContent, 'base64'), {mode: 0o600});
    const xml = execFileSync('/usr/bin/security', ['cms', '-D', '-i', path]);
    const check = JSON.parse(execFileSync('python3', ['-c', 'import plistlib,json,sys,datetime,hashlib; p=plistlib.loads(sys.stdin.buffer.read()); e=p["Entitlements"]; print(json.dumps({"team":p["TeamIdentifier"][0],"app":e["application-identifier"],"health":e.get("com.apple.developer.healthkit"),"domains":e.get("com.apple.developer.associated-domains"),"push":e.get("aps-environment"),"uuid":p["UUID"],"expires":p["ExpirationDate"].replace(tzinfo=datetime.timezone.utc).timestamp()*1000,"certificates":[hashlib.sha256(c).hexdigest() for c in p["DeveloperCertificates"]],"development":e.get("get-task-allow",False),"devices":bool(p.get("ProvisionedDevices")),"allDevices":bool(p.get("ProvisionsAllDevices"))}))'], {input: xml, encoding: 'utf8'}));
    profile.uuid = validateProfile(check, profile.kind, certificate.fingerprint256);
    const install = join(env.HOME, 'Library/MobileDevice/Provisioning Profiles');
    mkdirSync(install, {recursive: true, mode: 0o700});
    writeFileSync(join(install, profile.uuid + '.mobileprovision'), Buffer.from(profile.profileContent, 'base64'), {mode: 0o600});
    appendFileSync(env.GITHUB_ENV, `RUNANALYTICS_${profile.kind.toUpperCase()}_PROFILE=${profile.uuid}\n`);
    bindings[profile.identifier] = profile.uuid;
  }
  const exportOptions = {method: 'app-store-connect', destination: 'export', signingStyle: 'manual', teamID: 'DB5JRGGB6A', signingCertificate: 'Apple Distribution', manageAppVersionAndBuildNumber: false, testFlightInternalTestingOnly: false, provisioningProfiles: bindings};
  const exported = execFileSync('python3', ['-c', 'import plistlib,json,sys; sys.stdout.buffer.write(plistlib.dumps(json.load(sys.stdin)))'], {input: JSON.stringify(exportOptions)});
  writeFileSync(join(env.RUNNER_TEMP, 'RunAnalytics-ExportOptions.plist'), exported, {mode: 0o600});
  console.log('Validated the existing RunAnalytics app and widget distribution profiles. No identifiers, capabilities, profiles or certificates were created or changed by CI.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
