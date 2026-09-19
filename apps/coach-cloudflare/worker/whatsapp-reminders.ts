import {reminderTime,reminderTitle,validTimezone} from '../shared/reminders';
import {hash,ReminderError} from './reminders';
import {activeLink,sendWhatsApp} from './whatsapp';
import {validateGrant} from './whatsapp-oauth';
import {nextOccurrence,type Recurrence} from '../../../server/services/coachRecurrence';

const now=()=>Math.floor(Date.now()/1000);
type Reminder={id:string;session_id:string;link_generation:string;grant_generation:string;title:string;local_time:string;timezone:string;due_at:number;status:string;confirmation_kind:string};
// Every read/write uses both generations, so a replacement connection cannot
// inherit an old authorization or accidentally deliver an old reminder.
const live=`EXISTS(SELECT 1 FROM sessions s JOIN whatsapp_links w ON w.session_id=s.id JOIN whatsapp_oauth_grants g ON g.session_id=s.id WHERE s.id=r.session_id AND s.expires_at>unixepoch() AND g.expires_at>unixepoch() AND w.disabled=0 AND w.address IS NOT NULL AND w.generation=r.link_generation AND g.generation=r.grant_generation)`;
async function authority(env:Env,id:string,generation:string){
 await validateGrant(env,id);
 const row=await env.DB.prepare('SELECT g.generation,MIN(s.expires_at,g.expires_at) AS expires FROM sessions s JOIN whatsapp_oauth_grants g ON g.session_id=s.id JOIN whatsapp_links w ON w.session_id=s.id WHERE s.id=? AND w.generation=? AND w.disabled=0 AND w.address IS NOT NULL AND s.expires_at>? AND g.expires_at>?').bind(id,generation,now(),now()).first<{generation:string;expires:number}>();
 if(!row)throw new ReminderError('Reconnect WhatsApp in Settings before managing reminders.');
 return row;
}
function when(r:Reminder){return `${r.local_time.replace('T',' at ')} (${r.timezone})`;}
function saved(r:Reminder){return r.status==='scheduled'?`Done. ${r.title}\n${when(r)}\nReply undo within 10 minutes to cancel.`:`That reminder is already ${r.status==='unknown'?'delivery unconfirmed':r.status}. Send REMINDERS to check it.`;}
const identifier=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export const whatsappReminderTools=[
 {type:'function',name:'create_whatsapp_reminder',description:'Save a WhatsApp reminder on an explicit clear request. Use none for one-time, daily or weekly only when explicitly requested. The first occurrence must be within seven days. Never infer recurrence or schedule suggestions/hypotheticals. Ask for missing subject or time.',strict:true,parameters:{type:'object',properties:{title:{type:'string'},localTime:{type:'string',description:'First occurrence YYYY-MM-DDTHH:mm in the runner timezone'},recurrence:{type:'string',enum:['none','daily','weekly']}},required:['title','localTime','recurrence'],additionalProperties:false}},
 {type:'function',name:'list_whatsapp_reminders',description:'Show this runner their WhatsApp reminders, including IDs needed for cancellation.',strict:true,parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
 {type:'function',name:'cancel_whatsapp_reminder',description:'Cancel the exact reminder requested by the runner, using its ID from a previous list. No additional confirmation. Ask which reminder if ambiguous. Never guess an ID.',strict:true,parameters:{type:'object',properties:{reminderId:{type:'string'}},required:['reminderId'],additionalProperties:false}},
];

export async function reminderTool(env:Env,id:string,generation:string,timezone:string,name:string,raw:unknown,sourceSid?:string):Promise<string>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ReminderError('Please try that reminder request again.');
 const args=raw as Record<string,unknown>;
 const keys=Object.keys(args).sort().join(',');
 if(name==='list_whatsapp_reminders'&&keys==='')return listWhatsAppReminders(env,id,generation);
 const auth=await authority(env,id,generation);
 // The message reference comes from the signed webhook, never model arguments.
 if(!sourceSid||!await env.DB.prepare("SELECT sid FROM whatsapp_inbox WHERE sid=? AND session_id=? AND generation=? AND status='processing' AND created_at>?").bind(sourceSid,id,generation,now()-600).first())throw new ReminderError('Please send your reminder request again.');
 let row:Reminder|null=null;
 if(name==='create_whatsapp_reminder'&&['localTime,title','localTime,recurrence,title'].includes(keys)){
  const recurrence=args.recurrence??'none';if(!['none','daily','weekly'].includes(String(recurrence)))throw new ReminderError('Choose daily, weekly or one-time.');
  // Stable primary key makes even concurrent replays of one inbound message
  // idempotent. Never silently reschedule a cancelled or already-sent reminder.
  const digest=await hash('whatsapp-reminder:'+id+':'+sourceSid);
  const reminderId=`${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20,32)}`;
  const existing=await env.DB.prepare(`SELECT * FROM whatsapp_reminders AS r WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND ${live}`).bind(reminderId,id,generation,auth.generation).first<Reminder>();
  if(existing)return saved(existing);
  if(!validTimezone(timezone)||typeof args.localTime!=='string')throw new ReminderError('Please set your timezone in AITracker Settings first.');
  let title:string,due:number;
  try{title=reminderTitle(args.title);due=reminderTime(args.localTime,timezone,now(),auth.expires);}catch(error){throw new ReminderError(error instanceof Error?error.message:'Choose a valid reminder time.');}
  if(due>now()+23*3600&&!/^HX[a-f0-9]{32}$/i.test(env.TWILIO_WHATSAPP_CONTENT_SID||''))throw new ReminderError('For now, choose a time within the next 23 hours.');
  if(recurrence!=='none'){
   if(!/^HX[a-f0-9]{32}$/i.test(env.TWILIO_WHATSAPP_CONTENT_SID||''))throw new ReminderError('Repeating WhatsApp reminders need the approved reminder template.');
   nextOccurrence(due,due,timezone,recurrence as Recurrence);
   await env.DB.prepare(`INSERT INTO whatsapp_schedules(id,session_id,link_generation,grant_generation,title,timezone,local_time,recurrence,anchor_at,next_at,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM whatsapp_schedules WHERE session_id=? AND cancelled=0)<10 ON CONFLICT(id) DO NOTHING`).bind(reminderId,id,generation,auth.generation,title,timezone,args.localTime,String(recurrence),due,due,now(),id).run();
   const schedule=await env.DB.prepare(`SELECT * FROM whatsapp_schedules AS r WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND ${live}`).bind(reminderId,id,generation,auth.generation).first<{cancelled:number;title:string;recurrence:string;anchor_at:number}>();
   if(!schedule||schedule.cancelled||schedule.anchor_at!==due||schedule.title!==title||schedule.recurrence!==recurrence)throw new ReminderError('Schedule changed or your reminder limit was reached. Send REMINDERS.');
   return `Done. ${title}, ${recurrence} starting ${args.localTime.replace('T',' at ')} (${timezone}). Reply undo within 10 minutes to cancel.`;
  }
  row=await env.DB.prepare(`INSERT INTO whatsapp_reminders(id,session_id,link_generation,grant_generation,title,local_time,timezone,due_at,status,created_at) SELECT ?,?,?,?,?,?,?,?,'scheduled',? WHERE (SELECT COUNT(*) FROM whatsapp_reminders WHERE session_id=? AND (status IN ('scheduled','sending') OR (status='draft' AND confirmation_expires>?)))<10 AND EXISTS(SELECT 1 FROM whatsapp_links w JOIN whatsapp_oauth_grants g ON g.session_id=w.session_id JOIN sessions s ON s.id=w.session_id WHERE w.session_id=? AND w.generation=? AND w.disabled=0 AND w.address IS NOT NULL AND g.generation=? AND g.expires_at>? AND s.expires_at>?) ON CONFLICT(id) DO NOTHING RETURNING *`).bind(reminderId,id,generation,auth.generation,title,args.localTime,timezone,due,now(),id,now(),id,generation,auth.generation,now(),now()).first<Reminder>();
  if(!row)row=await env.DB.prepare(`SELECT * FROM whatsapp_reminders AS r WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND ${live}`).bind(reminderId,id,generation,auth.generation).first<Reminder>();
  if(!row)throw new ReminderError('You can have up to 10 pending WhatsApp reminders. List or cancel one first.');
  return saved(row);
 }else if(name==='cancel_whatsapp_reminder'&&keys==='reminderId'&&identifier(args.reminderId)){
  const scheduled=await cancelSchedule(env,id,generation,auth.generation,args.reminderId);if(scheduled)return scheduled;
  row=await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET status='cancelled',confirmation_hash=NULL WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND status IN ('scheduled','draft','cancelled') AND ${live} RETURNING *`).bind(args.reminderId,id,generation,auth.generation).first<Reminder>();
  if(!row)throw new ReminderError('That reminder is not available to cancel. Ask me to list your reminders.');
 }else throw new ReminderError('That reminder action is not supported.');
 return `Cancelled: ${row.title}\n${when(row)}`;
}

export async function listWhatsAppReminders(env:Env,id:string,generation:string){
 const auth=await authority(env,id,generation);
 const rows=await env.DB.prepare(`SELECT * FROM whatsapp_reminders AS r WHERE session_id=? AND link_generation=? AND grant_generation=? AND (status IN ('scheduled','sending','sent','unknown') OR (status='draft' AND confirmation_expires>?)) AND NOT EXISTS(SELECT 1 FROM whatsapp_schedule_occurrences o WHERE o.reminder_id=r.id) AND ${live} ORDER BY due_at DESC LIMIT 10`).bind(id,generation,auth.generation,now()).all<Reminder>();
 const schedules=await env.DB.prepare(`SELECT id,title,recurrence,timezone,next_at FROM whatsapp_schedules AS r WHERE session_id=? AND link_generation=? AND grant_generation=? AND cancelled=0 AND ${live} ORDER BY next_at LIMIT 10`).bind(id,generation,auth.generation).all<{id:string;title:string;recurrence:string;timezone:string;next_at:number}>();
 if(!rows.results.length&&!schedules.results.length)return 'You have no WhatsApp reminders. Try: remind me to get ready for my run tomorrow at 7am.';
 // Bound output below WhatsApp's limit without silently cutting an identifier.
 const entries=[...schedules.results.map(r=>`${r.title.slice(0,45)} | ${r.recurrence}\nNext: ${new Date(r.next_at*1000).toLocaleString('en-US',{timeZone:r.timezone})} (${r.timezone})\nID: ${r.id}`),...rows.results.map(r=>`${r.title.slice(0,45)}\n${when(r)} | ${r.status==='draft'?'awaiting confirmation':r.status==='unknown'?'delivery unconfirmed':r.status}\nID: ${r.id}`)];
 let text='Your WhatsApp reminders:';
 for(const entry of entries){if(text.length+entry.length>1250){text+='\nMore reminders are saved. Cancel an earlier one to narrow this list.';break;}text+='\n\n'+entry;}
 return text;
}

// Only the actual inbound message can confirm. The model has no confirmation tool.
export async function confirmWhatsAppReminder(env:Env,id:string,generation:string,message:string):Promise<string|null>{
 if(/^reminders$/i.test(message.trim()))return listWhatsAppReminders(env,id,generation);
 if(/^(cancel|undo)$/i.test(message.trim())){
  const auth=await authority(env,id,generation);
  // Include cancelled/sent rows when selecting: repeated undo must never fall
  // through to another reminder. Only the newest, recently created one qualifies.
  const latest=await env.DB.prepare(`SELECT * FROM whatsapp_reminders AS r WHERE session_id=? AND link_generation=? AND grant_generation=? AND created_at>? AND NOT EXISTS(SELECT 1 FROM whatsapp_schedule_occurrences o WHERE o.reminder_id=r.id) AND ${live} ORDER BY created_at DESC,rowid DESC LIMIT 1`).bind(id,generation,auth.generation,now()-600).first<Reminder>();
  const schedule=await env.DB.prepare(`SELECT id,created_at FROM whatsapp_schedules AS r WHERE session_id=? AND link_generation=? AND grant_generation=? AND created_at>? AND ${live} ORDER BY created_at DESC,rowid DESC LIMIT 1`).bind(id,generation,auth.generation,now()-600).first<{id:string;created_at:number}>();
  if(schedule&&latest&&schedule.created_at===Number((latest as unknown as {created_at:number}).created_at))return 'Which reminder should I cancel? Send REMINDERS to choose the exact one.';
  if(schedule&&(!latest||schedule.created_at>Number((latest as unknown as {created_at:number}).created_at)))return await cancelSchedule(env,id,generation,auth.generation,schedule.id);
  if(!latest)return 'Which reminder should I cancel? Send REMINDERS to see the list. STOP disconnects WhatsApp.';
  const cancelled=await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET status='cancelled',confirmation_hash=NULL WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND status IN ('scheduled','draft','cancelled') AND ${live} RETURNING *`).bind(latest.id,id,generation,auth.generation).first<Reminder>();
  return cancelled?`Cancelled: ${cancelled.title}`:'That reminder is already being sent or has finished. Send REMINDERS to check it.';
 }
 // Backward compatibility for an already-issued review, not used for new requests.
 const match=/^YES\s+([A-F0-9]{12})$/i.exec(message.trim());
 if(!match)return null;
 const auth=await authority(env,id,generation);
 const row=await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET status=CASE confirmation_kind WHEN 'create' THEN 'scheduled' ELSE 'cancelled' END,confirmation_hash=NULL WHERE session_id=? AND link_generation=? AND grant_generation=? AND confirmation_hash=? AND confirmation_expires>? AND ((confirmation_kind='create' AND status='draft' AND due_at>?) OR (confirmation_kind='cancel' AND status='scheduled')) AND due_at<? AND ${live} RETURNING *`).bind(id,generation,auth.generation,await hash(match[1].toUpperCase()),now(),now()+60,auth.expires-60).first<Reminder>();
 return row?`${row.status==='scheduled'?'Set. I’ll remind you on WhatsApp':'Cancelled'}: ${row.title}\n${when(row)}`:'That confirmation expired or was already used. Send REMINDERS to check what is saved.';
}

async function cancelSchedule(env:Env,id:string,link:string,grant:string,schedule:string):Promise<string|null>{
 const row=await env.DB.prepare(`SELECT title FROM whatsapp_schedules AS r WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND ${live}`).bind(schedule,id,link,grant).first<{title:string}>();
 if(!row)return null;
 await env.DB.batch([
  env.DB.prepare('UPDATE whatsapp_schedules SET cancelled=1 WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=?').bind(schedule,id,link,grant),
  env.DB.prepare("UPDATE whatsapp_reminders SET status='cancelled' WHERE session_id=? AND link_generation=? AND grant_generation=? AND status='scheduled' AND id IN (SELECT reminder_id FROM whatsapp_schedule_occurrences WHERE schedule_id=?)").bind(id,link,grant,schedule),
 ]);
 return 'Cancelled repeating reminder: '+row.title;
}
export async function materializeWhatsAppSchedules(env:Env){
 await env.DB.prepare(`UPDATE whatsapp_schedules AS r SET cancelled=1 WHERE cancelled=0 AND NOT ${live}`).run();
 const schedules=await env.DB.prepare('SELECT * FROM whatsapp_schedules WHERE cancelled=0 AND next_at<=? ORDER BY next_at LIMIT 20').bind(now()).all<{id:string;session_id:string;link_generation:string;grant_generation:string;title:string;timezone:string;recurrence:Recurrence;anchor_at:number;next_at:number}>();
 for(const r of schedules.results){
  try{
   const auth=await authority(env,r.session_id,r.link_generation);if(auth.generation!==r.grant_generation)continue;
   const digest=await hash('occurrence:'+r.id+':'+r.next_at),occurrence=`${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20,32)}`;
   const next=nextOccurrence(r.anchor_at,now(),r.timezone,r.recurrence);
   const parts=new Intl.DateTimeFormat('en-CA',{timeZone:r.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(r.next_at*1000)),p=(key:string)=>parts.find(x=>x.type===key)?.value;
   const local=`${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
   await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO whatsapp_reminders(id,session_id,link_generation,grant_generation,title,local_time,timezone,due_at,status,created_at) SELECT ?,session_id,link_generation,grant_generation,title,?,timezone,next_at,'scheduled',? FROM whatsapp_schedules AS r WHERE id=? AND cancelled=0 AND next_at=? AND next_at>? AND ${live}`).bind(occurrence,local,now(),r.id,r.next_at,now()-3600),
    env.DB.prepare('INSERT OR IGNORE INTO whatsapp_schedule_occurrences(schedule_id,reminder_id) SELECT ?,id FROM whatsapp_reminders WHERE id=?').bind(r.id,occurrence),
    env.DB.prepare('UPDATE whatsapp_schedules SET next_at=? WHERE id=? AND cancelled=0 AND next_at=?').bind(next,r.id,r.next_at),
   ]);
  }catch{console.warn(JSON.stringify({event:'whatsapp_schedule_unavailable'}));}
 }
}
export async function deliverWhatsAppReminders(env:Env){
 await materializeWhatsAppSchedules(env);
 await env.DB.prepare("UPDATE whatsapp_reminders SET status='unknown' WHERE status='sending' AND started_at<?").bind(now()-120).run();
 await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET status='expired',confirmation_hash=NULL WHERE (status='draft' AND confirmation_expires<=?) OR (status='scheduled' AND (due_at<? OR NOT ${live}))`).bind(now(),now()-3600).run();
 const rows=await env.DB.prepare("SELECT * FROM whatsapp_reminders WHERE status='scheduled' AND due_at<=? ORDER BY due_at LIMIT 20").bind(now()).all<Reminder>();
 for(const r of rows.results){
  let sending=false;
  try{
   const auth=await authority(env,r.session_id,r.link_generation);
   if(auth.generation!==r.grant_generation)continue;
   const claimed=await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET status='sending',started_at=? WHERE id=? AND status='scheduled' AND ${live} RETURNING id`).bind(now(),r.id).first();
   if(!claimed)continue;
   sending=true;
   const link=await activeLink(env,r.session_id);
   if(link?.generation!==r.link_generation)throw new Error('Disconnected');
   const sent=await sendWhatsApp(env,r.session_id,r.link_generation,`Reminder: ${r.title}\nSend REMINDERS to see your reminders, or STOP to disconnect.`,true);
   await env.DB.prepare("UPDATE whatsapp_reminders SET status='sent',provider_id=? WHERE id=? AND status='sending'").bind(sent.messageId,r.id).run();
  }catch{
   if(sending)await env.DB.prepare("UPDATE whatsapp_reminders SET status='unknown' WHERE id=? AND status='sending'").bind(r.id).run();
   console.warn(JSON.stringify({event:'whatsapp_reminder_delivery',outcome:sending?'unconfirmed':'authorization_unavailable'}));
  }
 }
}
