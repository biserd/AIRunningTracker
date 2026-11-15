import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createSignupEmailReference, parseSignupEmailReference, signupEmailResultMatches, signupEmailStep } from "./signupEmailReference";
import { signupEmailFunnelQuery } from "./signupEmailFunnelQuery";
import { isClientFunnelEvent } from "../../shared/funnelEvents";

process.env.DATABASE_URL ||= "postgresql://fixture:fixture@127.0.0.1:1/fixture";
process.env.MARKETING_LINK_SIGNING_SECRET = "fixture-only-signup-email-funnel-reference-test-secret";
const { resolveSignupEmailReference, recordSignupEmailTrial, signupEmailStripeMetadata } = await import("./signupEmailMetrics");

test("references are expiring, opaque, day-bound and cannot sign users in", async () => {
  const ref = createSignupEmailReference(14, "DAY7");
  const other = createSignupEmailReference(14, "DAY7");
  const job = { id: 14, jobType: "drip", campaign: "signup_unpaid", campaignVersion: 3, status: "sent", step: "DAY7", userId: 21 } as any;
  assert.notEqual(ref, other);
  assert.equal(parseSignupEmailReference(ref, Date.now() + 15 * 86400000), null);
  assert.equal(parseSignupEmailReference((ref.startsWith("A") ? "B" : "A") + ref.slice(1)), null);
  assert.equal(await resolveSignupEmailReference(ref, "signup_day1", async () => job), null);
  assert.equal(await resolveSignupEmailReference(ref, "signup_day7", async () => ({ ...job, status: "pending" })), null);
  assert.equal(await resolveSignupEmailReference(ref, "signup_day7", async () => job), job);
  const { verifyMarketingToken } = await import("./campaignSecurity");
  assert.equal(verifyMarketingToken(ref, "attribution"), null);
  assert.equal(verifyMarketingToken(ref, "click"), null);
  assert.equal(signupEmailStep("signup_day14"), "DAY14");
  assert.equal(signupEmailResultMatches("DAY14", "race_prediction"), false);
  assert.equal(signupEmailResultMatches("DAY1", "ai_coach"), true);
  assert.equal(signupEmailResultMatches("DAY1", "race_prediction"), true);
});

test("Stripe trial attribution checks delivery ownership and has a stable subscription dedupe key", async () => {
  const job = { id: 14, jobType: "drip", campaign: "signup_unpaid", campaignVersion: 3, status: "sent", step: "DAY14", userId: 21 } as any;
  const metadata = signupEmailStripeMetadata(job, "signup_day14");
  const recorded: any[] = [];
  const getJob = async () => job;
  const record = async (event: any) => { recorded.push(event); return { recorded: true }; };
  await recordSignupEmailTrial("sub_fixture", metadata, 99, getJob, record);
  await recordSignupEmailTrial("sub_fixture", { ...metadata, signupEmailSource: "signup_day1" }, 21, getJob, record);
  assert.equal(recorded.length, 0);
  await recordSignupEmailTrial("sub_fixture", metadata, 21, getJob, record);
  await recordSignupEmailTrial("sub_fixture", metadata, 21, getJob, record);
  assert.equal(recorded[0].dedupeKey, recorded[1].dedupeKey);
  assert.deepEqual(recorded[0].props, { subscriptionId: "sub_fixture", signupEmailJobId: "14", source: "signup_day14" });
  assert.equal(isClientFunnelEvent(recorded[0].event), false);
});

test("D1 funnel counts the delivery once per stage, excludes repeats and mismatched or non-Stripe events", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE email_jobs (id INTEGER, job_type TEXT, campaign TEXT, campaign_version INTEGER, status TEXT, step TEXT, metadata TEXT);
    CREATE TABLE email_clicks (job_id INTEGER, campaign TEXT, source TEXT);
    CREATE TABLE funnel_events (event TEXT, source TEXT, properties TEXT);
    INSERT INTO email_jobs VALUES (1,'drip','signup_unpaid',3,'sent','DAY1','{"signupEmailTracking":"1"}'),
      (2,'drip','signup_unpaid',3,'sent','DAY7','{"signupEmailTracking":"1"}'), (3,'drip','signup_unpaid',3,'sent','DAY14',null),
      (4,'drip','signup_unpaid',3,'pending','DAY14',null), (5,'test','signup_unpaid',3,'sent','DAY14',null);
    INSERT INTO email_clicks VALUES (1,'signup_unpaid','signup_direct'), (1,'signup_unpaid','signup_direct'),
      (2,'signup_unpaid','signup_direct'), (3,'signup_unpaid','signed_email'), (4,'signup_unpaid','signup_direct');
    INSERT INTO funnel_events VALUES
      ('tool_completed','signup_day1','{"signupEmailJobId":"1"}'),
      ('tool_completed','signup_day1','{"signupEmailJobId":"1"}'),
      ('tool_completed','signup_day1','{"signupEmailJobId":"2"}'),
      ('tool_completed','signup_day7',null),
      ('signup_email_trial_started','signup_day1','{"signupEmailJobId":"1"}'),
      ('signup_email_trial_started','signup_day1','{"signupEmailJobId":"1","subscriptionId":"duplicate-delivery"}'),
      ('trial_started','signup_day7','{"signupEmailJobId":"2"}'),
      ('signup_email_trial_started','signup_day14','{"signupEmailJobId":"3"}');
  `);
  assert.deepEqual(db.prepare(signupEmailFunnelQuery).all().map(row => ({ ...row })), [
    { step: "DAY1", sent: 1, trackable: 1, clicked: 1, results: 1, trials: 1 },
    { step: "DAY14", sent: 1, trackable: 0, clicked: 0, results: 0, trials: 0 },
    { step: "DAY7", sent: 1, trackable: 1, clicked: 1, results: 0, trials: 0 },
  ]);
  db.close();
});
