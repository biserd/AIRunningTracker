import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {D1BillingWebhookDelivery} from '../../server/d1/billingWebhookDelivery';
import {deliverBillingWebhook} from '../../server/services/billingWebhookDelivery';
import type {SqlDatabase,SqlStatement} from '../../server/d1/activities';

function setup(){
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync('apps/d1-migration/migrations/0007_billing_webhook_receipts.sql','utf8'));
  const port:SqlDatabase={prepare(sql){let args:(string|number|null)[]=[];
    const statement:SqlStatement={bind(...values){args=values;return statement;},
      async first<T>(){return (db.prepare(sql).get(...args)??null) as T|null;},
      async all<T>(){return {results:db.prepare(sql).all(...args) as T[]};},
      async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};return statement;}};
  return {db,store:new D1BillingWebhookDelivery(port)};
}
const event={id:'evt_test123',type:'customer.subscription.updated'};

test('failed billing processing is retried and completed events are durably deduplicated',async()=>{
  const {db,store}=setup();try{
    await assert.rejects(deliverBillingWebhook(store,event,async()=>{throw new Error('DB_UNAVAILABLE');}),/DB_UNAVAILABLE/);
    assert.equal(db.prepare('SELECT completed_at FROM billing_webhook_receipts').get()?.completed_at,null);
    let calls=0;
    await deliverBillingWebhook(store,event,async()=>{calls++;});
    await deliverBillingWebhook(store,event,async()=>{calls++;});
    assert.equal(calls,1);
    assert.equal(db.prepare('SELECT attempts FROM billing_webhook_receipts').get()?.attempts,2);
    assert.deepEqual(Object.keys(db.prepare('SELECT * FROM billing_webhook_receipts').get()!).sort(),
      ['attempts','completed_at','event_id','event_type','lease_owner','lease_until','received_at']);
  }finally{db.close();}
});

test('concurrent billing delivery is rejected and expired workers cannot acknowledge new owners',async()=>{
  const {db,store}=setup();try{
    assert.equal(await store.claim(event.id,event.type,'first'),'claimed');
    await assert.rejects(deliverBillingWebhook(store,event,async()=>{assert.fail('Must not process');}),/IN_PROGRESS/);
    db.exec('UPDATE billing_webhook_receipts SET lease_until=0');
    assert.equal(await store.claim(event.id,event.type,'second'),'claimed');
    assert.equal(await store.complete(event.id,'first'),false);
    await store.release(event.id,'first');
    assert.equal(db.prepare('SELECT lease_owner FROM billing_webhook_receipts').get()?.lease_owner,'second');
    assert.equal(await store.complete(event.id,'second'),true);
  }finally{db.close();}
});
