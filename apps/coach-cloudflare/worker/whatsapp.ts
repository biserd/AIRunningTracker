import { budget, hash, ReminderError } from './reminders';
import { boundedJSON } from './openai';
import { whatsappCoach } from './whatsapp-coach';
import { history } from './ai';
import type { State } from '../shared/coach';
import {hasGrant,oauthConfigured,revokeGrant,whatsappContext,validateGrant} from './whatsapp-oauth';

const now = () => Math.floor(Date.now()/1000);
const addressPattern = /^whatsapp:\+[1-9][0-9]{7,14}$/;
type Link = { session_id:string; generation:string; address:string|null; last_inbound:number; disabled:number };
export const whatsappConfigured = (env:Env) => /^AC[a-f0-9]{32}$/i.test(env.TWILIO_ACCOUNT_SID || '') && !!env.TWILIO_AUTH_TOKEN && addressPattern.test(env.TWILIO_WHATSAPP_FROM || '');
const templateReady = (env:Env) => /^HX[a-f0-9]{32}$/i.test(env.TWILIO_WHATSAPP_CONTENT_SID || '');
export async function activeLink(env:Env, id:string) {
 return env.DB.prepare("SELECT w.* FROM whatsapp_links w JOIN sessions s ON s.id=w.session_id WHERE w.session_id=? AND w.disabled=0 AND w.address IS NOT NULL AND s.expires_at>?").bind(id,now()).first<Link>();
}
export async function whatsappStatus(env:Env,id:string) {
 const link = await activeLink(env,id);
 return { configured:whatsappConfigured(env)&&oauthConfigured(env), authorized:await hasGrant(env,id), connected:!!link, destination:link?.address ? 'WhatsApp ending '+link.address.slice(-4) : null, templateReady:templateReady(env) };
}
export async function disconnectWhatsApp(env:Env,id:string) {
 await env.DB.batch([
  env.DB.prepare("UPDATE whatsapp_links SET disabled=1,address=NULL,token_hash=NULL WHERE session_id=?").bind(id),
  env.DB.prepare("UPDATE email_reminders SET status='cancelled' WHERE session_id=? AND channel='whatsapp' AND status IN ('draft','scheduled')").bind(id),
  env.DB.prepare("UPDATE whatsapp_inbox SET status='failed',body='' WHERE session_id=? AND status='pending'").bind(id),
 ]);
 await revokeGrant(env,id);
}
export async function whatsappAction(env:Env,id:string,path:string,input:Record<string,unknown>) {
 if (input.confirm!==true || Object.keys(input).some(k=>k!=='confirm')) throw new ReminderError('Explicit confirmation is required.');
 if(path==='disconnect') { await disconnectWhatsApp(env,id); return {ok:true}; }
 if(path!=='connect') throw new ReminderError('Not found.',404);
 if(!whatsappConfigured(env)) throw new ReminderError('WhatsApp is waiting for site-owner setup.',503);
 const session=await env.DB.prepare('SELECT state FROM sessions WHERE id=?').bind(id).first<{state:string}>();
 if(JSON.parse(session?.state||'{}').source==='production_account'){
  await validateGrant(env,id);
 }else{
  const c=await env.DB.prepare('SELECT session_id FROM reminder_contacts WHERE session_id=? AND verified_at IS NOT NULL AND disabled=0').bind(id).first();
  if(!c)throw new ReminderError('Verify your email first.',409);
 }
 if(await activeLink(env,id)) throw new ReminderError('Disconnect WhatsApp before linking another number.',409);
 if(!await budget(env,'wa-pair:'+id,5,3600)) throw new ReminderError('Please wait before creating another link.',429);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare("INSERT INTO whatsapp_links(session_id,generation,token_hash,token_expires,consent_at) VALUES (?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET generation=excluded.generation,token_hash=excluded.token_hash,token_expires=excluded.token_expires,consent_at=excluded.consent_at,address=NULL,disabled=0,last_inbound=0").bind(id,crypto.randomUUID(),await hash(token),now()+600,now()).run();
 return {url:'https://wa.me/'+env.TWILIO_WHATSAPP_FROM.slice(10)+'?text='+encodeURIComponent('LINK '+token), expiresIn:600};
}
export async function validSignature(secret:string,url:string,form:URLSearchParams,signature:string) {
 if(!/^[A-Za-z0-9+/]{27}=$/.test(signature)) return false;
 const keys=[...new Set(form.keys())].sort();
 // Reject ambiguous duplicate fields rather than accepting an alternate parse.
 if(keys.some(k=>form.getAll(k).length!==1)) return false;
 const data=url+keys.map(k=>k+form.get(k)).join('');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-1'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(signature),c=>c.charCodeAt(0)),new TextEncoder().encode(data));
}
const xml=(message='') => new Response('<?xml version="1.0" encoding="UTF-8"?><Response>'+(message?'<Message>'+message.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!))+'</Message>':'')+'</Response>',{headers:{'Content-Type':'text/xml','Cache-Control':'no-store'}});
export async function whatsappWebhook(request:Request,env:Env) {
 const url=new URL(request.url), path=url.pathname;
 if(!whatsappConfigured(env)) return new Response('Unavailable',{status:503});
 if(request.method!=='POST') return new Response('Method not allowed',{status:405});
 if(url.search || !request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return new Response('Invalid request',{status:400});
 const reader=request.body?.getReader(); let size=0,text=''; const decoder=new TextDecoder();
 if(reader) { try { while(true) { const p=await reader.read(); if(p.done) break; size+=p.value.length; if(size>16384) return new Response('Too large',{status:413}); text+=decoder.decode(p.value,{stream:true}); } text+=decoder.decode(); } finally {await reader.cancel();} }
 const form=new URLSearchParams(text);
 if(!await validSignature(env.TWILIO_AUTH_TOKEN,env.PUBLIC_ORIGIN+path,form,request.headers.get('X-Twilio-Signature')||'') || form.get('AccountSid')!==env.TWILIO_ACCOUNT_SID) return new Response('Forbidden',{status:403});
 const sid=form.get('MessageSid')||'';
 if(!/^SM[a-f0-9]{32}$/i.test(sid)) return new Response('Invalid message',{status:400});
 if(path==='/api/whatsapp/status') {
  const status=form.get('MessageStatus')||'';
  const rank:Record<string,number>={queued:1,sending:2,sent:3,failed:4,undelivered:4,delivered:5,read:6};
  if(!rank[status]) return xml();
  await env.DB.prepare("UPDATE email_reminders SET delivery_status=? WHERE provider_id=? AND channel='whatsapp' AND CASE delivery_status WHEN 'queued' THEN 1 WHEN 'sending' THEN 2 WHEN 'sent' THEN 3 WHEN 'failed' THEN 4 WHEN 'undelivered' THEN 4 WHEN 'delivered' THEN 5 WHEN 'read' THEN 6 ELSE 0 END < ?").bind(status,sid,rank[status]).run();
  return xml();
 }
 const from=form.get('From')||'', body=(form.get('Body')||'').trim();
 if(!addressPattern.test(from) || form.get('To')!==env.TWILIO_WHATSAPP_FROM) return new Response('Forbidden',{status:403});
 const receipt=await env.DB.prepare('INSERT OR IGNORE INTO whatsapp_receipts(sid,created_at) VALUES (?,?)').bind(sid,now()).run();
 if(!receipt.meta.changes) {
  // A previous webhook may have saved the inbox row but failed to publish.
  // A duplicate wakeup is safe; the inbox and conversation lease deduplicate it.
  const pending=await env.DB.prepare("SELECT sid FROM whatsapp_inbox WHERE sid=? AND status='pending'").bind(sid).first();
  if(pending)await wakeWhatsApp(env,sid);
  return xml();
 }
 if(/^(STOP|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(body) || form.get('OptOutType')==='STOP') {
  const link=await env.DB.prepare('SELECT session_id FROM whatsapp_links WHERE address=?').bind(from).first<{session_id:string}>();
  if(link) await disconnectWhatsApp(env,link.session_id);
  return xml();
 }
 if(!await budget(env,'wa-in:'+await hash(from),20,60)) return xml();
 if(/^LINK [a-f0-9]{48}$/.test(body)) {
  // A number cannot be rebound to another live preview by presenting another token.
  const existing=await env.DB.prepare('SELECT session_id FROM whatsapp_links WHERE address=?').bind(from).first();
  if(existing) return xml('This number is already connected. Disconnect it in your preview Settings first.');
  const linked=await env.DB.prepare("UPDATE whatsapp_links SET address=?,last_inbound=?,token_hash=NULL WHERE token_hash=? AND token_expires>? AND address IS NULL AND disabled=0 AND EXISTS(SELECT 1 FROM sessions s WHERE s.id=whatsapp_links.session_id AND s.expires_at>? AND (EXISTS(SELECT 1 FROM whatsapp_oauth_grants g WHERE g.session_id=s.id AND g.expires_at>?) OR (COALESCE(json_extract(s.state,'$.source'),'')!='production_account' AND EXISTS(SELECT 1 FROM reminder_contacts c WHERE c.session_id=s.id AND c.verified_at IS NOT NULL AND c.disabled=0)))) RETURNING session_id").bind(from,now(),await hash(body.slice(5)),now(),now(),now()).first();
  return xml(linked?'You\'re connected. Ask me about your runs or training plan. Send STOP anytime to disconnect.':'This link expired or was already used. Create a new link in Settings.');
 }
 const link=await env.DB.prepare('SELECT w.* FROM whatsapp_links w JOIN sessions s ON s.id=w.session_id WHERE w.address=? AND w.disabled=0 AND s.expires_at>?').bind(from,now()).first<Link>();
 if(!link) return xml();
 await env.DB.prepare('UPDATE whatsapp_links SET last_inbound=? WHERE session_id=? AND generation=? AND disabled=0').bind(now(),link.session_id,link.generation).run();
 if(!body || body.length>2000 || form.get('NumMedia')!=='0') return xml('Please send text of up to 2,000 characters. Voice notes and images are not supported in this preview.');
 if(!await budget(env,'wa-chat:'+link.session_id,30,86400) || !await budget(env,'wa-chat-global',300,86400)) return xml();
 await env.DB.prepare('INSERT OR IGNORE INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').bind(sid,link.session_id,link.generation,body,now()).run();
 await wakeWhatsApp(env,sid);
 return xml();
}
export async function sendWhatsApp(env:Env,id:string,generation:string,text:string,reminder=false) {
 const link=await activeLink(env,id);
 if(!whatsappConfigured(env) || !link || link.generation!==generation) throw new Error('WhatsApp unavailable');
 if(!await budget(env,'wa-send:'+id,60,86400) || !await budget(env,'wa-send-global',500,86400)) throw new Error('WhatsApp budget');
 const form=new URLSearchParams({From:env.TWILIO_WHATSAPP_FROM,To:link.address!,StatusCallback:env.PUBLIC_ORIGIN+'/api/whatsapp/status'});
 if(link.last_inbound<now()-23*3600) {
  if(!reminder || !templateReady(env)) throw new Error('WhatsApp template required');
  form.set('ContentSid',env.TWILIO_WHATSAPP_CONTENT_SID);
  // Approved template is a fixed generic notification. Never inject arbitrary AI text into it.
 } else form.set('Body',text.slice(0,1500));
 const response=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+env.TWILIO_ACCOUNT_SID+'/Messages.json',{method:'POST',headers:{Authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(15000)});
 if(!response.ok) { await response.body?.cancel(); throw new Error('WhatsApp delivery not confirmed'); }
 const result=await boundedJSON(response,16384);
 if(!result || typeof result!=='object' || !('sid' in result) || typeof result.sid!=='string' || !/^SM[a-f0-9]{32}$/i.test(result.sid)) throw new Error('WhatsApp delivery not confirmed');
 return {messageId:result.sid};
}
// Queue payload contains only an opaque message reference. Runner identity,
// phone number, body and OAuth credentials are always resolved server-side.
export async function wakeWhatsApp(env:Env,sid:string) {
 await env.WHATSAPP_QUEUE.send({sid},{contentType:'json',delaySeconds:0});
}

async function typing(env:Env,sid:string) {
 try {
  const response=await fetch('https://messaging.twilio.com/v3/Indicators/Typing.json',{
   method:'POST',headers:{Authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'Content-Type':'application/json'},
   body:JSON.stringify({messageId:sid,channel:'whatsapp'}),signal:AbortSignal.timeout(3000),
  });
  await response.body?.cancel();
  if(!response.ok)console.warn(JSON.stringify({event:'whatsapp_typing_unavailable',status:response.status}));
 } catch { /* Cosmetic only. Never fail a reply or log provider payloads. */ }
}

export async function consumeWhatsApp(batch:MessageBatch<unknown>,env:Env) {
 for(const message of batch.messages) {
  const body=message.body;
  if(!body||typeof body!=='object'||!('sid' in body)||typeof body.sid!=='string'||!/^SM[a-f0-9]{32}$/i.test(body.sid)) {message.ack();continue;}
  try {
   const row=await env.DB.prepare('SELECT session_id FROM whatsapp_inbox WHERE sid=?').bind(body.sid).first<{session_id:string}>();
   if(!row){message.ack();continue;}
   const result=await processWhatsApp(env,row.session_id);
   if(result==='busy')message.retry({delaySeconds:5});
   else if(result==='more')message.retry({delaySeconds:0});
   else message.ack();
  } catch {
   console.warn(JSON.stringify({event:'whatsapp_queue_retry'}));
   message.retry({delaySeconds:5});
  }
 }
}

// Cron is only an outbox recovery mechanism, not the normal chat path. It
// republishes pending work if a producer/consumer crashed or publishing failed.
export async function recoverWhatsApp(env:Env) {
 await env.DB.prepare("UPDATE whatsapp_inbox SET status='failed',body='',failure_stage='expired',finished_at_ms=? WHERE (status='pending' AND created_at<?) OR (status='processing' AND COALESCE(started_at_ms,created_at*1000)<?)").bind(Date.now(),now()-600,Date.now()-600000).run();
 const rows=await env.DB.prepare("SELECT sid FROM whatsapp_inbox w WHERE status='pending' AND NOT EXISTS(SELECT 1 FROM whatsapp_conversation_leases l WHERE l.session_id=w.session_id AND l.expires_at>?) GROUP BY session_id ORDER BY MIN(created_at) LIMIT 100").bind(now()).all<{sid:string}>();
 if(rows.results.length)await env.WHATSAPP_QUEUE.sendBatch(rows.results.map(({sid})=>({body:{sid}})),{delaySeconds:0});
}

export async function processWhatsApp(env:Env,id:string):Promise<'done'|'busy'|'more'> {
 if(!whatsappConfigured(env)||!env.OPENAI_API_KEY)throw new Error('WhatsApp unavailable');
 const owner=crypto.randomUUID();
 const lease=await env.DB.prepare('INSERT INTO whatsapp_conversation_leases(session_id,owner,expires_at) VALUES (?,?,?) ON CONFLICT(session_id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE expires_at<=? RETURNING owner').bind(id,owner,now()+300,now()).first();
 if(!lease)return 'busy';
 try {
  // Do not run past a crashed/uncertain delivery. Recovery expires it, never resends it.
  if(await env.DB.prepare("SELECT sid FROM whatsapp_inbox WHERE session_id=? AND status='processing' LIMIT 1").bind(id).first())return 'busy';
  for(let count=0;count<3;count++) {
   const renewed=await env.DB.prepare('UPDATE whatsapp_conversation_leases SET expires_at=? WHERE session_id=? AND owner=? AND expires_at>? RETURNING owner').bind(now()+300,id,owner,now()).first();
   if(!renewed)return 'busy';
   // D1 arrival order breaks ties within the same second, regardless of Queue delivery order.
   const started=Date.now();
   const item=await env.DB.prepare("UPDATE whatsapp_inbox SET status='processing',started_at_ms=?,queue_ms=MAX(0,?-created_at*1000) WHERE sid=(SELECT sid FROM whatsapp_inbox WHERE session_id=? AND status='pending' ORDER BY created_at,rowid LIMIT 1) AND status='pending' RETURNING sid,session_id,generation,body,created_at").bind(started,started,id).first<{sid:string;session_id:string;generation:string;body:string;created_at:number}>();
   if(!item)return 'done';
   let stage='context',contextMs=0,aiMs=0,deliveryMs=0;
   try {
    if(item.created_at<now()-600)throw new Error('Expired');
    const link=await activeLink(env,id);
    if(!link||link.generation!==item.generation)throw new Error('Disconnected');
    const row=await env.DB.prepare('SELECT state FROM sessions WHERE id=? AND expires_at>?').bind(id,now()).first<{state:string}>();
    if(!row)throw new Error('Expired');
    const saved=JSON.parse(row.state) as State;
    const [state,conversation]=await Promise.all([
     saved.source==='production_account'?whatsappContext(env,id):Promise.resolve(saved),
     history(env,id), typing(env,item.sid),
    ]);
    contextMs=Date.now()-started;stage='ai';const aiStart=Date.now();
    const reply=await whatsappCoach(env.OPENAI_API_KEY,state,conversation,item.body,AbortSignal.timeout(25000));
    aiMs=Date.now()-aiStart;stage='authorization';
    if(state.source==='production_account')await validateGrant(env,id);
    // A suspended old consumer must not send after another worker acquired its lease.
    const owns=await env.DB.prepare('SELECT owner FROM whatsapp_conversation_leases WHERE session_id=? AND owner=? AND expires_at>?').bind(id,owner,now()).first();
    if(!owns)throw new Error('Lease expired');
    stage='delivery';const sendStart=Date.now();
    await sendWhatsApp(env,id,item.generation,(state.source==='production_account'?'':'Sample data: ')+reply.slice(0,1400));
    deliveryMs=Date.now()-sendStart;stage='persistence';
    await env.DB.batch([
     env.DB.prepare("INSERT INTO coach_messages(session_id,role,content,created_at) VALUES (?,'user',?,?)").bind(id,item.body,now()),
     env.DB.prepare("INSERT INTO coach_messages(session_id,role,content,created_at) VALUES (?,'assistant',?,?)").bind(id,reply,now()),
     env.DB.prepare("UPDATE whatsapp_inbox SET status='done',body='',finished_at_ms=?,context_ms=?,ai_ms=?,delivery_ms=? WHERE sid=?").bind(Date.now(),contextMs,aiMs,deliveryMs,item.sid),
    ]);
    console.log(JSON.stringify({event:'whatsapp_reply',queue_ms:Math.max(0,started-item.created_at*1000),context_ms:contextMs,ai_ms:aiMs,delivery_ms:deliveryMs,total_ms:Date.now()-started}));
   } catch {
    // Give a useful, non-private failure response, but never follow an uncertain
    // send with another send. Authorization is rechecked before an AI-error reply.
    if(stage==='context'||stage==='ai') {
     try {
      if(stage==='ai')await validateGrant(env,id);
      await sendWhatsApp(env,id,item.generation,stage==='context'
       ? 'I couldn\'t securely load your running data. Please reconnect WhatsApp in Settings: '+env.PUBLIC_ORIGIN+'/preview'
       : 'I couldn\'t finish that reply. Please try your question again in a moment.');
     } catch { /* Disconnected or unavailable: do not retry. */ }
    }
    // Never retry uncertain outbound delivery, which could duplicate a message.
    await env.DB.prepare("UPDATE whatsapp_inbox SET status='failed',body='',finished_at_ms=?,context_ms=?,ai_ms=?,delivery_ms=?,failure_stage=? WHERE sid=?").bind(Date.now(),contextMs,aiMs,deliveryMs,stage,item.sid).run();
    console.warn(JSON.stringify({event:'whatsapp_reply_failed',stage,total_ms:Date.now()-started}));
   }
  }
  return await env.DB.prepare("SELECT sid FROM whatsapp_inbox WHERE session_id=? AND status='pending' LIMIT 1").bind(id).first()?'more':'done';
 } finally {
  await env.DB.prepare('DELETE FROM whatsapp_conversation_leases WHERE session_id=? AND owner=?').bind(id,owner).run();
 }
}
