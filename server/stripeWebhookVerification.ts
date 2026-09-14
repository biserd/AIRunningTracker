import type Stripe from 'stripe';
import {getStripeSync} from './stripeClient';

export async function verifyStripeWebhook(payload:Buffer,signature:string,uuid:string):Promise<Stripe.Event>{
  const sync=await getStripeSync();
  await sync.processWebhook(payload,signature,uuid);
  return JSON.parse(payload.toString());
}
