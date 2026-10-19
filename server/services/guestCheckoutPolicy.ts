type Session = {
  status?: string | null;
  mode?: string | null;
  metadata?: Record<string, string> | null;
  customer?: string | { id: string } | null;
  subscription?: string | { id: string } | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
};

export function guestCheckoutDetails(session: Session, appSlug: string) {
  if (session.status !== 'complete' || session.mode !== 'subscription' ||
      session.metadata?.app !== appSlug || session.metadata?.guestCheckout !== 'true') {
    throw new Error('CHECKOUT_NOT_COMPLETE');
  }
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const email = (session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (!customerId || !subscriptionId || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('CHECKOUT_DETAILS_MISSING');
  }
  return { customerId, subscriptionId, email };
}
