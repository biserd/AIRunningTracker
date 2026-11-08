import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, verify} from 'node:crypto';
import {appleToken, createProfiles, appIdentifier, widgetIdentifier} from './prepare-testflight-signing.mjs';

test('Apple JWT uses ES256 P1363, the expected audience, and a bounded lifetime', () => {
  const {privateKey, publicKey} = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  const token = appleToken({APP_STORE_CONNECT_KEY_ID: 'fixture', APP_STORE_CONNECT_ISSUER_ID: 'fixture-issuer', APP_STORE_CONNECT_PRIVATE_KEY: privateKey}, 1000);
  const [header, body, signature] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'ES256');
  assert.deepEqual(JSON.parse(Buffer.from(body, 'base64url')), {iss: 'fixture-issuer', iat: 1000, exp: 1600, aud: 'appstoreconnect-v1'});
  assert.equal(verify('sha256', Buffer.from(header + '.' + body), {key: publicKey, dsaEncoding: 'ieee-p1363'}, Buffer.from(signature, 'base64url')), true);
});

test('profiles use only the installed certificate, add required capability, and scope the widget exactly', async () => {
  const calls = [];
  const api = async (method, path, body) => {
    calls.push({method, path, body});
    if (path.startsWith('/v1/certificates')) return {data: [{id: 'cert', attributes: {serialNumber: '00AB', certificateType: 'DISTRIBUTION', expirationDate: '2035-01-01'}}]};
    if (method === 'GET' && path.includes(appIdentifier + '&')) return {data: [{id: 'app', attributes: {identifier: appIdentifier}}]};
    if (path === '/v1/bundleIds/app/bundleIdCapabilities') return {data: ['PUSH_NOTIFICATIONS', 'ASSOCIATED_DOMAINS'].map(capabilityType => ({attributes: {capabilityType}}))};
    if (method === 'GET' && path.includes(widgetIdentifier)) return {data: []};
    if (path === '/v1/bundleIds') return {data: {id: 'widget', attributes: body.data.attributes}};
    if (path === '/v1/profiles') return {data: {attributes: {uuid: 'fixture-uuid', profileContent: 'fixture-only', profileState: 'ACTIVE', expirationDate: '2035-01-01'}}};
    return {};
  };
  const profiles = await createProfiles(api, 'AB', 'fixture-1', Date.parse('2026-11-08'));
  assert.deepEqual(profiles.map(p => p.identifier), [appIdentifier, widgetIdentifier]);
  assert.deepEqual(calls.filter(c => c.path === '/v1/bundleIdCapabilities').map(c => c.body.data.attributes.capabilityType), ['HEALTHKIT']);
  for (const call of calls.filter(c => c.path === '/v1/profiles')) {
    assert.equal(call.body.data.attributes.profileType, 'IOS_APP_STORE');
    assert.deepEqual(call.body.data.relationships.certificates.data, [{type: 'certificates', id: 'cert'}]);
  }
  assert.ok(calls.every(c => c.method !== 'DELETE'));
});

test('certificate or app mismatch fails before changing bundle capabilities or profiles', async () => {
  for (const missing of ['certificate', 'app']) {
    let writes = 0;
    const api = async (method, path) => {
      if (method !== 'GET') writes++;
      if (path.includes('/certificates') && missing !== 'certificate') return {data: [{id: 'cert', attributes: {serialNumber: 'AB', certificateType: 'DISTRIBUTION', expirationDate: '2035-01-01'}}]};
      return {data: []};
    };
    await assert.rejects(() => createProfiles(api, 'AB', 'fixture-1', Date.parse('2026-11-08')));
    assert.equal(writes, 0);
  }
});
