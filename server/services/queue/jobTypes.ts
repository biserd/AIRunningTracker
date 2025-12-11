/**
 * Strava Job Queue - Job Type Definitions
 */

export type JobType = 'LIST_ACTIVITIES' | 'HYDRATE_ACTIVITY';

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

export type Job = ListActivitiesJob | HydrateActivityJob;

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  newJobs?: Omit<Job, 'id' | 'createdAt' | 'status' | 'attempts'>[];
}

export function createJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
