// Stripe Webhook Handlers
// Processes Stripe webhook events via stripe-replit-sync

import { getStripeSync } from './stripeClient';
import { storage } from './storage';

// Map price IDs to subscription plans
const PRICE_TO_PLAN: Record<string, string> = {
  // Pro prices
  'price_1SbtceRwvWaTf8xfu0bS2gc3': 'pro',  // Pro monthly
  'price_1SbtceRwvWaTf8xfoPfgZI1z': 'pro',  // Pro annual
  // Premium prices  
  'price_1SbtcfRwvWaTf8xfSEO4iKnc': 'premium',  // Premium monthly
  'price_1SbtcfRwvWaTf8xfwcVnrRf8': 'premium',  // Premium annual
};

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    // Validate payload is a Buffer
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // Process the webhook - stripe-replit-sync handles syncing to database
    await sync.processWebhook(payload, signature, uuid);
    
    // Parse the event to handle subscription updates
    const event = JSON.parse(payload.toString());
    
    console.log('Processing webhook event:', event.type);
    
    // Handle subscription events to update user records
    if (event.type === 'customer.subscription.created' || 
        event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;
      const priceId = subscription.items?.data?.[0]?.price?.id;
      
      console.log('Subscription event details:', { customerId, status, priceId });
      
      // Find user by stripe customer id and update their subscription
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        // Determine plan from price ID mapping, then metadata fallback
        let plan = 'free';
        if (priceId && PRICE_TO_PLAN[priceId]) {
          plan = PRICE_TO_PLAN[priceId];
        } else if (subscription.items?.data?.[0]?.price?.metadata?.plan) {
          plan = subscription.items.data[0].price.metadata.plan;
        }
        
        console.log('Updating user subscription:', { userId: user.id, status, plan });
        
        await storage.updateStripeSubscriptionId(user.id, subscription.id);
        await storage.updateSubscriptionStatus(user.id, status, plan);
      } else {
        console.log('User not found for Stripe customer:', customerId);
      }
    }
    
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        await storage.updateSubscriptionStatus(user.id, 'canceled', 'free');
      }
    }
  }
}
