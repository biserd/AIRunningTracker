import { getUncachableStripeClient } from '../stripeClient';
import { emailService } from './email';
import { NativeSignup } from './nativeSignup';
import { guestCheckoutDetails } from './guestCheckoutPolicy';
import { storage } from '../storage';
import { AppleSubscriptionLedger } from './appleSubscriptions';

const appSlug = () => process.env.APP_SLUG || 'aitracker';

/** The session ID is a lookup key, never proof of account ownership. */
export async function completedGuestCheckout(sessionId: string) {
  if (!/^cs_(test_|live_)[A-Za-z0-9_]{10,}$/.test(sessionId)) throw new Error('INVALID_CHECKOUT_SESSION');
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const { customerId, subscriptionId, email } = guestCheckoutDetails(session, appSlug());
  return { stripe, session, customerId, subscriptionId, email };
}

/** Stripe's email is not an authentication factor. Only the recipient of this link can claim access. */
export async function emailGuestCheckoutClaim(sessionId: string): Promise<void> {
  const { applicationSqlDatabase } = await import('../d1/runtimeDatabase');
  const { stripe, subscriptionId, email } = await completedGuestCheckout(sessionId);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const existing = await applicationSqlDatabase.prepare('SELECT id FROM users WHERE lower(email)=?')
    .bind(email).first<{ id: number }>();
  const user = existing ? await storage.getUser(existing.id) : null;
  const existingSubscription = Boolean(user?.stripeSubscriptionId && user.stripeSubscriptionId !== subscriptionId);
  const appleAccess = user ? await new AppleSubscriptionLedger(applicationSqlDatabase).access(user.id) : false;
  if (existingSubscription || appleAccess) {
    if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
      throw new Error('CHECKOUT_NOT_ACTIVE');
    }
    await new NativeSignup(
      applicationSqlDatabase,
      (to, token) => emailService.sendExistingAccountCheckoutEmail(to, token),
    ).request(email);
    return;
  }
  if (!['active', 'trialing'].includes(subscription.status)) throw new Error('CHECKOUT_NOT_ACTIVE');
  await new NativeSignup(
    applicationSqlDatabase,
    (to, token) => emailService.sendCheckoutClaimEmail(to, token, sessionId),
  ).request(email);
}
