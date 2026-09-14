import { budget, hash, ReminderError } from './reminders';
import { boundedJSON, coach } from './openai';
import { history } from './ai';
import type { State } from '../shared/coach';

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
 return { configured:whatsappConfigured(env), connected:!!link, destination:link?.address ? 'WhatsApp ending '+link.address.slice(-4) : null, templateReady:templateReady(env) };
}
export async function disconnectWhatsApp(env:Env,id:string) {
 await env.DB.batch([
  env.DB.prepare("UPDATE whatsapp_links SET disabled=1,address=NULL,token_hash=NULL WHERE session_id=?").bind(id),
  env.DB.prepare("UPDATE email_reminders SET status='cancelled' WHERE session_id=? AND channel='whatsapp' AND status IN ('draft','scheduled')").bind(id),
  env.DB.prepare("UPDATE whatsapp_inbox SET status='failed',body='' WHERE session_id=? AND status='pending'").bind(id),
 ]);
}
export async function whatsappAction(env:Env,id:string,path:string,input:Record<string,unknown>) {
 if (input.confirm!==true || Object.keys(input).some(k=>k!=='confirm')) throw new ReminderError('Explicit confirmation is required.');
 if(path==='disconnect') { await disconnectWhatsApp(env,id); return {ok:true}; }
 if(path!=='connect') throw new ReminderError('Not found.',404);
 if(!whatsappConfigured(env)) throw new ReminderError('WhatsApp is waiting for site-owner setup.',503);
 const c=await env.DB.prepare('SELECT session_id FROM reminder_contacts WHERE session_id=? AND verified_at IS NOT NULL AND disabled=0').bind(id).first();
 if(!c) throw new ReminderError('Verify your email first to connect this private preview.',409);
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
 if(!receipt.meta.changes) return xml();
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
  const linked=await env.DB.prepare("UPDATE whatsapp_links SET address=?,last_inbound=?,token_hash=NULL WHERE token_hash=? AND token_expires>? AND address IS NULL AND disabled=0 AND EXISTS(SELECT 1 FROM sessions s JOIN reminder_contacts c ON c.session_id=s.id WHERE s.id=whatsapp_links.session_id AND s.expires_at>? AND c.verified_at IS NOT NULL AND c.disabled=0) RETURNING session_id").bind(from,now(),await hash(body.slice(5)),now(),now()).first();
  return xml(linked?'Connected to your private AITracker coach. Confirm reminders in your browser and select WhatsApp. Text questions here; replies may take a minute. Send STOP to disconnect.':'This link expired or was already used. Create a new link in Settings.');
 }
 const link=await env.DB.prepare('SELECT w.* FROM whatsapp_links w JOIN sessions s ON s.id=w.session_id WHERE w.address=? AND w.disabled=0 AND s.expires_at>?').bind(from,now()).first<Link>();
 if(!link) return xml();
 await env.DB.prepare('UPDATE whatsapp_links SET last_inbound=? WHERE session_id=? AND generation=? AND disabled=0').bind(now(),link.session_id,link.generation).run();
 if(!body || body.length>2000 || form.get('NumMedia')!=='0') return xml('Please send text of up to 2,000 characters. Voice notes and images are not supported in this preview.');
 if(!await budget(env,'wa-chat:'+link.session_id,30,86400) || !await budget(env,'wa-chat-global',300,86400)) return xml();
 await env.DB.prepare('INSERT OR IGNORE INTO whatsapp_inbox(sid,session_id,generation,body,created_at) VALUES (?,?,?,?,?)').bind(sid,link.session_id,link.generation,body,now()).run();
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
export async function processWhatsApp(env:Env) {
 await env.DB.prepare("UPDATE whatsapp_inbox SET status='failed',body='' WHERE status IN ('pending','processing') AND created_at<?").bind(now()-600).run();
 if(!whatsappConfigured(env) || !env.OPENAI_API_KEY) return;
 const jobs=await env.DB.prepare("SELECT sid FROM whatsapp_inbox WHERE status='pending' ORDER BY created_at LIMIT 3").all<{sid:string}>();
 for(const job of jobs.results) {
  const item=await env.DB.prepare("UPDATE whatsapp_inbox SET status='processing' WHERE sid=? AND status='pending' RETURNING *").bind(job.sid).first<{session_id:string;generation:string;body:string}>();
  if(!item) continue;
  try {
   const link=await activeLink(env,item.session_id);
   if(!link || link.generation!==item.generation) throw new Error('Disconnected');
   const row=await env.DB.prepare('SELECT state FROM sessions WHERE id=? AND expires_at>?').bind(item.session_id,now()).first<{state:string}>();
   if(!row) throw new Error('Expired');
   const contextState=JSON.parse(row.state) as State;
   // No durable production credential is stored here. Fail closed rather than
   // serving stale private data or bypassing a changed subscription in a job.
   const result=contextState.source==='production_account'
     ? {message:'Your WhatsApp reminders are connected. For coaching with your latest running data, open your AITracker coach below.',change:undefined,reminder:undefined}
     : await coach(env.OPENAI_API_KEY,contextState,await history(env,item.session_id),item.body,AbortSignal.timeout(25000));
   const reply=result.change || result.reminder ? 'Please open your preview to request and confirm plan changes or reminders. Nothing has been changed.' : result.message;
   const contextLabel=contextState.source==='production_account' ? 'AITracker coach' : 'AITracker sample-data preview';
   await sendWhatsApp(env,item.session_id,item.generation,contextLabel+'\n\n'+reply.slice(0,1100)+'\n\n'+env.PUBLIC_ORIGIN+'/preview\nSend STOP to disconnect.');
   await env.DB.batch([
    env.DB.prepare("INSERT INTO coach_messages(session_id,role,content,created_at) VALUES (?,'user',?,?)").bind(item.session_id,item.body,now()),
    env.DB.prepare("INSERT INTO coach_messages(session_id,role,content,created_at) VALUES (?,'assistant',?,?)").bind(item.session_id,reply,now()),
   ]);
   await env.DB.prepare("UPDATE whatsapp_inbox SET status='done',body='' WHERE sid=?").bind(job.sid).run();
  } catch { await env.DB.prepare("UPDATE whatsapp_inbox SET status='failed',body='' WHERE sid=?").bind(job.sid).run(); }
 }
}
