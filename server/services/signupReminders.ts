import { storage } from "../storage";
import { beginEmailDelivery } from "../storageAtomic";
import { emailService } from "./email";
import { buildMarketingUrl, createMarketingToken, CLICK_SIGN_IN_TTL_SECONDS } from "./campaignSecurity";
import { SIGNUP_REMINDER_CAMPAIGN as CAMPAIGN, SIGNUP_REMINDER_STEPS as STEPS, SIGNUP_REMINDER_VERSION as VERSION, SIGNUP_FINAL_HOLDS_SETTING, nextSignupSendTime, signupDeliveryWindow, signupReminderExclusion, signupRemindersEnabled } from "../../shared/signupReminders";
import type { EmailJob, User } from "@shared/schema";
import { stableLifecycleBucket } from "../../shared/lifecycleCampaigns";

type Store = Pick<typeof storage, "getSystemSetting" | "getUser" | "getAllUsers" | "getUserCampaign" | "getActiveCampaigns" | "exitUserCampaign" | "cancelEmailJobsForUser" | "createUserCampaign" | "updateUserCampaign" | "getEmailJobByDedupeKey" | "getEmailJob" | "createEmailJob" | "updateEmailJob" | "getLastSentEmailForUser" | "updateUser">;
export class SignupReminderService {
  constructor(private store: Store = storage, private sender: Pick<typeof emailService, "sendDripEmail"> = emailService, private beginDelivery = beginEmailDelivery, private now = Date.now, private enabled = signupRemindersEnabled) {}
  private async included(userId: number) {
    const rollout = Number(await this.store.getSystemSetting("drip_campaigns_rollout_percent") || "5");
    const holdout = Number(await this.store.getSystemSetting("drip_campaigns_holdout_percent") || "10");
    return Number.isFinite(rollout) && Number.isFinite(holdout) && stableLifecycleBucket(userId, "signup:v3:rollout") < Math.max(0, Math.min(100, rollout)) && stableLifecycleBucket(userId, "signup:v3:holdout") >= Math.max(0, Math.min(50, holdout));
  }
  private async finalHolds(): Promise<Set<number>> {
    try {
      const raw = await this.store.getSystemSetting(SIGNUP_FINAL_HOLDS_SETTING);
      if (!raw || raw.length > 10000) return new Set();
      const ids: unknown = JSON.parse(raw);
      return new Set(Array.isArray(ids) && ids.length <= 1000 ? ids.filter(id => Number.isSafeInteger(id) && id > 0) : []);
    } catch { return new Set(); }
  }
  private isFinalHold(job: EmailJob | undefined, userId: number) {
    return Boolean(job && job.userId === userId && job.campaign === CAMPAIGN && job.campaignVersion === VERSION && job.step === "DAY14" && job.dedupeKey === `${userId}:${CAMPAIGN}:v${VERSION}:DAY14` && ["pending", "processing", "retry_scheduled"].includes(job.status || ""));
  }
  private async hasFinalHold(userId: number, holds: Set<number>) {
    return holds.has(userId) && this.isFinalHold(await this.store.getEmailJobByDedupeKey(`${userId}:${CAMPAIGN}:v${VERSION}:DAY14`), userId);
  }
  async schedule(user: User, holds?: Set<number>): Promise<"scheduled" | "ineligible" | "complete" | "suppressed"> {
    if (!this.enabled()) return "ineligible";
    const exclusion = signupReminderExclusion(user, this.now());
    if (exclusion) {
      if (exclusion === "sequence_expired" && await this.hasFinalHold(user.id, holds ?? await this.finalHolds())) return "scheduled";
      return "ineligible";
    }
    if (!await this.included(user.id)) return "suppressed";
    const active = await this.store.getActiveCampaigns(user.id);
    let campaign = active.find(c => c.campaign === CAMPAIGN && c.campaignVersion === VERSION);
    if (!campaign) {
      const previous = await this.store.getUserCampaign(user.id, CAMPAIGN);
      if (previous?.campaignVersion === VERSION && previous.state !== "active") return "complete";
      for (const old of active) await this.store.exitUserCampaign(old.id, "replaced_by_signup_sequence");
      await this.store.cancelEmailJobsForUser(user.id);
      campaign = await this.store.createUserCampaign({ userId: user.id, campaign: CAMPAIGN, campaignVersion: VERSION, currentStep: 1, experimentVariant: "signup_1_7_14", isHoldout: false });
      // Completed/exited enrollments are not silently reactivated after opt-out.
      if (campaign.state !== "active") return "complete";
    }
    for (let index = 0; index < STEPS.length; index++) {
      const step = STEPS[index], window = signupDeliveryWindow(user, index);
      if (this.now() >= window.end) continue; // Never replay missed historical reminders.
      const dedupeKey = `${user.id}:${CAMPAIGN}:v${VERSION}:${step.step}`;
      const existing = await this.store.getEmailJobByDedupeKey(dedupeKey);
      if (existing) {
        if (["pending", "processing", "retry_scheduled"].includes(existing.status || "")) return "scheduled";
        continue; // A failed/uncertain send is terminal, not a new email.
      }
      const requested = Math.max(this.now(), window.start);
      const at = nextSignupSendTime(user, requested) ?? requested + 86400000;
      await this.store.createEmailJob({ userId: user.id, enrollmentId: campaign.id, jobType: "drip", campaign: CAMPAIGN, campaignVersion: VERSION, experimentVariant: "signup_1_7_14", channel: "email", step: step.step, scheduledAt: new Date(at), dedupeKey, metadata: { ctaUrl: step.ctaPath, ctaKey: step.ctaKey, subject: step.subject, previewText: step.previewText } });
      await this.store.updateUserCampaign(campaign.id, { currentStep: index + 1 });
      return "scheduled";
    }
    await this.store.updateUserCampaign(campaign.id, { state: "completed", exitedAt: new Date(this.now()), exitReason: "completed" });
    return "complete";
  }
  async enroll() {
    let enrolled = 0, skipped = 0, suppressed = 0;
    const holds = await this.finalHolds();
    for (const user of await this.store.getAllUsers(10000)) {
      const result = await this.schedule(user, holds);
      if (result === "scheduled") enrolled++; else if (result === "suppressed") suppressed++; else skipped++;
    }
    return { enrolled, skipped, suppressed, bySegment: { [CAMPAIGN]: enrolled } };
  }
  async stats() {
    const suppressionReasons: Record<string, number> = {};
    const holds = await this.finalHolds();
    let eligible = 0, suppressed = 0;
    for (const user of await this.store.getAllUsers(10000)) {
      let reason = signupReminderExclusion(user, this.now());
      if (reason === "sequence_expired" && await this.hasFinalHold(user.id, holds)) reason = null;
      if (reason) { suppressed++; suppressionReasons[reason] = (suppressionReasons[reason] || 0) + 1; } else eligible++;
    }
    return { bySegment: { [CAMPAIGN]: eligible }, eligible, suppressed, suppressionReasons };
  }
  private async cancel(job: EmailJob, reason: string) {
    await this.store.updateEmailJob(job.id, { status: "cancelled", errorMessage: reason, claimedAt: null, claimedBy: null, leaseExpiresAt: null });
    return false;
  }
  async process(job: EmailJob): Promise<boolean> {
    const current = await this.store.getEmailJob(job.id);
    if (!current || current.status !== "processing" || !job.claimedBy || current.claimedBy !== job.claimedBy) return false;
    if (!this.enabled() || job.campaign !== CAMPAIGN || job.campaignVersion !== VERSION) return this.cancel(job, "signup_sequence_disabled_or_legacy");
    const index = STEPS.findIndex(step => step.step === job.step);
    if (index < 0) return this.cancel(job, "invalid_signup_step");
    const user = await this.store.getUser(job.userId);
    if (!user) return this.cancel(job, "user_not_found");
    const preservedFinal = this.isFinalHold(current, user.id) && (await this.finalHolds()).has(user.id);
    const excluded = signupReminderExclusion(user, this.now(), preservedFinal);
    if (excluded) return this.cancel(job, excluded);
    if (!await this.included(user.id)) return this.cancel(job, "rollout_or_holdout");
    const window = signupDeliveryWindow(user, index);
    if (!preservedFinal && this.now() >= window.end) { await this.cancel(job, "signup_step_expired"); await this.schedule(user); return false; }
    const last = await this.store.getLastSentEmailForUser(user.id);
    const requested = Math.max(this.now(), window.start, last?.sentAt ? last.sentAt.getTime() + 86400000 : 0);
    const notBefore = nextSignupSendTime(user, requested);
    if (notBefore === null || this.now() < notBefore) {
      await this.store.updateEmailJob(job.id, { status: "pending", scheduledAt: new Date(notBefore ?? this.now() + 86400000), errorMessage: notBefore === null ? "no_daytime_window" : null, claimedAt: null, claimedBy: null, leaseExpiresAt: null });
      return false;
    }
    // Conditional database claim prevents a slow or expired worker from sending
    // after a different worker owns the lease. Unknown outcomes remain terminal.
    if (!await this.beginDelivery(job.id, job.claimedBy)) return false;
    const step = STEPS[index], issued = Math.floor(this.now() / 1000);
    const result = await this.sender.sendDripEmail({ to: user.email!, userName: user.firstName || user.username || "Runner", ...step, bodyText: step.body, campaign: CAMPAIGN,
      ctaUrl: buildMarketingUrl("/api/marketing/click", createMarketingToken({ kind: "click", userId: user.id, jobId: job.id }, CLICK_SIGN_IN_TTL_SECONDS, issued)),
      unsubscribeUrl: buildMarketingUrl("/api/marketing/unsubscribe", createMarketingToken({ kind: "unsubscribe", userId: user.id }, 2 * 365 * 86400, issued)),
      beforeSend: async () => {
        const latest = await this.store.getUser(user.id), at = this.now();
        return Boolean(latest && this.enabled() && !signupReminderExclusion(latest, at, preservedFinal) && at >= window.start && (preservedFinal || at < signupDeliveryWindow(latest, index).end) && nextSignupSendTime(latest, at) === at);
      },
    });
    if (!result.success) {
      const reason = result.error || "cloudflare_email_rejected";
      const softBounce = reason === "cloudflare_suppressed_soft_bounce";
      const retry = softBounce || reason === "cloudflare_email_http_429" || reason === "cloudflare_suppression_check_unavailable";
      const retryCount = (job.retryCount || 0) + 1;
      if (reason.startsWith("cloudflare_suppressed_") && !softBounce || ["cloudflare_email_permanent_bounce", "cloudflare_email_suppressed"].includes(reason)) await this.store.updateUser(user.id, { marketingOptOut: true, marketingConsentStatus: "suppressed", marketingSuppressionReason: reason });
      await this.store.updateEmailJob(job.id, { status: reason === "recipient_no_longer_eligible" ? "cancelled" : retry && retryCount <= 5 ? "retry_scheduled" : "failed", retryCount, nextAttemptAt: retry && retryCount <= 5 ? new Date(this.now() + (softBounce ? 25 : Math.min(24, 2 ** retryCount)) * 3600000) : null, errorMessage: reason, claimedAt: null, claimedBy: null, leaseExpiresAt: null });
      return false;
    }
    await this.store.updateEmailJob(job.id, { status: "sent", sentAt: new Date(this.now()), providerMessageId: result.providerMessageId || null, errorMessage: null });
    if (index === STEPS.length - 1 && job.enrollmentId) await this.store.updateUserCampaign(job.enrollmentId, { state: "completed", exitedAt: new Date(this.now()), exitReason: "completed" });
    else await this.schedule(user);
    return true;
  }
}
export const signupReminderService = new SignupReminderService();
