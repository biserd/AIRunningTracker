import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './reminder-fixture';
import {crypt} from '../worker/whatsapp-oauth';
import {hash} from '../worker/reminders';
import {confirmWhatsAppReminder,reminderTool,deliverWhatsAppReminders,whatsappReminderTools} from '../worker/whatsapp-reminders';
import {disconnectWhatsApp,processWhatsApp} from '../worker/whatsapp';
import {whatsappCoach} from '../worker/whatsapp-coach';
import type {State} from '../shared/coach';
async function setup(){
 const f=fixture(),time=Math.floor(Date.now()/1000);
 Object.assign(f.env,{WHATSAPP_GRANT_KEY:'ab'.repeat(32),OPENAI_API_KEY:'test',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'test',TWILIO_WHATSAPP_FROM:'whatsapp:+14155550100'});
 let denied=false;
 Object.assign(f.env,{BACKEND:{async fetch(url:string,init:RequestInit){
  if(url.endsWith('/revoke'))return new Response('');
  if(denied)return new Response('',{status:401});
  const token=new Headers(init.headers).get('Authorization')!.slice(7);
  return Response.json({result:{structuredContent:{profile:{email:token+'@example.test'}}}});
 }}});
 for(const id of ['a','b']){
  f.db.prepare('INSERT INTO whatsapp_oauth_grants(session_id,client_id,email_hash,credentials,access_expires,expires_at,generation) VALUES (?,?,?,?,?,?,?)').run(id,'client',await hash(id+'@example.test'),await crypt(f.env,id,JSON.stringify({access_token:id,refresh_token:'refresh',expires_in:900})),time+900,time+864000,'grant-'+id);
  f.db.prepare('INSERT INTO whatsapp_links(session_id,generation,token_expires,address,last_inbound,consent_at) VALUES (?,?,?,?,?,?)').run(id,'link-'+id,0,'whatsapp:+1415555011'+(id==='a'?'1':'2'),time,time);
 }
 const draft=()=>reminderTool(f.env,'a','link-a','UTC','prepare_whatsapp_reminder',{title:'Get ready for your run',localTime:f.future()});
 const code=(text:string)=>text.match(/YES ([A-F0-9]{12})/)![0];
 const row=()=>f.db.prepare('SELECT * FROM whatsapp_reminders ORDER BY created_at DESC LIMIT 1').get()!;
 return {...f,draft,code,row,deny:()=>denied=true};
}
test('Prepare, explicit confirmation, replay and list are isolated to the bound runner without email verification',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());const text=await f.draft();assert.match(text,/UTC/);assert.equal(f.row().status,'draft');
 assert.equal(await confirmWhatsAppReminder(f.env,'a','link-a','yes'),null);
 assert.match((await confirmWhatsAppReminder(f.env,'b','link-b',f.code(text)))!,/expired/);assert.equal(f.row().status,'draft');
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a',f.code(text)))!,/Set\./);assert.equal(f.row().status,'scheduled');
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a',f.code(text)))!,/already used/);
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a','REMINDERS'))!,/Get ready/);
 assert.doesNotMatch((await confirmWhatsAppReminder(f.env,'b','link-b','REMINDERS'))!,/Get ready/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM reminder_contacts').get()!.n,0);
});
test('Cancellation requires a fresh confirmation and rejects cross-runner IDs and caller-selected identity',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());await confirmWhatsAppReminder(f.env,'a','link-a',f.code(await f.draft()));const id=String(f.row().id);
 await assert.rejects(reminderTool(f.env,'b','link-b','UTC','prepare_whatsapp_reminder_cancellation',{reminderId:id}));
 await assert.rejects(reminderTool(f.env,'a','link-a','UTC','prepare_whatsapp_reminder',{title:'x',localTime:f.future(),userId:'b'}));
 const cancel=await reminderTool(f.env,'a','link-a','UTC','prepare_whatsapp_reminder_cancellation',{reminderId:id});assert.equal(f.row().status,'scheduled');
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a',f.code(cancel)))!,/Cancelled/);assert.equal(f.row().status,'cancelled');
});
test('Expiry, generation changes, STOP, invalid times and limits fail closed',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());let code=f.code(await f.draft());f.db.prepare('UPDATE whatsapp_reminders SET confirmation_expires=0').run();assert.match((await confirmWhatsAppReminder(f.env,'a','link-a',code))!,/expired/);
 code=f.code(await f.draft());f.db.prepare("UPDATE whatsapp_oauth_grants SET generation='replacement' WHERE session_id='a'").run();assert.match((await confirmWhatsAppReminder(f.env,'a','link-a',code))!,/expired/);
 await assert.rejects(reminderTool(f.env,'a','link-a','UTC','prepare_whatsapp_reminder',{title:'x',localTime:'2020-01-01T07:00'}));
 await assert.rejects(reminderTool(f.env,'a','link-a','','prepare_whatsapp_reminder',{title:'x',localTime:f.future()}));
 for(let i=0;i<8;i++)await f.draft(); // includes the still-pending draft from the replaced grant
 await f.draft();await assert.rejects(f.draft());
 await disconnectWhatsApp(f.env,'a');assert.equal(f.db.prepare("SELECT COUNT(*) n FROM whatsapp_reminders WHERE status='draft'").get()!.n,0);
 await assert.rejects(confirmWhatsAppReminder(f.env,'a','link-a',code));
});
test('Due delivery claims once, obeys revocation and never retries ambiguous Twilio sends',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());await confirmWhatsAppReminder(f.env,'a','link-a',f.code(await f.draft()));f.db.prepare('UPDATE whatsapp_reminders SET due_at=?').run(Math.floor(Date.now()/1000)-1);
 let sends=0;const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async()=>{sends++;return Response.json({sid:'SM'+'c'.repeat(32)});};
 await Promise.all([deliverWhatsAppReminders(f.env),deliverWhatsAppReminders(f.env)]);assert.equal(sends,1);assert.equal(f.row().status,'sent');
 await confirmWhatsAppReminder(f.env,'a','link-a',f.code(await f.draft()));f.db.prepare("UPDATE whatsapp_reminders SET due_at=? WHERE status='scheduled'").run(Math.floor(Date.now()/1000)-1);
 globalThis.fetch=async()=>{sends++;throw new Error('Ambiguous transport failure');};await deliverWhatsAppReminders(f.env);await deliverWhatsAppReminders(f.env);assert.equal(sends,2);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM whatsapp_reminders WHERE status='unknown'").get()!.n,1);
 await confirmWhatsAppReminder(f.env,'a','link-a',f.code(await f.draft()));f.db.prepare("UPDATE whatsapp_reminders SET due_at=? WHERE status='scheduled'").run(Math.floor(Date.now()/1000)-1);f.deny();await deliverWhatsAppReminders(f.env);assert.equal(sends,2);
});
test('AI can only propose one allowlisted action and cannot invoke confirmation',async(t)=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let calls=0;
 let name='prepare_whatsapp_reminder';
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.equal(body.tools.length,3);assert.equal(body.parallel_tool_calls,false);return Response.json({status:'completed',output:[{type:'function_call',name,arguments:JSON.stringify({title:'Run',localTime:'2026-10-01T07:00'})}]});};
 const state:State={source:'production_account',activities:[],days:[],timezone:'UTC',today:'2026-09-14',goal:'Run comfortably'};
 assert.equal(await whatsappCoach('test',state,[],'Remind me to run',AbortSignal.timeout(5000),async()=>{calls++;return 'Confirm this draft';}),'Confirm this draft');assert.equal(calls,1);
 name='confirm_reminder';await assert.rejects(whatsappCoach('test',state,[],'yes',AbortSignal.timeout(5000),async()=>{calls++;return 'unsafe';}));assert.equal(calls,1);
 assert.ok(whatsappReminderTools.every(x=>!x.name.includes('confirm')));
});
test('Inbound processing prepares a reminder and confirms without a second model call',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());
 f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 f.db.prepare("UPDATE sessions SET state=? WHERE id='a'").run(JSON.stringify({source:'production_account'}));
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);const messages:string[]=[];let aiCalls=0;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/Indicators/Typing.json'))return Response.json({success:true});
  if(String(url).includes('api.openai.com')){aiCalls++;return Response.json({status:'completed',output:[{type:'function_call',name:'prepare_whatsapp_reminder',arguments:JSON.stringify({title:'Easy run',localTime:f.future()})}]});}
  messages.push(new URLSearchParams(String(init?.body)).get('Body')!);return Response.json({sid:'SM'+'c'.repeat(32)});
 };
 const enqueue=(sid:string,body:string)=>f.db.prepare('INSERT INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').run(sid,'a','link-a',body,Math.floor(Date.now()/1000));
 enqueue('request','Remind me about my run in five minutes');await processWhatsApp(f.env,'a');assert.equal(f.row().status,'draft');assert.equal(aiCalls,1);
 enqueue('confirmation',f.code(messages[0]));await processWhatsApp(f.env,'a');assert.equal(f.row().status,'scheduled');assert.equal(aiCalls,1);assert.match(messages[1],/^Set\./);
});
