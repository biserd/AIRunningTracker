import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import express from 'express';
import type {AddressInfo} from 'node:net';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {SqlStatement} from '../d1/activities';
import {GarminStore} from './store';
import {GarminClient,type GarminConfig,type GarminTokens} from './client';
import {registerGarminRoutes,maintainGarminConnection} from './routes';
import {garminChallenge,sealGarmin,openGarmin} from './crypto';
import {parseGarminPush,normalizeGarminRun} from '../../shared/garmin';
import {isGarminSource,receiveGarminWebhook} from '../../apps/api-cloudflare/container/garmin-webhook';
const key=Buffer.alloc(32,7).toString('base64');
const config:GarminConfig={clientId:'test-client',clientSecret:'test-client-secret',encryptionKey:key,origin:'https://aitracker.run'};
const tokens:GarminTokens={access_token:'access-private',refresh_token:'refresh-private',expires_in:86400,refresh_token_expires_in:7776000};
const now=Date.parse('2026-11-07T20:00:00.000Z');
function fixture(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2);');
  sqlite.exec(readFileSync('apps/d1-migration/migrations/0036_garmin_activity_sync.sql','utf8'));
  const db:AtomicSqlDatabase={
    prepare(sql){let params:(string|number|null)[]=[];const statement:SqlStatement={bind(...values){params=values;return statement;},async first<T>(){return (sqlite.prepare(sql).get(...params)??null) as T|null;},async all<T>(){return {results:sqlite.prepare(sql).all(...params) as T[]};},async run(){const result=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(result.changes)}};}};return statement;},
    async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}},
  };
  let time=now;const store=new GarminStore(db,key,()=>time);
  return {sqlite,db,store,advance:(ms:number)=>{time+=ms;}};
}
const summary=(userId='garmin-one',id:string|number=123)=>({userId,summaryId:String(id),activityId:id,activityName:'Morning run',activityType:'RUNNING',startTimeInSeconds:1794078000,durationInSeconds:1800,distanceInMeters:5000,averageHeartRateInBeatsPerMinute:150,averageRunCadenceInStepsPerMinute:172,totalElevationGainInMeters:24});
test('Garmin crypto binds tokens to owner and purpose; PKCE uses SHA256',()=>{
  const sealed=sealGarmin('private',key,'runner:1');assert.equal(openGarmin(sealed,key,'runner:1'),'private');
  assert.throws(()=>openGarmin(sealed,key,'runner:2'));assert.throws(()=>openGarmin(sealed,Buffer.alloc(32,8).toString('base64'),'runner:1'));
  assert.equal(garminChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('push validation drops unrequested location, token and URL fields; preserves units and null sensors',()=>{
  const push=parseGarminPush({activities:[{...summary(),callbackURL:'https://private.test/?token=secret',latitudeInDegree:44,accessToken:'secret'}]});
  assert.equal(JSON.stringify(push).includes('secret'),false);assert.equal(JSON.stringify(push).includes('latitude'),false);
  const run=normalizeGarminRun(push.activities![0])!;assert.equal(run.distance,5000);assert.equal(run.duration,1800);assert.equal(run.averageSpeed,5000/1800);assert.equal(run.cadence,172);
  assert.equal(normalizeGarminRun({...summary(),activityType:'CYCLING'}),null);
  assert.equal(normalizeGarminRun({...summary(),averageHeartRateInBeatsPerMinute:undefined})!.averageHeartRate,null);
  assert.throws(()=>normalizeGarminRun({...summary(),distanceInMeters:-1}));
  assert.throws(()=>parseGarminPush({health:[]}));assert.throws(()=>parseGarminPush({activities:Array(501).fill(summary())}));
});
test('OAuth sessions are encrypted, expire and can be consumed only once',async()=>{
  const f=fixture();try{
    const flow=await f.store.start(1);assert.equal(flow.verifier.length,43);
    const rows=f.sqlite.prepare('SELECT * FROM garmin_oauth_sessions').all();assert.equal(JSON.stringify(rows).includes(flow.verifier),false);assert.equal(JSON.stringify(rows).includes(flow.state),false);
    assert.equal((await f.store.consume(flow.state)).userId,1);await assert.rejects(f.store.consume(flow.state));
    const expired=await f.store.start(1);f.advance(600_001);await assert.rejects(f.store.consume(expired.state));
  }finally{f.sqlite.close();}
});
test('connection identity cannot be taken by a second runner and credentials never enter status or feed',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);
    await assert.rejects(f.store.save(2,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens));
    assert.equal((await f.store.connection(1))!.user_id,1);
    assert.equal(JSON.stringify(await f.store.status(1,true)).includes('private'),false);
    assert.equal(f.sqlite.prepare('SELECT tokens FROM garmin_connections').get()!.tokens===JSON.stringify(tokens),false);
  }finally{f.sqlite.close();}
});
test('durable pushes survive restart, deduplicate, respect ownership and process late registration',async()=>{
  const f=fixture();try{
    await f.store.receive(parseGarminPush({activities:[summary()]}));await f.store.process();
    assert.equal((await f.store.activities(1)).length,0);
    f.advance(1000);await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens,now);f.advance(61_000);
    await new GarminStore(f.db,key,()=>now+62_000).process();
    assert.equal((await f.store.activities(1)).length,1);assert.equal((await f.store.activities(2)).length,0);
    await f.store.receive(parseGarminPush({activities:[summary()]}));await f.store.process();assert.equal((await f.store.activities(1)).length,1);
    await f.store.receive(parseGarminPush({manuallyUpdatedActivities:[{...summary(),activityName:'Corrected run',distanceInMeters:5100}]}));await f.store.process();
    assert.equal((await f.store.activities(1))[0].distance,5100);assert.equal((await f.store.status(1,true)).activityCount,1);
    assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='activities'").get()!.n,0);
  }finally{f.sqlite.close();}
});
test('deletion tombstones defeat retries; withdrawing consent blocks future collection',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);f.advance(1000);
    await f.store.receive(parseGarminPush({activities:[summary()]}));await f.store.process();await f.store.deleteActivity(1,'123');
    f.advance(1000);await f.store.receive(parseGarminPush({activities:[{...summary(),distanceInMeters:5010}]}));await f.store.process();assert.equal((await f.store.activities(1)).length,0);
    await f.store.disconnect(1);await f.store.receive(parseGarminPush({activities:[summary('garmin-one',124)]}));await f.store.process();
    assert.equal((await f.store.activities(1)).length,0);assert.equal((await f.store.status(1,true)).status,'disconnect_pending');
  }finally{f.sqlite.close();}
});
test('permission notifications are ordered and deregistration removes feed and tokens',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);f.advance(2000);
    await f.store.receive(parseGarminPush({userPermissionsChange:[{userId:'garmin-one',permissions:[],changeTimeInSeconds:now/1000+2}]}));await f.store.process();
    assert.equal((await f.store.status(1,true)).status,'permission_required');
    await f.store.receive(parseGarminPush({activities:[summary()]}));await f.store.process();assert.equal((await f.store.activities(1)).length,0);
    await f.store.receive(parseGarminPush({userPermissionsChange:[{userId:'garmin-one',permissions:['ACTIVITY_EXPORT'],changeTimeInSeconds:now/1000+1}]}));await f.store.process();assert.equal((await f.store.status(1,true)).connected,false);
    await f.store.receive(parseGarminPush({deregistrations:[{userId:'garmin-one'}]}));await f.store.process();assert.equal((await f.store.connection(1))!.tokens,null);
  }finally{f.sqlite.close();}
});
test('deleting a RunAnalytics account cascades private Garmin records',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);await f.store.start(1);
    await f.store.receive(parseGarminPush({activities:[summary()]}));await f.store.process();
    f.sqlite.exec('DELETE FROM users WHERE id=1');assert.equal(await f.store.connection(1),null);assert.deepEqual(await f.store.activities(1),[]);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_oauth_sessions').get()!.n,0);
  }finally{f.sqlite.close();}
});
test('refresh credentials rotate before remote disconnection, and competing maintenance is fenced',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);
    f.sqlite.exec("UPDATE garmin_connections SET access_expires_at='2020-01-01T00:00:00.000Z'");await f.store.disconnect(1);
    let refreshes=0,revocations=0;
    const provider=new GarminClient(config,async(url,options)=>{
      if(String(url).includes('/oauth/token')){refreshes++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({...tokens,access_token:'rotated-access',refresh_token:'rotated-refresh'});}
      assert.equal(options!.method,'DELETE');assert.equal(new Headers(options!.headers).get('authorization'),'Bearer rotated-access');revocations++;return new Response(null,{status:204});
    });
    await Promise.all([maintainGarminConnection(f.store,provider,1),maintainGarminConnection(f.store,provider,1)]);
    assert.equal(refreshes,1);assert.equal(revocations,1);assert.equal((await f.store.connection(1))!.tokens,null);assert.equal((await f.store.status(1,true)).status,'not_connected');
    await f.store.save(1,{userId:'different-garmin-account',permissions:['ACTIVITY_EXPORT']},tokens);assert.equal((await f.store.connection(1))!.garmin_user_id,'different-garmin-account');
  }finally{f.sqlite.close();}
});
test('failed remote revocation remains disabled locally and can be retried after restart',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);await f.store.disconnect(1);
    const offline=new GarminClient(config,async()=>{throw new Error('network unavailable');});
    await assert.rejects(maintainGarminConnection(f.store,offline,1));assert.equal((await f.store.status(1,true)).connected,false);assert.ok((await f.store.connection(1))!.tokens);
    const online=new GarminClient(config,async(url)=>String(url).includes('/oauth/token')?Response.json(tokens):new Response(null,{status:204}));
    await maintainGarminConnection(new GarminStore(f.db,key,()=>now),online,1);assert.equal((await f.store.connection(1))!.tokens,null);
  }finally{f.sqlite.close();}
});
test('large pushes split into durable bounded work items and retry without double-counting',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT']},tokens);
    await f.store.receive(parseGarminPush({activities:Array.from({length:45},(_,index)=>summary('garmin-one',index+1))}));
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_push_inbox').get()!.n,3);
    await f.store.process();assert.equal((await f.store.status(1,true)).activityCount,45);
    assert.deepEqual(await f.store.activities(2),[]);
    f.advance(8*86400_000);await f.store.process();assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_push_inbox').get()!.n,0);
  }finally{f.sqlite.close();}
});
test('edge rejects spoofed forwarded IP/client ID and acknowledges only durable receipts',async()=>{
  for(const ip of ['204.77.162.1','204.77.163.255','98.199.125.1','185.132.79.2','208.65.207.255'])assert.equal(isGarminSource(ip),true);
  for(const ip of ['127.0.0.1','204.77.164.1','204.77.162.999','::1','garmin.com'])assert.equal(isGarminSource(ip),false);
  const f=fixture();try{
    const pending:Promise<unknown>[]=[];
    const req=(ip:string,client='test-client')=>new Request('https://aitracker.run/api/garmin/webhook',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':ip,'garmin-client-id':client,'X-Forwarded-For':'204.77.163.1'},body:JSON.stringify({activities:[summary()]})});
    assert.equal((await receiveGarminWebhook(req('127.0.0.1'),f.db,'test-client',p=>pending.push(p))).status,403);
    assert.equal((await receiveGarminWebhook(req('204.77.163.1','wrong'),f.db,'test-client',p=>pending.push(p))).status,403);
    assert.equal((await receiveGarminWebhook(req('204.77.163.1'),f.db,'test-client',p=>pending.push(p))).status,200);await Promise.all(pending);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_push_inbox').get()!.n,1);
    const broken={...f.db,prepare(){throw new Error('database unavailable');}};
    assert.equal((await receiveGarminWebhook(req('204.77.163.1'),broken,'test-client',()=>{})).status,503);
  }finally{f.sqlite.close();}
});
test('browser OAuth integration requires auth, explicit consent, matching cookie, PKCE and a single-use callback',async()=>{
  const f=fixture(),app=express();app.use(express.json());let exchanges=0;
  const provider=new GarminClient(config,async(url,options)=>{
    if(String(url).includes('/oauth/token')){exchanges++;const body=new URLSearchParams(String(options!.body));assert.ok(body.get('code_verifier'));assert.equal(body.get('redirect_uri'),'https://aitracker.run/api/garmin/callback');return Response.json(tokens);}
    if(String(url).endsWith('/id'))return Response.json({userId:'garmin-one'});
    if(String(url).endsWith('/permissions'))return Response.json({permissions:['ACTIVITY_EXPORT']});
    throw new Error('unexpected provider request');
  });
  registerGarminRoutes(app,{authenticate(req,res,next){if(req.get('authorization')!=='Bearer runner-one')return res.sendStatus(401);(req as any).user={id:1};next();},store:async()=>f.store,config:()=>config,client:()=>provider});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
  try{
    assert.equal((await fetch(origin+'/api/garmin/status')).status,401);
    const headers={'authorization':'Bearer runner-one','content-type':'application/json'};
    assert.equal((await fetch(origin+'/api/garmin/authorize',{method:'POST',headers,body:'{}'})).status,400);
    const started=await fetch(origin+'/api/garmin/authorize',{method:'POST',headers,body:JSON.stringify({activityConsent:true})});assert.equal(started.status,200);
    const destination=new URL((await started.json() as any).url),state=destination.searchParams.get('state')!,cookie=started.headers.get('set-cookie')!.split(';')[0];
    assert.equal(destination.origin,'https://connect.garmin.com');assert.equal(destination.searchParams.get('code_challenge_method'),'S256');assert.equal(destination.searchParams.has('code_verifier'),false);
    const callback=origin+'/api/garmin/callback?'+new URLSearchParams({state,code:'one-time-code'});
    assert.match((await fetch(callback,{redirect:'manual'})).headers.get('location')!,/invalid_state/);assert.equal(exchanges,0);
    assert.match((await fetch(callback,{redirect:'manual',headers:{cookie}})).headers.get('location')!,/garmin=connected/);assert.equal(exchanges,1);
    assert.match((await fetch(callback,{redirect:'manual',headers:{cookie}})).headers.get('location')!,/garmin=failed/);assert.equal(exchanges,1);
    const status=await (await fetch(origin+'/api/garmin/status',{headers})).json();assert.equal((status as any).connected,true);assert.equal(JSON.stringify(status).includes('private'),false);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));f.sqlite.close();}
});
