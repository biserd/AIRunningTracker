import test from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_URL ||= "postgresql://fixture:fixture@127.0.0.1:1/fixture";
const { storage } = await import("../storage");
const { emailService } = await import("./email");
const { dripCampaignService } = await import("./dripCampaign");
const { dripCampaignWorker } = await import("./dripCampaignWorker");
test("worker honors persisted pause, dry-run, hourly limit and suppression readiness; concurrent checks do not overlap", async () => {
  const originals = { get: storage.getSystemSetting, set: storage.setSystemSetting, claim: storage.claimPendingEmailJobs, enroll: dripCampaignService.enrollMissingUsers, configured: emailService.isConfigured, suppression: emailService.checkCloudflareSuppression };
  const previous = { flag: process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS, secret: process.env.MARKETING_LINK_SIGNING_SECRET, from: process.env.EMAIL_FROM };
  let enabled = "true", dryRun = "true", enrollments = 0, claims = 0, suppressionAvailable = false, persisted: any;
  process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS = "true";
  process.env.MARKETING_LINK_SIGNING_SECRET = "fixture-secret-with-at-least-thirty-two-characters";
  process.env.EMAIL_FROM = "Run Analytics <fixture@example.test>";
  storage.getSystemSetting = async key => key === "drip_campaigns_enabled" ? enabled : key === "drip_campaigns_dry_run" ? dryRun : "25";
  storage.setSystemSetting = async (_key, value) => { persisted = JSON.parse(value); };
  storage.claimPendingEmailJobs = async limit => { assert.equal(limit, 25); claims++; return []; };
  dripCampaignService.enrollMissingUsers = async () => { enrollments++; await new Promise(resolve => setTimeout(resolve, 10)); return { enrolled: 0, skipped: 0, suppressed: 0, bySegment: {} }; };
  emailService.isConfigured = () => true;
  emailService.checkCloudflareSuppression = async () => suppressionAvailable ? { status: "clear" } : { status: "unavailable" };
  const Worker = dripCampaignWorker.constructor as new () => typeof dripCampaignWorker;
  const worker = new Worker();
  try {
    await Promise.all([worker.runNow(), worker.runNow()]);
    assert.equal(enrollments, 1); assert.equal(claims, 0); assert.equal(persisted.dryRun, true);
    dryRun = "false";
    await worker.runNow(); assert.equal(claims, 0); assert.equal(persisted.readiness.ready, false);
    suppressionAvailable = true;
    await worker.runNow(); assert.equal(claims, 1); assert.equal(persisted.readiness.ready, true);
    assert.equal(persisted.signupReminders, true); assert.equal(persisted.hourlyLimit, 25);
    enabled = "false"; await worker.runNow(); assert.equal(claims, 1); assert.equal(worker.getStatus().campaignsEnabled, false);
  } finally {
    storage.getSystemSetting = originals.get; storage.setSystemSetting = originals.set; storage.claimPendingEmailJobs = originals.claim;
    dripCampaignService.enrollMissingUsers = originals.enroll; emailService.isConfigured = originals.configured; emailService.checkCloudflareSuppression = originals.suppression;
    for (const [key, value] of [["ENABLE_SIGNUP_PAYMENT_REMINDERS", previous.flag], ["MARKETING_LINK_SIGNING_SECRET", previous.secret], ["EMAIL_FROM", previous.from]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
  }
});
