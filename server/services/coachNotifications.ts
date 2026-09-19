import {applicationSqlDatabase as db} from '../d1/runtimeDatabase';
import {storage} from '../storage';
import {companionAllowed} from './coachCompanion';
type Channel='push'|'email'|'whatsapp'|'none';
export function preferredChannel(preference:string,available:{push:boolean;email:boolean;whatsapp:boolean}):Channel{
 if(preference==='auto')return available.push?'push':available.email?'email':'none';
 return ['push','email','whatsapp'].includes(preference)&&available[preference as keyof typeof available]?preference as Channel:'none';
}
async function whatsapp(action:string,user:number,extra:Record<string,string>={}){
 const response=await fetch('http://aitracker.coach.internal/notifications',{method:'POST',redirect:'error',headers:{authorization:process.env.D1_TRANSPORT_SECRET||'','content-type':'application/json'},body:JSON.stringify({action,user,...extra}),signal:AbortSignal.timeout(30000)});
 if(!response.ok){await response.body?.cancel();throw new Error('Notification service unavailable');}
 return await response.json() as {available?:boolean;status?:string};
}
/** Pin an event to one channel. A preference change cannot fan an in-flight event
 * out to another channel. Existing preferences are preserved until the runner
 * explicitly saves the new channel choice. Explicitly scheduled reminders use
 * their requested channel and are not rerouted by this proactive-only policy. */
export async function hasUnifiedCoachDelivery(user:number):Promise<boolean>{
 const row=await db.prepare('SELECT settings FROM coach_companion_preferences WHERE user_id=?').bind(user).first<{settings:string}>();
 return !!row && JSON.parse(row.settings).delivery!==undefined;
}
export async function permitCoachNotification(user:number,event:string,caller:'push'|'email',body?:string,emailEligible=true):Promise<boolean>{
 if(!/^(run:\d+|coach:(evening|weekly|followup):\d{4}-\d{2}-\d{2})$/.test(event))throw new Error('Invalid coaching event');
 const prefs=await db.prepare('SELECT settings FROM coach_companion_preferences WHERE user_id=?').bind(user).first<{settings:string}>();
 const preference=prefs?JSON.parse(prefs.settings).delivery:undefined;
 if(preference===undefined)return true;
 if(!await companionAllowed(user,event.startsWith('coach:')?event:undefined))return false;
 const runner=await storage.getUser(user);if(!runner)return false;
 const push=!!await db.prepare(`SELECT 1 FROM apple_push_devices WHERE user_id=? AND expires_at>? AND ${event.startsWith('run:')?'runs':'reminders'}=1 LIMIT 1`).bind(user,Math.floor(Date.now()/1000)).first();
 let wa=false;if(preference==='whatsapp'){try{wa=(await whatsapp('available',user)).available===true;}catch{return false;}}
 const channel=preferredChannel(preference,{push,email:!!runner.email&&(event.startsWith('coach:')||runner.notifyPostRun===true),whatsapp:wa});
 if(channel==='none')return false;
 await db.prepare('INSERT OR IGNORE INTO coach_notification_deliveries(user_id,event_key,channel,created_at) VALUES (?,?,?,?)').bind(user,event,channel,Math.floor(Date.now()/1000)).run();
 const pinned=await db.prepare('SELECT channel,state FROM coach_notification_deliveries WHERE user_id=? AND event_key=?').bind(user,event).first<{channel:Channel;state:string}>();
 if(!pinned)return false;
 if(pinned.channel==='push')return caller==='push';
 if(pinned.channel==='email'&&event.startsWith('run:')){
  if(caller!=='email'||!emailEligible)return false;
  return !!await db.prepare("UPDATE coach_notification_deliveries SET state='claimed' WHERE user_id=? AND event_key=? AND state='pending' RETURNING event_key").bind(user,event).first();
 }
 const claim=await db.prepare("UPDATE coach_notification_deliveries SET state='sending' WHERE user_id=? AND event_key=? AND state='pending' RETURNING event_key").bind(user,event).first();
 if(!claim)return false;
 let state='unknown';
 try{
  const text=(body||'Your new run is ready. Open Run Analytics or ask your coach about it.').slice(0,1400);
  if(pinned.channel==='whatsapp')state=(await whatsapp('deliver',user,{event,text})).status==='sent'?'sent':'unknown';
  else{
   const {emailService}=await import('./email');
   const {coachUnsubscribeToken}=await import('./coachUnsubscribe');
   const unsubscribe='https://aitracker.run/api/coach/notifications/unsubscribe?token='+coachUnsubscribeToken(user);
   const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
   const result=await emailService.sendEmailDetailed({to:runner.email!,subject:'Your Run Analytics coach',text:text+'\n\nStop proactive coaching alerts: '+unsubscribe,html:`<p>${escape(text)}</p><p><a href="${unsubscribe}">Stop proactive coaching alerts</a></p>`,headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}},0);
   state=result.success?'sent':'unknown';
  }
 }catch{/* Never retry or switch channels after an uncertain provider send. */}
 await db.prepare('UPDATE coach_notification_deliveries SET state=? WHERE user_id=? AND event_key=?').bind(state,user,event).run();
 return false;
}
// This is a fairness cursor in the long-lived Node scheduler, not delivery state.
// Durable event claims remain in D1 and are safe across multiple schedulers.
let scanAfterUser=0;
export async function prepareCoachingNotifications(){
 const users=(await db.prepare("SELECT user_id FROM coach_companion_preferences WHERE user_id>? AND json_extract(settings,'$.delivery') IN ('email','whatsapp','auto') AND (json_extract(settings,'$.evening')=1 OR json_extract(settings,'$.weekly')=1 OR json_extract(settings,'$.followup')=1) ORDER BY user_id LIMIT 100").bind(scanAfterUser).all<{user_id:number}>()).results;
 scanAfterUser=users.length===100?users[users.length-1].user_id:0;
 const {buildCompanionBriefings}=await import('./coachCompanion');
 for(const {user_id:user} of users){
  try{
  await buildCompanionBriefings(user);
  const briefings=(await db.prepare("SELECT kind,reference,body FROM coach_companion_briefings WHERE user_id=? AND julianday(created_at)>julianday('now','-1 hour') ORDER BY created_at DESC LIMIT 1").bind(user).all<{kind:string;reference:string;body:string}>()).results;
  for(const b of briefings)await permitCoachNotification(user,'coach:'+b.kind+':'+b.reference,'push',b.body);
  }catch{console.warn('[Coach notifications] A runner delivery check failed; continuing the batch.');}
 }
}
