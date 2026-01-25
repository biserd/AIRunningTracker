import { storage } from "../storage";
import { emailService } from "./email";
import type { User, EmailJob } from "@shared/schema";

export type UserSegment = "segment_a" | "segment_b" | "segment_c" | null;

interface DripStep {
  step: string;
  delayHours: number;
  subject: string;
  previewText: string;
  ctaText: string;
  ctaUrl: string;
  objective: string;
}

// Segment A: Not connected to Strava yet - push to connect and start Premium trial
const SEGMENT_A_STEPS: DripStep[] = [
  {
    step: "A1",
    delayHours: 0.08, // 5 minutes after signup
    subject: "Start your free 14-day Premium trial",
    previewText: "Connect Strava to unlock AI coaching and personalized insights",
    ctaText: "Start My Free Trial",
    ctaUrl: "/auth?tab=signup&connect=strava&source=emailA1",
    objective: "strava_connected",
  },
  {
    step: "A2",
    delayHours: 48, // Day 2
    subject: "Your AI running coach is waiting",
    previewText: "30 seconds to connect Strava and get personalized training insights",
    ctaText: "Connect Strava Now",
    ctaUrl: "/auth?tab=signup&connect=strava&source=emailA2",
    objective: "strava_connected",
  },
  {
    step: "A3",
    delayHours: 120, // Day 5
    subject: "Don't miss out on free Premium features",
    previewText: "Your 14-day trial includes AI coaching, race predictions, and training plans",
    ctaText: "Claim My Free Trial",
    ctaUrl: "/auth?tab=signup&connect=strava&source=emailA3",
    objective: "strava_connected",
  },
];

// Segment B: Active Premium trial users - feature discovery and engagement
const SEGMENT_B_STEPS: DripStep[] = [
  {
    step: "B1",
    delayHours: 1, // 1 hour after trial starts
    subject: "Your Runner Score is ready",
    previewText: "See your personalized performance analysis",
    ctaText: "View My Runner Score",
    ctaUrl: "/dashboard?source=B1",
    objective: "dashboard_viewed",
  },
  {
    step: "B2",
    delayHours: 24, // Day 1
    subject: "Meet your AI Running Coach",
    previewText: "Ask anything about your training - your coach knows your data",
    ctaText: "Chat with Coach",
    ctaUrl: "/chat?source=B2",
    objective: "coach_question_asked",
  },
  {
    step: "B3",
    delayHours: 72, // Day 3
    subject: "Your last run, analyzed",
    previewText: "See AI insights, effort breakdown, and coaching tips",
    ctaText: "View Run Analysis",
    ctaUrl: "/activities?source=B3",
    objective: "activity_viewed",
  },
  {
    step: "B4",
    delayHours: 120, // Day 5
    subject: "Your personalized training plan is ready",
    previewText: "AI-generated plan based on your goals and fitness level",
    ctaText: "See My Training Plan",
    ctaUrl: "/training-plans?source=B4",
    objective: "plan_viewed",
  },
  {
    step: "B5",
    delayHours: 168, // Day 7 - halfway through trial
    subject: "Halfway through your trial - here's what you've unlocked",
    previewText: "See your progress and the Premium features helping you improve",
    ctaText: "View My Progress",
    ctaUrl: "/dashboard?source=B5",
    objective: "dashboard_viewed",
  },
  {
    step: "B6",
    delayHours: 240, // Day 10
    subject: "Your race predictions are in",
    previewText: "See estimated finish times for 5K, 10K, half marathon, and marathon",
    ctaText: "View Race Predictions",
    ctaUrl: "/race-predictor?source=B6",
    objective: "race_predictor_viewed",
  },
  {
    step: "B7",
    delayHours: 288, // Day 12 - trial ending soon
    subject: "Your Premium trial ends in 2 days",
    previewText: "Keep your AI coach, training plans, and unlimited insights",
    ctaText: "Continue Premium",
    ctaUrl: "/settings?tab=subscription&source=B7",
    objective: "subscription_viewed",
  },
];

// Segment C: Inactive trial users OR expired trial - win-back and re-engagement
const SEGMENT_C_STEPS: DripStep[] = [
  {
    step: "C1",
    delayHours: 0, // Immediately when inactive/expired
    subject: "We miss you! Your running insights are waiting",
    previewText: "See what's new since your last visit",
    ctaText: "View My Dashboard",
    ctaUrl: "/dashboard?source=C1",
    objective: "dashboard_viewed",
  },
  {
    step: "C2",
    delayHours: 72, // 3 days after C1
    subject: "New feature: AI activity recaps",
    previewText: "Get personalized coaching after every run",
    ctaText: "Try It Now",
    ctaUrl: "/activities?source=C2",
    objective: "activity_viewed",
  },
  {
    step: "C3",
    delayHours: 168, // 7 days after C1
    subject: "Your training insights are piling up",
    previewText: "Your AI coach has new recommendations for you",
    ctaText: "See Recommendations",
    ctaUrl: "/chat?source=C3",
    objective: "coach_question_asked",
  },
  {
    step: "C4",
    delayHours: 336, // 14 days after C1
    subject: "Come back and see what's improved",
    previewText: "New features: better race predictions, smarter training plans",
    ctaText: "Explore New Features",
    ctaUrl: "/dashboard?source=C4",
    objective: "dashboard_viewed",
  },
];

const SEGMENT_STEPS: Record<string, DripStep[]> = {
  segment_a: SEGMENT_A_STEPS,
  segment_b: SEGMENT_B_STEPS,
  segment_c: SEGMENT_C_STEPS,
};

export class DripCampaignService {
  /**
   * Compute user segment based on new 3-segment model:
   * - Segment A: Not connected to Strava (push to connect & start trial)
   * - Segment B: Connected, on active trial, actively using (feature discovery)
   * - Segment C: Inactive 7+ days OR trial expired (win-back)
   */
  computeUserSegment(user: User): UserSegment {
    // Users who opted out of marketing get no emails
    if (user.marketingOptOut) {
      return null;
    }
    
    // Not connected to Strava yet - push to connect
    if (!user.stravaConnected) {
      return "segment_a";
    }
    
    // Check trial status - trial users are "trialing", active subscribers are "active"
    const isTrialing = user.subscriptionStatus === "trialing";
    const isActiveSubscriber = user.subscriptionStatus === "active" && user.subscriptionPlan !== "free";
    const hasExpiredTrial = user.subscriptionStatus === "canceled" || user.subscriptionStatus === "past_due" || user.subscriptionStatus === "unpaid";
    
    // Active paid subscribers don't get drip emails
    if (isActiveSubscriber) {
      return null;
    }
    
    // Check if user has been inactive for 7+ days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const isInactive = user.lastSeenAt && new Date(user.lastSeenAt) < sevenDaysAgo;
    
    // Segment C: Inactive trial users OR expired trial users
    if (isInactive || hasExpiredTrial) {
      return "segment_c";
    }
    
    // Segment B: Active trial users (trialing and active within last 7 days)
    if (isTrialing) {
      return "segment_b";
    }
    
    // Free users who connected Strava but never started trial (edge case)
    // Treat them as segment C (win-back)
    return "segment_c";
  }

  async scheduleNextEmailForUser(userId: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    if (user.marketingOptOut) {
      console.log(`[DripCampaign] User ${userId} opted out of marketing`);
      return;
    }

    const segment = this.computeUserSegment(user);
    if (!segment) {
      console.log(`[DripCampaign] User ${userId} is paid, no drip emails`);
      return;
    }

    const steps = SEGMENT_STEPS[segment];
    if (!steps || steps.length === 0) return;

    // Find the next step that hasn't been sent yet
    for (const step of steps) {
      const dedupeKey = `${userId}:${segment}:${step.step}`;
      const existingJob = await storage.getEmailJobByDedupeKey(dedupeKey);
      
      if (!existingJob) {
        // Schedule this step
        const scheduledAt = new Date(Date.now() + step.delayHours * 60 * 60 * 1000);

        await storage.createEmailJob({
          userId,
          jobType: "drip",
          campaign: segment,
          step: step.step,
          scheduledAt,
          dedupeKey,
          metadata: {
            ctaUrl: step.ctaUrl,
            subject: step.subject,
            previewText: step.previewText,
          },
        });

        console.log(`[DripCampaign] Scheduled ${step.step} for user ${userId} at ${scheduledAt.toISOString()}`);
        return; // Only schedule one email at a time
      }
    }

    console.log(`[DripCampaign] User ${userId} has completed ${segment} campaign`);
  }

  async processEmailJob(job: EmailJob): Promise<boolean> {
    try {
      const user = await storage.getUser(job.userId);
      if (!user) {
        await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: "User not found" });
        return false;
      }

      if (user.marketingOptOut) {
        await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: "User opted out" });
        return false;
      }

      if (user.subscriptionPlan !== "free") {
        await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: "User is paid" });
        await this.cancelEmailsForUser(user.id);
        return false;
      }

      // Check if user's segment has changed - if so, cancel old emails and reschedule
      const currentSegment = this.computeUserSegment(user);
      if (currentSegment !== job.campaign) {
        await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: `Segment changed to ${currentSegment}` });
        
        // Schedule email for new segment
        if (currentSegment) {
          await this.scheduleNextEmailForUser(user.id);
        }
        return false;
      }

      // Check frequency cap - no more than 1 email per 24 hours
      const lastEmailSent = await this.getLastEmailSentAt(user.id);
      if (lastEmailSent) {
        const hoursSinceLastEmail = (Date.now() - lastEmailSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastEmail < 24 && job.jobType === "drip") {
          const newScheduledAt = new Date(lastEmailSent.getTime() + 24 * 60 * 60 * 1000);
          await storage.updateEmailJob(job.id, { scheduledAt: newScheduledAt });
          console.log(`[DripCampaign] Rescheduled ${job.step} for user ${user.id} due to frequency cap`);
          return false;
        }
      }

      const steps = SEGMENT_STEPS[job.campaign || ""];
      const stepConfig = steps?.find(s => s.step === job.step);
      if (!stepConfig) {
        await storage.updateEmailJob(job.id, { status: "failed", errorMessage: "Step config not found" });
        return false;
      }

      const metadata = job.metadata as { ctaUrl?: string; subject?: string; previewText?: string } || {};
      const ctaUrl = metadata.ctaUrl || stepConfig.ctaUrl;
      const fullUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://aitracker.run'}${ctaUrl}`;

      await emailService.sendDripEmail({
        to: user.email,
        subject: metadata.subject || stepConfig.subject,
        previewText: metadata.previewText || stepConfig.previewText,
        ctaText: stepConfig.ctaText,
        ctaUrl: fullUrl,
        userName: user.firstName || user.username || "Runner",
        step: stepConfig.step,
        campaign: job.campaign || "",
      });

      await storage.updateEmailJob(job.id, { 
        status: "sent", 
        sentAt: new Date() 
      });

      // Schedule the next step in the campaign
      const currentStepNum = parseInt(job.step?.replace(/[A-D]/, "") || "1");
      const nextStep = steps[currentStepNum];
      if (nextStep) {
        const dedupeKey = `${user.id}:${job.campaign}:${nextStep.step}`;
        const existingNextJob = await storage.getEmailJobByDedupeKey(dedupeKey);
        
        if (!existingNextJob) {
          const scheduledAt = new Date(Date.now() + nextStep.delayHours * 60 * 60 * 1000);
          await storage.createEmailJob({
            userId: user.id,
            jobType: "drip",
            campaign: job.campaign,
            step: nextStep.step,
            scheduledAt,
            dedupeKey,
            metadata: {
              ctaUrl: nextStep.ctaUrl,
              subject: nextStep.subject,
              previewText: nextStep.previewText,
            },
          });
          console.log(`[DripCampaign] Scheduled next step ${nextStep.step} for user ${user.id}`);
        }
      }

      console.log(`[DripCampaign] Sent ${job.step} to user ${user.id}`);
      return true;
    } catch (error) {
      console.error(`[DripCampaign] Error processing job ${job.id}:`, error);
      await storage.updateEmailJob(job.id, { 
        status: "failed", 
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        retryCount: (job.retryCount || 0) + 1,
      });
      return false;
    }
  }

  async getLastEmailSentAt(userId: number): Promise<Date | null> {
    // Get last sent email from email_jobs
    const lastSentJob = await storage.getLastSentEmailForUser(userId);
    return lastSentJob?.sentAt || null;
  }

  async cancelEmailsForUser(userId: number): Promise<void> {
    await storage.cancelEmailJobsForUser(userId);
    console.log(`[DripCampaign] Cancelled pending emails for user ${userId}`);
  }

  async recordActivation(userId: number, activationType: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    if (!user.activationAt) {
      await storage.updateUserActivation(userId, new Date());
      console.log(`[DripCampaign] User ${userId} activated via ${activationType}`);
      
      // Cancel old segment emails and schedule new ones
      await this.cancelEmailsForUser(userId);
      await this.scheduleNextEmailForUser(userId);
    }
  }

  async recordLastSeen(userId: number): Promise<void> {
    await storage.updateUserLastSeen(userId);
  }

  async onStravaConnected(userId: number): Promise<void> {
    // Cancel segment A emails and schedule segment B
    await this.cancelEmailsForUser(userId);
    await this.scheduleNextEmailForUser(userId);
    console.log(`[DripCampaign] User ${userId} connected Strava, transitioning to segment B`);
  }

  async onUserSubscribed(userId: number): Promise<void> {
    await this.cancelEmailsForUser(userId);
    console.log(`[DripCampaign] User ${userId} subscribed, cancelled all drip emails`);
  }

  async scheduleActivityReadyEmail(userId: number, activityId: number): Promise<void> {
    const dedupeKey = `${userId}:activity_ready:${activityId}`;
    
    const existingJob = await storage.getEmailJobByDedupeKey(dedupeKey);
    if (existingJob) return;

    const scheduledAt = new Date(Date.now() + 5 * 60 * 1000);

    await storage.createEmailJob({
      userId,
      jobType: "activity_ready",
      campaign: null,
      step: null,
      scheduledAt,
      dedupeKey,
      metadata: {
        activityId,
      },
    });

    console.log(`[DripCampaign] Scheduled activity_ready email for user ${userId}, activity ${activityId}`);
  }

  // Bulk enroll all users who should be in a segment but don't have pending emails
  async enrollMissingUsers(): Promise<{ enrolled: number; skipped: number }> {
    let enrolled = 0;
    let skipped = 0;

    for (const segment of ["segment_a", "segment_b", "segment_c"]) {
      const users = await storage.getUsersNeedingCampaign(segment);
      
      for (const user of users) {
        // Check if user already has a pending email for this segment
        const steps = SEGMENT_STEPS[segment];
        if (!steps || steps.length === 0) continue;

        const firstStep = steps[0];
        const dedupeKey = `${user.id}:${segment}:${firstStep.step}`;
        const existingJob = await storage.getEmailJobByDedupeKey(dedupeKey);
        
        if (!existingJob) {
          await this.scheduleNextEmailForUser(user.id);
          enrolled++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`[DripCampaign] Enrolled ${enrolled} users, skipped ${skipped} already enrolled`);
    return { enrolled, skipped };
  }
}

export const dripCampaignService = new DripCampaignService();
