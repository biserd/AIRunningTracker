import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, verify} from 'node:crypto';
import {appleToken, appIdentifier, widgetIdentifier, suppliedProfiles, validateProfile} from './prepare-testflight-signing.mjs';

test('supplied profiles require both targets and avoid changing API permissions', () => {
  assert.throws(() => suppliedProfiles({}), /Both app and widget/);
  assert.throws(() => suppliedProfiles({IOS_PROVISIONING_PROFILE: 'app'}), /Both app and widget/);
  assert.deepEqual(suppliedProfiles({IOS_PROVISIONING_PROFILE: 'app', IOS_WIDGET_PROVISIONING_PROFILE: 'widget'}).map(p => p.identifier), [appIdentifier, widgetIdentifier]);
});
test('uploaded profiles must match the app, certificate, expiry, entitlements and distribution type', () => {
  const fixture = {team: 'DB5JRGGB6A', app: 'DB5JRGGB6A.' + appIdentifier, uuid: 'DAD00000-0000-4000-8000-000000000002', expires: Date.parse('2035-01-01'), certificates: ['AABB'], health: true, domains: ['*'], push: 'production'};
  assert.equal(validateProfile(fixture, 'app', 'AA:BB'), fixture.uuid);
  assert.equal(validateProfile({...fixture, domains: '*'}, 'app', 'AA:BB'), fixture.uuid);
  assert.equal(validateProfile({...fixture, domains: ['applinks:new.aitracker.run']}, 'app', 'AA:BB'), fixture.uuid);
  assert.equal(validateProfile({...fixture, app: 'DB5JRGGB6A.' + widgetIdentifier, health: false, domains: []}, 'widget', 'AA:BB'), fixture.uuid);
  for (const change of [{app: 'DB5JRGGB6A.other'}, {team: 'OTHER'}, {expires: 0}, {certificates: ['CCDD']}, {health: false}, {domains: []}, {domains: 'unexpected'}, {domains: ['applinks:other.example']}, {push: 'development'}, {development: true}, {devices: true}, {allDevices: true}]) {
    assert.throws(() => validateProfile({...fixture, ...change}, 'app', 'AA:BB'));
  }
});

test('Apple JWT uses ES256 P1363, the expected audience, and a bounded lifetime', () => {
  const {privateKey, publicKey} = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  const token = appleToken({APP_STORE_CONNECT_KEY_ID: 'fixture', APP_STORE_CONNECT_ISSUER_ID: 'fixture-issuer', APP_STORE_CONNECT_PRIVATE_KEY: privateKey}, 1000);
  const [header, body, signature] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'ES256');
  assert.deepEqual(JSON.parse(Buffer.from(body, 'base64url')), {iss: 'fixture-issuer', iat: 1000, exp: 1600, aud: 'appstoreconnect-v1'});
  assert.equal(verify('sha256', Buffer.from(header + '.' + body), {key: publicKey, dsaEncoding: 'ieee-p1363'}, Buffer.from(signature, 'base64url')), true);
});
