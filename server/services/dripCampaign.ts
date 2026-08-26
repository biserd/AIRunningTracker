import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { funnelEvents, type EmailJob, type User, type UserCampaign } from "@shared/schema";
import { LIFECYCLE_SEGMENTS, resolveLifecycleSegment, stableLifecycleBucket, type LifecycleSegment, type LifecycleSignals } from "@shared/lifecycleCampaigns";
import { db } from "../db";
import { storage } from "../storage";
import { emailService } from "./email";
import { buildMarketingUrl, createMarketingToken } from "./campaignSecurity";

interface DripStep { step: string; offsetHours: number; subject: string; previewText: string; body: string; ctaText: string; ctaPath: string; ctaKey: string; }
export const CAMPAIGN_VERSION = 2;

export const LIFECYCLE_CAMPAIGNS: Record<LifecycleSegment, DripStep[]> = {
  signup_no_strava: [
    { step: "SNS1", offsetHours: 1, subject: "Connect one run and see what AITracker notices", previewText: "Your first useful insight starts with a Strava sync", body: "Connect Strava and AITracker will turn your latest run into a clear finding and one practical next step.", ctaText: "Connect Strava", ctaPath: "/settings?section=connections", ctaKey: "connect_strava" },
    { step: "SNS2", offsetHours: 48, subject: "Still guessing after your runs?", previewText: "See effort, recovery and what to do next in one place", body: "A sync takes less than a minute. Once your run is in, you can see what changed, whether the effort matched the goal, and what to adjust next.", ctaText: "Sync My Runs", ctaPath: "/settings?section=connections", ctaKey: "connect_strava" },
  ],
  preview_ready_unseen: [
    { step: "PRU1", offsetHours: 1, subject: "Your first run insight is ready", previewText: "We found two useful signals in your latest run", body: "Your Premium Preview is ready. It shows two findings from your run and one action you can use in your next session.", ctaText: "See My Run Insight", ctaPath: "/dashboard", ctaKey: "view_preview" },
    { step: "PRU2", offsetHours: 48, subject: "One useful change for your next run", previewText: "Your latest run already contains a practical next step", body: "Your preview is still waiting. Open it before your next run and use the recommended action as a simple test.", ctaText: "Open My Preview", ctaPath: "/dashboard", ctaKey: "view_preview" },
  ],
  preview_engaged_no_trial: [
    { step: "PEN1", offsetHours: 2, subject: "Want this depth after every run?", previewText: "Unlock the complete analysis and proactive coach", body: "You have seen the preview. A 14-day Premium trial unlocks the complete run analysis, trends, training plans and proactive Telegram coaching.", ctaText: "Start My 14-Day Trial", ctaPath: "/dashboard?startTrial=1&source=lifecycle_preview", ctaKey: "start_trial" },
    { step: "PEN2", offsetHours: 96, subject: "Turn one run insight into a training pattern", previewText: "See how effort, recovery and consistency connect", body: "One run is useful. The real value comes from seeing the pattern across several weeks and getting a clear recommendation when the pattern changes.", ctaText: "Unlock My Training Trends", ctaPath: "/dashboard?startTrial=1&source=lifecycle_trends", ctaKey: "start_trial" },
  ],
  checkout_abandoned: [
    { step: "CA1", offsetHours: 1, subject: "Your 14-day trial is still available", previewText: "Pick up where you left off", body: "You were close to unlocking the complete analysis. Your trial is still available, and you will not be charged until it ends.", ctaText: "Continue to Secure Checkout", ctaPath: "/dashboard?startTrial=1&source=lifecycle_checkout", ctaKey: "resume_checkout" },
    { step: "CA2", offsetHours: 24, subject: "Any question before you try Premium?", previewText: "What you get, when billing starts and how to cancel", body: "Premium includes complete run analysis, longer-term trends, training plans and the proactive coach. The trial lasts 14 days and you can cancel before billing starts.", ctaText: "Start My Trial", ctaPath: "/dashboard?startTrial=1&source=lifecycle_checkout_help", ctaKey: "resume_checkout" },
  ],
  trial_needs_activation: [
    { step: "TNA1", offsetHours: 2, subject: "Your trial is live. Start with this run", previewText: "Open the complete analysis and find one action for the next session", body: "Your Premium trial is active. Start with your latest run, then look for the single action you can carry into the next session.", ctaText: "Analyze My Latest Run", ctaPath: "/activities", ctaKey: "activate_trial" },
    { step: "TNA2", offsetHours: 48, subject: "Ask your coach one real training question", previewText: "Use your own running history, not generic advice", body: "Try a question you would actually ask a coach, such as whether to push tomorrow, how to pace your long run, or why recovery is slipping.", ctaText: "Ask My AI Coach", ctaPath: "/coach-insights", ctaKey: "activate_trial" },
  ],
  trial_engaged: [
    { step: "TE1", offsetHours: 48, subject: "Your running pattern is becoming clearer", previewText: "Check the trend behind the latest run", body: "You have started using Premium. Compare the latest run with your recent load and recovery so the next decision is based on the pattern, not one workout.", ctaText: "Review My Trends", ctaPath: "/dashboard", ctaKey: "review_trends" },
  ],
  trial_ending: [
    { step: "TEND1", offsetHours: 0, subject: "Your Premium trial ends soon", previewText: "Keep your complete analysis, plans and proactive coach", body: "Your trial is nearly over. Review what Premium has learned from your running and decide whether you want the analysis and coaching to continue.", ctaText: "Review My Premium Access", ctaPath: "/settings?tab=subscription", ctaKey: "review_subscription" },
  ],
  trial_expired_winback: [
    { step: "TEW1", offsetHours: 24, subject: "Your training history is still here", previewText: "Return to the trends and coaching built from your runs", body: "Your Premium access ended, but your running history is still here. Restart when you want complete analysis, plans and proactive coaching again.", ctaText: "See What Premium Unlocks", ctaPath: "/dashboard?startTrial=1&source=lifecycle_winback", ctaKey: "restart_premium" },
    { step: "TEW2", offsetHours: 168, subject: "A fresh look at your recent training", previewText: "See whether your load and recovery have changed", body: "If your training has moved on since the trial, Premium can rebuild the picture from your newer runs and surface the next useful adjustment.", ctaText: "Review My Running", ctaPath: "/dashboard?startTrial=1&source=lifecycle_winback_2", ctaKey: "restart_premium" },
  ],
  inactive_free: [
    { step: "IF1", offsetHours: 0, subject: "Your recent running picture is waiting", previewText: "Reconnect with one useful trend, not a wall of charts", body: "It has been a while since your last visit. Come back for a quick look at what changed in your training and the next action worth taking.", ctaText: "Check My Running", ctaPath: "/dashboard", ctaKey: "return_to_app" },
    { step: "IF2", offsetHours: 168, subject: "Want AITracker to make the next run easier to plan?", previewText: "Use your own history to choose effort and recovery", body: "Open your dashboard before the next session. AITracker can help you choose the right effort from your recent load, recovery and goals.", ctaText: "Plan My Next Run", ctaPath: "/dashboard", ctaKey: "return_to_app" },
  ],
};

export class DripCampaignService {
  private allowedSendTime(user: User, requested: Date): Date {
    const timezone = user.coachTimezone || "UTC";
    const quietStart = Number.isInteger(user.coachQuietHoursStart) ? Number(user.coachQuietHoursStart) : 20;
    const quietEnd = Number.isInteger(user.coachQuietHoursEnd) ? Number(user.coachQuietHoursEnd) : 8;
    const hourAt = (date: Date) => {
      try { return Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(date)); }
      catch { return date.getUTCHours(); }
    };
    const isQuiet = (hour: number) => quietStart > quietEnd ? hour >= quietStart || hour < quietEnd : hour >= quietStart && hour < quietEnd;
    const adjusted = new Date(requested);
    for (let attempt = 0; attempt < 24 && isQuiet(hourAt(adjusted)); attempt += 1) adjusted.setHours(adjusted.getHours() + 1);
    return adjusted;
  }

  async getSignals(userId: number): Promise<LifecycleSignals> {
    const rows = await db.select({ event: funnelEvents.event, occurredAt: funnelEvents.occurredAt }).from(funnelEvents)
      .where(and(eq(funnelEvents.userId, userId), inArray(funnelEvents.event, ["preview_viewed", "preview_cta_clicked", "checkout_session_created", "checkout_started", "trial_started"])))
      .orderBy(desc(funnelEvents.occurredAt)).limit(30);
    const latest = (names: string[]) => rows.find((row) => names.includes(row.event))?.occurredAt || null;
    return { previewViewedAt: latest(["preview_viewed"]), previewCtaClickedAt: latest(["preview_cta_clicked"]), checkoutStartedAt: latest(["checkout_session_created", "checkout_started"]), trialStartedAt: latest(["trial_started"]) };
  }

  async computeUserSegment(user: User): Promise<LifecycleSegment | null> { return resolveLifecycleSegment(user, await this.getSignals(user.id)); }

  private async campaignConfig() {
    const rollout = Number(await storage.getSystemSetting("drip_campaigns_rollout_percent") || "5");
    const holdout = Number(await storage.getSystemSetting("drip_campaigns_holdout_percent") || "10");
    return { rolloutPercent: Math.max(0, Math.min(100, Number.isFinite(rollout) ? rollout : 5)), holdoutPercent: Math.max(0, Math.min(50, Number.isFinite(holdout) ? holdout : 10)) };
  }

  private async ensureEnrollment(user: User, segment: LifecycleSegment): Promise<UserCampaign> {
    const active = await storage.getActiveCampaigns(user.id);
    const matching = active.find((campaign) => campaign.campaign === segment && campaign.campaignVersion === CAMPAIGN_VERSION);
    if (matching) return matching;
    for (const campaign of active) await storage.exitUserCampaign(campaign.id, "segment_change");
    await storage.cancelEmailJobsForUser(user.id);
    const { holdoutPercent } = await this.campaignConfig();
    return storage.createUserCampaign({ userId: user.id, campaign: segment, campaignVersion: CAMPAIGN_VERSION, currentStep: 1, experimentVariant: stableLifecycleBucket(user.id, `${segment}:copy:v${CAMPAIGN_VERSION}`) < 50 ? "control" : "benefit_copy", isHoldout: stableLifecycleBucket(user.id, `${segment}:holdout:v${CAMPAIGN_VERSION}`) < holdoutPercent });
  }

  async scheduleNextEmailForUser(userId: number, prefetched?: { user: User; segment: LifecycleSegment | null }): Promise<"scheduled" | "suppressed" | "ineligible" | "complete"> {
    const user = prefetched?.user || await storage.getUser(userId);
    if (!user) return "ineligible";
    const segment = prefetched ? prefetched.segment : await this.computeUserSegment(user);
    if (!segment) { await this.exitCampaignForUser(userId, "ineligible"); return "ineligible"; }
    const enrollment = await this.ensureEnrollment(user, segment);
    const { rolloutPercent } = await this.campaignConfig();
    if (enrollment.isHoldout || stableLifecycleBucket(user.id, `${segment}:rollout:v${CAMPAIGN_VERSION}`) >= rolloutPercent) return "suppressed";
    const steps = LIFECYCLE_CAMPAIGNS[segment];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const dedupeKey = `${userId}:${segment}:v${CAMPAIGN_VERSION}:${step.step}`;
      if (await storage.getEmailJobByDedupeKey(dedupeKey)) continue;
      const enteredAt = enrollment.enteredAt ? new Date(enrollment.enteredAt) : new Date();
      const requestedAt = new Date(enteredAt.getTime() + step.offsetHours * 60 * 60 * 1000);
      await storage.createEmailJob({ userId, enrollmentId: enrollment.id, jobType: "drip", campaign: segment, campaignVersion: CAMPAIGN_VERSION, experimentVariant: enrollment.experimentVariant, channel: "email", step: step.step, scheduledAt: this.allowedSendTime(user, requestedAt), dedupeKey, metadata: { ctaUrl: step.ctaPath, ctaKey: step.ctaKey, subject: step.subject, previewText: step.previewText } });
      await storage.updateUserCampaign(enrollment.id, { currentStep: index + 1 });
      return "scheduled";
    }
    await storage.updateUserCampaign(enrollment.id, { state: "completed", exitedAt: new Date(), exitReason: "completed" });
    return "complete";
  }

  async processEmailJob(job: EmailJob): Promise<boolean> {
    try {
      const user = await storage.getUser(job.userId);
      if (!user) return this.cancelJob(job, "user_not_found");
      if (!user.email) return this.cancelJob(job, "email_missing");
      const segment = await this.computeUserSegment(user);
      if (!segment || segment !== job.campaign) return this.cancelJob(job, `segment_changed:${segment || "none"}`);
      const step = LIFECYCLE_CAMPAIGNS[segment].find((candidate) => candidate.step === job.step);
      if (!step) return this.failJob(job, "campaign_step_not_found", false);
      const lastSent = await storage.getLastSentEmailForUser(user.id);
      if (lastSent?.sentAt && Date.now() - new Date(lastSent.sentAt).getTime() < 24 * 60 * 60 * 1000) {
        await storage.updateEmailJob(job.id, { status: "pending", scheduledAt: new Date(new Date(lastSent.sentAt).getTime() + 24 * 60 * 60 * 1000), claimedAt: null, claimedBy: null, leaseExpiresAt: null });
        return false;
      }
      const clickToken = createMarketingToken({ kind: "click", userId: user.id, jobId: job.id }, 45 * 24 * 60 * 60);
      const unsubscribeToken = createMarketingToken({ kind: "unsubscribe", userId: user.id }, 2 * 365 * 24 * 60 * 60);
      const delivery = await emailService.sendDripEmail({ to: user.email, subject: step.subject, previewText: step.previewText, bodyText: step.body, ctaText: step.ctaText, ctaUrl: buildMarketingUrl("/api/marketing/click", clickToken), unsubscribeUrl: buildMarketingUrl("/api/marketing/unsubscribe", unsubscribeToken), userName: user.firstName || user.username || "Runner", step: step.step, campaign: segment });
      if (!delivery.success) return this.failJob(job, delivery.error || "email_provider_rejected", true);
      await storage.updateEmailJob(job.id, { status: "sent", sentAt: new Date(), providerMessageId: delivery.providerMessageId || null, claimedAt: null, claimedBy: null, leaseExpiresAt: null, errorMessage: null });
      if (job.enrollmentId) await storage.updateUserCampaign(job.enrollmentId, { lastEmailSentAt: new Date() });
      await this.scheduleNextEmailForUser(user.id);
      return true;
    } catch (error) { return this.failJob(job, error instanceof Error ? error.message : "unknown_error", true); }
  }

  private async cancelJob(job: EmailJob, reason: string): Promise<false> { await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: reason, claimedAt: null, claimedBy: null, leaseExpiresAt: null }); return false; }
  private async failJob(job: EmailJob, reason: string, retry: boolean): Promise<false> {
    const retryCount = (job.retryCount || 0) + 1;
    const shouldRetry = retry && retryCount <= 5;
    await storage.updateEmailJob(job.id, { status: shouldRetry ? "retry_scheduled" : "failed", retryCount, nextAttemptAt: shouldRetry ? new Date(Date.now() + Math.min(24, 2 ** retryCount) * 60 * 60 * 1000) : null, errorMessage: reason.slice(0, 500), claimedAt: null, claimedBy: null, leaseExpiresAt: null });
    return false;
  }

  async cancelEmailsForUser(userId: number): Promise<void> { await storage.cancelEmailJobsForUser(userId); }
  async exitCampaignForUser(userId: number, reason: string): Promise<void> { for (const campaign of await storage.getActiveCampaigns(userId)) await storage.exitUserCampaign(campaign.id, reason); await storage.cancelEmailJobsForUser(userId); }
  async recordActivation(userId: number, _activationType: string): Promise<void> { const user = await storage.getUser(userId); if (user && !user.activationAt) await storage.updateUserActivation(userId, new Date()); await this.exitCampaignForUser(userId, "activation"); await this.scheduleNextEmailForUser(userId); }
  async recordLastSeen(userId: number): Promise<void> { await storage.updateUserLastSeen(userId); }
  async onStravaConnected(userId: number): Promise<void> { await this.exitCampaignForUser(userId, "strava_connected"); await this.scheduleNextEmailForUser(userId); }
  async onUserSubscribed(userId: number): Promise<void> { await this.exitCampaignForUser(userId, "subscribed"); }

  async scheduleActivityReadyEmail(userId: number, activityId: number): Promise<void> {
    const dedupeKey = `${userId}:activity_ready:${activityId}`;
    if (await storage.getEmailJobByDedupeKey(dedupeKey)) return;
    await storage.createEmailJob({ userId, jobType: "activity_ready", campaign: null, step: null, scheduledAt: new Date(Date.now() + 5 * 60 * 1000), dedupeKey, metadata: { activityId } });
  }

  async enrollMissingUsers(): Promise<{ enrolled: number; skipped: number; suppressed: number; bySegment: Record<string, number> }> {
    let enrolled = 0; let skipped = 0; let suppressed = 0;
    const bySegment: Record<string, number> = Object.fromEntries(LIFECYCLE_SEGMENTS.map((segment) => [segment, 0]));
    const signalRows = await db.execute(sql`
      SELECT user_id,
        MAX(occurred_at) FILTER (WHERE event = 'preview_viewed') AS preview_viewed_at,
        MAX(occurred_at) FILTER (WHERE event = 'preview_cta_clicked') AS preview_clicked_at,
        MAX(occurred_at) FILTER (WHERE event IN ('checkout_started', 'checkout_session_created')) AS checkout_at,
        MAX(occurred_at) FILTER (WHERE event = 'trial_started') AS trial_at
      FROM funnel_events
      WHERE event IN ('preview_viewed', 'preview_cta_clicked', 'checkout_started', 'checkout_session_created', 'trial_started')
      GROUP BY user_id
    `);
    const signalsByUser = new Map<number, LifecycleSignals>();
    for (const row of signalRows.rows as any[]) signalsByUser.set(Number(row.user_id), { previewViewedAt: row.preview_viewed_at, previewCtaClickedAt: row.preview_clicked_at, checkoutStartedAt: row.checkout_at, trialStartedAt: row.trial_at });
    for (const user of await storage.getAllUsers(10000)) {
      const segment = resolveLifecycleSegment(user, signalsByUser.get(user.id) || {});
      if (!segment) { skipped += 1; continue; }
      bySegment[segment] += 1;
      const result = await this.scheduleNextEmailForUser(user.id, { user, segment });
      if (result === "scheduled") enrolled += 1; else if (result === "suppressed") suppressed += 1; else skipped += 1;
    }
    return { enrolled, skipped, suppressed, bySegment };
  }

  async getSegmentStats(): Promise<{ bySegment: Record<string, number>; eligible: number; suppressed: number }> {
    const bySegment: Record<string, number> = Object.fromEntries(LIFECYCLE_SEGMENTS.map((segment) => [segment, 0]));
    const result = await db.execute(sql`
      WITH signals AS (
        SELECT user_id,
          MAX(occurred_at) FILTER (WHERE event = 'preview_viewed') AS preview_viewed_at,
          MAX(occurred_at) FILTER (WHERE event = 'preview_cta_clicked') AS preview_clicked_at,
          MAX(occurred_at) FILTER (WHERE event IN ('checkout_started', 'checkout_session_created')) AS checkout_at,
          MAX(occurred_at) FILTER (WHERE event = 'trial_started') AS trial_at
        FROM funnel_events GROUP BY user_id
      ), categorized AS (
        SELECT users.id,
          CASE
            WHEN users.email IS NULL OR users.marketing_consent_status <> 'consented' OR users.marketing_opt_out = true THEN NULL
            WHEN users.subscription_plan <> 'free' AND users.subscription_status = 'active' THEN NULL
            WHEN users.subscription_status = 'trialing' AND users.trial_ends_at IS NOT NULL AND users.trial_ends_at <= NOW() + INTERVAL '72 hours' THEN 'trial_ending'
            WHEN users.subscription_status = 'trialing' AND users.activation_at IS NULL THEN 'trial_needs_activation'
            WHEN users.subscription_status = 'trialing' THEN 'trial_engaged'
            WHEN users.subscription_status IN ('canceled', 'past_due', 'unpaid') THEN 'trial_expired_winback'
            WHEN users.strava_connected = false THEN 'signup_no_strava'
            WHEN signals.checkout_at <= NOW() - INTERVAL '30 minutes' AND (signals.trial_at IS NULL OR signals.trial_at < signals.checkout_at) THEN 'checkout_abandoned'
            WHEN users.premium_preview_created_at IS NOT NULL AND (signals.preview_viewed_at IS NOT NULL OR signals.preview_clicked_at IS NOT NULL) THEN 'preview_engaged_no_trial'
            WHEN users.premium_preview_created_at IS NOT NULL THEN 'preview_ready_unseen'
            WHEN COALESCE(users.last_seen_at, users.created_at) <= NOW() - INTERVAL '30 days' THEN 'inactive_free'
            ELSE NULL
          END AS segment
        FROM users LEFT JOIN signals ON signals.user_id = users.id
      )
      SELECT segment, COUNT(*)::int AS count FROM categorized GROUP BY segment
    `);
    let suppressed = 0;
    for (const row of result.rows as Array<{ segment: string | null; count: number | string }>) {
      if (row.segment && row.segment in bySegment) bySegment[row.segment] = Number(row.count);
      else suppressed += Number(row.count);
    }
    return { bySegment, eligible: Object.values(bySegment).reduce((sum, count) => sum + count, 0), suppressed };
  }
}

export const dripCampaignService = new DripCampaignService();
