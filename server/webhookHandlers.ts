// Stripe Webhook Handlers
// Processes Stripe webhook events via stripe-replit-sync

import { getStripeSync } from './stripeClient';
import { storage } from './storage';

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
    
    // Handle subscription events to update user records
    if (event.type === 'customer.subscription.created' || 
        event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;
      
      // Find user by stripe customer id and update their subscription
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        // Determine plan from price metadata or product
        let plan = 'free';
        if (subscription.items?.data?.[0]?.price?.metadata?.plan) {
          plan = subscription.items.data[0].price.metadata.plan;
        }
        
        await storage.updateStripeSubscriptionId(user.id, subscription.id);
        await storage.updateSubscriptionStatus(user.id, status, plan);
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
