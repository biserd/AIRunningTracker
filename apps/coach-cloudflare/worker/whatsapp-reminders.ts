import {reminderTime,reminderTitle,validTimezone} from '../shared/reminders';
import {hash,ReminderError} from './reminders';
import {activeLink,sendWhatsApp} from './whatsapp';
import {validateGrant} from './whatsapp-oauth';

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
const identifier=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export const whatsappReminderTools=[
 {type:'function',name:'prepare_whatsapp_reminder',description:'Prepare a one-time WhatsApp reminder for explicit confirmation in chat. Never schedules it yet. Clarify missing subject or time. Use the server timezone. Maximum seven days; no recurring reminders.',strict:true,parameters:{type:'object',properties:{title:{type:'string'},localTime:{type:'string',description:'YYYY-MM-DDTHH:mm in the server-supplied runner timezone'}},required:['title','localTime'],additionalProperties:false}},
 {type:'function',name:'list_whatsapp_reminders',description:'Show this runner their WhatsApp reminders, including IDs needed for cancellation.',strict:true,parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
 {type:'function',name:'prepare_whatsapp_reminder_cancellation',description:'Prepare cancellation of an exact reminder ID from a previous list. Ask the runner to identify it if ambiguous. Explicit chat confirmation is required.',strict:true,parameters:{type:'object',properties:{reminderId:{type:'string'}},required:['reminderId'],additionalProperties:false}},
];

export async function reminderTool(env:Env,id:string,generation:string,timezone:string,name:string,raw:unknown):Promise<string>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ReminderError('Please try that reminder request again.');
 const args=raw as Record<string,unknown>;
 const keys=Object.keys(args).sort().join(',');
 if(name==='list_whatsapp_reminders'&&keys==='')return listWhatsAppReminders(env,id,generation);
 const auth=await authority(env,id,generation);
 const code=crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase();
 const codeHash=await hash(code),expires=now()+600;
 let row:Reminder|null=null;
 if(name==='prepare_whatsapp_reminder'&&keys==='localTime,title'){
  if(!validTimezone(timezone)||typeof args.localTime!=='string')throw new ReminderError('Please set your timezone in AITracker Settings first.');
  let title:string,due:number;
  try{title=reminderTitle(args.title);due=reminderTime(args.localTime,timezone,now(),auth.expires);}catch(error){throw new ReminderError(error instanceof Error?error.message:'Choose a valid reminder time.');}
  if(due>now()+23*3600&&!/^HX[a-f0-9]{32}$/i.test(env.TWILIO_WHATSAPP_CONTENT_SID||''))throw new ReminderError('For now, choose a time within the next 23 hours.');
  row=await env.DB.prepare(`INSERT INTO whatsapp_reminders(id,session_id,link_generation,grant_generation,title,local_time,timezone,due_at,confirmation_hash,confirmation_kind,confirmation_expires,created_at) SELECT ?,?,?,?,?,?,?,?,?,'create',?,? WHERE (SELECT COUNT(*) FROM whatsapp_reminders WHERE session_id=? AND (status IN ('scheduled','sending') OR (status='draft' AND confirmation_expires>?)))<10 AND EXISTS(SELECT 1 FROM whatsapp_links w JOIN whatsapp_oauth_grants g ON g.session_id=w.session_id WHERE w.session_id=? AND w.generation=? AND w.disabled=0 AND w.address IS NOT NULL AND g.generation=? AND g.expires_at>?) RETURNING *`).bind(crypto.randomUUID(),id,generation,auth.generation,title,args.localTime,timezone,due,codeHash,expires,now(),id,now(),id,generation,auth.generation,now()).first<Reminder>();
  if(!row)throw new ReminderError('You can have up to 10 pending WhatsApp reminders. List or cancel one first.');
 }else if(name==='prepare_whatsapp_reminder_cancellation'&&keys==='reminderId'&&identifier(args.reminderId)){
  row=await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET confirmation_hash=?,confirmation_kind='cancel',confirmation_expires=? WHERE id=? AND session_id=? AND link_generation=? AND grant_generation=? AND status='scheduled' AND ${live} RETURNING *`).bind(codeHash,expires,args.reminderId,id,generation,auth.generation).first<Reminder>();
  if(!row)throw new ReminderError('That reminder is not available to cancel. Ask me to list your reminders.');
 }else throw new ReminderError('That reminder action is not supported.');
 return `${row.confirmation_kind==='cancel'?'Cancel':'Remind you on WhatsApp'}: ${row.title}\n${when(row)}\nReply YES ${code} within 10 minutes to confirm. ${row.confirmation_kind==='create'?'Delivery is checked each minute. Outside an active chat, you may receive a generic reminder notification.':''}`.trim();
}

export async function listWhatsAppReminders(env:Env,id:string,generation:string){
 const auth=await authority(env,id,generation);
 const rows=await env.DB.prepare(`SELECT * FROM whatsapp_reminders AS r WHERE session_id=? AND link_generation=? AND grant_generation=? AND (status IN ('scheduled','sending','sent','unknown') OR (status='draft' AND confirmation_expires>?)) AND ${live} ORDER BY due_at DESC LIMIT 10`).bind(id,generation,auth.generation,now()).all<Reminder>();
 if(!rows.results.length)return 'You have no WhatsApp reminders. Try: remind me to get ready for my run tomorrow at 7am.';
 // Bound output below WhatsApp's limit without silently cutting an identifier.
 const entries=rows.results.map(r=>`${r.title.slice(0,45)}\n${when(r)} | ${r.status==='draft'?'awaiting confirmation':r.status==='unknown'?'delivery unconfirmed':r.status}\nID: ${r.id}`);
 let text='Your WhatsApp reminders:';
 for(const entry of entries){if(text.length+entry.length>1250){text+='\nMore reminders are saved. Cancel an earlier one to narrow this list.';break;}text+='\n\n'+entry;}
 return text;
}

// Only the actual inbound message can confirm. The model has no confirmation tool.
export async function confirmWhatsAppReminder(env:Env,id:string,generation:string,message:string):Promise<string|null>{
 if(/^reminders$/i.test(message.trim()))return listWhatsAppReminders(env,id,generation);
 const match=/^YES\s+([A-F0-9]{12})$/i.exec(message.trim());
 if(!match)return null;
 const auth=await authority(env,id,generation);
 const row=await env.DB.prepare(`UPDATE whatsapp_reminders AS r SET status=CASE confirmation_kind WHEN 'create' THEN 'scheduled' ELSE 'cancelled' END,confirmation_hash=NULL WHERE session_id=? AND link_generation=? AND grant_generation=? AND confirmation_hash=? AND confirmation_expires>? AND ((confirmation_kind='create' AND status='draft' AND due_at>?) OR (confirmation_kind='cancel' AND status='scheduled')) AND due_at<? AND ${live} RETURNING *`).bind(id,generation,auth.generation,await hash(match[1].toUpperCase()),now(),now()+60,auth.expires-60).first<Reminder>();
 return row?`${row.status==='scheduled'?'Set. I’ll remind you on WhatsApp':'Cancelled'}: ${row.title}\n${when(row)}`:'That confirmation expired or was already used. Send REMINDERS to check what is saved.';
}

export async function deliverWhatsAppReminders(env:Env){
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
