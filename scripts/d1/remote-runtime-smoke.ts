import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {migrationTarget} from './target';
import type {SqlDatabase,SqlStatement} from '../../server/d1/activities';
import {D1SchedulerLeadership} from '../../server/d1/schedulerLeadership';
import {D1BillingWebhookDelivery} from '../../server/d1/billingWebhookDelivery';
import {deliverBillingWebhook} from '../../server/services/billingWebhookDelivery';

// Administrative, fixed isolated D1 target only. No Worker endpoint or provider calls.
const target=migrationTarget();
const db:SqlDatabase={prepare(sql){let params:(string|number|null)[]=[];
  const execute=async()=>(await target.query([{sql,params}]))[0];
  const statement:SqlStatement={bind(...values){params=values;return statement;},
    async first<T>(){return ((await execute()).results[0]??null) as T|null;},
    async all<T>(){return {results:(await execute()).results as T[]};},
    async run(){return {meta:(await execute()).meta??{}};}};return statement;}};
const owner=randomUUID(),successor=randomUUID(),event={id:`evt_migration${randomUUID().replaceAll('-','')}`,type:'migration.test'};
try{
  const run=await db.prepare('SELECT status,manifest_json FROM migration_runs').first<{status:string;manifest_json:string}>();
  assert.equal(run?.status,'verifying');
  assert.equal(JSON.parse(run!.manifest_json).stage,'snapshot_imported_runtime_not_ready');
  assert.equal(await db.prepare("SELECT 1 FROM scheduler_leases WHERE name='application'").first(),null);
  const leadership=new D1SchedulerLeadership(db);
  const first=await leadership.acquire(owner);assert.ok(first);
  assert.equal(await leadership.acquire(successor),null);
  assert.equal(await leadership.renew(first),true);
  await leadership.release(first);
  const second=await leadership.acquire(successor);assert.ok(second);
  assert.equal(await leadership.renew(first),false);
  await leadership.release(first);
  assert.equal(await leadership.renew(second),true);
  console.log(JSON.stringify({check:'remote_d1_scheduler_lease',passed:true}));

  const store=new D1BillingWebhookDelivery(db);
  await assert.rejects(deliverBillingWebhook(store,event,async()=>{throw new Error('SIMULATED_PROCESSING_FAILURE');}),/SIMULATED_PROCESSING_FAILURE/);
  let calls=0;
  await deliverBillingWebhook(store,event,async()=>{calls++;});
  await deliverBillingWebhook(store,event,async()=>{calls++;});
  assert.equal(calls,1);
  console.log(JSON.stringify({check:'remote_d1_billing_retry_and_deduplication',passed:true}));
}catch{
  console.error('REMOTE_RUNTIME_SMOKE_FAILED_DETAILS_REDACTED');process.exitCode=1;
}finally{
  // Remove only this test's synthetic operational records, never application data.
  await db.prepare('DELETE FROM billing_webhook_receipts WHERE event_id=? AND event_type=?').bind(event.id,event.type).run();
  await db.prepare("DELETE FROM scheduler_leases WHERE name='application' AND owner IN (?,?)").bind(owner,successor).run();
}
