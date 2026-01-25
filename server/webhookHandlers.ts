// Stripe Webhook Handlers
// Processes Stripe webhook events via stripe-replit-sync

import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { emailService } from './services/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'biserd@gmail.com';

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
        
        // Send admin notification for new trial starts
        if (event.type === 'customer.subscription.created' && status === 'trialing') {
          await WebhookHandlers.sendAdminNotification(
            'New Trial Started',
            user,
            plan,
            subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
          );
        }
      } else {
        console.log('User not found for Stripe customer:', customerId);
      }
    }
    
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        const previousPlan = user.subscriptionPlan || 'unknown';
        await storage.updateSubscriptionStatus(user.id, 'canceled', 'free');
        
        // Send admin notification for cancellation
        await WebhookHandlers.sendAdminNotification(
          'Subscription Canceled',
          user,
          previousPlan,
          null
        );
      }
    }
  }

  private static async sendAdminNotification(
    eventType: string,
    user: { id: number; email: string; firstName?: string | null },
    plan: string,
    trialEndsAt: Date | null
  ): Promise<void> {
    try {
      const subject = `[RunAnalytics] ${eventType}: ${user.email}`;
      const trialInfo = trialEndsAt 
        ? `<p><strong>Trial ends:</strong> ${trialEndsAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>`
        : '';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${eventType.includes('Canceled') ? '#e74c3c' : '#27ae60'};">${eventType}</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>User:</strong> ${user.firstName || 'N/A'}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>User ID:</strong> ${user.id}</p>
            <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
            ${trialInfo}
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
          </div>
        </div>
      `;

      await emailService.sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html,
        text: `${eventType}\n\nUser: ${user.email}\nPlan: ${plan}\n${trialEndsAt ? `Trial ends: ${trialEndsAt.toISOString()}` : ''}`
      });
      
      console.log(`[Webhook] Admin notification sent: ${eventType} for ${user.email}`);
    } catch (error) {
      console.error('[Webhook] Failed to send admin notification:', error);
    }
  }
}
