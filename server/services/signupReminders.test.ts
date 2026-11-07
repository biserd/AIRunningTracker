import assert from "node:assert/strict";
import test from "node:test";
process.env.DATABASE_URL ||= "postgresql://fixture:fixture@127.0.0.1:1/fixture";
process.env.MARKETING_LINK_SIGNING_SECRET = "fixture-only-signup-link-secret-more-than-thirty-two-characters";
const { SignupReminderService } = await import("./signupReminders");
function fixture() {
  let now = Date.parse("2026-11-07T12:00:00Z"), enabled = true, claims = 0;
  const user: any = { id: 1007, email: "fixture@example.test", subscriptionPlan: "free", subscriptionStatus: "active", marketingConsentStatus: "consented", marketingOptOut: false, createdAt: new Date(now - 86400000), coachTimezone: "UTC" };
  const jobs: any[] = [], campaigns: any[] = [], sent: any[] = [];
  const store: any = {
    getSystemSetting: async (key: string) => key.includes("rollout") ? "100" : "0",
    getUser: async () => user, getAllUsers: async () => [user], getUserCampaign: async () => campaigns[0],
    getActiveCampaigns: async () => campaigns.filter(c => c.state === "active"),
    exitUserCampaign: async (id: number, reason: string) => Object.assign(campaigns.find(c => c.id === id), { state: "exited", exitReason: reason }),
    cancelEmailJobsForUser: async () => jobs.filter(j => ["pending","processing","retry_scheduled"].includes(j.status)).forEach(j => j.status = "cancelled"),
    createUserCampaign: async (value: any) => { const c = { id: campaigns.length + 1, state: "active", ...value }; campaigns.push(c); return c; },
    updateUserCampaign: async (id: number, value: any) => Object.assign(campaigns.find(c => c.id === id), value),
    getEmailJobByDedupeKey: async (key: string) => jobs.find(j => j.dedupeKey === key),
    getEmailJob: async (id: number) => jobs.find(j => j.id === id),
    createEmailJob: async (value: any) => { const job = { id: jobs.length + 1, status: "pending", retryCount: 0, ...value }; jobs.push(job); return job; },
    updateEmailJob: async (id: number, value: any) => Object.assign(jobs.find(j => j.id === id), value),
    getLastSentEmailForUser: async () => jobs.filter(j => j.status === "sent").at(-1),
    updateUser: async (_id: number, value: any) => Object.assign(user, value),
  };
  let failure: string | undefined, beforeSend: (() => void) | undefined;
  const sender = { sendDripEmail: async (value: any) => { beforeSend?.(); if (!await value.beforeSend()) return { success: false, error: "recipient_no_longer_eligible" }; if (failure) return { success: false, error: failure }; sent.push(value); return { success: true, providerMessageId: "fixture-message" }; } };
  const service = new SignupReminderService(store, sender, async (id, owner) => { const j = jobs.find(j => j.id === id); if (j.status !== "processing" || j.claimedBy !== owner) return false; j.status = "failed"; claims++; return true; }, () => now, () => enabled);
  const claim = (index = 0) => { const j = jobs[index]; j.status = "processing"; j.claimedBy = "fixture-worker"; return { ...j }; };
  return { user, jobs, campaigns, sent, service, claim, advance: (days: number) => { now += days * 86400000; }, fail: (reason: string) => { failure = reason; }, beforeSend: (fn: () => void) => { beforeSend = fn; }, disable: () => { enabled = false; }, claims: () => claims };
}
test("sequence is deduplicated and schedules days 1/7/14 from original signup, then completes", async () => {
  const f = fixture();
  await f.service.schedule(f.user); await f.service.schedule(f.user);
  assert.equal(f.jobs.length, 1);
  for (let index = 0; index < 3; index++) {
    const claimed = f.claim(index);
    assert.equal(await f.service.process(claimed), true);
    assert.equal(await f.service.process(claimed), false, "same job cannot send twice");
    assert.equal(f.sent[index].step, ["DAY1","DAY7","DAY14"][index]);
    assert.ok(f.sent[index].unsubscribeUrl.includes("/api/marketing/unsubscribe?token="));
    if (index < 2) f.advance(index === 0 ? 6 : 7);
  }
  assert.equal(f.sent.length, 3); assert.equal(f.jobs.length, 3);
  assert.equal(f.campaigns[0].state, "completed");
  assert.equal(await f.service.schedule(f.user), "complete");
});
test("unknown-consent signup can enroll and send without manufacturing opt-in", async () => {
  const f = fixture(); f.user.marketingConsentStatus = "unknown";
  assert.equal(await f.service.schedule(f.user), "scheduled");
  assert.equal(await f.service.process(f.claim()), true);
  assert.equal(f.sent.length, 1);
  assert.equal(f.user.marketingConsentStatus, "unknown");
});
test("unknown consent never overrides an explicit opt-out or unsubscribe", async () => {
  for (const patch of [{ marketingConsentStatus: "unknown", marketingOptOut: true }, { marketingConsentStatus: "unsubscribed", marketingOptOut: false }]) {
    const f = fixture(); Object.assign(f.user, patch);
    assert.equal(await f.service.schedule(f.user), "ineligible");
    assert.equal(f.jobs.length, 0);
  }
});
for (const kind of ["paid", "optout", "suppressed", "trial", "disabled"]) test("queued send stops after " + kind, async () => {
  const f = fixture(); await f.service.schedule(f.user); const job = f.claim();
  if (kind === "paid") Object.assign(f.user, { subscriptionPlan: "premium", subscriptionStatus: "active" });
  if (kind === "optout") f.user.marketingOptOut = true;
  if (kind === "suppressed") f.user.marketingConsentStatus = "suppressed";
  if (kind === "trial") f.user.subscriptionStatus = "trialing";
  if (kind === "disabled") f.disable();
  assert.equal(await f.service.process(job), false); assert.equal(f.sent.length, 0);
});
test("upgrading during provider preflight stops the final send", async () => {
  const f = fixture(); await f.service.schedule(f.user);
  f.beforeSend(() => Object.assign(f.user, { subscriptionPlan: "premium", subscriptionStatus: "active" }));
  assert.equal(await f.service.process(f.claim()), false); assert.equal(f.sent.length, 0); assert.equal(f.jobs[0].status, "cancelled");
});
test("old accounts are not backfilled, expired day-1 jobs move to day-7 without sending late", async () => {
  const f = fixture(); await f.service.schedule(f.user); f.advance(6);
  assert.equal(await f.service.process(f.claim()), false); assert.equal(f.sent.length, 0);
  assert.equal(f.jobs[1].step, "DAY7");
  const old = fixture(); old.advance(30); assert.equal(await old.service.schedule(old.user), "ineligible"); assert.equal(old.jobs.length, 0);
});
test("uncertain delivery is terminal, not automatically resent", async () => {
  const f = fixture(); await f.service.schedule(f.user); f.fail("cloudflare_email_outcome_unknown");
  assert.equal(await f.service.process(f.claim()), false); assert.equal(f.jobs[0].status, "failed");
  await f.service.schedule(f.user); assert.equal(f.jobs.filter(j => j.step === "DAY1").length, 1); assert.equal(f.jobs[1].step, "DAY7");
});
test("suppression and retry failures do not claim delivery", async () => {
  for (const reason of ["cloudflare_suppressed_hard_bounce", "cloudflare_suppressed_soft_bounce", "cloudflare_suppression_check_unavailable"]) {
    const f = fixture(); await f.service.schedule(f.user); f.fail(reason);
    assert.equal(await f.service.process(f.claim()), false); assert.equal(f.sent.length, 0);
    assert.equal(f.jobs[0].status, reason === "cloudflare_suppressed_hard_bounce" ? "failed" : "retry_scheduled");
    if (reason === "cloudflare_suppressed_hard_bounce") assert.equal(f.user.marketingOptOut, true);
  }
});
test("quiet hours defer a due reminder instead of sending overnight", async () => {
  const f = fixture(); await f.service.schedule(f.user); f.user.coachTimezone = "America/New_York";
  assert.equal(await f.service.process(f.claim()), false); assert.equal(f.sent.length, 0);
  assert.equal(f.jobs[0].scheduledAt.toISOString(), "2026-11-07T13:00:00.000Z");
});
