import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutDiscountOptions, webIntroOfferForPrice } from './webIntroOffer';

const beforeExpiry = Date.parse('2026-11-30T12:00:00.000Z');
const afterExpiry = Date.parse('2026-12-01T05:00:00.000Z');

test('first-time monthly subscribers receive the exact first-payment discount', () => {
  assert.deepEqual(webIntroOfferForPrice({ billingPeriod: 'monthly', regularUnitAmount: 799,
    currency: 'usd', firstTimeSubscriber: true, couponId: 'monthly-coupon', now: beforeExpiry }), {
    couponId: 'monthly-coupon', introductoryUnitAmount: 399, regularUnitAmount: 799,
    introductoryPayments: 1, offerEndsAt: '2026-12-01T05:00:00.000Z',
  });
});

test('first-time annual subscribers receive only a first-year discount', () => {
  const offer = webIntroOfferForPrice({ billingPeriod: 'annual', regularUnitAmount: 7999,
    currency: 'usd', firstTimeSubscriber: true, couponId: 'annual-coupon', now: beforeExpiry });
  assert.equal(offer?.introductoryUnitAmount, 3999);
  assert.equal(offer?.regularUnitAmount, 7999);
  assert.equal(offer?.introductoryPayments, 1);
});

test('existing subscribers, missing configuration, changed prices, and expired offers receive no coupon', () => {
  const base = { billingPeriod: 'monthly' as const, regularUnitAmount: 799,
    currency: 'usd', firstTimeSubscriber: true, couponId: 'monthly-coupon', now: beforeExpiry };
  assert.equal(webIntroOfferForPrice({ ...base, firstTimeSubscriber: false }), null);
  assert.equal(webIntroOfferForPrice({ ...base, couponId: undefined }), null);
  assert.equal(webIntroOfferForPrice({ ...base, regularUnitAmount: 699 }), null);
  assert.equal(webIntroOfferForPrice({ ...base, currency: 'eur' }), null);
  assert.equal(webIntroOfferForPrice({ ...base, now: afterExpiry }), null);
});

test('Checkout sends either a pre-applied coupon or a promotion-code field, never both', () => {
  assert.deepEqual(checkoutDiscountOptions('monthly-coupon'), { discounts: [{ coupon: 'monthly-coupon' }] });
  assert.deepEqual(checkoutDiscountOptions(), { allow_promotion_codes: true });
});
