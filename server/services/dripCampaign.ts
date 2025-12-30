import { storage } from "../storage";
import { emailService } from "./email";
import type { User, EmailJob } from "@shared/schema";

export type UserSegment = "segment_a" | "segment_b" | "segment_c" | "segment_d" | null;

interface DripStep {
  step: string;
  delayHours: number;
  subject: string;
  previewText: string;
  ctaText: string;
  ctaUrl: string;
  objective: string;
}

const SEGMENT_A_STEPS: DripStep[] = [
  {
    step: "A1",
    delayHours: 0.08, // 5 minutes after signup
    subject: "Your running analysis is waiting",
    previewText: "Connect Strava to see your Coach Grade",
    ctaText: "Connect Strava",
    ctaUrl: "/auth?tab=signup&connect=strava&source=emailA1",
    objective: "strava_connected",
  },
  {
    step: "A2",
    delayHours: 48, // Day 2
    subject: "30 seconds to unlock your running insights",
    previewText: "Connect Strava and see what you've been missing",
    ctaText: "Connect Strava (30 seconds)",
    ctaUrl: "/auth?tab=signup&connect=strava&source=emailA2",
    objective: "strava_connected",
  },
];

const SEGMENT_B_STEPS: DripStep[] = [
  {
    step: "B1",
    delayHours: 1, // 1 hour after connect
    subject: "Your Coach Grade is ready",
    previewText: "See how your recent runs stack up",
    ctaText: "View My Coach Grade",
    ctaUrl: "/dashboard?source=B1",
    objective: "snapshot_viewed",
  },
  {
    step: "B2",
    delayHours: 24, // Next morning
    subject: "Your personalized running recommendation",
    previewText: "Based on your recent activity",
    ctaText: "See Today's Recommendation",
    ctaUrl: "/dashboard?source=B2",
    objective: "snapshot_viewed",
  },
  {
    step: "B3",
    delayHours: 72, // Day 3
    subject: "Your last run in 30 seconds",
    previewText: "See the story of your recent run",
    ctaText: "View Run Story",
    ctaUrl: "/activities?source=B3",
    objective: "activity_story_viewed",
  },
  {
    step: "B4",
    delayHours: 120, // Day 5
    subject: "Ask your AI Coach anything",
    previewText: "Get a personalized answer about your training",
    ctaText: "Ask the Coach",
    ctaUrl: "/chat?source=B4",
    objective: "coach_question_asked",
  },
  {
    step: "B5",
    delayHours: 168, // Day 7
    subject: "Your Week in Review is ready",
    previewText: "See your training trends and progress",
    ctaText: "View Weekly Review",
    ctaUrl: "/dashboard?source=B5",
    objective: "weekly_review_viewed",
  },
  {
    step: "B6",
    delayHours: 240, // Day 10
    subject: "Compare your runs side-by-side",
    previewText: "See how you're progressing",
    ctaText: "Compare Runs",
    ctaUrl: "/activities?compare=true&source=B6",
    objective: "compare_opened",
  },
  {
    step: "B7",
    delayHours: 336, // Day 14
    subject: "Unlock unlimited coaching and insights",
    previewText: "Get the most out of your training data",
    ctaText: "See Pro Features",
    ctaUrl: "/pricing?source=B7",
    objective: "upgrade_click",
  },
];

const SEGMENT_C_STEPS: DripStep[] = [
  {
    step: "C1",
    delayHours: 48, // Day 2 after activation
    subject: "You've unlocked valuable insights",
    previewText: "See what you've discovered so far",
    ctaText: "Ask the Coach",
    ctaUrl: "/chat?source=C1",
    objective: "coach_question_asked",
  },
  {
    step: "C2",
    delayHours: 120, // Day 5 after activation
    subject: "Compare runs to see your progress",
    previewText: "Training insights from your data",
    ctaText: "Compare Runs",
    ctaUrl: "/activities?compare=true&source=C2",
    objective: "compare_opened",
  },
  {
    step: "C3",
    delayHours: 240, // Day 10 after activation
    subject: "Get a simple training plan for this week",
    previewText: "AI-powered, personalized to you",
    ctaText: "Generate My Plan",
    ctaUrl: "/training-plans?source=C3",
    objective: "plan_generated",
  },
  {
    step: "C4",
    delayHours: 336, // Day 14 after activation
    subject: "Ready for the next level?",
    previewText: "Unlock Pro features for serious runners",
    ctaText: "Start Pro Trial",
    ctaUrl: "/pricing?source=C4",
    objective: "upgrade_click",
  },
];

const SEGMENT_D_STEPS: DripStep[] = [
  {
    step: "D1",
    delayHours: 0, // Immediately when inactive
    subject: "See what changed since your last run",
    previewText: "Your running insights are waiting",
    ctaText: "View My Dashboard",
    ctaUrl: "/dashboard?source=D1",
    objective: "snapshot_viewed",
  },
  {
    step: "D2",
    delayHours: 72, // 3 days after D1
    subject: "Your new week plan is ready",
    previewText: "Get back on track with personalized recommendations",
    ctaText: "See This Week's Plan",
    ctaUrl: "/dashboard?source=D2",
    objective: "snapshot_viewed",
  },
];

const SEGMENT_STEPS: Record<string, DripStep[]> = {
  segment_a: SEGMENT_A_STEPS,
  segment_b: SEGMENT_B_STEPS,
  segment_c: SEGMENT_C_STEPS,
  segment_d: SEGMENT_D_STEPS,
};

export class DripCampaignService {
  computeUserSegment(user: User): UserSegment {
    const isPaid = user.subscriptionPlan !== "free";
    
    if (isPaid) {
      return null;
    }
    
    if (!user.stravaConnected) {
      return "segment_a";
    }
    
    if (!user.activationAt) {
      return "segment_b";
    }
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (user.lastSeenAt && new Date(user.lastSeenAt) < sevenDaysAgo) {
      return "segment_d";
    }
    
    return "segment_c";
  }

  async enterCampaign(userId: number, segment: UserSegment): Promise<void> {
    if (!segment) return;

    const existingCampaign = await storage.getUserCampaign(userId, segment);
    if (existingCampaign && existingCampaign.state === "active") {
      console.log(`[DripCampaign] User ${userId} already in active ${segment} campaign`);
      return;
    }

    const campaign = await storage.createUserCampaign({
      userId,
      campaign: segment,
      currentStep: 1,
    });

    console.log(`[DripCampaign] User ${userId} entered ${segment} campaign`);

    await this.scheduleNextStep(userId, segment, 1);
  }

  async scheduleNextStep(userId: number, segment: string, stepNumber: number): Promise<void> {
    const steps = SEGMENT_STEPS[segment];
    if (!steps || stepNumber > steps.length) {
      console.log(`[DripCampaign] No more steps for ${segment}, step ${stepNumber}`);
      return;
    }

    const step = steps[stepNumber - 1];
    const dedupeKey = `${userId}:${segment}:${step.step}`;

    const existingJob = await storage.getEmailJobByDedupeKey(dedupeKey);
    if (existingJob) {
      console.log(`[DripCampaign] Email job already exists for ${dedupeKey}`);
      return;
    }

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
        await this.exitCampaignForUser(user.id, "subscribed");
        return false;
      }

      const currentSegment = this.computeUserSegment(user);
      if (currentSegment !== job.campaign) {
        await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: `Segment changed to ${currentSegment}` });
        
        if (currentSegment) {
          await this.enterCampaign(user.id, currentSegment);
        }
        return false;
      }

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

      const campaign = await storage.getUserCampaign(user.id, job.campaign || "");
      if (campaign) {
        await storage.updateUserCampaign(campaign.id, { 
          currentStep: (campaign.currentStep || 0) + 1,
          lastEmailSentAt: new Date(),
        });

        const currentStepNum = parseInt(job.step?.replace(/[A-D]/, "") || "1");
        await this.scheduleNextStep(user.id, job.campaign || "", currentStepNum + 1);
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
    const campaigns = await storage.getActiveCampaigns(userId);
    const lastSent = campaigns
      .map(c => c.lastEmailSentAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return lastSent || null;
  }

  async exitCampaignForUser(userId: number, reason: string): Promise<void> {
    const campaigns = await storage.getActiveCampaigns(userId);
    for (const campaign of campaigns) {
      await storage.exitUserCampaign(campaign.id, reason);
    }
    await storage.cancelEmailJobsForUser(userId);
    console.log(`[DripCampaign] Exited all campaigns for user ${userId}, reason: ${reason}`);
  }

  async recordActivation(userId: number, activationType: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    if (!user.activationAt) {
      await storage.updateUserActivation(userId, new Date());
      console.log(`[DripCampaign] User ${userId} activated via ${activationType}`);

      const segmentBCampaign = await storage.getUserCampaign(userId, "segment_b");
      if (segmentBCampaign && segmentBCampaign.state === "active") {
        await storage.exitUserCampaign(segmentBCampaign.id, "activated");
        await storage.cancelEmailJobsForUser(userId);
        
        await this.enterCampaign(userId, "segment_c");
      }
    }
  }

  async recordLastSeen(userId: number): Promise<void> {
    await storage.updateUserLastSeen(userId);
  }

  async onStravaConnected(userId: number): Promise<void> {
    const segmentACampaign = await storage.getUserCampaign(userId, "segment_a");
    if (segmentACampaign && segmentACampaign.state === "active") {
      await storage.exitUserCampaign(segmentACampaign.id, "strava_connected");
      await storage.cancelEmailJobsForUser(userId);
    }

    await this.enterCampaign(userId, "segment_b");
  }

  async onUserSubscribed(userId: number): Promise<void> {
    await this.exitCampaignForUser(userId, "subscribed");
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
}

export const dripCampaignService = new DripCampaignService();
