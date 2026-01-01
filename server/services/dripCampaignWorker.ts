import { storage } from "../storage";
import { dripCampaignService } from "./dripCampaign";
import { emailService } from "./email";
import type { EmailJob } from "@shared/schema";

const WORKER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_JOBS_PER_RUN = 50;
const SETTING_KEY = "drip_campaigns_enabled";

class DripCampaignWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunAt: Date | null = null;
  private jobsProcessed = 0;
  private jobsFailed = 0;
  private campaignsEnabled = false; // In-memory cache of DB setting (defaults to OFF)

  async start(): Promise<void> {
    if (this.intervalId) {
      console.log("[DripWorker] Already running");
      return;
    }

    // Load setting from database on startup
    try {
      const setting = await storage.getSystemSetting(SETTING_KEY);
      this.campaignsEnabled = setting === "true"; // Default to false if not set
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

    this.isRunning = true;
    this.lastRunAt = new Date();

    try {
      const jobs = await storage.getPendingEmailJobs(MAX_JOBS_PER_RUN);
      
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
            } else {
              this.jobsFailed++;
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

    await emailService.sendActivityReadyEmail({
      to: user.email,
      userName: user.firstName || user.username || "Runner",
      activityName: activity.name,
      activityId: activity.id,
    });

    await storage.updateEmailJob(job.id, { 
      status: "sent", 
      sentAt: new Date() 
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
  } {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      jobsProcessed: this.jobsProcessed,
      jobsFailed: this.jobsFailed,
      workerActive: this.intervalId !== null,
      campaignsEnabled: this.campaignsEnabled,
    };
  }

  async runNow(): Promise<void> {
    await this.processJobs();
  }

  async setCampaignsEnabled(enabled: boolean): Promise<void> {
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

  isCampaignsEnabled(): boolean {
    return this.campaignsEnabled;
  }
}

export const dripCampaignWorker = new DripCampaignWorker();
