/**
 * Queue Metrics Module
 * Provides in-memory counters for observability of the Strava job queue system.
 */

export interface MetricsSnapshot {
  jobsProcessed: Record<string, number>;
  jobsFailed: Record<string, number>;
  rateLimitHits: number;
  lastRateLimitPauseAt: string | null;
  lastRateLimitResumeAt: string | null;
  lastJobFailureAt: string | null;
  recentEvents: MetricEvent[];
  uptimeSeconds: number;
}

export interface MetricEvent {
  timestamp: string;
  event: string;
  type?: string;
  details?: Record<string, any>;
}

class MetricsRegistry {
  private jobsProcessed: Record<string, number> = {};
  private jobsFailed: Record<string, number> = {};
  private rateLimitHits: number = 0;
  private lastRateLimitPauseAt: Date | null = null;
  private lastRateLimitResumeAt: Date | null = null;
  private lastJobFailureAt: Date | null = null;
  private recentEvents: MetricEvent[] = [];
  private maxRecentEvents: number = 50;
  private startTime: Date = new Date();

  incrementJobsProcessed(jobType: string): void {
    this.jobsProcessed[jobType] = (this.jobsProcessed[jobType] || 0) + 1;
    this.logEvent('job_processed', jobType);
  }

  incrementJobsFailed(jobType: string, error?: string): void {
    this.jobsFailed[jobType] = (this.jobsFailed[jobType] || 0) + 1;
    this.lastJobFailureAt = new Date();
    this.logEvent('job_failed', jobType, { error });
    
    console.warn(JSON.stringify({
      event: 'job_failed',
      type: jobType,
      error: error || 'unknown',
      timestamp: new Date().toISOString(),
      totalFailures: this.jobsFailed[jobType],
    }));
  }

  incrementRateLimitHits(): void {
    this.rateLimitHits++;
  }

  recordRateLimitPause(usage: { shortTerm: number; longTerm: number }): void {
    this.lastRateLimitPauseAt = new Date();
    this.incrementRateLimitHits();
    this.logEvent('rate_limit_pause', undefined, usage);
    
    console.warn(JSON.stringify({
      event: 'rate_limit_pause',
      timestamp: new Date().toISOString(),
      usage,
      totalHits: this.rateLimitHits,
    }));
  }

  recordRateLimitResume(usage: { shortTerm: number; longTerm: number }): void {
    this.lastRateLimitResumeAt = new Date();
    this.logEvent('rate_limit_resume', undefined, usage);
    
    console.info(JSON.stringify({
      event: 'rate_limit_resume',
      timestamp: new Date().toISOString(),
      usage,
    }));
  }

  private logEvent(event: string, type?: string, details?: Record<string, any>): void {
    const metricEvent: MetricEvent = {
      timestamp: new Date().toISOString(),
      event,
      type,
      details,
    };
    
    this.recentEvents.unshift(metricEvent);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.pop();
    }
  }

  getSnapshot(): MetricsSnapshot {
    const now = new Date();
    const uptimeSeconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
    
    return {
      jobsProcessed: { ...this.jobsProcessed },
      jobsFailed: { ...this.jobsFailed },
      rateLimitHits: this.rateLimitHits,
      lastRateLimitPauseAt: this.lastRateLimitPauseAt?.toISOString() || null,
      lastRateLimitResumeAt: this.lastRateLimitResumeAt?.toISOString() || null,
      lastJobFailureAt: this.lastJobFailureAt?.toISOString() || null,
      recentEvents: [...this.recentEvents],
      uptimeSeconds,
    };
  }

  reset(): void {
    this.jobsProcessed = {};
    this.jobsFailed = {};
    this.rateLimitHits = 0;
    this.lastRateLimitPauseAt = null;
    this.lastRateLimitResumeAt = null;
    this.lastJobFailureAt = null;
    this.recentEvents = [];
    this.startTime = new Date();
  }

  getTotals(): { processed: number; failed: number } {
    const processed = Object.values(this.jobsProcessed).reduce((a, b) => a + b, 0);
    const failed = Object.values(this.jobsFailed).reduce((a, b) => a + b, 0);
    return { processed, failed };
  }
}

export const metrics = new MetricsRegistry();
