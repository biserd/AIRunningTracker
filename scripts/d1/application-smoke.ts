import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import bcrypt from 'bcrypt';
import assert from 'node:assert/strict';
import {privateDatabaseHandler} from '../../server/d1/transport';
import type {DatabaseCommand,DatabaseResult} from '../../server/d1/database';

// Entirely synthetic application smoke test. Every outbound provider request is blocked.
process.env.NODE_ENV='test';process.env.APP_PLATFORM='cloudflare';process.env.APP_ENV='production';process.env.APP_ROLE='web';
process.env.PORT='5197';process.env.D1_TRANSPORT_SECRET=randomBytes(32).toString('hex');
process.env.JWT_SIGNING_SECRET=randomBytes(32).toString('hex');
process.env.OPENAI_API_KEY='synthetic-test-key-not-a-provider-credential';
const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync('apps/d1-migration/migrations').filter(f=>f.endsWith('.sql')).sort()){
  sqlite.exec(readFileSync(`apps/d1-migration/migrations/${file}`,'utf8'));
}
sqlite.prepare('INSERT INTO users(id,email,password,username) VALUES(?,?,?,?)').run(1,'smoke@example.test',await bcrypt.hash('test-password-123',10),'smoke');
sqlite.prepare('INSERT INTO users(id,email,username) VALUES(?,?,?)').run(2,'other@example.test','other');
sqlite.exec("UPDATE users SET subscription_plan='premium',subscription_status='active' WHERE id=1");
sqlite.prepare("INSERT INTO activities(id,user_id,strava_id,name,type,distance,moving_time,total_elevation_gain,average_speed,max_speed,start_date) VALUES(1,1,'1001','Synthetic run','Run',5000,1800,20,2.77,4,?)").run(new Date().toISOString());
sqlite.exec("INSERT INTO goals(id,user_id,title,description,type) VALUES(1,1,'Own goal','Synthetic goal','distance'),(2,2,'Other goal','Private synthetic goal','distance')");
const execute=async(c:DatabaseCommand):Promise<DatabaseResult>=>{
  try{
    const statement=sqlite.prepare(c.sql);statement.setReturnArrays(true);
    if(c.method==='run')return {rows:[],changes:Number(statement.run(...c.params).changes)};
    const columns=statement.columns().map(c=>c.name),rows=statement.all(...c.params);
    return {rows:c.method==='get'?(rows[0]??[]):rows,columns};
  }catch(error){
    // Synthetic local test only. Report SQL syntax, never parameters.
    console.error('SQL_COMPATIBILITY_FAILURE',c.sql.slice(0,400));throw error;
  }
};
const handler=privateDatabaseHandler({execute,async batch(commands){sqlite.exec('BEGIN');try{
  const results=[];for(const c of commands)results.push(await execute(c));sqlite.exec('COMMIT');return results;
}catch(error){sqlite.exec('ROLLBACK');throw error;}}},process.env.D1_TRANSPORT_SECRET);
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  if(url.hostname==='aitracker.database.internal')return handler(request);
  if(url.hostname==='127.0.0.1'&&url.port==='5197')return originalFetch(request);
  throw new Error('TEST_EXTERNAL_PROVIDER_BLOCKED');
};
await import('../../dist/d1-index.mjs');
const base='http://127.0.0.1:5197';
let ready=false;
for(let attempt=0;attempt<30;attempt++){
  try{if((await fetch(`${base}/health`)).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
}
if(!ready){console.error('APPLICATION_NOT_READY');process.exit(1);}
const login=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'smoke@example.test',password:'test-password-123'})});
const identity=await login.json();
console.log(JSON.stringify({test:'application_login',status:login.status,passed:login.ok&&typeof identity.token==='string'}));
if(!login.ok||typeof identity.token!=='string')process.exit(1);
let failures=0;
for(const [path,expected] of [['/api/auth/identity',200],['/api/user',200],['/api/goals/1',200],['/api/goals/2',403],['/api/activities',200],['/api/dashboard/1',200],['/api/dashboard/2',403],['/api/fitness/1',200],['/api/training/plans',200],['/api/goals/progress/2',403]] as const){
  const response=await fetch(base+path,{headers:{authorization:`Bearer ${identity.token}`}});
  await response.body?.cancel();
  console.log(JSON.stringify({test:path,status:response.status,expected,passed:response.status===expected}));
  if(response.status!==expected)failures++;
}
const request=async(path:string,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{authorization:`Bearer ${identity.token}`,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
try {
  const goals=await (await request('/api/goals/1')).json();
  assert.ok(Array.isArray(goals));
  assert.ok(goals.some((goal:any)=>goal.id===1));
  assert.ok(goals.every((goal:any)=>goal.userId===1));
  assert.equal((await request('/api/goals/2/complete','PATCH')).status,404);
  assert.equal((await request('/api/goals/2','DELETE')).status,200);
  assert.equal(sqlite.prepare('SELECT status FROM goals WHERE id=2').get()?.status,'active');
  const created=await request('/api/goals','POST',{userId:2,title:'Ownership test',description:'Synthetic',type:'distance'});
  assert.equal(created.status,200);
  const ownGoal=await created.json();assert.equal(ownGoal.userId,1);
  assert.equal((await request(`/api/goals/${ownGoal.id}/complete`,'PATCH')).status,200);
  assert.equal(sqlite.prepare('SELECT status FROM goals WHERE id=?').get(ownGoal.id)?.status,'completed');
  assert.equal((await request(`/api/goals/${ownGoal.id}`,'DELETE')).status,200);
  assert.equal(sqlite.prepare('SELECT id FROM goals WHERE id=?').get(ownGoal.id),undefined);
  assert.equal((await request('/api/strava/connect','POST',{userId:2,code:'not-a-real-code'})).status,403);
  console.log(JSON.stringify({test:'application_mutations_and_tenant_isolation',passed:true}));
} catch(error) { failures++;console.error('APPLICATION_ASSERTION_FAILED',error); }
try {
  // Realistic hydrated histories must not overflow the private transport's 8 MB cap.
  const insert=sqlite.prepare("INSERT INTO activities(id,user_id,strava_id,name,type,distance,moving_time,total_elevation_gain,average_speed,max_speed,start_date) VALUES(?,1,?,'Synthetic hydrated run','Run',5000,1800,20,2.77,4,?)");
  for(let id=10;id<30;id++) insert.run(id,String(1000+id),new Date(Date.now()-(id-9)*86400000).toISOString());
  const paths=['/api/activities/heatmap','/api/activities/heatmap?range=6m','/api/runner-score/1','/api/runner-score/1/history'];
  const before=[];
  for(const path of paths){const r=await request(path);assert.equal(r.status,200);before.push(await r.json());}
  sqlite.prepare('UPDATE activities SET streams_data=?,laps_data=?,detailed_polyline=? WHERE user_id=1')
    .run(JSON.stringify({data:'x'.repeat(500000)}),JSON.stringify({laps:'y'.repeat(100000)}),'p'.repeat(10000));
  const bytes=sqlite.prepare('SELECT sum(length(streams_data)+length(laps_data)) AS bytes FROM activities WHERE user_id=1').get()?.bytes;
  assert.ok(Number(bytes)>8_000_000);
  for(const [index,path] of paths.entries()){
    const r=await request(path);assert.equal(r.status,200,path);
    assert.deepEqual(await r.json(),before[index],`${path} must not change with hydration`);
  }
  assert.equal((await request('/api/runner-score/2')).status,403);
  assert.equal((await request('/api/runner-score/2/history')).status,403);
  sqlite.exec("UPDATE users SET strava_connected=1 WHERE id=1; UPDATE activities SET average_cadence=85,average_heartrate=145,max_heartrate=175 WHERE user_id=1");
  const efficiencyResponse=await request('/api/performance/efficiency/1');
  assert.equal(efficiencyResponse.status,200);
  const efficiency=await efficiencyResponse.json();
  assert.ok(efficiency.runsAnalyzed>=3);
  assert.ok(efficiency.averageCadence>0);
  const batchResponse=await request('/api/analytics/batch/1');
  assert.equal(batchResponse.status,200);
  const batch=await batchResponse.json();
  assert.ok(batch.efficiency?.runsAnalyzed>=3);
  assert.ok(batch.hrZones?.heartRateZones);
  assert.equal((await request('/api/performance/efficiency/2')).status,404);
  assert.equal((await request('/api/analytics/batch/2')).status,404);
  const coachResponse=await request('/api/coach/experience?userId=2');
  assert.equal(coachResponse.status,200);
  const coach=await coachResponse.json();
  assert.equal(coach.runner.id,1);
  assert.equal(coach.state.source,'production_account');
  assert.equal(coach.state.activities.length,21);
  assert.ok(coach.state.activities.every((a:any)=>!('streamsData' in a) && !('userId' in a)));
  assert.deepEqual(coach.state.days,[]);
  sqlite.exec("INSERT INTO training_plans_v2(id,user_id,goal_type,total_weeks,status) VALUES(1,1,'5k',1,'active'),(2,2,'marathon',1,'active')");
  const dayDate=new Date().toISOString().slice(0,10)+"T00:00:00.000Z";
  sqlite.prepare("INSERT INTO plan_weeks(id,plan_id,week_number,week_start_date,week_end_date,planned_distance_km,week_type) VALUES(1,1,1,?,?,5,'base')").run(dayDate,dayDate);
  sqlite.prepare("INSERT INTO plan_days(id,week_id,plan_id,date,day_of_week,workout_type,title,planned_duration_mins,status) VALUES(1,1,1,?,'monday','easy','Own planned run',30,'completed')").run(dayDate);
  const withPlan=await (await request('/api/coach/experience?userId=2')).json();
  assert.equal(withPlan.state.days.length,1);
  assert.equal(withPlan.state.days[0].title,'Own planned run');
  assert.equal(withPlan.state.days[0].completed,true);
  assert.equal(withPlan.state.days[0].minutes,30);
  assert.ok(!JSON.stringify(coach).includes('test-password'));
  assert.equal((await fetch(base+'/api/coach/experience')).status,401);
  // Calendar's existing free-user lock filter must still be enforced.
  sqlite.exec("UPDATE users SET subscription_plan='free',subscription_status=NULL WHERE id=1; UPDATE activities SET locked_for_free=1 WHERE id=10");
  const calendar=await (await request('/api/activities/heatmap')).json();
  const ids=calendar.days.flatMap((day:any)=>day.activities.map((a:any)=>a.id));
  assert.ok(ids.includes(11));assert.ok(!ids.includes(10));
  console.log(JSON.stringify({test:'hydrated_dashboard_summaries_and_ownership',passed:true}));
} catch(error) { failures++;console.error('DASHBOARD_SUMMARY_ASSERTION_FAILED',error); }
try {
  // Admin reads must work through the strict D1 parameter boundary, not just PG.
  assert.equal((await request('/api/admin/performance')).status,403);
  sqlite.exec('UPDATE users SET is_admin=1 WHERE id=1');
  sqlite.prepare("INSERT INTO performance_logs(user_id,endpoint,method,status_code,elapsed_time,timestamp,error_message) VALUES(1,'/synthetic','GET',500,12001,?,'Synthetic error')").run(new Date().toISOString());
  const statsResponse=await request('/api/admin/stats');assert.equal(statsResponse.status,200);
  const stats=await statsResponse.json();
  assert.deepEqual(Object.keys(stats).sort(),['connectedUsers','totalActivities','totalUsers']);
  assert.equal(stats.totalUsers,2);assert.equal(stats.totalActivities,21);
  const perfResponse=await request('/api/admin/performance');assert.equal(perfResponse.status,200);
  const perf=await perfResponse.json();assert.equal(perf.telemetryAvailable,true);
  assert.ok(perf.recentErrors.some((row:any)=>row.endpoint==='/synthetic'));
  assert.ok(perf.slowRequests.some((row:any)=>row.endpoint==='/synthetic'));
  assert.equal(perf.performanceTrend.length,6);
  assert.ok(perf.performanceTrend.every((row:any)=>Number.isFinite(Date.parse(row.timestamp))));
  for(const path of ['/api/admin/campaigns/analytics','/api/admin/campaigns/segment-stats']){
    const r=await request(path);assert.equal(r.status,200,path);await r.body?.cancel();
  }
  console.log(JSON.stringify({test:'admin_d1_performance_and_bounded_stats',passed:true}));
} catch(error) { failures++;console.error('ADMIN_ASSERTION_FAILED',error); }
process.exit(failures?1:0);
