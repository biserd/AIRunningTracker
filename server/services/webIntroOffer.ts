export type WebBillingPeriod = 'monthly' | 'annual';

export const WEB_INTRO_OFFER_ENDS_AT = '2026-12-01T05:00:00.000Z';

const WEB_INTRO_PRICES = {
  monthly: { regular: 799, introductory: 399, payments: 1 },
  annual: { regular: 7999, introductory: 3999, payments: 1 },
} as const;

/** The coupon is redeemed when Checkout creates a subscription, not when its trial ends. */
export function webIntroOfferForPrice({
  billingPeriod,
  regularUnitAmount,
  currency,
  firstTimeSubscriber,
  couponId,
  now = Date.now(),
}: {
  billingPeriod: WebBillingPeriod;
  regularUnitAmount: number;
  currency: string;
  firstTimeSubscriber: boolean;
  couponId?: string;
  now?: number;
}) {
  const expected = WEB_INTRO_PRICES[billingPeriod];
  if (!firstTimeSubscriber || !couponId || now >= Date.parse(WEB_INTRO_OFFER_ENDS_AT) ||
      currency.toLowerCase() !== 'usd' || regularUnitAmount !== expected.regular) return null;
  return {
    couponId,
    introductoryUnitAmount: expected.introductory,
    regularUnitAmount: expected.regular,
    introductoryPayments: expected.payments,
    offerEndsAt: WEB_INTRO_OFFER_ENDS_AT,
  };
}

export function configuredWebIntroCoupon(billingPeriod: WebBillingPeriod): string | undefined {
  return process.env[billingPeriod === 'monthly'
    ? 'STRIPE_WEB_INTRO_MONTHLY_COUPON'
    : 'STRIPE_WEB_INTRO_ANNUAL_COUPON'];
}

/** Stripe rejects a Session that specifies discounts and allow_promotion_codes together. */
export function checkoutDiscountOptions(couponId?: string) {
  return couponId
    ? { discounts: [{ coupon: couponId }] }
    : { allow_promotion_codes: true };
}
