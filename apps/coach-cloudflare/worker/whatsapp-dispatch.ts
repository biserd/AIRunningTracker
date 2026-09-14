import {DurableObject} from 'cloudflare:workers';
import {processWhatsApp} from './whatsapp';

// Internal RPC only. A persisted alarm, not webhook waitUntil, owns AI work.
// D1 remains the authoritative inbox and lease for both this and Queue recovery.
export class WhatsAppDispatch extends DurableObject<Env> {
 async wake(sessionId:string) {
  if(typeof sessionId!=='string'||!sessionId.length||sessionId.length>128||
   !this.ctx.id.equals(this.env.WHATSAPP_DISPATCH.idFromName(sessionId)))throw new Error('Invalid dispatch');
  await this.ctx.storage.put('session',sessionId);
  await this.ctx.storage.setAlarm(Date.now());
 }
 async alarm() {
  const id=await this.ctx.storage.get<string>('session');
  if(!id)return;
  // Pending work expires after ten minutes; never keep waking an idle runner.
  const pending=await this.env.DB.prepare("SELECT sid FROM whatsapp_inbox WHERE session_id=? AND status='pending' AND created_at>? LIMIT 1").bind(id,Math.floor(Date.now()/1000)-600).first();
  if(!pending)return;
  const result=await processWhatsApp(this.env,id,undefined,'direct');
  if(result==='more'||result==='busy')await this.ctx.storage.setAlarm(Date.now()+(result==='busy'?1000:0));
  // Do not delete an alarm here: a concurrent wake may have scheduled new work.
 }
}
