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

    for (const segment of ["segment_a", "segment_b", "segment_c", "segment_d"]) {
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
