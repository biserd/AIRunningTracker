import {randomUUID} from 'node:crypto';

export interface BillingWebhookDeliveryStore {
  claim(eventId:string,eventType:string,owner:string):Promise<'claimed'|'done'|'busy'>;
  complete(eventId:string,owner:string):Promise<boolean>;
  release(eventId:string,owner:string):Promise<void>;
}

/** At-least-once delivery. Business updates must remain idempotent on event/subscription ID. */
export async function deliverBillingWebhook(store:BillingWebhookDeliveryStore,event:{id:string;type:string},process:()=>Promise<void>){
  if(!/^evt_[a-zA-Z0-9]{1,180}$/.test(event.id)||!/^[-a-zA-Z0-9_.]{1,120}$/.test(event.type))throw new Error('INVALID_STRIPE_EVENT');
  const owner=randomUUID();
  const claimed=await store.claim(event.id,event.type,owner);
  if(claimed==='done')return;
  if(claimed==='busy')throw new Error('STRIPE_EVENT_IN_PROGRESS');
  try{
    await process();
    if(!await store.complete(event.id,owner))throw new Error('STRIPE_EVENT_LEASE_LOST');
  }catch(error){
    // Never persist provider responses, bearer tokens or private payloads in the receipt.
    await store.release(event.id,owner).catch(()=>undefined);
    throw error;
  }
}
