import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './reminder-fixture';
import {seed} from '../shared/coach';
import {processWhatsApp,consumeWhatsApp,recoverWhatsApp,disconnectWhatsApp} from '../worker/whatsapp';
import {whatsappCoach} from '../worker/whatsapp-coach';

function setup(){
 const f=fixture();
 f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 Object.assign(f.env,{OPENAI_API_KEY:'test',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'test',TWILIO_WHATSAPP_FROM:'whatsapp:+14155550100'});
 const time=Math.floor(Date.now()/1000);
 for(const [id,phone] of [['a','111'],['b','222']]){
  f.db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(seed()),id);
  f.db.prepare('INSERT INTO whatsapp_links(session_id,generation,token_expires,address,last_inbound,consent_at) VALUES (?,?,?,?,?,?)').run(id,'g-'+id,0,'whatsapp:+14155550'+phone,time,time);
 }
 let count=0;
 const insert=(id:string,body:string)=>{
  const sid='SM'+(++count).toString(16).padStart(32,'0');
  f.db.prepare('INSERT INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').run(sid,id,'g-'+id,body,time);
  return sid;
 };
 return {...f,insert};
}
function event(body:unknown){
 let ack=0;const retries:number[]=[];
 const message:Message<unknown>={id:'queue-id',body,timestamp:new Date(),attempts:1,ack(){ack++;},retry(options){retries.push(options?.delaySeconds??0);}};
 const batch:MessageBatch<unknown>={queue:'aitracker-coach-whatsapp',metadata:{metrics:{backlogCount:1,backlogBytes:0}},messages:[message],ackAll(){message.ack();},retryAll(options){message.retry(options);}};
 return {batch,acks:()=>ack,retries};
}
const answer=(text:string)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]});
const sent=()=>Response.json({sid:'SM'+'e'.repeat(32)});

test('Same-runner replies serialize in inbox order; other runners do not wait',async(t)=>{
 const f=setup();t.after(()=>f.db.close());const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 const first=f.insert('a','first'),second=f.insert('a','second');f.insert('b','other');
 let release!:()=>void,start!:()=>void;
 const blocked=new Promise<void>(r=>release=r),started=new Promise<void>(r=>start=r);
 const sends:string[]=[];let aiCalls=0,typingCalls=0;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/Indicators/Typing.json')){typingCalls++;return Response.json({success:true});}
  if(String(url).includes('openai.com')){
   aiCalls++;const body=JSON.parse(String(init?.body));assert.equal(body.model,'gpt-5.6-luna');assert.deepEqual(body.reasoning,{effort:'low'});assert.deepEqual(body.tools,[]);assert.equal(body.tool_choice,'none');
   const question=body.input.at(-1).content;
   if(question==='first'){start();await blocked;}
   if(question==='second')assert.ok(body.input.some((x:{role:string;content:string})=>x.role==='assistant'&&x.content==='reply-first'));
   if(question==='other')assert.ok(!JSON.stringify(body.input).includes('reply-first'));
   return answer('reply-'+question);
  }
  sends.push(new URLSearchParams(String(init?.body)).get('Body')!);return sent();
 };
 // Even if Queue delivers second first, the server drains the earliest inbox row.
 const delivery=event({sid:second,userId:'b'});
 const running=consumeWhatsApp(delivery.batch,f.env);await started;
 const duplicate=event({sid:first});await consumeWhatsApp(duplicate.batch,f.env);assert.deepEqual(duplicate.retries,[5]);
 await processWhatsApp(f.env,'b');assert.equal(sends.length,1);assert.match(sends[0],/reply-other/);
 release();await running;assert.equal(delivery.acks(),1);assert.equal(aiCalls,3);assert.equal(typingCalls,3);
 assert.match(sends[1],/reply-first/);assert.match(sends[2],/reply-second/);
 const again=event({sid:first});await consumeWhatsApp(again.batch,f.env);assert.equal(sends.length,3);
 const rows=f.db.prepare('SELECT status,body,started_at_ms,finished_at_ms,queue_ms,ai_ms FROM whatsapp_inbox').all();
 assert.ok(rows.every(r=>r.status==='done'&&r.body===''&&Number(r.finished_at_ms)>=Number(r.started_at_ms)&&Number(r.queue_ms)>=0&&Number(r.ai_ms)>=0));
});

test('Failed typing is cosmetic; ambiguous outbound failure is never resent',async(t)=>{
 const f=setup();t.after(()=>f.db.close());const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 const sid=f.insert('a','question');let sends=0,ai=0;
 globalThis.fetch=async(url)=>{
  if(String(url).includes('/Indicators/Typing.json'))throw new Error('unavailable');
  if(String(url).includes('openai.com')){ai++;return answer('Go easy.');}
  sends++;throw new Error('Network lost after provider may have accepted');
 };
 const a=event({sid});await consumeWhatsApp(a.batch,f.env);
 const b=event({sid});await consumeWhatsApp(b.batch,f.env);
 assert.equal(a.acks(),1);assert.equal(b.acks(),1);assert.equal(sends,1);assert.equal(ai,1);
 assert.deepEqual({...f.db.prepare('SELECT status,body,failure_stage FROM whatsapp_inbox').get()},{status:'failed',body:'',failure_stage:'delivery'});
});

test('STOP during AI preparation prevents delivery and cancels following work',async(t)=>{
 const f=setup();t.after(()=>f.db.close());const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 f.insert('a','question');f.insert('a','follow-up');let sends=0;
 globalThis.fetch=async(url)=>{
  if(String(url).includes('/Indicators/Typing.json'))return Response.json({success:true});
  if(String(url).includes('openai.com')){await disconnectWhatsApp(f.env,'a');return answer('Private reply');}
  sends++;return sent();
 };
 await processWhatsApp(f.env,'a');assert.equal(sends,0);
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM whatsapp_inbox WHERE status='failed'").get()!.n,2);
});

test('Recovery wakes pending messages, expires crashed claims, and never replays uncertain sends',async(t)=>{
 const f=setup();t.after(()=>f.db.close());const sid=f.insert('a','old');
 f.db.prepare("UPDATE whatsapp_inbox SET status='processing',started_at_ms=? WHERE sid=?").run(Date.now()-601000,sid);
 const next=f.insert('a','next');await recoverWhatsApp(f.env);
 assert.equal(f.db.prepare('SELECT status FROM whatsapp_inbox WHERE sid=?').get(sid)!.status,'failed');
 assert.deepEqual(f.queued,[{sid:next}]);
 const invalid=event({sid:'wrong',session_id:'a'});await consumeWhatsApp(invalid.batch,f.env);assert.equal(invalid.acks(),1);
 const missing=event({sid:'SM'+'f'.repeat(32)});await consumeWhatsApp(missing.batch,f.env);assert.equal(missing.acks(),1);
});

test('WhatsApp never executes model tool requests and gives the context on the first request',async(t)=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let calls=0;
 globalThis.fetch=async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));assert.ok(body.input[0].content.includes('activityEvidence'));assert.deepEqual(body.tools,[]);
  return Response.json({status:'completed',output:[{type:'function_call',name:'preview_plan_change'}]});
 };
 await assert.rejects(whatsappCoach('test',seed(),[],'change my plan',AbortSignal.timeout(1000)));assert.equal(calls,1);
});
