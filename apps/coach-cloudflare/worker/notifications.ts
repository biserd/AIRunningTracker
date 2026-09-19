import {WorkerEntrypoint} from 'cloudflare:workers';
import {hash} from './reminders';
import {activeLink,sendWhatsApp,whatsappConfigured} from './whatsapp';
import {validateGrant} from './whatsapp-oauth';

// Service-binding RPC only. No public fetch route and no caller-supplied address.
export class CoachNotifications extends WorkerEntrypoint<Env>{
 private async identity(user:number){
  if(!Number.isSafeInteger(user)||user<1)throw new Error('Invalid account');
  return hash('production-runner:'+user);
 }
 async available(user:number){
  const id=await this.identity(user),link=await activeLink(this.env,id);
  if(!whatsappConfigured(this.env)||!link)return false;
  try{await validateGrant(this.env,id);}catch{return false;}
  return link.last_inbound>Math.floor(Date.now()/1000)-23*3600||/^HX[a-f0-9]{32}$/i.test(this.env.TWILIO_WHATSAPP_CONTENT_SID||'');
 }
 async deliver(user:number,event:string,text:string){
  if(!/^(run:\d+|coach:(evening|weekly|followup):\d{4}-\d{2}-\d{2})$/.test(event)||typeof text!=='string'||!text||text.length>1400)throw new Error('Invalid notification');
  const id=await this.identity(user);
  if(!await this.available(user))return {status:'unavailable'};
  const link=await activeLink(this.env,id);if(!link)return {status:'unavailable'};
  const claim=await this.env.DB.prepare("INSERT OR IGNORE INTO coach_delivery_events(session_id,event_key,state,created_at) VALUES (?,?,'sending',?)").bind(id,event,Math.floor(Date.now()/1000)).run();
  if(!claim.meta.changes)return {status:'already_claimed'};
  try{
   await validateGrant(this.env,id);
   await sendWhatsApp(this.env,id,link.generation,text,true);
   await this.env.DB.prepare("UPDATE coach_delivery_events SET state='sent' WHERE session_id=? AND event_key=?").bind(id,event).run();
   return {status:'sent'};
  }catch{
   await this.env.DB.prepare("UPDATE coach_delivery_events SET state='unknown' WHERE session_id=? AND event_key=?").bind(id,event).run();
   return {status:'unknown'};
  }
 }
}
