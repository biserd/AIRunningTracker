import { storage } from "../storage";
import { dripCampaignService } from "./dripCampaign";
import { emailService } from "./email";
import type { EmailJob } from "@shared/schema";
import crypto from "crypto";

const WORKER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_JOBS_PER_RUN = 50;
const SETTING_KEY = "drip_campaigns_enabled";
const DRY_RUN_KEY = "drip_campaigns_dry_run";
const HOURLY_LIMIT_KEY = "drip_campaigns_hourly_limit";

class DripCampaignWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunAt: Date | null = null;
  private jobsProcessed = 0;
  private jobsFailed = 0;
  private campaignsEnabled = false; // In-memory cache of DB setting (defaults to OFF)
  private dryRun = true;
  private hourlyLimit = 50;
  private hourStartedAt = Date.now();
  private sendsThisHour = 0;
  private lastReconciledAt: Date | null = null;
  private readonly workerId = `drip-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;

  private readiness() {
    const checks = {
      marketingLinkSecret: Boolean(process.env.MARKETING_LINK_SIGNING_SECRET && process.env.MARKETING_LINK_SIGNING_SECRET.length >= 32),
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
      fromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
    };
    return { ready: Object.values(checks).every(Boolean), checks };
  }

  async start(): Promise<void> {
    if (this.intervalId) {
      console.log("[DripWorker] Already running");
      return;
    }

    // Load setting from database on startup
    try {
      const setting = await storage.getSystemSetting(SETTING_KEY);
      this.campaignsEnabled = setting === "true"; // Default to false if not set
      this.dryRun = (await storage.getSystemSetting(DRY_RUN_KEY)) !== "false";
      this.hourlyLimit = Math.max(1, Math.min(500, Number(await storage.getSystemSetting(HOURLY_LIMIT_KEY) || "50")));
      console.log(`[DripWorker] Loaded campaigns enabled: ${this.campaignsEnabled}`);
    } catch (error) {
      console.error("[DripWorker] Error loading setting, defaulting to disabled:", error);
      this.campaignsEnabled = false;
    }

    console.log("[DripWorker] Starting worker with interval:", WORKER_INTERVAL_MS / 1000, "seconds");
    
    setTimeout(() => this.processJobs(), 10000);

    this.intervalId = setInterval(() => this.processJobs(), WORKER_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[DripWorker] Stopped");
    }
  }

  async processJobs(): Promise<void> {
    if (this.isRunning) {
      console.log("[DripWorker] Already processing, skipping");
      return;
    }

    if (!this.campaignsEnabled) {
      console.log("[DripWorker] Campaigns disabled, skipping");
      return;
    }

    if (Date.now() - this.hourStartedAt >= 60 * 60 * 1000) {
      this.hourStartedAt = Date.now();
      this.sendsThisHour = 0;
    }
    if (this.sendsThisHour >= this.hourlyLimit) return;

    this.isRunning = true;
    this.lastRunAt = new Date();

    try {
      if (!this.lastReconciledAt || Date.now() - this.lastReconciledAt.getTime() >= 60 * 60 * 1000) {
        await dripCampaignService.enrollMissingUsers();
        this.lastReconciledAt = new Date();
      }
      if (this.dryRun) {
        console.log("[DripWorker] Dry-run active. Eligibility reconciled, delivery skipped.");
        return;
      }
      const jobs = await storage.claimPendingEmailJobs(Math.min(MAX_JOBS_PER_RUN, this.hourlyLimit - this.sendsThisHour), this.workerId);
      
      if (jobs.length === 0) {
        console.log("[DripWorker] No pending jobs");
        return;
      }

      console.log(`[DripWorker] Processing ${jobs.length} pending jobs`);

      for (const job of jobs) {
        try {
          if (job.jobType === "drip") {
            const success = await dripCampaignService.processEmailJob(job);
            if (success) {
              this.jobsProcessed++;
              this.sendsThisHour++;
            } else {
              const latest = await storage.getEmailJobByDedupeKey(job.dedupeKey);
              if (latest?.status === "failed") this.jobsFailed++;
            }
          } else if (job.jobType === "activity_ready") {
            await this.processActivityReadyJob(job);
            this.jobsProcessed++;
          } else {
            console.log(`[DripWorker] Unknown job type: ${job.jobType}`);
            await storage.updateEmailJob(job.id, { 
              status: "failed", 
              errorMessage: "Unknown job type" 
            });
            this.jobsFailed++;
          }
        } catch (error) {
          console.error(`[DripWorker] Error processing job ${job.id}:`, error);
          await storage.updateEmailJob(job.id, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            retryCount: (job.retryCount || 0) + 1,
          });
          this.jobsFailed++;
        }
      }

      console.log(`[DripWorker] Finished processing ${jobs.length} jobs`);
    } catch (error) {
      console.error("[DripWorker] Error fetching jobs:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processActivityReadyJob(job: EmailJob): Promise<void> {
    const user = await storage.getUser(job.userId);
    if (!user) {
      await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: "User not found" });
      return;
    }
    if (!user.email) {
      await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: "Email missing", claimedAt: null, claimedBy: null, leaseExpiresAt: null });
      return;
    }

    const metadata = job.metadata as { activityId?: number } || {};
    if (!metadata.activityId) {
      await storage.updateEmailJob(job.id, { status: "failed", errorMessage: "No activityId in metadata" });
      return;
    }

    const activity = await storage.getActivityById(metadata.activityId);
    if (!activity) {
      await storage.updateEmailJob(job.id, { status: "cancelled", errorMessage: "Activity not found" });
      return;
    }

    const sent = await emailService.sendActivityReadyEmail({
      to: user.email,
      userName: user.firstName || user.username || "Runner",
      activityName: activity.name,
      activityId: activity.id,
    });

    if (!sent) {
      const retryCount = (job.retryCount || 0) + 1;
      await storage.updateEmailJob(job.id, {
        status: retryCount <= 5 ? "retry_scheduled" : "failed",
        retryCount,
        nextAttemptAt: retryCount <= 5 ? new Date(Date.now() + Math.min(24, 2 ** retryCount) * 60 * 60 * 1000) : null,
        errorMessage: "email_provider_rejected",
        claimedAt: null,
        claimedBy: null,
        leaseExpiresAt: null,
      });
      return;
    }
    await storage.updateEmailJob(job.id, { 
      status: "sent", 
      sentAt: new Date(),
      claimedAt: null,
      claimedBy: null,
      leaseExpiresAt: null,
    });

    console.log(`[DripWorker] Sent activity_ready email for activity ${metadata.activityId} to user ${user.id}`);
  }

  getStatus(): {
    isRunning: boolean;
    lastRunAt: Date | null;
    jobsProcessed: number;
    jobsFailed: number;
    workerActive: boolean;
    campaignsEnabled: boolean;
    dryRun: boolean;
    hourlyLimit: number;
    sendsThisHour: number;
    workerId: string;
    lastReconciledAt: Date | null;
    readiness: ReturnType<DripCampaignWorker["readiness"]>;
  } {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      jobsProcessed: this.jobsProcessed,
      jobsFailed: this.jobsFailed,
      workerActive: this.intervalId !== null,
      campaignsEnabled: this.campaignsEnabled,
      dryRun: this.dryRun,
      hourlyLimit: this.hourlyLimit,
      sendsThisHour: this.sendsThisHour,
      workerId: this.workerId,
      lastReconciledAt: this.lastReconciledAt,
      readiness: this.readiness(),
    };
  }

  async runNow(): Promise<void> {
    await this.processJobs();
  }

  async setCampaignsEnabled(enabled: boolean): Promise<void> {
    if (enabled && !this.dryRun && !this.readiness().ready) throw new Error("Campaign delivery cannot be enabled until all readiness checks pass");
    this.campaignsEnabled = enabled;
    // Persist to database
    try {
      await storage.setSystemSetting(SETTING_KEY, enabled.toString());
      console.log(`[DripWorker] Campaigns ${enabled ? 'ENABLED' : 'DISABLED'} (saved to DB)`);
    } catch (error) {
      console.error("[DripWorker] Error saving setting to DB:", error);
      throw error;
    }
  }

  async setSafetyConfig(config: { dryRun?: boolean; hourlyLimit?: number }): Promise<void> {
    if (typeof config.dryRun === "boolean") {
      if (!config.dryRun && !this.readiness().ready) throw new Error("Dry-run cannot be disabled until all readiness checks pass");
      this.dryRun = config.dryRun;
      await storage.setSystemSetting(DRY_RUN_KEY, String(config.dryRun));
    }
    if (typeof config.hourlyLimit === "number") {
      this.hourlyLimit = Math.max(1, Math.min(500, Math.floor(config.hourlyLimit)));
      await storage.setSystemSetting(HOURLY_LIMIT_KEY, String(this.hourlyLimit));
    }
  }

  isCampaignsEnabled(): boolean {
    return this.campaignsEnabled;
  }
}

export const dripCampaignWorker = new DripCampaignWorker();
