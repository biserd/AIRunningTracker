import type {Job} from '../services/queue/jobTypes';
import type {SqlDatabase,SqlStatement} from './activities';
import {D1JobLeases} from './jobLeases';
import {positiveId} from './activityPolicy';
import type {JobStore} from '../services/queue/jobStore';

export interface AtomicSqlDatabase extends SqlDatabase {
  batch(statements:SqlStatement[]):Promise<{meta:{changes?:number}}[]>;
}
type Row={id:string;user_id:number;type:Job['type'];data:string;priority:number;created_at:string;
  scheduled_at:string;attempts:number;max_attempts:number;status:Job['status'];error_code?:string};
const decode=(r:Row):Job=>({id:r.id,userId:r.user_id,type:r.type,data:JSON.parse(r.data),priority:r.priority,
  createdAt:new Date(r.created_at),scheduledAt:new Date(r.scheduled_at),attempts:r.attempts,
  maxAttempts:r.max_attempts,status:r.status,error:r.error_code} as Job);
function encoded(job:Job){
  positiveId(job.userId);
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(job.id)||!Number.isSafeInteger(job.priority)
    ||!Number.isInteger(job.maxAttempts)||job.maxAttempts<1||job.maxAttempts>20)throw new Error('INVALID_JOB');
  if(!['LIST_ACTIVITIES','HYDRATE_ACTIVITY','GENERATE_COACH_RECAP','FINALIZE_SYNC','STRAVA_WEBHOOK'].includes(job.type))throw new Error('INVALID_JOB_TYPE');
  const data=JSON.stringify(job.data);
  if(!data||new TextEncoder().encode(data).byteLength>16384)throw new Error('JOB_DATA_LIMIT');
  return {id:job.id,user_id:job.userId,type:job.type,data,priority:job.priority,
    created_at:job.createdAt.toISOString(),scheduled_at:job.scheduledAt.toISOString(),max_attempts:job.maxAttempts};
}

/** Native D1 binding only. No PostgreSQL pool, REST credential, scheduler or provider calls. */
export class D1JobStore implements JobStore {
  private leases:D1JobLeases;
  constructor(private db:AtomicSqlDatabase,private clock:()=>Date=()=>new Date()){
    this.leases=new D1JobLeases(db,clock);
  }
  async enqueue(job:Job){
    const v=encoded(job);
    await this.db.prepare(`INSERT INTO cloudflare_jobs(id,user_id,type,data,priority,created_at,scheduled_at,max_attempts)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
      .bind(v.id,v.user_id,v.type,v.data,v.priority,v.created_at,v.scheduled_at,v.max_attempts).run();
  }
  async claim(owner:string):Promise<Job|null>{
    const claimed=await this.leases.claim(owner);
    if(!claimed)return null;
    const row=await this.db.prepare('SELECT * FROM cloudflare_jobs WHERE id=? AND lease_owner=? AND status=\'processing\'')
      .bind(claimed.id,owner).first<Row>();
    return row?decode(row):null;
  }
  heartbeat(id:string,owner:string){return this.leases.heartbeat(id,owner);}
  fail(job:Job,owner:string,retryAt:Date|null){return this.leases.fail(job.id,owner,retryAt);}
  async complete(job:Job,owner:string,children:Job[],progress?:{processedCount:number;activitiesCount:number}){
    positiveId(job.userId);
    if(children.length>500||children.some(c=>c.userId!==job.userId))throw new Error('JOB_OWNER_OR_BATCH_LIMIT');
    const processed=progress?.processedCount??0,activities=progress?.activitiesCount??0;
    if([processed,activities].some(n=>!Number.isInteger(n)||n<0||n>1000000))throw new Error('INVALID_JOB_PROGRESS');
    const payload=JSON.stringify(children.map(encoded));
    if(new TextEncoder().encode(payload).byteLength>1000000)throw new Error('JOB_BATCH_BYTES_LIMIT');
    const nonce=crypto.randomUUID(),now=this.clock().toISOString();
    // The unique per-call receipt gates every side effect. Lost leases and replayed
    // completion calls cannot enqueue children or increment progress a second time.
    const results=await this.db.batch([
      this.db.prepare(`INSERT INTO d1_job_completions(id,job_id,user_id,lease_owner,completed_at,processed_count,activities_count)
        SELECT ?,id,user_id,?,?,?,? FROM cloudflare_jobs WHERE id=? AND user_id=? AND type=?
        AND status='processing' AND lease_owner=? AND lease_until>?
        ON CONFLICT(job_id) DO NOTHING`).bind(nonce,owner,now,processed,activities,job.id,job.userId,job.type,owner,now),
      this.db.prepare(`INSERT INTO cloudflare_jobs(id,user_id,type,data,priority,created_at,scheduled_at,max_attempts)
        SELECT json_extract(value,'$.id'),json_extract(value,'$.user_id'),json_extract(value,'$.type'),
        json_extract(value,'$.data'),json_extract(value,'$.priority'),json_extract(value,'$.created_at'),
        json_extract(value,'$.scheduled_at'),json_extract(value,'$.max_attempts') FROM json_each(?)
        WHERE EXISTS(SELECT 1 FROM d1_job_completions WHERE id=?) ON CONFLICT(id) DO NOTHING`).bind(payload,nonce),
    ]);
    if(!results[0].meta.changes)throw new Error('JOB_LEASE_LOST');
  }
  async hasPending(userId:number,exceptId:string){
    return !!await this.db.prepare(`SELECT 1 FROM cloudflare_jobs WHERE user_id=? AND id<>?
      AND type<>'FINALIZE_SYNC' AND status IN ('pending','processing') LIMIT 1`).bind(positiveId(userId),exceptId).first();
  }
  async jobsForUser(userId:number){
    const {results}=await this.db.prepare(`SELECT * FROM (SELECT *,row_number() OVER
      (PARTITION BY status ORDER BY created_at DESC,id DESC) position FROM cloudflare_jobs WHERE user_id=?)
      WHERE position<=200 ORDER BY created_at DESC,id DESC`).bind(positiveId(userId)).all<Row>();
    const jobs=results.map(decode);
    return {pending:jobs.filter(j=>j.status==='pending'),processing:jobs.filter(j=>j.status==='processing'),
      completed:jobs.filter(j=>j.status==='completed').slice(0,20),failed:jobs.filter(j=>j.status==='failed').slice(0,10)};
  }
  async stats(){
    const now=this.clock().toISOString();
    const result=await this.db.prepare(`SELECT count(CASE WHEN status='pending' AND scheduled_at<=? THEN 1 END) pending,
      count(CASE WHEN status='pending' AND scheduled_at>? THEN 1 END) delayed,
      count(CASE WHEN status='processing' THEN 1 END) processing,count(CASE WHEN status='completed' THEN 1 END) completed,
      count(CASE WHEN status='failed' THEN 1 END) failed FROM cloudflare_jobs`).bind(now,now)
      .first<{pending:number;delayed:number;processing:number;completed:number;failed:number}>();
    if(!result)throw new Error('JOB_STATS_UNAVAILABLE');
    return result;
  }
}
