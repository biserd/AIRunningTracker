import type {Job} from './jobTypes';

/** Durable queue contract shared by the PostgreSQL and D1 implementations. */
export interface JobStore {
  enqueue(job:Job):Promise<void>;
  claim(owner:string):Promise<Job|null>;
  heartbeat(id:string,owner:string):Promise<boolean>;
  fail(job:Job,owner:string,retryAt:Date|null):Promise<boolean>;
  complete(job:Job,owner:string,children:Job[],progress?:{processedCount:number;activitiesCount:number}):Promise<void>;
  hasPending(userId:number,exceptId:string):Promise<boolean>;
  jobsForUser(userId:number):Promise<{pending:Job[];processing:Job[];completed:Job[];failed:Job[]}>;
  stats():Promise<{pending:number;delayed:number;processing:number;completed:number;failed:number}>;
}
