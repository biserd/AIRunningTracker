import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,verify} from 'node:crypto';
import {ApplePushService,registration} from '../../server/services/applePush';
import {applePayload,providerToken,type ApplePushMessage} from '../../server/services/applePushTransport';
import type {AtomicSqlDatabase} from '../../server/d1/jobStore';
import type {SqlStatement} from '../../server/d1/activities';
const time=()=>Math.floor(Date.now()/1000);
const input={installation:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',token:'aa'.repeat(32),environment:'production',reminders:true,runs:true};
function setup(status=200){
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2); CREATE TABLE activities(id INTEGER PRIMARY KEY,user_id INTEGER,type TEXT,start_date TEXT,created_at TEXT);');
  db.exec(readFileSync('migrations/20260919_apple_push.sql','utf8'));
  db.exec(readFileSync('migrations/20260919_coach_automation.sql','utf8'));
  const adapter:AtomicSqlDatabase={prepare(sql){let values:(string|number|null)[]=[];const s:SqlStatement={bind(...v){values=v;return s;},async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};return s;},async batch(statements){db.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const sent:ApplePushMessage[]=[];
  const service=new ApplePushService(adapter,{keyId:'test',teamId:'test',privateKey:'test'},async msg=>{sent.push(msg);return {status,reason:status===410?'Unregistered':''};});
  return {db,service,sent};
}
test('APNs token is ES256 with raw 64-byte signature and reusable provider auth',()=>{
  const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const config={keyId:'KEY',teamId:'TEAM',privateKey:keys.privateKey.export({format:'pem',type:'pkcs8'}).toString()};
  const token=providerToken(config,10000),parts=token.split('.');
  assert.equal(Buffer.from(parts[2],'base64url').length,64);
  assert.ok(verify('sha256',Buffer.from(parts.slice(0,2).join('.')),{key:keys.publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')));
  assert.equal(providerToken(config,10001),token);assert.notEqual(providerToken(config,14000),token);
});
test('invalid registration rejected; payload has no runner details or URLs',()=>{
  assert.throws(()=>registration({...input,token:'ExponentPushToken[test]'}));
  assert.throws(()=>registration({...input,runs:'true'}));
  const payload=applePayload({id:'x',token:'secret',generation:'opaque',environment:'production',expires:1,kind:'run'});
  assert.equal(payload.destination,'coach');assert.equal(JSON.stringify(payload).includes('secret'),false);
});
test('device reassignment and unregister are tenant-scoped',async()=>{
  const {service,db}=setup();
  const first=await service.register(1,input,time()+3600);
  await service.unregister(2,input.installation);
  assert.equal(db.prepare('SELECT user_id FROM apple_push_devices').get()?.user_id,1);
  const second=await service.register(2,input,time()+3600);
  assert.notEqual(first.generation,second.generation);
  await service.unregister(1,input.installation);
  assert.equal(db.prepare('SELECT user_id FROM apple_push_devices').get()?.user_id,2);
});
test('new run notification dedupes and excludes another runner and old imports',async()=>{
  const {service,db,sent}=setup();await service.register(1,input,time()+3600);
  db.exec("INSERT INTO activities VALUES(1,1,'Run',datetime('now'),datetime('now')), (2,2,'Run',datetime('now'),datetime('now')), (3,1,'Run',datetime('now','-2 days'),datetime('now'))");
  await service.tick();await service.tick();assert.equal(sent.length,1);assert.equal(sent[0].kind,'run');
});
test('recurring schedules materialize once, remain account scoped, and cancel queued occurrences',async()=>{
 const {service,db,sent}=setup();await service.register(1,input,time()+3600);
 await service.reminder(1,{id:'daily-run',title:'Easy run',dueAt:time()+120,recurrence:'daily',timezone:'America/New_York'});
 assert.equal((await service.reminders(1))[0].recurrence,'daily');
 assert.equal((await service.reminders(2)).length,0);
 const due=time()-60;
 db.prepare('UPDATE coach_reminder_schedules SET next_at=?,anchor_at=?').run(due,due);
 await service.tick();await service.tick();assert.equal(sent.length,1);
 assert.ok(Number(db.prepare('SELECT next_at FROM coach_reminder_schedules').get()?.next_at)>time());
 await service.reminder(2,{id:'daily-run',cancel:true});
 assert.equal(db.prepare('SELECT cancelled FROM coach_reminder_schedules').get()?.cancelled,0);
 await service.reminder(1,{id:'daily-run',cancel:true});
 assert.equal(db.prepare('SELECT cancelled FROM coach_reminder_schedules').get()?.cancelled,1);
 assert.equal(db.prepare('SELECT cancelled FROM apple_push_reminders').get()?.cancelled,1);
});
test('reminder ownership, cancellation and expired devices',async()=>{
  const {service,db,sent}=setup();await service.register(1,input,time()+3600);
  await service.reminder(1,{id:'r1',title:'Run',dueAt:time()+60});
  await service.reminder(2,{id:'r1',cancel:true});assert.equal((await service.reminders(1)).length,1);
  await assert.rejects(service.reminder(2,{id:'r2',title:'Run',dueAt:time()+60}),/Enable notifications/);
  db.exec("UPDATE apple_push_reminders SET due_at=unixepoch()-1");
  await service.tick();await service.tick();assert.equal(sent.length,1);
  await service.reminder(1,{id:'r3',title:'Run',dueAt:time()+60});await service.reminder(1,{id:'r3',cancel:true});
  db.exec("UPDATE apple_push_reminders SET due_at=unixepoch()-1");await service.tick();assert.equal(sent.length,1);
});
test('invalid device removed and disabled preferences prevent delivery',async()=>{
  const {service,db,sent}=setup(410);await service.register(1,{...input,runs:false},time()+3600);
  db.exec("INSERT INTO activities VALUES(1,1,'Run',datetime('now'),datetime('now'))");await service.tick();assert.equal(sent.length,0);
  await service.test(1,input.installation);await service.tick();assert.equal(sent.length,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM apple_push_devices').get()?.n,0);
});
test('retry only explicit transient rejection; uncertain claims not replayed',async()=>{
  const {service,db,sent}=setup(503);await service.register(1,input,time()+3600);await service.test(1,input.installation);await service.tick();
  assert.equal(db.prepare('SELECT state FROM apple_push_outbox').get()?.state,'pending');
  db.exec("UPDATE apple_push_outbox SET state='sending',claimed_at=unixepoch()-180");await service.tick();assert.equal(sent.length,1);assert.equal(db.prepare('SELECT state FROM apple_push_outbox').get()?.state,'unknown');
});
