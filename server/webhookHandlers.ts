// Stripe Webhook Handlers
// Processes Stripe webhook events via stripe-replit-sync

import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { emailService } from './services/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'biserd@gmail.com';
const APP_SLUG = process.env.APP_SLUG || 'aitracker';
const ALLOWED_PRICE_IDS = (process.env.ALLOWED_PRICE_IDS || '').split(',').filter(Boolean);

// Map price IDs to subscription plans
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1SbtcfRwvWaTf8xfSEO4iKnc': 'premium',  // Premium monthly
  'price_1SbtcfRwvWaTf8xfwcVnrRf8': 'premium',  // Premium annual
};

const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 1000;

export class WebhookHandlers {
  private static determineOwnerApp(event: any): string | null {
    const obj = event.data?.object;
    if (!obj) return null;

    if (obj.metadata?.app) return obj.metadata.app;

    if (event.type?.startsWith('invoice.')) {
      const lines = obj.lines?.data || [];
      for (const line of lines) {
        if (line.metadata?.app) return line.metadata.app;
      }
    }

    if (event.type?.startsWith('customer.subscription.')) {
      const items = obj.items?.data || [];
      for (const item of items) {
        if (item.metadata?.app) return item.metadata.app;
      }
    }

    return null;
  }

  private static extractPriceIds(event: any): string[] {
    const obj = event.data?.object;
    if (!obj) return [];
    const priceIds: string[] = [];

    if (event.type?.startsWith('invoice.')) {
      const lines = obj.lines?.data || [];
      for (const line of lines) {
        if (line.price?.id) priceIds.push(line.price.id);
        if (line.pricing?.price_details?.price) priceIds.push(line.pricing.price_details.price);
      }
    }

    if (event.type?.startsWith('customer.subscription.')) {
      const items = obj.items?.data || [];
      for (const item of items) {
        if (item.price?.id) priceIds.push(item.price.id);
      }
    }

    if (event.type?.startsWith('checkout.session.')) {
      const lineItems = obj.line_items?.data || [];
      for (const item of lineItems) {
        if (item.price?.id) priceIds.push(item.price.id);
      }
    }

    return priceIds;
  }

  private static shouldProcessEvent(event: any): boolean {
    const ownerApp = this.determineOwnerApp(event);

    if (ownerApp === APP_SLUG) {
      return true;
    }

    if (ownerApp && ownerApp !== APP_SLUG) {
      console.log(`[Webhook] Ignored event ${event.id} (${event.type}) - belongs to app: ${ownerApp}`);
      return false;
    }

    if (ALLOWED_PRICE_IDS.length > 0) {
      const priceIds = this.extractPriceIds(event);
      if (priceIds.length > 0) {
        const hasMatch = priceIds.some(id => ALLOWED_PRICE_IDS.includes(id));
        if (!hasMatch) {
          console.log(`[Webhook] Ignored event ${event.id} (${event.type}) - price IDs [${priceIds.join(', ')}] not in allowlist`);
          return false;
        }
        return true;
      }
    }

    const customerEvents = ['customer.created', 'customer.updated', 'customer.deleted'];
    if (customerEvents.includes(event.type)) {
      return true;
    }

    console.log(`[Webhook] Ignored event ${event.id} (${event.type}) - no metadata and no matching price IDs`);
    return false;
  }

  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    await sync.processWebhook(payload, signature, uuid);
    
    const event = JSON.parse(payload.toString());

    if (processedEvents.has(event.id)) {
      console.log(`[Webhook] Skipping duplicate event ${event.id} (${event.type})`);
      return;
    }
    processedEvents.add(event.id);
    if (processedEvents.size > MAX_PROCESSED_EVENTS) {
      const first = processedEvents.values().next().value;
      if (first) processedEvents.delete(first);
    }

    if (!this.shouldProcessEvent(event)) {
      return;
    }
    
    console.log(`[Webhook] Processing event ${event.id}: ${event.type} (app: ${APP_SLUG})`);
    
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
