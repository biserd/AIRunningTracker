import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {Encoder,Profile} from '@garmin/fitsdk';
import express from 'express';
import type {AddressInfo} from 'node:net';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {SqlStatement} from '../d1/activities';
import {GarminStore} from './store';
import {GarminHealthStore} from './healthStore';
import {GarminDetailsStore,validateFileCallback} from './detailsStore';
import {registerGarminRoutes} from './routes';
import {decodeGarminFit} from './fit';
import {normalizeRunDetails,distanceSplits} from '../../shared/garminDetails';
import {normalizeWellnessDetail,wellnessSeries} from '../../shared/garminWellnessDetails';
const now=Date.parse('2026-11-08T12:00:00Z'),start=now/1000-3600,key=Buffer.alloc(32,9).toString('base64');
const config={clientId:'fixture-client',clientSecret:'fixture-secret',encryptionKey:key,origin:'https://aitracker.run'};
const summary={activityId:'123',summaryId:'123',activityType:'RUNNING',activityName:'Fixture run',startTimeInSeconds:start,durationInSeconds:600,distanceInMeters:2000,averageRunCadenceInStepsPerMinute:170};
const detail=(userId='garmin-one')=>({userId,activityId:'123',summary:summary,samples:Array.from({length:61},(_,i)=>({startTimeInSeconds:start+i*10,heartRate:140+i%20,stepsPerMinute:170,speedMetersPerSecond:10/3,latitudeInDegree:40+i/10000,longitudeInDegree:-74+i/10000,totalDistanceInMeters:i*100/3,timerDurationInSeconds:i*10})),laps:[{startTimeInSeconds:start},{startTimeInSeconds:start+300}]});
const health=(extra:object={})=>({userId:'garmin-one',summaryId:'h1',calendarDate:'2026-11-08',startTimeInSeconds:start,durationInSeconds:600,hrvValues:{0:42,300:44,600:48},lastNightAvg:44,...extra});
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY);INSERT INTO users VALUES(1),(2);');
 for(const file of ['0036_garmin_activity_sync.sql','0037_garmin_health_sync.sql','0040_garmin_details.sql'])sqlite.exec(readFileSync('apps/d1-migration/migrations/'+file,'utf8'));
 const db:AtomicSqlDatabase={prepare(sql){let args:any[]=[];const st:SqlStatement={bind(...values){args=values;return st;},async first<T>(){return(sqlite.prepare(sql).get(...args)||null)as T|null;},async all<T>(){return{results:sqlite.prepare(sql).all(...args)as T[]};},async run(){return{meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};return st;},async batch(rows){sqlite.exec('BEGIN');try{const out=[];for(const row of rows)out.push(await row.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 let time=now;return {sqlite,db,base:new GarminStore(db,key,()=>time),health:new GarminHealthStore(db,()=>time),details:new GarminDetailsStore(db,key,()=>time),advance:(ms:number)=>{time+=ms;}};
}
async function connect(f:ReturnType<typeof fixture>){await f.base.save(1,{userId:'garmin-one',permissions:['ACTIVITY_EXPORT','HEALTH_EXPORT']},{access_token:'private',refresh_token:'private',expires_in:86400,refresh_token_expires_in:7776000});}
function fit(){const encoder=new Encoder(),at=(s:number)=>new Date((start+s)*1000);encoder.writeMesg({mesgNum:Profile.MesgNum.FILE_ID,type:'activity',manufacturer:'garmin',timeCreated:at(0)});
 encoder.writeMesg({mesgNum:Profile.MesgNum.EVENT,event:'timer',eventType:'start',timestamp:at(0)});encoder.writeMesg({mesgNum:Profile.MesgNum.EVENT,event:'timer',eventType:'stop',timestamp:at(300)});encoder.writeMesg({mesgNum:Profile.MesgNum.EVENT,event:'timer',eventType:'start',timestamp:at(310)});
 for(let i=0;i<=60;i++)encoder.writeMesg({mesgNum:Profile.MesgNum.RECORD,timestamp:at(i*10),positionLat:Math.round((40+i/10000)*2147483648/180),positionLong:Math.round((-74+i/10000)*2147483648/180),distance:i*100/3,heartRate:145,cadence:85,speed:10/3,altitude:20,verticalOscillation:80,stanceTime:240});
 for(let i=0;i<2;i++)encoder.writeMesg({mesgNum:Profile.MesgNum.LAP,startTime:at(i*300),timestamp:at((i+1)*300),totalTimerTime:i===0?300:290,totalElapsedTime:300,totalDistance:1000,avgHeartRate:145,avgCadence:85,totalAscent:10});
 encoder.writeMesg({mesgNum:Profile.MesgNum.SESSION,sport:'running',startTime:at(0),timestamp:at(600),totalElapsedTime:600,totalTimerTime:590,totalDistance:2000,avgHeartRate:145,avgCadence:85,totalAscent:20,totalTrainingEffect:2.8,totalAnaerobicTrainingEffect:0.5});return encoder.close();}
test('JSON normalizer preserves GPS and correct units, isolates gaps, marks sample laps and rejects implausible sensors',()=>{
 const d=detail();d.samples[10].heartRate=-1;d.samples[11].latitudeInDegree=999;const normalized=normalizeRunDetails({...d,secret:'discard-me'})!;
 assert.equal(normalized.samples[0].cadence,170);assert.equal(normalized.samples[10].heartRate,null);assert.equal(normalized.samples[11].longitude,null);assert.equal(normalized.laps.length,2);assert.equal(normalized.laps[0].estimated,true);assert.equal(normalized.laps[0].distance,1000);assert.equal(JSON.stringify(normalized).includes('discard-me'),false);
 assert.equal(distanceSplits(normalized.samples).length,2);const gap=normalized.samples.filter(s=>s.seconds<200||s.seconds>400);assert.deepEqual(distanceSplits(gap),[]);
});
test('official FIT codec preserves lap summaries, doubles running cycles to steps and excludes pauses from split timers',()=>{
 const value=decodeGarminFit(fit(),summary)!;assert.equal(value.format,'FIT');assert.equal(value.samples[0].cadence,170);assert.ok(Math.abs(value.samples[0].latitude!-40)<0.0001);assert.equal(value.run.duration,590);assert.equal(value.laps[1].duration,290);assert.equal(value.laps[0].estimated,false);assert.equal(value.trainingEffect,2.8);assert.equal(value.samples.at(-1)!.timer,590);assert.throws(()=>decodeGarminFit(new Uint8Array([1,2,3]),summary));
});
test('unconsented and unknown detail deliveries are not stored; opted-in run storage is owner scoped and summary arrival can be late',async()=>{
 const f=fixture();try{await connect(f);await f.details.receive({activityDetails:[detail()]});assert.equal(await f.details.run(1,'123'),null);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_detail_records').get()!.n,0);
 await f.details.enable(1,'activity');await f.details.receive({activityDetails:[detail(),detail('unknown')]});assert.equal((await f.details.run(1,'123'))!.samples.length,61);assert.equal(await f.details.run(2,'123'),null);assert.equal((await f.base.activities(1)).length,1);
 }finally{f.sqlite.close();}
});
test('chunked retries publish complete versions, later JSON cannot downgrade FIT, and old timestamps cannot replace a newer snapshot',async()=>{
 const f=fixture();try{await connect(f);await f.details.enable(1,'activity');const d=normalizeRunDetails(detail())!;d.samples=Array.from({length:3100},(_,i)=>({...d.samples[i%61],seconds:i}));await f.details.saveRun(1,new Date(now).toISOString(),d);assert.equal((await f.details.run(1,'123'))!.samples.length,3100);
 const decoded=decodeGarminFit(fit(),summary)!;await f.details.saveRun(1,new Date(now).toISOString(),decoded);f.advance(1000);await f.details.receive({activityDetails:[detail()]});assert.equal((await f.details.run(1,'123'))!.format,'FIT');
 const older={...decoded,run:{...decoded.run,name:'older'}};await f.details.saveRun(1,new Date(now).toISOString(),older,new Date(now-1000).toISOString());assert.notEqual((await f.details.run(1,'123'))!.run.name,'older');
 }finally{f.sqlite.close();}
});
test('FIT callback host/path and redirects are restricted, URLs stay encrypted and repeated notifications do not redownload',async()=>{
 for(const url of ['http://apis.garmin.com/wellness-api/rest/activityFile?id=1&token=s','https://evil.test/wellness-api/rest/activityFile?id=1&token=s','https://apis.garmin.com@evil.test/wellness-api/rest/activityFile?id=1&token=s','https://apis.garmin.com/wellness-api/rest/activityFile?id=1&token=s#x'])assert.throws(()=>validateFileCallback(url));
 const f=fixture();try{await connect(f);await f.details.enable(1,'activity');const notification={...summary,userId:'garmin-one',fileType:'FIT',callbackURL:'https://apis.garmin.com/wellness-api/rest/activityFile?id=1&token=private-callback'};await f.details.receive({activityFiles:[notification]});assert.equal(JSON.stringify(f.sqlite.prepare('SELECT * FROM garmin_file_jobs').all()).includes('private-callback'),false);let pulls=0;
 await f.details.processFiles(1,(async(_url:any,options:any)=>{pulls++;assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);return new Response(fit());})as typeof fetch);
 assert.equal((await f.details.run(1,'123'))!.format,'FIT');assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_file_blobs').get()!.n,0);await f.details.receive({activityFiles:[notification]});await f.details.processFiles(1,(async()=>{pulls++;return new Response(fit());})as typeof fetch);assert.equal(pulls,1);
 }finally{f.sqlite.close();}
});
test('health detail allowlists strip unknown fields, distinguish categories and retain overnight sensor series with missing values',async()=>{
 const r=normalizeWellnessDetail('sleeps',health({sleepLevelsMap:{deep:[{startTimeInSeconds:start,endTimeInSeconds:start+30}]},timeOffsetSleepRespiration:{0:15,60:-1},token:'private'}));assert.equal(JSON.stringify(r).includes('private'),false);assert.equal(wellnessSeries(r,'timeOffsetSleepRespiration',1,100)[1].value,null);
 const f=fixture();try{await connect(f);await assert.rejects(f.details.enable(1,'recovery'));await f.health.enable(1);await f.details.enable(1,'recovery');await f.details.receive({hrv:[health()],bloodPressures:[health({measurementTimeInSeconds:start,systolic:120,diastolic:80})]});assert.equal((await f.details.wellness(1)).length,1);await f.details.enable(1,'additional');await f.details.receive({bloodPressures:[health({measurementTimeInSeconds:start,systolic:120,diastolic:80})]});assert.equal((await f.details.wellness(1)).length,2);assert.equal((await f.details.wellness(2)).length,0);await f.health.disable(1);assert.equal((await f.details.wellness(1)).length,0);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_detail_records').get()!.n,0);
 }finally{f.sqlite.close();}
});
test('source deletion tombstones defeat detailed retries, revoke removes records and pending files, account deletion cascades',async()=>{
 const f=fixture();try{await connect(f);await f.details.enable(1,'activity');await f.details.receive({activityDetails:[detail()]});await f.base.deleteActivity(1,'123');await f.details.receive({activityDetails:[detail()]});assert.equal(await f.details.run(1,'123'),null);await f.base.disconnect(1);assert.equal((await f.details.status(1)).grants.length,0);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_detail_chunks').get()!.n,0);f.sqlite.prepare('DELETE FROM users WHERE id=1').run();assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_detail_consents').get()!.n,0);
 }finally{f.sqlite.close();}
});
test('current push names, nutrition and variable-length sleep breathing periods normalize without inventing measurements',()=>{
 assert.equal(normalizeWellnessDetail('pulseox',health({timeOffsetSpo2Values:{0:97}})).kind,'pulseOx');
 assert.equal(normalizeWellnessDetail('allDayRespiration',health({timeOffsetEpochToBreaths:{0:15}})).kind,'respiration');
 const nutrition=normalizeWellnessDetail('nutrition',{summaryId:'n',calendarDate:'2026-11-08',dailyNutritionIntake:{kiloCalories:2100,carbsInGrams:200,token:'secret'},loggedFoods:[{mealConsumedTimeInLocal:'07:30:00',nutritionContentIntake:{proteinInGrams:30}}]});assert.equal(nutrition.data.dailyNutritionIntake.kiloCalories,2100);assert.equal(JSON.stringify(nutrition).includes('secret'),false);
 const breath=normalizeWellnessDetail('breathingVariations',{summaryId:'b',calendarDate:'2026-11-08',variation:'MINIMAL',readings:[{variation:'FEW',startTimeInSeconds:start,endTimeInSeconds:start+60},{variation:'MINIMAL',startTimeInSeconds:start+60,endTimeInSeconds:start+600}]});assert.equal(breath.startAt,new Date(start*1000).toISOString());assert.equal(breath.data.readings[1].endTimeInSeconds-breath.data.readings[1].startTimeInSeconds,540);
});
test('health correction with a changed summary ID replaces its window and shorter late retries do not erase a complete series',async()=>{
 const f=fixture();try{await connect(f);await f.health.enable(1);await f.details.enable(1,'recovery');await f.details.receive({hrv:[health()]});f.advance(1000);await f.details.receive({hrv:[health({summaryId:'corrected',lastNightAvg:45})]});assert.equal((await f.details.wellness(1)).length,1);assert.equal((await f.details.wellness(1))[0].data.lastNightAvg,45);f.advance(1000);await f.details.receive({hrv:[health({summaryId:'shorter',durationInSeconds:300,lastNightAvg:99})]});assert.equal((await f.details.wellness(1))[0].data.lastNightAvg,45);
 }finally{f.sqlite.close();}
});
test('detail HTTP routes require authentication and explicit versioned consent; internal ingest is private',async()=>{
 const f=fixture(),app=express();app.use(express.json());await connect(f);registerGarminRoutes(app,{authenticate:(req,res,next)=>req.headers.authorization==='Bearer fixture'?((req as any).user={id:1},next()):res.sendStatus(401),store:async()=>f.base,config:()=>config});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address()as AddressInfo).port;
 try{for(const path of ['/api/garmin/details/status','/api/garmin/details/run/123','/api/garmin/details/wellness','/api/garmin/details/export'])assert.equal((await fetch(url+path)).status,401);assert.equal((await fetch(url+'/internal/garmin/ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,404);
 const send=(body:object)=>fetch(url+'/api/garmin/details/consent',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture'},body:JSON.stringify(body)});assert.equal((await send({category:'activity',consent:true,version:'old'})).status,400);assert.equal((await send({category:'activity',consent:true,version:'garmin-details-v1',userId:2})).status,200);assert.equal((await f.details.status(2)).grants.length,0);
 }finally{server.close();f.sqlite.close();}
});
