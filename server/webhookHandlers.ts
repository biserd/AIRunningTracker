// Stripe Webhook Handlers
// Processes Stripe webhook events via stripe-replit-sync

import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { emailService } from './services/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'biserd@gmail.com';
const APP_SLUG = process.env.APP_SLUG || 'aitracker';
const ALLOWED_PRICE_IDS = (process.env.ALLOWED_PRICE_IDS || '').split(',').filter(Boolean);

// Optional env-var price ID overrides for the resolver. These let ops pin the
// live price IDs without having to retag products in Stripe. The resolver
// works without them as long as the Stripe product has metadata.plan='premium'.
const ENV_PRICE_TO_PLAN: Record<string, string> = {};
for (const [envName, plan] of [
  ['STRIPE_PRICE_PREMIUM_MONTHLY', 'premium'],
  ['STRIPE_PRICE_PREMIUM_ANNUAL', 'premium'],
] as const) {
  const v = process.env[envName];
  if (v) ENV_PRICE_TO_PLAN[v] = plan;
}

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
const TERMINAL_STATUSES = new Set(['canceled', 'incomplete_expired', 'unpaid']);

// In-memory cache of Stripe product metadata so we don't hit the API on
// every webhook event. Products change so rarely this is safe.
const productMetaCache = new Map<string, Record<string, string> | null>();
async function getProductMetadata(productId: string): Promise<Record<string, string> | null> {
  if (!productId) return null;
  if (productMetaCache.has(productId)) return productMetaCache.get(productId) ?? null;
  try {
    const stripe = await getUncachableStripeClient();
    const product = await stripe.products.retrieve(productId);
    const meta = (product as any)?.metadata || null;
    productMetaCache.set(productId, meta);
    return meta;
  } catch (err) {
    console.warn(`[Webhook] Failed to fetch product ${productId}:`, (err as any)?.message);
    productMetaCache.set(productId, null);
    return null;
  }
}

export interface ResolvedPlan {
  plan: string;
  source: 'price-metadata' | 'product-metadata' | 'env-override' | 'status-fallback' | 'terminal-status' | 'unknown-status';
  priceId?: string;
  productId?: string;
}

/**
 * Resolve the subscription plan ('premium' or 'free') for a Stripe subscription
 * object. Critical: never returns 'free' for an active/trialing/past_due
 * subscription; the only way to land on 'free' is via a terminal status
 * (canceled / incomplete_expired / unpaid).
 *
 * Resolution order:
 *   1. subscription.items[0].price.metadata.plan
 *   2. Cached fetch of subscription.items[0].price.product → product.metadata.plan
 *   3. Env-var override (STRIPE_PRICE_PREMIUM_MONTHLY/ANNUAL)
 *   4. Status fallback: active/trialing/past_due ⇒ 'premium' (only paid tier left)
 *   5. Terminal status ⇒ 'free'
 */
export async function resolvePlan(subscription: any): Promise<ResolvedPlan> {
  const item = subscription?.items?.data?.[0];
  const price = item?.price;
  const priceId: string | undefined = price?.id;
  const productId: string | undefined = typeof price?.product === 'string'
    ? price.product
    : price?.product?.id;
  const status: string = subscription?.status || '';

  // 1. price.metadata.plan
  const priceMetaPlan = price?.metadata?.plan;
  if (priceMetaPlan === 'premium' || priceMetaPlan === 'free') {
    return { plan: priceMetaPlan, source: 'price-metadata', priceId, productId };
  }

  // 2. product.metadata.plan
  if (productId) {
    const productMeta = await getProductMetadata(productId);
    const productPlan = productMeta?.plan;
    if (productPlan === 'premium' || productPlan === 'free') {
      return { plan: productPlan, source: 'product-metadata', priceId, productId };
    }
  }

  // 3. env-var override
  if (priceId && ENV_PRICE_TO_PLAN[priceId]) {
    return { plan: ENV_PRICE_TO_PLAN[priceId], source: 'env-override', priceId, productId };
  }

  // 4/5. status-based fallback
  if (TERMINAL_STATUSES.has(status)) {
    return { plan: 'free', source: 'terminal-status', priceId, productId };
  }
  if (ACTIVE_STATUSES.has(status)) {
    // Premium is the only paid tier; if a real customer is in a paying state,
    // they are Premium even if we couldn't tag the price.
    return { plan: 'premium', source: 'status-fallback', priceId, productId };
  }

  // Unknown status (incomplete, paused, etc.). Don't downgrade -- treat as free
  // only if there's no signal at all. The downgrade-safety rule in the
  // webhook handlers will still refuse to flip an existing 'premium' user
  // when this branch returns 'free'.
  return { plan: 'free', source: 'unknown-status', priceId, productId };
}

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

  private static extractCustomerId(event: any): string | null {
    const obj = event.data?.object;
    if (!obj) return null;
    const c = obj.customer;
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && typeof c.id === 'string') return c.id;
    return null;
  }

  private static async shouldProcessEvent(event: any): Promise<boolean> {
    const ownerApp = this.determineOwnerApp(event);

    // Explicitly tagged for our app.
    if (ownerApp === APP_SLUG) {
      return true;
    }

    // Explicitly tagged for a different app sharing this Stripe account.
    if (ownerApp && ownerApp !== APP_SLUG) {
      console.log(`[Webhook] Ignored event ${event.id} (${event.type}) - belongs to app: ${ownerApp}`);
      return false;
    }

    // No explicit owner -- accept if we own the customer in our DB. This
    // catches Customer Portal updates, manual Stripe-Dashboard subs, and
    // any subscription that pre-dates the metadata.app tagging.
    const customerId = this.extractCustomerId(event);
    if (customerId) {
      try {
        const owned = await storage.getUserByStripeCustomerId(customerId);
        if (owned) {
          return true;
        }
      } catch (err) {
        console.warn(`[Webhook] customer ownership lookup failed for ${customerId}:`, (err as any)?.message);
      }
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

    console.log(`[Webhook] Ignored event ${event.id} (${event.type}) - no metadata, no owned customer, no matching price IDs`);
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

    if (!(await this.shouldProcessEvent(event))) {
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
        const resolved = await resolvePlan(subscription);
        const previousPlan = user.subscriptionPlan || 'free';

        // Safety rule: never silently downgrade an existing 'premium' user to
        // 'free' on .created/.updated. Only the .deleted handler (or an
        // explicit terminal status) may downgrade. This protects against
        // mid-cycle Stripe changes that briefly drop metadata or hit a non-
        // terminal status we don't recognize.
        let planToWrite = resolved.plan;
        if (
          previousPlan === 'premium' &&
          planToWrite === 'free' &&
          !TERMINAL_STATUSES.has(status)
        ) {
          console.warn(
            `[Webhook] Refusing to downgrade user ${user.id} premium→free on ${event.type} (status=${status}, source=${resolved.source}, priceId=${resolved.priceId})`
          );
          planToWrite = 'premium';
        }

        console.log('Updating user subscription:', {
          userId: user.id,
          status,
          plan: planToWrite,
          source: resolved.source,
          priceId: resolved.priceId,
        });

        await storage.updateStripeSubscriptionId(user.id, subscription.id);
        await storage.updateSubscriptionStatus(user.id, status, planToWrite);

        // Backfill the user's email from Stripe if we don't have one yet
        // (e.g. silent Strava signups where Stripe Checkout collected the email).
        if (!user.email) {
          try {
            const stripeClient = await getUncachableStripeClient();
            const customer = await stripeClient.customers.retrieve(customerId);
            const stripeEmail = (customer && !('deleted' in customer && customer.deleted) && (customer as any).email) || null;
            if (stripeEmail) {
              const existing = await storage.getUserByEmail(stripeEmail);
              if (!existing || existing.id === user.id) {
                await storage.updateUser(user.id, { email: stripeEmail });
                console.log(`[Webhook] Backfilled email for user ${user.id} from Stripe customer ${customerId}`);
              } else {
                console.warn(`[Webhook] Cannot backfill email for user ${user.id}: ${stripeEmail} already in use by user ${existing.id}`);
              }
            }
          } catch (emailErr) {
            console.error(`[Webhook] Failed to backfill email for user ${user.id}:`, emailErr);
          }
        }

        // Admin notification when the resolver had to fall back to a status
        // guess. This catches future Stripe price additions that aren't tagged.
        if (resolved.source === 'status-fallback') {
          await WebhookHandlers.sendAdminNotification(
            'Plan Resolution Fallback Used',
            user,
            planToWrite,
            null,
            {
              note: 'Resolver could not find plan metadata on price or product; defaulted from subscription status. Tag the Stripe product with metadata.plan=premium to silence this.',
              customerId,
              priceId: resolved.priceId,
              productId: resolved.productId,
              subscriptionId: subscription.id,
              status,
            }
          );
        }
        
        // Send admin notification for new trial starts
        if (event.type === 'customer.subscription.created' && status === 'trialing') {
          await WebhookHandlers.sendAdminNotification(
            'New Trial Started',
            user,
            planToWrite,
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
    user: { id: number; email?: string | null; firstName?: string | null },
    plan: string,
    trialEndsAt: Date | null,
    extraDetails?: Record<string, any>
  ): Promise<void> {
    try {
      const userEmail = user.email || `(no email, user ${user.id})`;
      const subject = `[RunAnalytics] ${eventType}: ${userEmail}`;
      const trialInfo = trialEndsAt 
        ? `<p><strong>Trial ends:</strong> ${trialEndsAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>`
        : '';
      const extraInfo = extraDetails
        ? Object.entries(extraDetails)
            .map(([k, v]) => `<p><strong>${k}:</strong> ${String(v)}</p>`)
            .join('')
        : '';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${eventType.includes('Canceled') ? '#e74c3c' : eventType.includes('Fallback') ? '#f39c12' : '#27ae60'};">${eventType}</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>User:</strong> ${user.firstName || 'N/A'}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>User ID:</strong> ${user.id}</p>
            <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
            ${trialInfo}
            ${extraInfo}
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
