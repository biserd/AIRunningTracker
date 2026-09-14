import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {fixture} from './reminder-fixture';
import {whatsappAction,whatsappWebhook,whatsappStatus,sendWhatsApp,validSignature,processWhatsApp} from '../worker/whatsapp';
import {readFileSync} from 'node:fs';
import {seed} from '../shared/coach';
import {draftReminder,reminderAction,deliverReminders} from '../worker/reminders';
function setup(){const f=fixture();Object.assign(f.env,{TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'test-secret',TWILIO_WHATSAPP_FROM:'whatsapp:+14155550100',TWILIO_WHATSAPP_CONTENT_SID:'HX'+'b'.repeat(32)});return f;}
let serial=0;
function request(env:Env,body:string,extra:Record<string,string>={},path='/api/whatsapp/inbound'){
 const form=new URLSearchParams({AccountSid:env.TWILIO_ACCOUNT_SID,MessageSid:'SM'+(++serial).toString(16).padStart(32,'0'),From:'whatsapp:+14155550111',To:env.TWILIO_WHATSAPP_FROM,Body:body,NumMedia:'0',...extra});
 const url=env.PUBLIC_ORIGIN+path;
 const signature=createHmac('sha1',env.TWILIO_AUTH_TOKEN).update(url+[...form.keys()].sort().map(k=>k+form.get(k)).join('')).digest('base64');
 return new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':signature},body:form});
}
async function pair(f:ReturnType<typeof setup>,id='a') {await f.verify(id);const r=await whatsappAction(f.env,id,'connect',{confirm:true});assert.ok(r.url);const body=new URL(r.url).searchParams.get('text')!;return request(f.env,body);}
test('Twilio signatures reject tampering, different URL and duplicate parameters',async()=>{
 const p=new URLSearchParams({Body:'hi',From:'+123'}),url='https://example.test/hook';
 const sig=createHmac('sha1','secret').update(url+'BodyhiFrom+123').digest('base64');
 assert.equal(await validSignature('secret',url,p,sig),true);
 assert.equal(await validSignature('secret',url+'/other',p,sig),false);
 p.append('Body','hi');assert.equal(await validSignature('secret',url,p,sig),false);
});
test('Queued coaching replies use the linked sample session and are not sent twice',async(t)=>{
 const f=setup();t.after(()=>f.db.close());
 f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 f.db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(seed()),'a');
 f.env.OPENAI_API_KEY='test-only';
 await whatsappWebhook(await pair(f),f.env);await whatsappWebhook(request(f.env,'What is next?'),f.env);
 let sends=0;const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 globalThis.fetch=async(url,init)=>{
  if(String(url).startsWith('https://api.openai.com/')) return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Keep the sample run easy.'}]}]});
  sends++;assert.equal(new URLSearchParams(String(init?.body)).get('To'),'whatsapp:+14155550111');return Response.json({sid:'SM'+'c'.repeat(32)});
 };
 await processWhatsApp(f.env);await processWhatsApp(f.env);assert.equal(sends,1);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM coach_messages WHERE session_id=?').get('a')!.n,2);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM coach_messages WHERE session_id=?').get('b')!.n,0);
 assert.equal(f.db.prepare('SELECT body FROM whatsapp_inbox').get()!.body,'');
});
test('Real-account background replies do not expose stale data or bypass entitlements',async(t)=>{
 const f=setup();t.after(()=>f.db.close());await whatsappWebhook(await pair(f),f.env);
 f.env.OPENAI_API_KEY='test-only';
 f.db.exec(readFileSync(new URL('../migrations/0002_ai.sql',import.meta.url),'utf8'));
 f.db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify({source:'production_account',activities:[{private:'must not leak'}]}),'a');
 await whatsappWebhook(request(f.env,'Tell me my latest run'),f.env);
 let sends=0;const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 globalThis.fetch=async(url,init)=>{
   assert.ok(!String(url).includes('openai.com'));sends++;
   assert.ok(!String(init?.body).includes('must not leak'));
   return Response.json({sid:'SM'+'f'.repeat(32)});
 };
 await processWhatsApp(f.env);assert.equal(sends,1);
});
test('Pairing requires verified owner, expires, is single-use and number cannot cross sessions',async(t)=>{
 const f=setup();t.after(()=>f.db.close());
 await assert.rejects(whatsappAction(f.env,'a','connect',{confirm:true}),/Verify/);
 const req=await pair(f);const replay=req.clone() as Request;assert.match(await (await whatsappWebhook(req,f.env)).text(),/Connected/);
 assert.equal((await whatsappStatus(f.env,'a')).connected,true);assert.equal((await whatsappStatus(f.env,'b')).connected,false);
 assert.equal(await (await whatsappWebhook(replay,f.env)).text(),'<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
 const second=await pair(f,'b');assert.match(await (await whatsappWebhook(second,f.env)).text(),/already connected/);
 assert.equal((await whatsappStatus(f.env,'b')).connected,false);
 const expired=await whatsappAction(f.env,'b','connect',{confirm:true});assert.ok(expired.url);
 f.db.prepare('UPDATE whatsapp_links SET token_expires=0 WHERE session_id=?').run('b');
 assert.match(await (await whatsappWebhook(request(f.env,new URL(expired.url).searchParams.get('text')!,{From:'whatsapp:+14155550222'}),f.env)).text(),/expired/);
});
test('WhatsApp reminder is owner-scoped, claimed once, template-safe, and STOP cancels',async(t)=>{
 const f=setup();t.after(()=>f.db.close());await whatsappWebhook(await pair(f),f.env);
 const draft=await draftReminder(f.env,'a',{kind:'create',title:'Lay out kit',localTime:f.future()});
 await f.verify('b');await assert.rejects(reminderAction(f.env,'b','confirm',{id:draft.id,kind:'create',confirm:true,channel:'whatsapp'},'b'));
 await reminderAction(f.env,'a','confirm',{id:draft.id,kind:'create',confirm:true,channel:'whatsapp'},'a');f.due(draft.id);
 let sends=0;const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 globalThis.fetch=async(_url,init)=>{sends++;const data=new URLSearchParams(String(init?.body));assert.equal(data.get('To'),'whatsapp:+14155550111');return Response.json({sid:'SM'+'f'.repeat(32)});};
 await Promise.all([deliverReminders(f.env),deliverReminders(f.env)]);assert.equal(sends,1);assert.equal(f.emails.length,2);
 const link=f.db.prepare('SELECT generation FROM whatsapp_links WHERE session_id=?').get('a')!;
 f.db.prepare('UPDATE whatsapp_links SET last_inbound=0').run();
 globalThis.fetch=async(_url,init)=>{const data=new URLSearchParams(String(init?.body));assert.equal(data.has('Body'),false);assert.equal(data.get('ContentSid'),f.env.TWILIO_WHATSAPP_CONTENT_SID);return Response.json({sid:'SM'+'e'.repeat(32)});};
 await sendWhatsApp(f.env,'a',String(link.generation),'private text',true);
 const pending=await draftReminder(f.env,'a',{kind:'create',title:'Run',localTime:f.future()});await reminderAction(f.env,'a','confirm',{id:pending.id,kind:'create',confirm:true,channel:'whatsapp'},'a');
 await whatsappWebhook(request(f.env,'STOP'),f.env);assert.equal((await whatsappStatus(f.env,'a')).connected,false);assert.equal(f.db.prepare('SELECT status FROM email_reminders WHERE id=?').get(pending.id)!.status,'cancelled');
});
test('Forged webhook has no effect; inbound retries queue only once; callbacks cannot regress',async(t)=>{
 const f=setup();t.after(()=>f.db.close());const good=await pair(f);const bad=new Request(good.clone() as Request,{headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':'invalid'}});
 assert.equal((await whatsappWebhook(bad,f.env)).status,403);await whatsappWebhook(good,f.env);
 const chat=request(f.env,'How should I run?');await whatsappWebhook(chat.clone() as Request,f.env);await whatsappWebhook(chat,f.env);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM whatsapp_inbox').get()!.n,1);
 const draft=await draftReminder(f.env,'a',{kind:'create',title:'Run',localTime:f.future()});
 f.db.prepare("UPDATE email_reminders SET channel='whatsapp',provider_id=?,delivery_status='read' WHERE id=?").run('SM'+'d'.repeat(32),draft.id);
 await whatsappWebhook(request(f.env,'',{MessageSid:'SM'+'d'.repeat(32),MessageStatus:'sent'},'/api/whatsapp/status'),f.env);
 assert.equal(f.db.prepare('SELECT delivery_status FROM email_reminders WHERE id=?').get(draft.id)!.delivery_status,'read');
});
