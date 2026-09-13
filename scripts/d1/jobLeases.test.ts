import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { D1JobLeases } from '../../server/d1/jobLeases';
import type {SqlDatabase,SqlStatement} from '../../server/d1/activities';

test('atomic claims, lease loss and retry exhaustion',async()=>{
  const db=new DatabaseSync(':memory:');
  for(const file of ['0001_application.sql','0002_migration_support.sql'])db.exec(readFileSync(`apps/d1-migration/migrations/${file}`,'utf8'));
  db.exec("INSERT INTO users(id) VALUES(1); INSERT INTO cloudflare_jobs(id,user_id,type,data,priority,scheduled_at,max_attempts) VALUES('job',1,'FINALIZE_SYNC','{}',1,'2026-01-01T00:00:00.000Z',2)");
  const adapter:SqlDatabase={prepare(sql){
    let values:(string|number|null)[]=[];
    const statement:SqlStatement={bind(...v){values=v;return statement;},async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};return statement;
  }};
  let now=new Date('2026-01-01T01:00:00.000Z');
  const leases=new D1JobLeases(adapter,()=>now);
  const first=await leases.claim('worker_owner_one');
  assert.equal(first?.attempts,1);
  assert.equal(await leases.claim('worker_owner_two'),null);
  assert.equal(await leases.heartbeat('job','worker_owner_two'),false);
  now=new Date('2026-01-01T01:06:00.000Z');
  assert.equal((await leases.claim('worker_owner_two'))?.attempts,2);
  assert.equal(await leases.fail('job','worker_owner_one',null),false);
  now=new Date('2026-01-01T01:12:00.000Z');
  assert.equal(await leases.claim('worker_owner_one'),null);
  assert.equal(db.prepare("SELECT status FROM cloudflare_jobs WHERE id='job'").get()?.status,'failed');
  db.close();
});
