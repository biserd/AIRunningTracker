import assert from "node:assert/strict";
import test from "node:test";
import { SIGNUP_REMINDER_STEPS, signupReminderExclusion, signupReminderWindow } from "../signupReminders";
const now = Date.parse("2026-11-07T12:00:00Z");
const base = { email: "fixture@example.test", subscriptionPlan: "free", subscriptionStatus: "active", marketingConsentStatus: "consented", marketingOptOut: false, createdAt: new Date(now - 86400000) };
test("signup cadence is exactly day 1, 7 and 14 from signup, with no missed-step replay", () => {
  assert.deepEqual(SIGNUP_REMINDER_STEPS.map(step => step.offsetHours / 24), [1,7,14]);
  for (let index = 0; index < 3; index++) {
    const window = signupReminderWindow(base.createdAt, index);
    assert.equal(window.start, base.createdAt.getTime() + SIGNUP_REMINDER_STEPS[index].offsetHours * 3600000);
    assert.equal(window.end - window.start, 3 * 86400000);
  }
  assert.equal(signupReminderExclusion(base, now), null);
  assert.equal(signupReminderExclusion({ ...base, createdAt: new Date(now - 17 * 86400000) }, now), "sequence_expired");
});
test("Premium, trial, paid-through cancellations, delinquent billing, opt-outs and missing consent are excluded", () => {
  for (const patch of [
    { subscriptionPlan: "premium", subscriptionStatus: "active" }, { subscriptionPlan: "pro", subscriptionStatus: "active" },
    { subscriptionStatus: "trialing" }, { subscriptionStatus: "past_due" }, { subscriptionStatus: "unpaid" },
    { subscriptionStatus: "canceled", subscriptionEndsAt: new Date(now + 86400000) },
    { marketingOptOut: true }, { marketingConsentStatus: "unsubscribed" }, { marketingConsentStatus: "suppressed" },
    { marketingConsentStatus: "unknown" }, { email: null }, { createdAt: "invalid" }, { createdAt: new Date(now + 1000) }, { isAdmin: true },
  ]) assert.ok(signupReminderExclusion({ ...base, ...patch }, now), JSON.stringify(patch));
});
