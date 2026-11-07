import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import express from 'express';
import type {AddressInfo} from 'node:net';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {SqlStatement} from '../d1/activities';
import {GarminStore} from './store';
import {GarminSignin,garminReturnTo,garminSigninHtml} from './signin';
import {GarminClient,type GarminConfig,type GarminTokens} from './client';
import {registerGarminRoutes} from './routes';
const key=Buffer.alloc(32,9).toString('base64');
const tokens:GarminTokens={access_token:'private-access',refresh_token:'private-refresh',expires_in:86400,refresh_token_expires_in:7776000};
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT UNIQUE,email TEXT UNIQUE,password TEXT,subscription_plan TEXT,marketing_opt_out INTEGER,marketing_consent_status TEXT);INSERT INTO users(id,email) VALUES(1,'existing@example.test'),(2,'other@example.test');`);
  for(const file of ['0036_garmin_activity_sync.sql','0037_garmin_health_sync.sql','0038_garmin_signin.sql'])sqlite.exec(readFileSync('apps/d1-migration/migrations/'+file,'utf8'));
  const db:AtomicSqlDatabase={prepare(sql){let params:(string|number|null)[]=[];const statement:SqlStatement={bind(...values){params=values;return statement;},async first<T>(){return (sqlite.prepare(sql).get(...params)??null) as T|null;},async all<T>(){return {results:sqlite.prepare(sql).all(...params) as T[]};},async run(){const result=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(result.changes)}};}};return statement;},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  let now=Date.now();const store=new GarminStore(db,key,()=>now),signin=new GarminSignin(store,key,()=>now);
  return {sqlite,store,signin,advance:(ms:number)=>now+=ms,now:()=>now};
}
test('anonymous challenges are encrypted, purpose-bound, single-use, expiring and bounded',async()=>{
  const f=fixture();try{
    const first=await f.signin.start('/recovery'),rows=JSON.stringify(f.sqlite.prepare('SELECT * FROM garmin_signin_sessions').all());
    assert.ok(!rows.includes(first.verifier));assert.ok(!rows.includes(first.state));
    assert.deepEqual(await f.signin.consume(first.state),{verifier:first.verifier,returnTo:'/recovery',consentStartedAt:f.now()});
    await assert.rejects(f.signin.consume(first.state));
    const expired=await f.signin.start('//outside.test');f.advance(600_001);await assert.rejects(f.signin.consume(expired.state));
    for(let i=0;i<60;i++)await f.signin.start('/dashboard');
    await assert.rejects(f.signin.start('/dashboard'),/RATE_LIMIT/);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM users').get()!.n,2);
  }finally{f.sqlite.close();}
});
test('verified Garmin identity returns the existing owner without merging by name or email',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'already-linked',permissions:['ACTIVITY_EXPORT','HEALTH_EXPORT']},tokens);
    f.sqlite.prepare('UPDATE garmin_connections SET health_consented_at=? WHERE user_id=1').run(new Date(f.now()).toISOString());
    const result=await f.signin.resolve({userId:'already-linked',permissions:['ACTIVITY_EXPORT','HEALTH_EXPORT']},tokens,f.now());
    assert.deepEqual(result,{userId:1,isNew:false,status:'connected'});
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM users').get()!.n,2);
    assert.ok(f.sqlite.prepare('SELECT health_consented_at FROM garmin_connections WHERE user_id=1').get()!.health_consented_at);
  }finally{f.sqlite.close();}
});
test('first Garmin signup creates one free account, keeps health opt-in separate and repeated callbacks reuse it',async()=>{
  const f=fixture();try{
    const first=await f.signin.resolve({userId:'new-garmin',permissions:['ACTIVITY_EXPORT','HEALTH_EXPORT']},tokens,f.now());
    const second=await f.signin.resolve({userId:'new-garmin',permissions:['ACTIVITY_EXPORT','HEALTH_EXPORT']},tokens,f.now());
    assert.equal(first.isNew,true);assert.equal(second.isNew,false);assert.equal(first.userId,second.userId);
    const user=f.sqlite.prepare('SELECT * FROM users WHERE id=?').get(first.userId)!;
    assert.equal(user.email,null);assert.equal(user.password,null);assert.equal(user.subscription_plan,'free');assert.equal(user.marketing_opt_out,1);
    assert.equal(f.sqlite.prepare('SELECT health_consented_at FROM garmin_connections WHERE user_id=?').get(first.userId)!.health_consented_at,null);
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM users').get()!.n,3);
    assert.ok(!(await f.store.connection(first.userId))!.tokens!.includes('private'));
  }finally{f.sqlite.close();}
});
test('sign-in does not bypass pending disconnection or reuse an authenticated linking challenge',async()=>{
  const f=fixture();try{
    await f.store.save(1,{userId:'linked',permissions:['ACTIVITY_EXPORT']},tokens);await f.store.disconnect(1);
    await assert.rejects(f.signin.resolve({userId:'linked',permissions:['ACTIVITY_EXPORT']},tokens,f.now()),/DISCONNECT_PENDING/);
    const link=await f.store.start(2);await assert.rejects(f.signin.consume(link.state));
    assert.equal((await f.store.consume(link.state)).userId,2);
  }finally{f.sqlite.close();}
});
test('redirects are restricted and inline handoff escapes script boundaries',()=>{
  for(const value of ['//evil.test','https://evil.test','/api/auth/garmin-login','/auth','/\\evil.test'])assert.equal(garminReturnTo(value),null);
  assert.equal(garminReturnTo('/settings#garmin'),'/settings#garmin');
  const html=garminSigninHtml('session</script>','/dashboard','test-nonce');
  assert.ok(!html.includes('session</script>'));assert.ok(html.includes('session\\u003c/script>'));assert.ok(!html.includes('?token='));
});
test('public sign-in requires consent and same origin, binds cookies and PKCE, rejects replay and provider denial',async()=>{
  const f=fixture(),app=express();app.use(express.json());
  const config:GarminConfig={clientId:'test-client',clientSecret:'private-secret',encryptionKey:key,origin:'https://aitracker.run'};
  let exchanges=0;
  const provider=new GarminClient(config,async(url,options)=>{
    if(String(url).includes('/oauth/token')){exchanges++;assert.equal(new URLSearchParams(String(options!.body)).get('code_verifier')?.length,43);return Response.json(tokens);}
    if(String(url).endsWith('/id'))return Response.json({userId:'login-owner'});
    return Response.json({permissions:['ACTIVITY_EXPORT']});
  });
  registerGarminRoutes(app,{authenticate:(_req,res)=>res.sendStatus(401),store:async()=>f.store,config:()=>config,client:()=>provider,session:async userId=>'local-session-'+userId});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
  const start=(body:unknown,source='https://aitracker.run')=>fetch(origin+'/api/auth/garmin-login',{method:'POST',headers:{'Content-Type':'application/json',Origin:source},body:JSON.stringify(body)});
  try{
    assert.equal((await start({})).status,400);assert.equal((await start({activityConsent:true},'https://outside.test')).status,403);
    const response=await start({activityConsent:true,returnTo:'https://outside.test',userId:2});assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie')!.split(';')[0],url=new URL((await response.json()).url),state=url.searchParams.get('state')!;
    assert.ok(response.headers.get('set-cookie')!.includes('HttpOnly'));assert.ok(response.headers.get('set-cookie')!.includes('Secure'));assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    const callback=origin+'/api/garmin/callback?state='+state+'&code=valid-code';
    const missing=await fetch(callback,{redirect:'manual'});assert.equal(missing.status,302);assert.equal(exchanges,0);
    f.advance(10_000); // Route uses wall-clock time; the store fixture clock is explicit.
    const success=await fetch(callback,{headers:{Cookie:cookie},redirect:'manual'});assert.equal(success.status,200);assert.match(success.headers.get('content-security-policy')!,/default-src 'none'/);assert.equal(success.headers.get('cache-control'),'no-store');
    const html=await success.text();assert.ok(html.includes('local-session-3'));assert.ok(!html.includes('outside.test'));assert.ok(!html.includes('private-access'));assert.equal(exchanges,1);
    const replay=await fetch(callback,{headers:{Cookie:cookie},redirect:'manual'});assert.equal(replay.headers.get('location'),'/auth?error=garmin_failed');assert.equal(exchanges,1);
    const deniedStart=await start({activityConsent:true}),deniedCookie=deniedStart.headers.get('set-cookie')!.split(';')[0],deniedUrl=new URL((await deniedStart.json()).url);
    const denied=await fetch(origin+'/api/garmin/callback?state='+deniedUrl.searchParams.get('state')+'&error=access_denied',{headers:{Cookie:deniedCookie},redirect:'manual'});
    assert.equal(denied.headers.get('location'),'/auth?error=garmin_denied');assert.equal(exchanges,1);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));f.sqlite.close();}
});
