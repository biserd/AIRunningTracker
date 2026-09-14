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
process.exit(failures?1:0);
