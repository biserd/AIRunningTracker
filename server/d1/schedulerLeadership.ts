import {randomUUID} from 'node:crypto';
import type {SqlDatabase} from './activities';

export type SchedulerLease={owner:string;generation:number};
/** Database time is authoritative, so container clock differences cannot claim a live lease. */
export class D1SchedulerLeadership {
  constructor(private db:SqlDatabase){}
  async acquire(owner:string):Promise<SchedulerLease|null>{
    if(!/^[a-zA-Z0-9_-]{16,128}$/.test(owner))throw new Error('INVALID_SCHEDULER_OWNER');
    return this.db.prepare(`INSERT INTO scheduler_leases(name,owner,generation,expires_at)
      VALUES('application',?,1,unixepoch()+60) ON CONFLICT(name) DO UPDATE
      SET owner=excluded.owner,generation=scheduler_leases.generation+1,expires_at=excluded.expires_at
      WHERE scheduler_leases.expires_at<=unixepoch() RETURNING owner,generation`).bind(owner).first<SchedulerLease>();
  }
  async renew(lease:SchedulerLease){
    const result=await this.db.prepare(`UPDATE scheduler_leases SET expires_at=unixepoch()+60
      WHERE name='application' AND owner=? AND generation=? AND expires_at>unixepoch()`)
      .bind(lease.owner,lease.generation).run();
    return result.meta.changes===1;
  }
  async release(lease:SchedulerLease){
    await this.db.prepare(`UPDATE scheduler_leases SET expires_at=0
      WHERE name='application' AND owner=? AND generation=?`).bind(lease.owner,lease.generation).run();
  }
}

/** Node container scheduler entrypoint. Starts the existing workers only after obtaining a D1 lease.
 * Individual jobs still require their own durable claims. No timers run when database access fails.
 */
export function runAsD1SchedulerLeader(db:SqlDatabase,start:()=>Promise<void>):()=>void {
  const store=new D1SchedulerLeadership(db),owner=randomUUID();
  let lease:SchedulerLease|null=null,busy=false,stopped=false,lastVerified=0;
  const terminate=()=>{console.error('[Scheduler] D1 leadership lost; stopping process');process.exit(1);};
  const tick=async()=>{
    if(stopped)return;
    if(lease&&performance.now()-lastVerified>40_000)return terminate();
    if(busy)return;
    busy=true;
    try{
      if(lease){if(!await store.renew(lease))return terminate();lastVerified=performance.now();}
      else{
        const acquired=await store.acquire(owner);
        if(!acquired)return;
        if(stopped){await store.release(acquired);return;}
        lease=acquired;lastVerified=performance.now();
        await start();
        console.log('[Scheduler] D1 leadership acquired');
      }
    }catch{if(lease)return terminate();console.error('[Scheduler] D1 unavailable; no jobs started');}
    finally{busy=false;}
  };
  const timer=setInterval(()=>{void tick();},10_000);timer.unref();void tick();
  // Stopping this controller after workers have started cannot leave those timers alive.
  return ()=>{stopped=true;clearInterval(timer);if(lease)terminate();};
}
