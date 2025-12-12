/**
 * Strava Job Queue - In-Memory Priority Queue with Delayed Retries
 */

import { Job, JobResult, createJobId } from './jobTypes';
import { stravaClient, isRateLimitError } from '../stravaClient';
import { storage } from '../../storage';
import { metrics } from './metrics';

// Track users with active sync operations
const activeSyncs = new Map<number, { startedAt: Date; totalActivities: number; processedActivities: number }>();

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueConfig {
  concurrency: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  processIntervalMs: number;
}

type JobProgressCallback = (userId: number, message: string, data?: any) => void;

class JobQueue {
  private queue: Job[] = [];
  private processing: Map<string, Job> = new Map();
  private completed: Job[] = [];
  private failed: Job[] = [];
  private isRunning = false;
  private processInterval: NodeJS.Timeout | null = null;
  private progressCallbacks: Map<number, JobProgressCallback> = new Map();
  
  private config: QueueConfig = {
    concurrency: 2,
    retryDelayMs: 60000,
    maxRetryDelayMs: 300000,
    processIntervalMs: 1000,
  };

  constructor() {}

  configure(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  registerProgressCallback(userId: number, callback: JobProgressCallback): void {
    this.progressCallbacks.set(userId, callback);
  }

  unregisterProgressCallback(userId: number): void {
    this.progressCallbacks.delete(userId);
  }

  private notifyProgress(userId: number, message: string, data?: any): void {
    const callback = this.progressCallbacks.get(userId);
    if (callback) {
      callback(userId, message, data);
    }
  }

  addJob(jobData: Omit<Job, 'id' | 'createdAt' | 'status' | 'attempts'>): Job {
    const job: Job = {
      ...jobData,
      id: createJobId(),
      createdAt: new Date(),
      status: 'pending',
      attempts: 0,
    } as Job;

    this.queue.push(job);
    this.queue.sort((a, b) => {
      if (a.scheduledAt.getTime() !== b.scheduledAt.getTime()) {
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      }
      return a.priority - b.priority;
    });

    // Start sync tracking for first LIST_ACTIVITIES job
    if (job.type === 'LIST_ACTIVITIES' && !activeSyncs.has(job.userId)) {
      activeSyncs.set(job.userId, { startedAt: new Date(), totalActivities: 0, processedActivities: 0 });
      storage.startSync(job.userId).catch(err => console.error('[JobQueue] Failed to start sync state:', err));
    }

    console.log(`[JobQueue] Added job ${job.id} (${job.type}) for user ${job.userId}. Queue size: ${this.queue.length}`);
    return job;
  }

  addJobs(jobs: Omit<Job, 'id' | 'createdAt' | 'status' | 'attempts'>[]): Job[] {
    return jobs.map(job => this.addJob(job));
  }

  private getNextJob(): Job | null {
    if (this.processing.size >= this.config.concurrency) {
      return null;
    }

    if (stravaClient.isRateLimited()) {
      console.log('[JobQueue] Strava rate limited, waiting...');
      return null;
    }

    const now = new Date();
    const index = this.queue.findIndex(job => 
      job.status === 'pending' && job.scheduledAt <= now
    );

    if (index === -1) {
      return null;
    }

    const job = this.queue.splice(index, 1)[0];
    job.status = 'processing';
    this.processing.set(job.id, job);
    return job;
  }

  private async processJob(job: Job): Promise<void> {
    job.attempts++;
    console.log(`[JobQueue] Processing job ${job.id} (${job.type}), attempt ${job.attempts}/${job.maxAttempts}`);

    try {
      const result = await this.executeJob(job);
      
      if (result.success) {
        job.status = 'completed';
        this.processing.delete(job.id);
        this.completed.push(job);
        metrics.incrementJobsProcessed(job.type);
        this.notifyProgress(job.userId, `Completed ${job.type}`, result.data);
        
        if (result.newJobs && result.newJobs.length > 0) {
          this.addJobs(result.newJobs);
        }
        
        // Check if sync is complete (no more jobs for this user)
        this.checkSyncCompletion(job.userId);
        
        if (this.completed.length > 1000) {
          this.completed = this.completed.slice(-500);
        }
      } else {
        throw new Error(result.error || 'Job failed');
      }
    } catch (error: any) {
      console.error(`[JobQueue] Job ${job.id} failed:`, error.message);
      job.error = error.message;
      
      if (isRateLimitError(error)) {
        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(2, job.attempts - 1),
          this.config.maxRetryDelayMs
        );
        job.scheduledAt = new Date(Date.now() + delay);
        job.status = 'pending';
        this.processing.delete(job.id);
        this.queue.push(job);
        console.log(`[JobQueue] Rate limited, requeuing job ${job.id} with ${delay}ms delay`);
        this.notifyProgress(job.userId, `Rate limited, retrying in ${delay / 1000}s`);
      } else if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        this.processing.delete(job.id);
        this.failed.push(job);
        metrics.incrementJobsFailed(job.type, error.message);
        this.notifyProgress(job.userId, `Job ${job.type} failed after ${job.attempts} attempts`, { error: error.message });
        
        // Mark sync as failed if this was a LIST_ACTIVITIES job
        if (job.type === 'LIST_ACTIVITIES') {
          this.markSyncError(job.userId, `Sync failed: ${error.message}`);
        }
        
        if (this.failed.length > 500) {
          this.failed = this.failed.slice(-250);
        }
      } else {
        const delay = this.config.retryDelayMs * job.attempts;
        job.scheduledAt = new Date(Date.now() + delay);
        job.status = 'pending';
        this.processing.delete(job.id);
        this.queue.push(job);
        console.log(`[JobQueue] Requeuing job ${job.id} with ${delay}ms delay`);
      }
    }
  }

  private async executeJob(job: Job): Promise<JobResult> {
    switch (job.type) {
      case 'LIST_ACTIVITIES':
        return await this.executeListActivities(job);
      case 'HYDRATE_ACTIVITY':
        return await this.executeHydrateActivity(job);
      default:
        return { success: false, error: `Unknown job type: ${(job as any).type}` };
    }
  }

  private async executeListActivities(job: Job): Promise<JobResult> {
    if (job.type !== 'LIST_ACTIVITIES') {
      return { success: false, error: 'Invalid job type' };
    }

    const { page, perPage, after, maxActivities } = job.data;
    const response = await stravaClient.getActivities(job.userId, page, perPage, after);
    const activities = response.data;

    this.notifyProgress(job.userId, `Fetched page ${page} with ${activities.length} activities`);

    const user = await storage.getUser(job.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const newJobs: Omit<Job, 'id' | 'createdAt' | 'status' | 'attempts'>[] = [];
    let processedCount = 0;
    let rehydratedCount = 0;

    for (const activity of activities) {
      const stravaId = activity.id.toString();
      
      const existingActivity = await storage.getActivityByStravaIdAndUser(stravaId, job.userId);
      
      if (existingActivity) {
        const needsStreams = !existingActivity.streamsData;
        const needsLaps = !existingActivity.lapsData;
        
        if (needsStreams || needsLaps) {
          newJobs.push({
            type: 'HYDRATE_ACTIVITY',
            userId: job.userId,
            priority: 3,
            scheduledAt: new Date(),
            maxAttempts: 3,
            data: {
              activityId: existingActivity.id,
              stravaId,
              fetchStreams: needsStreams,
              fetchLaps: needsLaps,
            },
          });
          rehydratedCount++;
        }
        continue;
      }

      const newActivity = await storage.createActivity({
        userId: job.userId,
        stravaId,
        name: activity.name,
        type: activity.type,
        distance: activity.distance,
        movingTime: activity.moving_time,
        totalElevationGain: activity.total_elevation_gain || 0,
        averageSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        averageHeartrate: activity.average_heartrate,
        maxHeartrate: activity.max_heartrate,
        startDate: new Date(activity.start_date),
        calories: activity.calories,
        averageCadence: activity.average_cadence,
        maxCadence: activity.max_cadence,
        averageWatts: activity.average_watts,
        maxWatts: activity.max_watts,
        sufferScore: activity.suffer_score,
        startLatitude: activity.start_latlng?.[0] ?? null,
        startLongitude: activity.start_latlng?.[1] ?? null,
        endLatitude: activity.end_latlng?.[0] ?? null,
        endLongitude: activity.end_latlng?.[1] ?? null,
        polyline: activity.map?.summary_polyline || null,
        // New fields from Strava summary API
        elapsedTime: activity.elapsed_time || null,
        workoutType: activity.workout_type ?? null,
        prCount: activity.pr_count || 0,
        photoCount: activity.photo_count || 0,
        athleteCount: activity.athlete_count || 1,
        timezone: activity.timezone || null,
        gearId: activity.gear_id || null,
        elevHigh: activity.elev_high || null,
        elevLow: activity.elev_low || null,
      });

      newJobs.push({
        type: 'HYDRATE_ACTIVITY',
        userId: job.userId,
        priority: 2,
        scheduledAt: new Date(),
        maxAttempts: 3,
        data: {
          activityId: newActivity.id,
          stravaId,
          fetchStreams: true,
          fetchLaps: true,
        },
      });

      processedCount++;
    }

    this.notifyProgress(job.userId, `Created ${processedCount} new activities${rehydratedCount > 0 ? `, requeued ${rehydratedCount} for missing data` : ''}`);
    console.log(`[JobQueue] User ${job.userId}: ${processedCount} new activities, ${rehydratedCount} rehydration jobs queued`);

    // Update sync progress
    const syncState = activeSyncs.get(job.userId);
    if (syncState) {
      syncState.processedActivities += processedCount;
      syncState.totalActivities += activities.length;
      storage.updateSyncProgress(job.userId, syncState.processedActivities, syncState.totalActivities)
        .catch(err => console.error('[JobQueue] Failed to update sync progress:', err));
    }

    if (activities.length === perPage && processedCount < maxActivities) {
      newJobs.unshift({
        type: 'LIST_ACTIVITIES',
        userId: job.userId,
        priority: 1,
        scheduledAt: new Date(),
        maxAttempts: 3,
        data: {
          page: page + 1,
          perPage,
          after,
          maxActivities: maxActivities - processedCount,
        },
      });
    }

    return { success: true, data: { processedCount, activitiesCount: activities.length }, newJobs };
  }

  private async executeHydrateActivity(job: Job): Promise<JobResult> {
    if (job.type !== 'HYDRATE_ACTIVITY') {
      return { success: false, error: 'Invalid job type' };
    }

    const { activityId, stravaId, fetchStreams, fetchLaps } = job.data;
    const SENTINEL = JSON.stringify({ status: 'not_available' });
    const updates: any = {};
    const transientErrors: string[] = [];

    if (fetchStreams) {
      try {
        const streamsResponse = await stravaClient.getActivityStreams(job.userId, parseInt(stravaId));
        if (streamsResponse.data) {
          updates.streamsData = JSON.stringify(streamsResponse.data);
        } else {
          updates.streamsData = SENTINEL;
        }
      } catch (error: any) {
        if (isRateLimitError(error)) {
          throw error;
        }
        if (error.message?.includes('404') || error.message?.includes('UNAUTHORIZED')) {
          updates.streamsData = SENTINEL;
          console.log(`[JobQueue] Streams not available for activity ${stravaId}, marking as unavailable`);
        } else {
          transientErrors.push(`streams: ${error.message}`);
        }
      }
    }

    if (fetchLaps) {
      try {
        const lapsResponse = await stravaClient.getActivityLaps(job.userId, parseInt(stravaId));
        if (lapsResponse.data && lapsResponse.data.length > 0) {
          updates.lapsData = JSON.stringify(lapsResponse.data);
        } else {
          updates.lapsData = SENTINEL;
        }
      } catch (error: any) {
        if (isRateLimitError(error)) {
          throw error;
        }
        if (error.message?.includes('404') || error.message?.includes('UNAUTHORIZED')) {
          updates.lapsData = SENTINEL;
          console.log(`[JobQueue] Laps not available for activity ${stravaId}, marking as unavailable`);
        } else {
          transientErrors.push(`laps: ${error.message}`);
        }
      }
    }

    if (transientErrors.length > 0) {
      throw new Error(`Transient hydration errors: ${transientErrors.join('; ')}`);
    }

    if (Object.keys(updates).length > 0) {
      await storage.updateActivity(activityId, updates);
    }

    this.notifyProgress(job.userId, `Hydrated activity ${stravaId}`, { 
      activityId, 
      updated: Object.keys(updates),
    });

    return { 
      success: true, 
      data: { 
        activityId, 
        updated: Object.keys(updates),
      } 
    };
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('[JobQueue] Starting job processor');

    this.processInterval = setInterval(async () => {
      const job = this.getNextJob();
      if (job) {
        this.processJob(job);
      }
    }, this.config.processIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log('[JobQueue] Stopped job processor');
  }

  getStats(): QueueStats {
    const now = new Date();
    return {
      pending: this.queue.filter(j => j.status === 'pending' && j.scheduledAt <= now).length,
      processing: this.processing.size,
      completed: this.completed.length,
      failed: this.failed.length,
      delayed: this.queue.filter(j => j.status === 'pending' && j.scheduledAt > now).length,
    };
  }

  getJobsForUser(userId: number): { pending: Job[]; processing: Job[]; completed: Job[]; failed: Job[] } {
    return {
      pending: this.queue.filter(j => j.userId === userId),
      processing: Array.from(this.processing.values()).filter(j => j.userId === userId),
      completed: this.completed.filter(j => j.userId === userId).slice(-20),
      failed: this.failed.filter(j => j.userId === userId).slice(-10),
    };
  }

  private checkSyncCompletion(userId: number): void {
    const userJobs = this.getJobsForUser(userId);
    const hasPendingWork = userJobs.pending.length > 0 || userJobs.processing.length > 0;
    
    if (!hasPendingWork && activeSyncs.has(userId)) {
      const syncState = activeSyncs.get(userId)!;
      activeSyncs.delete(userId);
      
      // Get the most recent activity date to store for next incremental sync
      storage.getMostRecentActivityByUserId(userId)
        .then(mostRecent => {
          const incrementalSince = mostRecent?.startDate || new Date();
          return storage.completeSyncSuccess(userId, incrementalSince);
        })
        .then(() => {
          console.log(`[JobQueue] Sync completed for user ${userId}. Processed ${syncState.processedActivities} activities.`);
          this.notifyProgress(userId, 'Sync completed', { 
            processedActivities: syncState.processedActivities,
            totalActivities: syncState.totalActivities,
          });
        })
        .catch(err => console.error('[JobQueue] Failed to complete sync state:', err));
    }
  }

  markSyncError(userId: number, error: string): void {
    activeSyncs.delete(userId);
    storage.completeSyncError(userId, error)
      .catch(err => console.error('[JobQueue] Failed to mark sync error:', err));
  }

  clearCompletedJobs(): void {
    this.completed = [];
    this.failed = [];
  }
}

export const jobQueue = new JobQueue();

jobQueue.start();
