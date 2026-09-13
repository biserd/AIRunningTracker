import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {D1JobStore,type AtomicSqlDatabase} from '../../server/d1/jobStore';
import type {SqlStatement} from '../../server/d1/activities';
import type {Job} from '../../server/services/queue/jobTypes';
function setup(){
  const db=new DatabaseSync(':memory:');
  for(const file of ['0001_application.sql','0002_migration_support.sql','0006_job_completion.sql'])db.exec(readFileSync(`apps/d1-migration/migrations/${file}`,'utf8'));
  db.exec('INSERT INTO users(id) VALUES(1),(2)');
  const port:AtomicSqlDatabase={prepare(sql){
    let values:(string|number|null)[]=[];
    const statement:SqlStatement={bind(...v){values=v;return statement;},async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},
      async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
    return statement;
  },async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}
    catch(e){db.exec('ROLLBACK');throw e;}}};
  let now=new Date('2026-01-01T01:00:00.000Z');
  return {db,store:new D1JobStore(port,()=>now),advance(){now=new Date(now.getTime()+360000);}};
}
function job(id:string,userId=1):Job{return {id,userId,type:'LIST_ACTIVITIES',data:{page:1,perPage:20,maxActivities:100},
  priority:1,createdAt:new Date('2026-01-01'),scheduledAt:new Date('2026-01-01'),attempts:0,maxAttempts:3,status:'pending'};}
test('enqueue deduplication, atomic completion and replay prevention',async()=>{
  const {db,store}=setup();try{
    await store.enqueue(job('parent'));
    db.exec('UPDATE users SET sync_progress=7 WHERE id=1');await store.enqueue(job('parent'));
    assert.equal(db.prepare('SELECT sync_progress p FROM users WHERE id=1').get()?.p,7);
    await assert.rejects(store.enqueue(job('parent',2)),/JOB_OWNER_MISMATCH/);
    const parent=(await store.claim('worker_owner_one'))!;
    const child={...job('child'),type:'FINALIZE_SYNC',data:{}} as Job;
    await store.complete(parent,'worker_owner_one',[child],{processedCount:3,activitiesCount:2});
    assert.equal(db.prepare('SELECT sync_progress p FROM users WHERE id=1').get()?.p,10);
    await assert.rejects(store.complete(parent,'worker_owner_one',[child],{processedCount:3,activitiesCount:2}),/JOB_LEASE_LOST/);
    assert.equal(db.prepare('SELECT sync_progress p FROM users WHERE id=1').get()?.p,10);
    assert.equal((await store.jobsForUser(2)).pending.length,0);
    assert.equal((await store.stats())?.completed,1);
  }finally{db.close();}
});
test('failed child write rolls back parent completion and progress',async()=>{
  const {db,store}=setup();try{
    await store.enqueue(job('parent'));const parent=(await store.claim('worker_owner_one'))!;
    db.exec("CREATE TRIGGER fail_child BEFORE INSERT ON cloudflare_jobs WHEN NEW.id='child' BEGIN SELECT RAISE(ABORT,'TEST_FAILURE'); END");
    await assert.rejects(store.complete(parent,'worker_owner_one',[job('child')],{processedCount:5,activitiesCount:1}),/TEST_FAILURE/);
    assert.equal(db.prepare("SELECT status s FROM cloudflare_jobs WHERE id='parent'").get()?.s,'processing');
    assert.equal(db.prepare('SELECT count(*) n FROM d1_job_completions').get()?.n,0);
    assert.equal(db.prepare('SELECT sync_progress p FROM users WHERE id=1').get()?.p,0);
  }finally{db.close();}
});
test('expired lease and cross-runner child cannot cause side effects',async()=>{
  const {db,store,advance}=setup();try{
    await store.enqueue(job('parent'));const parent=(await store.claim('worker_owner_one'))!;
    await assert.rejects(store.complete(parent,'worker_owner_one',[job('other',2)]),/JOB_OWNER_OR_BATCH_LIMIT/);
    advance();
    await assert.rejects(store.complete(parent,'worker_owner_one',[job('child')]),/JOB_LEASE_LOST/);
    assert.equal(db.prepare('SELECT count(*) n FROM cloudflare_jobs').get()?.n,1);
  }finally{db.close();}
});
