import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {waitlistInput,joinWaitlist,leaveWaitlist,deliverLaunch} from '../worker/waitlist';
test('waitlist consent, normalization and bot validation',()=>{
  assert.equal(waitlistInput({email:' RUNNER@example.com ',consent:true}),'runner@example.com');
  assert.throws(()=>waitlistInput({email:'runner@example.com',consent:false}));
  assert.throws(()=>waitlistInput({email:'bad\n@example.com',consent:true}));
  assert.equal(waitlistInput({website:'spam'}),null);
});
test('dedupe, optout, disabled launch, one-time delivery and uncertain outcomes',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0004_waitlist.sql',import.meta.url),'utf8'));
  let sends=0;
  const env=Object.assign({} as Env,{REMINDER_FROM:'test@example.com',REMINDER_EMAIL:{async send(){sends++;return {messageId:'test'};}},DB:{prepare(sql:string){let args: (string|number)[]=[];return {bind(...values:(string|number)[]){args=values;return this;},async run(){return db.prepare(sql).run(...args);},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};}};}}});
  try {
    await joinWaitlist(env,'runner@example.com');await joinWaitlist(env,'runner@example.com');
    assert.equal(db.prepare('SELECT count(*) AS n FROM coach_waitlist').get()?.n,1);
    await deliverLaunch(env);assert.equal(sends,0);
    const token=db.prepare('SELECT unsubscribe_token FROM coach_waitlist').get()?.unsubscribe_token;
    await leaveWaitlist(env,token);await joinWaitlist(env,'runner@example.com');
    db.exec('UPDATE coach_launch SET enabled=1,cutoff_at=2000000000');
    await deliverLaunch(env);assert.equal(sends,0);
    await joinWaitlist(env,'second@example.com');await deliverLaunch(env);await deliverLaunch(env);
    assert.equal(sends,1);
    assert.equal(db.prepare("SELECT launch_status FROM coach_waitlist WHERE email='second@example.com'").get()?.launch_status,'accepted');
    env.REMINDER_EMAIL.send=async()=>{throw new Error('unknown');};
    await joinWaitlist(env,'third@example.com');await deliverLaunch(env);
    assert.equal(db.prepare("SELECT launch_status FROM coach_waitlist WHERE email='third@example.com'").get()?.launch_status,'review');
  } finally {db.close();}
});
