import assert from "node:assert/strict";
import test from "node:test";
import { SIGNUP_REMINDER_STEPS, nextSignupSendTime, signupCampaignTimezone, signupDeliveryWindow, signupReminderExclusion, signupReminderWindow } from "../signupReminders";
const now = Date.parse("2026-11-07T15:00:00Z");
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
test("default UTC is a campaign fallback, not an overwritten profile location", () => {
  const user = { ...base, coachTimezone: "UTC" };
  assert.equal(signupCampaignTimezone(user), "America/New_York");
  assert.equal(user.coachTimezone, "UTC");
  assert.equal(signupCampaignTimezone({ ...user, coachTimezone: "Europe/Paris" }), "Europe/Paris");
  assert.equal(signupCampaignTimezone({ ...user, coachTimezone: "invalid" }), "America/New_York");
});
test("daytime scheduling respects local zones, DST and custom quiet hours", () => {
  const after = (user: any, raw: string) => new Date(nextSignupSendTime(user, Date.parse(raw))!).toISOString();
  assert.equal(after({ coachTimezone: "UTC" }, "2026-11-07T23:00:00Z"), "2026-11-08T14:00:00.000Z");
  assert.equal(after({ coachTimezone: "America/New_York" }, "2026-03-08T05:00:00Z"), "2026-03-08T13:00:00.000Z");
  assert.equal(after({ coachTimezone: "Europe/Paris" }, "2026-11-07T01:00:00Z"), "2026-11-07T08:00:00.000Z");
  assert.equal(after({ coachTimezone: "America/New_York", coachQuietHoursStart: 8, coachQuietHoursEnd: 12 }, "2026-11-08T12:00:00Z"), "2026-11-08T17:00:00.000Z");
  assert.equal(nextSignupSendTime({ coachTimezone: "America/New_York", coachQuietHoursStart: 8, coachQuietHoursEnd: 20 }, now), null);
});
test("an overnight final deadline extends through the next daytime opening", () => {
  const user = { ...base, createdAt: "2026-10-22T03:40:34.907Z", coachTimezone: "UTC" };
  assert.equal(new Date(signupDeliveryWindow(user, 2).end).toISOString(), "2026-11-08T15:00:00.000Z");
  assert.equal(signupReminderExclusion(user, Date.parse("2026-11-08T14:00:00Z")), null);
  assert.equal(signupReminderExclusion(user, Date.parse("2026-11-20T15:00:00Z")), "sequence_expired");
  assert.equal(signupReminderExclusion(user, Date.parse("2026-11-20T15:00:00Z"), true), null);
  assert.equal(signupReminderExclusion({ ...user, marketingOptOut: true }, Date.parse("2026-11-20T15:00:00Z"), true), "unsubscribed");
});
test("unknown consent is eligible without changing consent, but explicit opt-outs still win", () => {
  for (const marketingConsentStatus of ["unknown", null, undefined]) {
    const user = { ...base, marketingConsentStatus };
    assert.equal(signupReminderExclusion(user, now), null);
    assert.equal(user.marketingConsentStatus, marketingConsentStatus);
    assert.equal(signupReminderExclusion({ ...user, marketingOptOut: true }, now), "unsubscribed");
  }
});
test("Premium, trial, paid-through cancellations, delinquent billing, opt-outs and suppressed users are excluded", () => {
  for (const patch of [
    { subscriptionPlan: "premium", subscriptionStatus: "active" }, { subscriptionPlan: "pro", subscriptionStatus: "active" },
    { subscriptionStatus: "trialing" }, { subscriptionStatus: "past_due" }, { subscriptionStatus: "unpaid" },
    { subscriptionStatus: "canceled", subscriptionEndsAt: new Date(now + 86400000) },
    { marketingOptOut: true }, { marketingConsentStatus: "unsubscribed" }, { marketingConsentStatus: "suppressed" },
    { marketingConsentStatus: "invalid" }, { email: null }, { createdAt: "invalid" }, { createdAt: new Date(now + 1000) }, { isAdmin: true },
  ]) assert.ok(signupReminderExclusion({ ...base, ...patch }, now), JSON.stringify(patch));
});
