import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maintainTyping,typing} from '../worker/whatsapp-typing';
import {fixture} from './reminder-fixture';

test('Typing repeats while working and stops without waiting for the next interval',async()=>{
 let calls=0;let reached!:()=>void;const twice=new Promise<void>(resolve=>reached=resolve);
 const stop=maintainTyping(async()=>{if(++calls===2)reached();},5);
 await twice;await stop();const count=calls;
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(calls,count);assert.equal(count,2);
});
test('Typing records accepted/rejected/timeout outcomes without logging sensitive response fields',async(t)=>{
 const f=fixture();t.after(()=>f.db.close());
 const sid='SM'+'a'.repeat(32);
 f.db.prepare('INSERT INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').run(sid,'a','g','private question',1);
 Object.assign(f.env,{TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'private-secret'});
 const original=globalThis.fetch,log=console.log;const logs:string[]=[];
 t.after(()=>{globalThis.fetch=original;console.log=log;});console.log=(s:string)=>logs.push(s);
 globalThis.fetch=async(url,init)=>{
  assert.equal(String(url),'https://messaging.twilio.com/v3/Indicators/Typing.json');
  assert.equal(new Headers(init?.headers).get('Content-Type'),'application/json');
  assert.deepEqual(JSON.parse(String(init?.body)),{messageId:sid,channel:'WHATSAPP'});
  return Response.json({success:true});
 };await typing(f.env,sid);
 let row=f.db.prepare('SELECT * FROM whatsapp_inbox WHERE sid=?').get(sid)!;
 assert.equal(row.typing_accepted,1);assert.equal(row.typing_last_outcome,'accepted');
 globalThis.fetch=async()=>Response.json({code:20003,message:'private-secret private question',details:{phone:'+14155550111'}},{status:401});
 await typing(f.env,sid);row=f.db.prepare('SELECT * FROM whatsapp_inbox WHERE sid=?').get(sid)!;
 assert.equal(row.typing_attempts,2);assert.equal(row.typing_last_status,401);assert.equal(row.typing_last_code,20003);assert.equal(row.typing_last_outcome,'rejected');
 globalThis.fetch=async()=>{throw new DOMException('private-secret','TimeoutError');};await typing(f.env,sid);
 assert.equal(f.db.prepare('SELECT typing_last_outcome FROM whatsapp_inbox WHERE sid=?').get(sid)!.typing_last_outcome,'timeout');
 assert.ok(!logs.join('').includes('private'));assert.ok(!logs.join('').includes(sid));assert.ok(!logs.join('').includes('14155550111'));
});
test('Stopping aborts an in-flight indicator; cosmetic failures do not escape',async()=>{
 let aborted=false;
 const stop=maintainTyping(signal=>new Promise<void>(resolve=>signal.addEventListener('abort',()=>{aborted=true;resolve();},{once:true})));
 await stop();assert.equal(aborted,true);
 await maintainTyping(async()=>{throw new Error('unavailable');})();
});
