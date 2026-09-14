import type Stripe from 'stripe';
import {getUncachableStripeClient} from '../stripeClient';

/** Dedicated signature verification replaces the PostgreSQL-backed managed sync package. */
export async function verifyStripeWebhook(payload:Buffer,signature:string,_uuid:string):Promise<Stripe.Event>{
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret?.startsWith('whsec_')||secret.length<24)throw new Error('STRIPE_WEBHOOK_SECRET_REQUIRED');
  const stripe=await getUncachableStripeClient();
  const event=stripe.webhooks.constructEvent(payload,signature,secret);
  if(process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')&&!event.livemode)throw new Error('STRIPE_EVENT_MODE_MISMATCH');
  return event;
}
