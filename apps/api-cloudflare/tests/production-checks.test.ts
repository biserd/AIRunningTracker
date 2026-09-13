import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionChecks } from '../container/production-checks';

test('production probes use only fixed GET routes and omit returned provider configuration', async () => {
  const paths: string[]=[];
  const result=await productionChecks(async request=>{
    assert.equal(request.method,'GET');
    assert.equal(new URL(request.url).origin,'https://aitracker.run');
    const path=new URL(request.url).pathname; paths.push(path);
    return Response.json(path==='/health'?{status:'ok'}:path==='/api/stripe/config'?{publishableKey:'pk_live_test-only'}:{issuer:'https://aitracker.run'});
  });
  assert.deepEqual(paths,['/health','/api/stripe/config','/.well-known/oauth-authorization-server']);
  assert.ok(result.every(r=>r.status==='pass'));
  assert.ok(!JSON.stringify(result).includes('pk_live'));
});
test('Resend probe uses a signed no-op and detects rejection of altered raw bytes',async()=>{
  let posts=0;
  const secret='whsec_'+btoa('test-only-webhook-secret');
  const result=await productionChecks(async request=>{
    if(request.method==='POST') {
      posts++;
      assert.equal(new URL(request.url).pathname,'/api/webhooks/resend');
      const body=await request.text();
      assert.deepEqual(JSON.parse(body),{type:'migration.probe',data:{}});
      assert.ok(request.headers.get('svix-signature')?.startsWith('v1,'));
      return Response.json({}, {status:body.endsWith(' ')?401:200});
    }
    const path=new URL(request.url).pathname;
    return Response.json(path==='/health'?{status:'ok'}:path==='/api/stripe/config'?{publishableKey:'pk_live_test'}:{issuer:'https://aitracker.run'});
  },secret);
  assert.equal(posts,2); assert.equal(result.at(-1)?.status,'pass');
  assert.ok(!JSON.stringify(result).includes(secret));
});
test('production probes reject oversized, failed and unexpected responses',async()=>{
  for(const response of [()=>new Response('x'.repeat(16385)),()=>new Response('private error',{status:503}),()=>Response.json({})]) {
    const result=await productionChecks(async()=>response());
    assert.ok(result.every(r=>r.status!=='pass'));
    assert.ok(!JSON.stringify(result).includes('private error'));
  }
});
