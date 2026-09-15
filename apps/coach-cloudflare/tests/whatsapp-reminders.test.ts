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
 const inbound=(id='a',sid=crypto.randomUUID())=>{f.db.prepare("INSERT OR IGNORE INTO whatsapp_inbox(sid,session_id,generation,body,status,created_at) VALUES (?,?,?,'reminder request','processing',?)").run(sid,id,'link-'+id,time);return sid;};
 const create=(sid:string=inbound())=>reminderTool(f.env,'a','link-a','UTC','create_whatsapp_reminder',{title:'Get ready for your run',localTime:f.future()},sid);
 const row=()=>f.db.prepare('SELECT * FROM whatsapp_reminders ORDER BY created_at DESC,rowid DESC LIMIT 1').get()!;
 return {...f,create,inbound,row,deny:()=>denied=true};
}
test('A clear request saves immediately without a code; concurrent/replayed inbound messages create only one reminder',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());const sid=f.inbound();
 const replies=await Promise.all([f.create(sid),f.create(sid)]);
 assert.ok(replies.every(x=>x.startsWith('Done.')));assert.ok(replies.every(x=>!x.includes('YES ')));
 assert.equal(f.row().status,'scheduled');assert.equal(f.row().confirmation_hash,null);
 await f.create(sid);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM whatsapp_reminders').get()!.n,1);
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a','REMINDERS'))!,/Get ready/);
 assert.doesNotMatch((await confirmWhatsAppReminder(f.env,'b','link-b','REMINDERS'))!,/Get ready/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM reminder_contacts').get()!.n,0);
});
test('Immediate cancellation rejects cross-runner IDs, foreign message references and caller identity fields',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());await f.create();const id=String(f.row().id);
 await assert.rejects(reminderTool(f.env,'b','link-b','UTC','cancel_whatsapp_reminder',{reminderId:id},f.inbound('b')));
 await assert.rejects(reminderTool(f.env,'a','link-a','UTC','create_whatsapp_reminder',{title:'x',localTime:f.future(),userId:'b'},f.inbound()));
 await assert.rejects(f.create(f.inbound('b')));
 await assert.rejects(f.create('missing-message'));
 assert.match(await reminderTool(f.env,'a','link-a','UTC','cancel_whatsapp_reminder',{reminderId:id},f.inbound()),/Cancelled/);
 assert.equal(f.row().status,'cancelled');
});
test('Cancel/undo only affects the latest recent reminder and repeated undo never cancels an older one',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());await f.create();const older=f.row().id;const sid=f.inbound();await f.create(sid);const newest=f.row().id;
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a','cancel'))!,/Cancelled/);
 assert.equal(f.row().status,'cancelled');await confirmWhatsAppReminder(f.env,'a','link-a','undo');
 assert.equal(f.db.prepare('SELECT status FROM whatsapp_reminders WHERE id=?').get(older)!.status,'scheduled');
 assert.equal(f.db.prepare('SELECT status FROM whatsapp_reminders WHERE id=?').get(newest)!.status,'cancelled');
 assert.match(await f.create(sid),/already cancelled/);
 assert.equal(f.db.prepare("SELECT disabled FROM whatsapp_links WHERE session_id='a'").get()!.disabled,0);
 f.db.prepare('UPDATE whatsapp_reminders SET created_at=0').run();
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a','cancel'))!,/Which reminder/);
});
test('Stale messages, changed grants, STOP, missing or invalid times and limits fail closed',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());const stale=f.inbound();f.db.prepare('UPDATE whatsapp_inbox SET created_at=0 WHERE sid=?').run(stale);await assert.rejects(f.create(stale));
 await f.create();const id=String(f.row().id);f.db.prepare("UPDATE whatsapp_oauth_grants SET generation='replacement' WHERE session_id='a'").run();
 await assert.rejects(reminderTool(f.env,'a','link-a','UTC','cancel_whatsapp_reminder',{reminderId:id},f.inbound()));
 for(const args of [{title:'x',localTime:'2020-01-01T07:00'},{title:'x'}, {title:'',localTime:f.future()}])await assert.rejects(reminderTool(f.env,'a','link-a','UTC','create_whatsapp_reminder',args,f.inbound()));
 await assert.rejects(reminderTool(f.env,'a','link-a','','create_whatsapp_reminder',{title:'x',localTime:f.future()},f.inbound()));
 for(let i=0;i<9;i++)await f.create();await assert.rejects(f.create());
 await disconnectWhatsApp(f.env,'a');assert.equal(f.db.prepare("SELECT COUNT(*) n FROM whatsapp_reminders WHERE status='scheduled'").get()!.n,0);
 await assert.rejects(f.create());
});
test('Legacy unconfirmed drafts are not auto-scheduled by deployment; old explicit codes remain scoped and single use',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());await f.create();
 f.db.prepare("UPDATE whatsapp_reminders SET status='draft',confirmation_kind='create',confirmation_hash=?,confirmation_expires=?").run(await hash('ABCDEF123456'),Math.floor(Date.now()/1000)+600);
 await deliverWhatsAppReminders(f.env);assert.equal(f.row().status,'draft');
 assert.match((await confirmWhatsAppReminder(f.env,'b','link-b','YES ABCDEF123456'))!,/expired/);
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a','YES ABCDEF123456'))!,/Set\./);
 assert.match((await confirmWhatsAppReminder(f.env,'a','link-a','YES ABCDEF123456'))!,/already used/);
});
test('Due delivery claims once, obeys revocation and never retries ambiguous Twilio sends',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());await f.create();f.db.prepare('UPDATE whatsapp_reminders SET due_at=?').run(Math.floor(Date.now()/1000)-1);
 let sends=0;const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async()=>{sends++;return Response.json({sid:'SM'+'c'.repeat(32)});};
 await Promise.all([deliverWhatsAppReminders(f.env),deliverWhatsAppReminders(f.env)]);assert.equal(sends,1);assert.equal(f.row().status,'sent');
 await f.create();f.db.prepare("UPDATE whatsapp_reminders SET due_at=? WHERE status='scheduled'").run(Math.floor(Date.now()/1000)-1);
 globalThis.fetch=async()=>{sends++;throw new Error('Ambiguous transport failure');};await deliverWhatsAppReminders(f.env);await deliverWhatsAppReminders(f.env);assert.equal(sends,2);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM whatsapp_reminders WHERE status='unknown'").get()!.n,1);
 await f.create();f.db.prepare("UPDATE whatsapp_reminders SET due_at=? WHERE status='scheduled'").run(Math.floor(Date.now()/1000)-1);f.deny();await deliverWhatsAppReminders(f.env);assert.equal(sends,2);
});
test('AI only executes one allowlisted reminder action and cannot change plans',async(t)=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let calls=0;let name='create_whatsapp_reminder';
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.equal(body.tools.length,3);assert.equal(body.parallel_tool_calls,false);assert.match(body.instructions,/Do not ask for a confirmation code/);return Response.json({status:'completed',output:[{type:'function_call',name,arguments:JSON.stringify({title:'Run',localTime:'2026-10-01T07:00'})}]});};
 const state:State={source:'production_account',activities:[],days:[],timezone:'UTC',today:'2026-09-14',goal:'Run comfortably'};
 assert.equal(await whatsappCoach('test',state,[],'Remind me to run',AbortSignal.timeout(5000),async()=>{calls++;return 'Done.';}),'Done.');assert.equal(calls,1);
 name='change_training_plan';await assert.rejects(whatsappCoach('test',state,[],'change my plan',AbortSignal.timeout(5000),async()=>{calls++;return 'unsafe';}));assert.equal(calls,1);
 assert.ok(whatsappReminderTools.every(x=>!x.name.includes('plan')));
});
test('Inbound processing saves on the first message and undo bypasses the model',async(t)=>{
 const f=await setup();t.after(()=>f.db.close());f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 f.db.prepare("UPDATE sessions SET state=? WHERE id='a'").run(JSON.stringify({source:'production_account'}));
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);const messages:string[]=[];let aiCalls=0;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/Indicators/Typing.json'))return Response.json({success:true});
  if(String(url).includes('api.openai.com')){aiCalls++;return Response.json({status:'completed',output:[{type:'function_call',name:'create_whatsapp_reminder',arguments:JSON.stringify({title:'Easy run',localTime:f.future()})}]});}
  messages.push(new URLSearchParams(String(init?.body)).get('Body')!);return Response.json({sid:'SM'+'c'.repeat(32)});
 };
 const enqueue=(sid:string,body:string)=>f.db.prepare('INSERT INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').run(sid,'a','link-a',body,Math.floor(Date.now()/1000));
 enqueue('request','Remind me about my run in five minutes');await processWhatsApp(f.env,'a');assert.equal(f.row().status,'scheduled');assert.equal(aiCalls,1);assert.match(messages[0],/^Done\./);
 await processWhatsApp(f.env,'a');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM whatsapp_reminders').get()!.n,1);
 enqueue('undo','cancel');await processWhatsApp(f.env,'a');assert.equal(f.row().status,'cancelled');assert.equal(aiCalls,1);assert.match(messages[1],/^Cancelled/);
});
