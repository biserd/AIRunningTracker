import type {SqlDatabase} from './activities';
import type {BillingWebhookDeliveryStore} from '../services/billingWebhookDelivery';

export class D1BillingWebhookDelivery implements BillingWebhookDeliveryStore {
  constructor(private db:SqlDatabase){}
  async claim(eventId:string,eventType:string,owner:string):Promise<'claimed'|'done'|'busy'>{
    const result=await this.db.prepare(`INSERT INTO billing_webhook_receipts(event_id,event_type,lease_owner,lease_until)
      VALUES(?,?,?,unixepoch()+600) ON CONFLICT(event_id) DO UPDATE
      SET lease_owner=excluded.lease_owner,lease_until=excluded.lease_until,attempts=billing_webhook_receipts.attempts+1
      WHERE billing_webhook_receipts.completed_at IS NULL AND billing_webhook_receipts.lease_until<=unixepoch()
      AND billing_webhook_receipts.event_type=excluded.event_type RETURNING event_id`).bind(eventId,eventType,owner).first();
    if(result)return 'claimed';
    const existing=await this.db.prepare('SELECT completed_at FROM billing_webhook_receipts WHERE event_id=?')
      .bind(eventId).first<{completed_at:number|null}>();
    return existing?.completed_at?'done':'busy';
  }
  async complete(eventId:string,owner:string){
    const result=await this.db.prepare(`UPDATE billing_webhook_receipts SET completed_at=unixepoch(),lease_owner=NULL
      WHERE event_id=? AND lease_owner=? AND completed_at IS NULL AND lease_until>unixepoch()`).bind(eventId,owner).run();
    return result.meta.changes===1;
  }
  async release(eventId:string,owner:string){
    await this.db.prepare(`UPDATE billing_webhook_receipts SET lease_until=unixepoch(),lease_owner=NULL
      WHERE event_id=? AND lease_owner=? AND completed_at IS NULL`).bind(eventId,owner).run();
  }
}
