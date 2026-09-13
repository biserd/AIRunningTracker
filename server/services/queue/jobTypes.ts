/**
 * Strava Job Queue - Job Type Definitions
 */

export type JobType = 'LIST_ACTIVITIES' | 'HYDRATE_ACTIVITY' | 'GENERATE_COACH_RECAP' | 'FINALIZE_SYNC' | 'STRAVA_WEBHOOK';

export interface BaseJob {
  id: string;
  type: JobType;
  userId: number;
  priority: number;
  createdAt: Date;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ListActivitiesJob extends BaseJob {
  type: 'LIST_ACTIVITIES';
  data: {
    page: number;
    perPage: number;
    after?: number;
    maxActivities: number;
  };
}

export interface HydrateActivityJob extends BaseJob {
  type: 'HYDRATE_ACTIVITY';
  data: {
    activityId: number;
    stravaId: string;
    fetchStreams: boolean;
    fetchLaps: boolean;
  };
}

export interface GenerateCoachRecapJob extends BaseJob {
  type: 'GENERATE_COACH_RECAP';
  data: {
    activityId: number;
    stravaId: string;
  };
}

export interface FinalizeSyncJob extends BaseJob {
  type: 'FINALIZE_SYNC';
  data: Record<string, never>;
}
export interface StravaEvent {
  object_type: 'activity' | 'athlete'; object_id: number; aspect_type: 'create' | 'update' | 'delete';
  owner_id: number; subscription_id: number; event_time: number; updates?: Record<string, unknown>;
}
export interface StravaWebhookJob extends BaseJob { type: 'STRAVA_WEBHOOK'; data: StravaEvent }
export type Job = ListActivitiesJob | HydrateActivityJob | GenerateCoachRecapJob | FinalizeSyncJob | StravaWebhookJob;

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  newJobs?: Omit<Job, 'id' | 'createdAt' | 'status' | 'attempts'>[];
}

export function createJobId(): string {
  return `job_${crypto.randomUUID()}`;
}

export function createListActivitiesJob(
  userId: number,
  page: number,
  perPage: number,
  maxActivities: number,
  after?: number,
  priority = 1
): Omit<ListActivitiesJob, 'id' | 'createdAt' | 'status' | 'attempts'> {
  return {
    type: 'LIST_ACTIVITIES',
    userId,
    priority,
    scheduledAt: new Date(),
    maxAttempts: 3,
    data: {
      page,
      perPage,
      after,
      maxActivities,
    },
  };
}

export function createHydrateActivityJob(
  userId: number,
  activityId: number,
  stravaId: string,
  fetchStreams = true,
  fetchLaps = true,
  priority = 2
): Omit<HydrateActivityJob, 'id' | 'createdAt' | 'status' | 'attempts'> {
  return {
    type: 'HYDRATE_ACTIVITY',
    userId,
    priority,
    scheduledAt: new Date(),
    maxAttempts: 3,
    data: {
      activityId,
      stravaId,
      fetchStreams,
      fetchLaps,
    },
  };
}

export function createCoachRecapJob(
  userId: number,
  activityId: number,
  stravaId: string,
  priority = 5
): Omit<GenerateCoachRecapJob, 'id' | 'createdAt' | 'status' | 'attempts'> {
  return {
    type: 'GENERATE_COACH_RECAP',
    userId,
    priority,
    scheduledAt: new Date(),
    maxAttempts: 2,
    data: {
      activityId,
      stravaId,
    },
  };
}
