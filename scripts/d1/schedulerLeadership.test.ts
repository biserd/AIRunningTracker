import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {D1SchedulerLeadership} from '../../server/d1/schedulerLeadership';
import type {SqlDatabase,SqlStatement} from '../../server/d1/activities';

test('D1 scheduler has one owner and old generations cannot renew or release a successor',async()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(readFileSync('apps/d1-migration/migrations/0008_scheduler_leases.sql','utf8'));
    const port:SqlDatabase={prepare(sql){let args:(string|number|null)[]=[];
      const s:SqlStatement={bind(...values){args=values;return s;},
        async first<T>(){return (db.prepare(sql).get(...args)??null) as T|null;},
        async all<T>(){return {results:db.prepare(sql).all(...args) as T[]};},
        async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};return s;}};
    const leadership=new D1SchedulerLeadership(port);
    const first=(await leadership.acquire('first_owner_123456'))!;
    assert.ok(first);
    assert.equal(await leadership.acquire('second_owner_12345'),null);
    assert.equal(await leadership.renew(first),true);
    db.exec('UPDATE scheduler_leases SET expires_at=0');
    assert.equal(await leadership.renew(first),false);
    const second=(await leadership.acquire('second_owner_12345'))!;
    assert.equal(second.generation,first.generation+1);
    await leadership.release(first);
    assert.equal(await leadership.renew(second),true);
    await leadership.release(second);
    assert.ok(await leadership.acquire('third_owner_123456'));
  }finally{db.close();}
});
