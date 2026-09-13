import type { SqlDatabase } from './activities';

type JobRow = {
  id:string;user_id:number;type:string;data:string;attempts:number;max_attempts:number;
  lease_owner:string|null;lease_until:string|null;
};
function ownerId(value:string){
  if(!/^[a-zA-Z0-9_-]{16,128}$/.test(value))throw new Error('INVALID_LEASE_OWNER');
  return value;
}

/** D1's atomic UPDATE replaces PostgreSQL SELECT FOR UPDATE SKIP LOCKED.
 * This component does not start a scheduler or call any external provider.
 * Orchestration must still atomically coordinate child jobs/progress before cutover.
 */
export class D1JobLeases {
  constructor(private readonly db:SqlDatabase,private readonly clock:()=>Date=()=>new Date()){}

  async claim(owner:string):Promise<JobRow|null>{
    ownerId(owner);
    const now=this.clock(),at=now.toISOString(),until=new Date(now.getTime()+300000).toISOString();
    await this.db.prepare(`UPDATE cloudflare_jobs SET status='failed',error_code='RETRIES_EXHAUSTED',
      finished_at=?,lease_owner=NULL,lease_until=NULL WHERE attempts>=max_attempts AND
      (status='pending' OR (status='processing' AND lease_until<=?))`).bind(at,at).run();
    return this.db.prepare(`UPDATE cloudflare_jobs SET status='processing',attempts=attempts+1,
      lease_owner=?,lease_until=? WHERE id=(SELECT id FROM cloudflare_jobs
      WHERE attempts<max_attempts AND ((status='pending' AND scheduled_at<=?) OR
      (status='processing' AND lease_until<=?)) ORDER BY priority,scheduled_at,id LIMIT 1)
      RETURNING id,user_id,type,data,attempts,max_attempts,lease_owner,lease_until`)
      .bind(owner,until,at,at).first<JobRow>();
  }

  async heartbeat(id:string,owner:string):Promise<boolean>{
    const now=this.clock();
    const result=await this.db.prepare(`UPDATE cloudflare_jobs SET lease_until=?
      WHERE id=? AND status='processing' AND lease_owner=? AND lease_until>?`)
      .bind(new Date(now.getTime()+300000).toISOString(),id,ownerId(owner),now.toISOString()).run();
    return result.meta.changes===1;
  }

  async fail(id:string,owner:string,retryAt:Date|null):Promise<boolean>{
    const at=this.clock().toISOString();
    const result=await this.db.prepare(`UPDATE cloudflare_jobs SET
      status=CASE WHEN ? IS NOT NULL AND attempts<max_attempts THEN 'pending' ELSE 'failed' END,
      scheduled_at=coalesce(?,scheduled_at),error_code='JOB_EXECUTION_FAILED',
      finished_at=CASE WHEN ? IS NOT NULL AND attempts<max_attempts THEN NULL ELSE ? END,
      lease_owner=NULL,lease_until=NULL
      WHERE id=? AND status='processing' AND lease_owner=? AND lease_until>?`)
      .bind(retryAt?.toISOString()??null,retryAt?.toISOString()??null,retryAt?.toISOString()??null,at,id,ownerId(owner),at).run();
    return result.meta.changes===1;
  }
}
