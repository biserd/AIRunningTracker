import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerChecks } from '../container/provider-checks';

const keys = { stripe: 'sk_live_test-only', resend: 'resend-test-only', openai: 'openai-test-only', stravaClientId: '123', stravaSecret: 'strava-test-only' };
test('provider preflight is GET-only, bounded, and returns no credentials or upstream records', async () => {
  const calls: string[] = [];
  const send: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); calls.push(url.origin);
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
    if (url.pathname.includes('/prices/')) return Response.json({active:true,livemode:true,type:'recurring',secret:'never-return'});
    if (url.pathname.includes('webhook_endpoints')) return Response.json({data:[{livemode:true,status:'enabled',url:'https://aitracker.run/api/stripe/webhook/test-id'}]});
    if (url.pathname.includes('push_subscriptions')) {
      assert.equal(url.searchParams.get('client_secret'), keys.stravaSecret);
      return Response.json([{id:123,callback_url:'https://aitracker.run/api/strava/webhook'}]);
    }
    if (url.pathname === '/domains') return Response.json({data:[{name:'aitracker.run',status:'verified'}]});
    return Response.json({object:'list',data:[{id:'internal-model-name'}]});
  };
  const result = await providerChecks(keys, send);
  assert.equal(calls.length, 6);
  assert.ok(result.every(check => check.status === 'pass'));
  for (const secret of [...Object.values(keys), 'never-return', 'internal-model-name']) assert.ok(!JSON.stringify(result).includes(secret) || secret === '123');
});
test('provider errors, oversized responses and missing keys never pass', async () => {
  const denied = await providerChecks(keys, async () => new Response('private provider details', {status:403}));
  assert.ok(denied.every(check => check.status === 'unverified'));
  assert.ok(!JSON.stringify(denied).includes('private provider'));
  const oversized = await providerChecks(keys, async () => new Response('x'.repeat(512_001)));
  assert.ok(oversized.every(check => check.status === 'unverified'));
  let calls = 0;
  const missing = await providerChecks({stripe:'',resend:'',openai:'',stravaClientId:'',stravaSecret:''}, async () => {calls++; return Response.json({});});
  assert.equal(calls,0); assert.ok(missing.every(check => check.status === 'fail'));
});
