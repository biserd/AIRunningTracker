import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {D1Conversations} from '../../server/d1/conversations';
import type {AtomicSqlDatabase} from '../../server/d1/jobStore';
import type {SqlStatement} from '../../server/d1/activities';

test('conversation queries and atomic deletion enforce runner ownership and rollback',async()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
    const port:AtomicSqlDatabase={prepare(sql){let values:(string|number|null)[]=[];
      const s:SqlStatement={bind(...v){values=v;return s;},async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},
        async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};return s;},
      async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}
        catch(e){db.exec('ROLLBACK');throw e;}}};
    const store=new D1Conversations(port),conversation=(await store.create(1,'Running'))!;
    assert.ok(await store.addMessage(1,conversation.id,'user','What is my next run?'));
    assert.equal(await store.addMessage(2,conversation.id,'user','Not my conversation'),null);
    assert.deepEqual(await store.messages(2,conversation.id),[]);
    assert.equal(await store.get(2,conversation.id),null);
    assert.equal(await store.remove(2,conversation.id),false);
    db.exec("CREATE TRIGGER fail_conversation_delete BEFORE DELETE ON ai_conversations BEGIN SELECT RAISE(ABORT,'TEST_FAILURE'); END");
    await assert.rejects(store.remove(1,conversation.id),/TEST_FAILURE/);
    assert.equal((await store.messages(1,conversation.id)).length,1);
    db.exec('DROP TRIGGER fail_conversation_delete');
    assert.equal(await store.remove(1,conversation.id),true);
    assert.equal(db.prepare('SELECT count(*) n FROM ai_messages').get()?.n,0);
    await assert.rejects(store.list(1,1000),/INVALID_PAGE_LIMIT/);
  }finally{db.close();}
});
