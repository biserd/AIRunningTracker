import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isLifecycleMessageable, resolveLifecycleSegment, stableLifecycleBucket } from "../lifecycleCampaigns";

const now = new Date("2026-08-25T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const base = {
  email: "runner@example.com",
  marketingConsentStatus: "consented",
  marketingOptOut: false,
  subscriptionPlan: "free",
  subscriptionStatus: "active",
  stravaConnected: true,
  createdAt: hoursAgo(48),
  lastSeenAt: hoursAgo(1),
};

assert.equal(isLifecycleMessageable(base), true);
assert.equal(resolveLifecycleSegment({ ...base, marketingConsentStatus: "unknown" }, {}, now), null, "unknown consent must not receive marketing");
assert.equal(resolveLifecycleSegment({ ...base, marketingOptOut: true }, {}, now), null, "opt-out must always win");
assert.equal(resolveLifecycleSegment({ ...base, subscriptionPlan: "premium", subscriptionStatus: "active" }, {}, now), null, "paid runners are suppressed");
assert.equal(resolveLifecycleSegment({ ...base, stravaConnected: false }, {}, now), "signup_no_strava");
assert.equal(resolveLifecycleSegment({ ...base, premiumPreviewCreatedAt: hoursAgo(2) }, {}, now), "preview_ready_unseen");
assert.equal(resolveLifecycleSegment({ ...base, premiumPreviewCreatedAt: hoursAgo(2) }, { previewViewedAt: hoursAgo(1) }, now), "preview_engaged_no_trial");
assert.equal(resolveLifecycleSegment(base, { checkoutStartedAt: hoursAgo(2) }, now), "checkout_abandoned", "checkout intent outranks generic free state");
assert.equal(resolveLifecycleSegment({ ...base, subscriptionStatus: "trialing", trialEndsAt: new Date(now.getTime() + 48 * 60 * 60 * 1000) }, {}, now), "trial_ending");
assert.equal(resolveLifecycleSegment({ ...base, subscriptionStatus: "trialing", trialEndsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) }, {}, now), "trial_needs_activation");
assert.equal(resolveLifecycleSegment({ ...base, subscriptionStatus: "trialing", trialEndsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), activationAt: hoursAgo(1) }, {}, now), "trial_engaged");
assert.equal(resolveLifecycleSegment({ ...base, subscriptionStatus: "canceled" }, {}, now), "trial_expired_winback");
assert.equal(resolveLifecycleSegment({ ...base, lastSeenAt: hoursAgo(31 * 24) }, {}, now), "inactive_free");
assert.equal(stableLifecycleBucket(42, "test"), stableLifecycleBucket(42, "test"), "cohort assignment must be deterministic");

const migration = readFileSync(new URL("../../migrations/0003_lifecycle_campaigns.sql", import.meta.url), "utf8");
assert.match(migration, /drip_campaigns_enabled', 'false'[\s\S]*DO UPDATE SET value = 'false'/, "migration must force delivery off");
assert.match(migration, /drip_campaigns_dry_run', 'true'[\s\S]*DO UPDATE SET value = 'true'/, "migration must force dry-run on");
assert.match(migration, /FOR UPDATE SKIP LOCKED|email_jobs_claim_idx/, "migration must support safe job claiming");

console.log("Lifecycle campaign segmentation tests passed");
