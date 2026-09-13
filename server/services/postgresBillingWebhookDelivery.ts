import type {JobSqlClient} from './queue/durableJobStore';
import type {BillingWebhookDeliveryStore} from './billingWebhookDelivery';

export class PostgresBillingWebhookDelivery implements BillingWebhookDeliveryStore {
  constructor(private db:JobSqlClient){}
  async claim(eventId:string,eventType:string,owner:string):Promise<'claimed'|'done'|'busy'>{
    const result=await this.db.query(`INSERT INTO billing_webhook_receipts(event_id,event_type,lease_owner,lease_until)
      VALUES($1,$2,$3,now()+interval '10 minutes') ON CONFLICT(event_id) DO UPDATE
      SET lease_owner=excluded.lease_owner,lease_until=excluded.lease_until,attempts=billing_webhook_receipts.attempts+1
      WHERE billing_webhook_receipts.completed_at IS NULL AND billing_webhook_receipts.lease_until<=now()
      AND billing_webhook_receipts.event_type=excluded.event_type RETURNING event_id`,[eventId,eventType,owner]);
    if(result.rows.length)return 'claimed';
    const existing=await this.db.query('SELECT completed_at FROM billing_webhook_receipts WHERE event_id=$1',[eventId]);
    return existing.rows[0]?.completed_at?'done':'busy';
  }
  async complete(eventId:string,owner:string){
    const result=await this.db.query(`UPDATE billing_webhook_receipts SET completed_at=now(),lease_owner=NULL
      WHERE event_id=$1 AND lease_owner=$2 AND completed_at IS NULL AND lease_until>now() RETURNING event_id`,[eventId,owner]);
    return result.rows.length===1;
  }
  async release(eventId:string,owner:string){
    await this.db.query(`UPDATE billing_webhook_receipts SET lease_until=now(),lease_owner=NULL
      WHERE event_id=$1 AND lease_owner=$2 AND completed_at IS NULL`,[eventId,owner]);
  }
}
