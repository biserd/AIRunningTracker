import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import express from 'express';
import type {AddressInfo} from 'node:net';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {SqlStatement} from '../d1/activities';
import {RunningFeed,registerRunningFeed,runningOverview} from './runningFeed';
import {garminFeedRun,mergeRunningFeed,type FeedRun} from '../../shared/runningFeed';
import type {GarminRun} from '../../shared/garmin';
import {FREE_ACTIVITY_LIMIT} from '../../shared/entitlements';
const g=(id='g1',overrides:Partial<GarminRun>={}):GarminRun=>({id,name:'Garmin morning run',type:'RUNNING',startDate:'2026-11-07T12:00:00.000Z',offsetSeconds:-18000,distance:5000,duration:1800,averageSpeed:5000/1800,averageHeartRate:145,maxHeartRate:165,cadence:170,elevationGain:null,calories:350,device:'Garmin',manual:false,...overrides});
const s=(id='s1',overrides:Partial<FeedRun>={}):FeedRun=>({...garminFeedRun(g()),id,source:'strava',sources:['strava'],name:'Strava run',stravaRecordId:1,garminActivityId:null,detailUrl:'/activity/1',deleteUrl:'/api/activities/1',grade:'B',...overrides});
test('one run on both services counts once, retains the Strava link and both source IDs without modifying either input',()=>{
  const strava=s(),garmin=garminFeedRun(g()),before=JSON.stringify([strava,garmin]);
  const rows=mergeRunningFeed([strava],[garmin]);assert.equal(rows.length,1);assert.deepEqual(rows[0].sources,['strava','garmin']);assert.equal(rows[0].detailUrl,'/activity/1');assert.equal(rows[0].garminActivityId,'g1');assert.equal(rows[0].grade,'B');assert.equal(JSON.stringify([strava,garmin]),before);
  assert.deepEqual(mergeRunningFeed([strava],[garmin]),rows);
});
test('UTC start matching tolerates small timing/GPS differences and uses elapsed time when a run contains stops',()=>{
  const rows=mergeRunningFeed([s('s1',{startDate:'2026-11-07T12:00:30Z',distance:5070,movingTime:1600,elapsedTime:1800})],[garminFeedRun(g())]);assert.equal(rows.length,1);
  assert.equal(mergeRunningFeed([s('s1',{startDate:'2026-11-07T07:00:00-05:00'})],[garminFeedRun(g())]).length,1);
});
test('close but ambiguous candidates, distinct runs, manual entries and missing durations are not silently merged',()=>{
  const ambiguous=mergeRunningFeed([s('s1'),s('s2',{stravaRecordId:2})],[garminFeedRun(g())]);assert.equal(ambiguous.length,3);assert.ok(ambiguous.every(run=>run.possibleDuplicate));
  assert.equal(mergeRunningFeed([s()],[garminFeedRun(g('g2',{startDate:'2026-11-07T13:00:00Z'}))]).length,2);
  assert.equal(mergeRunningFeed([s()],[garminFeedRun(g('g2',{distance:6000}))]).length,2);
  assert.equal(mergeRunningFeed([s()],[garminFeedRun(g('g2',{manual:true}))]).length,2);
  assert.equal(mergeRunningFeed([s()],[garminFeedRun(g('g2',{duration:0}))]).length,2);
});
test('arrival order yields one displayed run and deleting either source reveals the remaining copy',()=>{
  const garmin=garminFeedRun(g());assert.equal(mergeRunningFeed([], [garmin])[0].source,'garmin');
  assert.equal(mergeRunningFeed([s()],[garmin])[0].source,'strava');
  assert.equal(mergeRunningFeed([], [garmin]).length,1);assert.equal(mergeRunningFeed([s()],[]).length,1);
});
function fixture(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,unit_preference TEXT,subscription_plan TEXT,subscription_status TEXT,strava_connected INTEGER);
    INSERT INTO users VALUES(1,'km','premium','active',1),(2,'miles','free','active',0);
    CREATE TABLE activities(id INTEGER PRIMARY KEY,user_id INTEGER,name TEXT,start_date TEXT,type TEXT,distance REAL,moving_time INTEGER,elapsed_time INTEGER,average_speed REAL,average_heartrate REAL,total_elevation_gain REAL,cached_grade TEXT,locked_for_free INTEGER);
    CREATE TABLE garmin_connections(user_id INTEGER PRIMARY KEY,status TEXT);
    CREATE TABLE garmin_activity_summaries(user_id INTEGER,activity_id TEXT,start_date TEXT,summary TEXT,PRIMARY KEY(user_id,activity_id));
    INSERT INTO garmin_connections VALUES(1,'connected'),(2,'connected');`);
  sqlite.exec(readFileSync('apps/d1-migration/migrations/0039_garmin_run_display.sql','utf8'));
  const db:AtomicSqlDatabase={prepare(sql){let params:(string|number|null)[]=[];const statement:SqlStatement={bind(...values){params=values;return statement;},async first<T>(){return (sqlite.prepare(sql).get(...params)??null) as T|null;},async all<T>(){return {results:sqlite.prepare(sql).all(...params) as T[]};},async run(){const result=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(result.changes)}};}};return statement;},async batch(statements){const results=[];for(const statement of statements)results.push(await statement.run());return results;}};
  const addG=(owner:number,run:GarminRun)=>sqlite.prepare('INSERT INTO garmin_activity_summaries VALUES(?,?,?,?)').run(owner,run.id,run.startDate,JSON.stringify(run));
  const addS=(owner:number,id:number,run=g(),locked=0)=>sqlite.prepare('INSERT INTO activities VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,owner,run.name,run.startDate,'Run',run.distance,run.duration,run.duration,run.averageSpeed,run.averageHeartRate,run.elevationGain,'A',locked);
  return {sqlite,db,addG,addS,feed:new RunningFeed(db)};
}
test('owner-scoped storage supports Garmin-only users, caps Strava before filters, and does not expose locked Strava analysis',async()=>{
  const f=fixture();try{
    f.addG(1,g());f.addS(1,1);f.addG(2,g('own'));f.addS(1,2,g('secret',{startDate:'2026-11-07T15:00:00Z'}));
    const onlyGarmin=await f.feed.read(2);assert.equal(onlyGarmin.visible.length,1);assert.equal(onlyGarmin.visible[0].garminActivityId,'own');assert.equal(onlyGarmin.visible[0].grade,null);assert.equal(onlyGarmin.stravaConnected,false);
    f.sqlite.prepare("UPDATE users SET subscription_plan='free' WHERE id=1").run();
    for(let i=0;i<FREE_ACTIVITY_LIMIT+3;i++)f.addS(1,100+i,g('n'+i,{startDate:new Date(Date.parse('2026-11-07T18:00:00Z')-i*86400000).toISOString()}));
    f.addG(1,g('locked',{startDate:'2026-11-07T20:00:00Z'}));f.addS(1,999,g('locked',{startDate:'2026-11-07T20:00:00Z'}),1);
    const feed=await f.feed.read(1);assert.equal(feed.visible.filter(run=>run.source==='strava').length,FREE_ACTIVITY_LIMIT);assert.ok(feed.freeTier);assert.equal(feed.visible.find(run=>run.garminActivityId==='locked')?.grade,null);assert.equal(feed.visible.find(run=>run.garminActivityId==='locked')?.source,'garmin');
    f.sqlite.prepare("UPDATE garmin_connections SET status='disconnect_pending' WHERE user_id=2").run();assert.equal((await f.feed.read(2)).visible.length,0);
  }finally{f.sqlite.close();}
});
test('calendar totals exclude future/old-month rows and count shared runs once, including Garmin-only running time',()=>{
  const now=new Date('2026-11-07T21:00:00Z');
  const rows=mergeRunningFeed([s()],[garminFeedRun(g()),garminFeedRun(g('solo',{startDate:'2026-11-06T12:00:00Z'})),garminFeedRun(g('old',{startDate:'2026-10-01T12:00:00Z'})),garminFeedRun(g('future',{startDate:'2026-12-01T12:00:00Z'}))]);
  const result=runningOverview(rows,'km','30days',now);assert.equal(result.stats.monthlyTotalActivities,2);assert.equal(result.stats.monthlyTotalDistance,'10.0');assert.equal(result.stats.monthlyTotalMinutes,60);assert.equal(result.chartData.reduce((sum,point)=>sum+point.distance,0),10);
  assert.equal(runningOverview([garminFeedRun(g())],'miles','7days',now).stats.monthlyTotalDistance,'3.1');
});
test('history beyond a transport page is read completely and split preferences cascade when a source is deleted',async()=>{
  const f=fixture();try{
    f.sqlite.exec('BEGIN');for(let i=0;i<1002;i++)f.addS(1,i+1,g(String(i),{startDate:new Date(Date.parse('2026-11-07T12:00:00Z')-i*86400000).toISOString()}));f.sqlite.exec('COMMIT');
    const last=g('last',{startDate:new Date(Date.parse('2026-11-07T12:00:00Z')-1001*86400000).toISOString()});f.addG(1,last);
    const feed=await f.feed.read(1);assert.equal(feed.all.length,1002);assert.equal(feed.all.find(run=>run.garminActivityId==='last')?.sources.length,2);
    f.sqlite.prepare('INSERT INTO garmin_run_match_exclusions VALUES(?,?,?,?)').run(1,1002,'last','2026-11-07');assert.equal((await f.feed.read(1)).all.length,1003);
    f.sqlite.prepare('DELETE FROM garmin_activity_summaries WHERE user_id=1 AND activity_id=?').run('last');assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_run_match_exclusions').get()!.n,0);
  }finally{f.sqlite.close();}
});
test('feed routes authenticate, ignore a supplied owner, filter and paginate after matching, and keep Garmin details owner scoped',async()=>{
  const f=fixture(),app=express();app.use(express.json());f.addG(1,g());f.addS(1,1);f.addG(1,g('solo',{startDate:'2026-11-06T12:00:00Z'}));f.addG(2,g('private'));
  registerRunningFeed(app,{authenticate(req,res,next){if(req.get('authorization')!=='Bearer owner')return res.sendStatus(401);(req as any).user={id:1};next();},db:async()=>f.db,now:()=>new Date('2026-11-07T21:00:00Z')});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
  const get=(path:string,auth=true)=>fetch(origin+path,{headers:auth?{Authorization:'Bearer owner'}:{}});
  try{
    for(const path of ['/api/runs','/api/runs/overview','/api/runs/calendar','/api/runs/garmin/g1'])assert.equal((await get(path,false)).status,401);
    const first=await(await get('/api/runs?userId=2&pageSize=1&minDistance=4.9&maxDistance=5.1')).json();assert.equal(first.total,2);assert.equal(first.activities.length,1);assert.deepEqual(first.activities[0].sources,['strava','garmin']);
    const next=await(await get('/api/runs?pageSize=1&page=2')).json();assert.equal(next.activities[0].garminActivityId,'solo');
    assert.equal((await get('/api/runs/garmin/private')).status,404);assert.equal((await get('/api/runs/garmin/g1')).status,200);
    const calendar=await(await get('/api/runs/calendar')).json();assert.equal(calendar.days.find((day:any)=>day.date==='2026-11-07')?.activities.length,1);
    for(const path of ['/api/runs?pageSize=1000','/api/runs?minDistance=-1','/api/runs?startDate=2026-02-31','/api/runs/overview?range=forever'])assert.equal((await get(path)).status,400);
    const preference=(method:string,garminActivityId='g1',auth=true)=>fetch(origin+'/api/runs/keep-separate',{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer owner'}:{})},body:JSON.stringify({userId:2,stravaRecordId:1,garminActivityId})});
    assert.equal((await preference('POST','g1',false)).status,401);assert.equal((await preference('POST','private')).status,404);
    assert.equal((await preference('POST')).status,200);assert.equal((await preference('POST')).status,200);
    assert.equal((await(await get('/api/runs')).json()).total,3);
    assert.equal((await preference('DELETE')).status,200);assert.equal((await(await get('/api/runs')).json()).total,2);
    // Reads never merge, rewrite or delete either stored source or analysis grade.
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM activities').get()!.n,1);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM garmin_activity_summaries').get()!.n,3);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));f.sqlite.close();}
});
