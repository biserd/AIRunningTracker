import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import express from 'express';
import type {AddressInfo} from 'node:net';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {SqlStatement} from '../d1/activities';
import {GarminStore} from './store';
import {GarminHealthStore} from './healthStore';
import {registerGarminRoutes} from './routes';
import {parseGarminPush} from '../../shared/garmin';
import {normalizeGarminHealth,recoveryOverview,GARMIN_HEALTH_CONSENT_VERSION,type GarminHealthRecord,type GarminHealthStatus} from '../../shared/garminHealth';
const now=Date.parse('2026-11-07T20:00:00Z'),key=Buffer.alloc(32,7).toString('base64');
const tokens={access_token:'private-access',refresh_token:'private-refresh',expires_in:86400,refresh_token_expires_in:7776000};
const status:GarminHealthStatus={connected:true,hasPermission:true,consented:true,enabled:true,consentedAt:new Date(now).toISOString(),lastSyncAt:null,summaryCount:0,retentionDays:90};
const sample=(date='2026-11-07',userId='garmin-one')=>({userId,summaryId:'health-'+date,calendarDate:date,startTimeInSeconds:Date.parse(date+'T00:00:00Z')/1000,startTimeOffsetInSeconds:7200,durationInSeconds:8*3600,
  restingHeartRateInBeatsPerMinute:52,steps:5000,activeKilocalories:350,averageStressLevel:23,lastNightAvg:44,lastNight5MinHigh:60,deepSleepDurationInSeconds:3600,lightSleepDurationInSeconds:5*3600,remSleepInSeconds:2*3600,awakeDurationInSeconds:1800,validation:'ENHANCED_FINAL',overallSleepScore:{value:82,qualifierKey:'GOOD'},timeOffsetBodyBatteryValues:{0:45,180:55,360:58}});
function fixture(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2);');
  for(const file of ['0036_garmin_activity_sync.sql','0037_garmin_health_sync.sql'])sqlite.exec(readFileSync('apps/d1-migration/migrations/'+file,'utf8'));
  const db:AtomicSqlDatabase={prepare(sql){let params:(string|number|null)[]=[];const stmt:SqlStatement={bind(...values){params=values;return stmt;},async first<T>(){return(sqlite.prepare(sql).get(...params)??null)as T|null;},async all<T>(){return{results:sqlite.prepare(sql).all(...params)as T[]};},async run(){return{meta:{changes:Number(sqlite.prepare(sql).run(...params).changes)}};}};return stmt;},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const stmt of statements)result.push(await stmt.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  let time=now;return{sqlite,db,store:new GarminStore(db,key,()=>time),health:new GarminHealthStore(db,()=>time),advance:(ms:number)=>time+=ms};
}
async function connect(f:ReturnType<typeof fixture>,userId=1,garminId='garmin-one',permissions=['ACTIVITY_EXPORT','HEALTH_EXPORT']){await f.store.save(userId,{userId:garminId,permissions},tokens);}
test('health normalization preserves Garmin units, missing sensors, exact score qualifier and tentative sleep; discards raw samples',()=>{
  const sleep=normalizeGarminHealth('sleeps',{...sample(),validation:'ENHANCED_TENTATIVE',timeOffsetSleepSpo2:{0:95},latitudeInDegree:42,token:'private'});
  assert.equal(sleep.sleepSeconds,28800);assert.equal(sleep.awakeSeconds,1800);assert.equal(sleep.sleepScore,82);assert.equal(sleep.sleepQualifier,'GOOD');assert.equal(sleep.tentative,true);assert.equal(sleep.date,'2026-11-07');
  assert.equal(JSON.stringify(sleep).includes('private'),false);assert.equal(JSON.stringify(sleep).includes('Spo2'),false);
  const hrv=normalizeGarminHealth('hrv',{...sample(),lastNightAvg:undefined});assert.equal(hrv.hrvAverage,null);
  const daily=normalizeGarminHealth('dailies',{...sample(),steps:0,averageStressLevel:-2,restingHeartRateInBeatsPerMinute:0});assert.equal(daily.steps,0);assert.equal(daily.averageStress,null);assert.equal(daily.restingHeartRate,null);
  const stress=normalizeGarminHealth('stressDetails',{...sample(),timeOffsetBodyBatteryValues:{360:58,0:45,180:55,999999:100,400:-1}});assert.equal(stress.bodyBattery,58);assert.equal(stress.bodyBatteryAt,'2026-11-07T00:06:00.000Z');
  assert.throws(()=>normalizeGarminHealth('sleeps',{...sample(),calendarDate:'2026-02-31'}));
});
test('unconsented, unknown and unpermitted health never enter durable storage; health has a distinct owner-specific inbox',async()=>{
  const f=fixture();try{
    await connect(f);const push=parseGarminPush({sleeps:[sample()]});await f.store.receive(push);await f.health.receive(push);
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_push_inbox').get()!.n,0);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_inbox').get()!.n,0);
    await f.health.enable(1);await f.health.receive(parseGarminPush({sleeps:[sample(),sample('2026-11-07','unknown')]}));await f.health.process();
    assert.equal((await f.health.records(1)).length,1);assert.equal((await f.health.records(2)).length,0);
    const raw=JSON.stringify(f.sqlite.prepare('SELECT * FROM garmin_health_inbox').all());assert.equal(raw.includes('garmin-one'),false);assert.equal(raw.includes('unknown'),false);
    await connect(f,2,'garmin-two',['ACTIVITY_EXPORT']);await assert.rejects(f.health.enable(2));
  }finally{f.sqlite.close();}
});
test('health updates with changed summary IDs replace the same window, deduplicate retries and survive worker restart',async()=>{
  const f=fixture();try{
    await connect(f);await f.health.enable(1);const push=parseGarminPush({sleeps:[{...sample(),durationInSeconds:18000,validation:'ENHANCED_TENTATIVE'}]});
    await f.health.receive(push);await f.health.receive(push);await new GarminHealthStore(f.db,()=>now).process();assert.equal((await f.health.records(1)).length,1);
    f.advance(1000);await f.health.receive(parseGarminPush({sleeps:[{...sample(),summaryId:'revised-id'}]}));await f.health.process();
    const rows=await f.health.records(1);assert.equal(rows.length,1);assert.equal(rows[0].duration,28800);assert.equal(rows[0].tentative,false);assert.equal((await f.health.status(1)).summaryCount,1);
    f.advance(1000);await f.health.receive(parseGarminPush({sleeps:[{...sample(),summaryId:'late-shorter-retry',durationInSeconds:18000,validation:'ENHANCED_TENTATIVE'}]}));await f.health.process();assert.equal((await f.health.records(1))[0].duration,28800);
    assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM garmin_push_inbox WHERE payload LIKE '%sleep%'").get()!.n,0);
  }finally{f.sqlite.close();}
});
test('a mixed-user health notification stays partitioned when one runner withdraws consent',async()=>{
  const f=fixture();try{
    await connect(f);await connect(f,2,'garmin-two');await f.health.enable(1);await f.health.enable(2);
    await f.health.receive(parseGarminPush({sleeps:[sample(),{...sample('2026-11-07','garmin-two'),durationInSeconds:25000}]}));
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_inbox').get()!.n,2);
    await f.health.disable(1);await f.health.process();assert.deepEqual(await f.health.records(1),[]);assert.equal((await f.health.records(2))[0].duration,25000);
    assert.equal((await f.health.status(2)).enabled,true);
  }finally{f.sqlite.close();}
});
test('health withdrawal deletes stored and queued health, blocks late pushes and preserves activities',async()=>{
  const f=fixture();try{
    await connect(f);await f.health.enable(1);await f.health.receive(parseGarminPush({sleeps:[sample()]}));await f.health.process();
    f.advance(1000);await f.health.receive(parseGarminPush({hrv:[sample()]}));assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_inbox').get()!.n,2);
    await f.health.disable(1);await f.health.receive(parseGarminPush({sleeps:[sample()]}));await f.health.process();
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_inbox').get()!.n,0);assert.deepEqual(await f.health.records(1),[]);assert.equal((await f.store.status(1,true)).connected,true);
    f.advance(1000);await f.health.enable(1);await f.health.receive(parseGarminPush({sleeps:[sample()]}));await f.health.process();assert.equal((await f.health.records(1)).length,1);
    await f.store.disconnect(1);assert.deepEqual(await f.health.records(1),[]);assert.equal((await f.health.status(1)).consented,false);
  }finally{f.sqlite.close();}
});
test('health permission revocation deletes health and pending receipts without disconnecting activity sync; stale permission updates cannot revoke new grants',async()=>{
  const f=fixture();try{
    await connect(f);await f.health.enable(1);await f.health.receive(parseGarminPush({sleeps:[sample()]}));await f.health.process();f.advance(1000);
    await f.store.receive(parseGarminPush({userPermissionsChange:[{userId:'garmin-one',permissions:['ACTIVITY_EXPORT'],changeTimeInSeconds:now/1000+1}]}));await f.store.process();
    assert.equal((await f.store.status(1,true)).connected,true);assert.equal((await f.health.status(1)).consented,false);assert.deepEqual(await f.health.records(1),[]);
    f.advance(1000);await f.store.receive(parseGarminPush({userPermissionsChange:[{userId:'garmin-one',permissions:['ACTIVITY_EXPORT','HEALTH_EXPORT'],changeTimeInSeconds:now/1000+2}]}));await f.store.process();await f.health.enable(1);
    await f.store.receive(parseGarminPush({userPermissionsChange:[{userId:'garmin-one',permissions:[],changeTimeInSeconds:now/1000}]}));await f.store.process();assert.equal((await f.health.status(1)).enabled,true);
  }finally{f.sqlite.close();}
});
test('health retention and account deletion remove normalized summaries and owner-specific delivery records',async()=>{
  const f=fixture();try{
    await connect(f);await f.health.enable(1);await f.health.receive(parseGarminPush({sleeps:[sample()]}));await f.health.process();f.advance(92*86400000);await f.health.process();
    assert.deepEqual(await f.health.records(1),[]);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_summaries').get()!.n,0);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_inbox').get()!.n,0);
    await f.health.receive(parseGarminPush({hrv:[sample('2027-02-07')]}));f.sqlite.exec('DELETE FROM users WHERE id=1');assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM garmin_health_inbox').get()!.n,0);
  }finally{f.sqlite.close();}
});
test('recovery uses Garmin dates, distinct-day median baselines, missing-value gaps and tentative/stale labels without a synthetic readiness score',()=>{
  const records:GarminHealthRecord[]=[];
  for(let index=0;index<10;index++){const date=new Date(now-index*86400000).toISOString().slice(0,10);for(const kind of ['sleeps','dailies','hrv','stressDetails'] as const)records.push({...normalizeGarminHealth(kind,{...sample(date),lastNightAvg:index?40:44,restingHeartRateInBeatsPerMinute:50,durationInSeconds:kind==='sleeps'?28800:3600}),receivedAt:new Date(now-index*86400000).toISOString()});}
  const overview=recoveryOverview(records,status,7,'America/New_York',now);assert.equal(overview.series.length,7);assert.equal(overview.metrics.hrv.baseline,40);assert.equal(overview.metrics.hrv.baselineDays,9);assert.equal(overview.metrics.sleep.value,28800);assert.equal(overview.metrics.sleep.observedAt,'2026-11-07T08:30:00.000Z');
  assert.equal(overview.metrics.hrv.value,44);assert.equal(Object.hasOwn(overview,'readinessScore'),false);
  const old=recoveryOverview([records.at(-1)!],status,28,'UTC',now);assert.equal(old.metrics.bodyBattery.stale,true);assert.equal(old.series.at(-1)!.sleep,null);
  const noBaseline=recoveryOverview(records.slice(0,8),status,28,'UTC',now);assert.equal(noBaseline.metrics.hrv.baseline,null);
  const timezone=recoveryOverview([],status,7,'America/Los_Angeles',Date.parse('2026-11-08T01:00:00Z'));assert.equal(timezone.today,'2026-11-07');
});
test('health routes require authentication and versioned consent, isolate owners and reject invalid timezones',async()=>{
  const f=fixture();await connect(f);const app=express();app.use(express.json());
  registerGarminRoutes(app,{authenticate(req,res,next){if(req.get('authorization')!=='Bearer runner-one')return res.sendStatus(401);(req as any).user={id:1};next();},store:async()=>f.store,config:()=>({clientId:'test',clientSecret:'test',encryptionKey:key,origin:'https://aitracker.run'})});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port,headers={authorization:'Bearer runner-one','content-type':'application/json'};
  try{
    for(const path of ['/status','/recovery','/export'])assert.equal((await fetch(origin+'/api/garmin/health'+path)).status,401);
    assert.equal((await fetch(origin+'/api/garmin/health/consent',{method:'POST',headers,body:'{}'})).status,400);
    assert.equal((await fetch(origin+'/api/garmin/health/consent',{method:'POST',headers,body:JSON.stringify({healthConsent:true,version:GARMIN_HEALTH_CONSENT_VERSION})})).status,200);
    const response=await fetch(origin+'/api/garmin/health/recovery?userId=2&days=7&timezone=America%2FNew_York',{headers});assert.equal(response.status,200);assert.match(response.headers.get('cache-control')!,/no-store/);assert.equal(((await response.json()) as any).status.enabled,true);
    assert.equal((await fetch(origin+'/api/garmin/health/recovery?timezone=invalid',{headers})).status,400);assert.equal((await fetch(origin+'/api/garmin/health/recovery?days=1000',{headers})).status,400);
    assert.equal((await fetch(origin+'/api/garmin/health/consent',{method:'DELETE',headers})).status,200);assert.equal((await f.health.status(1)).enabled,false);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));f.sqlite.close();}
});
