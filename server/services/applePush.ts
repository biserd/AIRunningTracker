import {randomUUID} from 'node:crypto';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import {sendApplePush,type ApplePushConfig,type ApplePushMessage,type ApplePushResult} from './applePushTransport';

const now=()=>Math.floor(Date.now()/1000);
type Device={installation:string;user_id:number;token:string;environment:'production'|'sandbox';generation:string;reminders:number;runs:number;enabled_at:number;expires_at:number};
type Item={id:string;installation:string;user_id:number;generation:string;kind:'run'|'reminder'|'test';reference:string;attempts:number;expires_at:number};
export class ApplePushError extends Error {constructor(message:string,public status=400){super(message);}}
export function registration(input:Record<string,unknown>) {
  if(typeof input.installation!=='string'||! /^[a-f0-9-]{36}$/i.test(input.installation) || typeof input.token!=='string'||! /^[a-f0-9]{32,512}$/i.test(input.token) || !['sandbox','production'].includes(String(input.environment)) || typeof input.reminders!=='boolean'||typeof input.runs!=='boolean')throw new ApplePushError('Invalid Apple notification registration.');
  return {installation:input.installation.toLowerCase(),token:input.token.toLowerCase(),environment:String(input.environment),reminders:Number(input.reminders),runs:Number(input.runs)};
}
export class ApplePushService {
  constructor(private db:AtomicSqlDatabase,private config:ApplePushConfig,private send=(message:ApplePushMessage)=>sendApplePush(config,message)){}
  async register(user:number,input:Record<string,unknown>,sessionExpiry:number){
    const value=registration(input),time=now();
    const prior=await this.db.prepare('SELECT * FROM apple_push_devices WHERE installation=?').bind(value.installation).first<Device>();
    const same=prior?.user_id===user && prior.expires_at>time;
    const generation=same?prior.generation:randomUUID();
    await this.db.batch([
      this.db.prepare('DELETE FROM apple_push_devices WHERE token=? AND environment=? AND installation<>?').bind(value.token,value.environment,value.installation),
      this.db.prepare(`INSERT INTO apple_push_devices(installation,user_id,token,environment,generation,reminders,runs,enabled_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(installation) DO UPDATE SET user_id=excluded.user_id,token=excluded.token,environment=excluded.environment,generation=excluded.generation,reminders=excluded.reminders,runs=excluded.runs,enabled_at=excluded.enabled_at,expires_at=excluded.expires_at`)
        .bind(value.installation,user,value.token,value.environment,generation,value.reminders,value.runs,same&&prior.runs?prior.enabled_at:time,Math.min(sessionExpiry,time+7*86400)),
    ]);
    return {ok:true,generation};
  }
  async unregister(user:number,installation:unknown){
    if(typeof installation!=='string')throw new ApplePushError('Invalid device.');
    await this.db.prepare('DELETE FROM apple_push_devices WHERE user_id=? AND installation=?').bind(user,installation.toLowerCase()).run();return {ok:true};
  }
  async reminders(user:number){return (await this.db.prepare('SELECT id,title,due_at FROM apple_push_reminders WHERE user_id=? AND cancelled=0 AND due_at>? ORDER BY due_at LIMIT 30').bind(user,now()-3600).all()).results;}
  async reminder(user:number,input:Record<string,unknown>){
    if(typeof input.id!=='string'|| !/^[a-zA-Z0-9-]{1,80}$/.test(input.id))throw new ApplePushError('Invalid reminder.');
    if(input.cancel===true){await this.db.prepare('UPDATE apple_push_reminders SET cancelled=1 WHERE user_id=? AND id=?').bind(user,input.id).run();return {ok:true};}
    const time=now();
    if(typeof input.title!=='string'||!input.title.trim()||input.title.length>160||!Number.isSafeInteger(input.dueAt)||Number(input.dueAt)<time+15||Number(input.dueAt)>time+7*86400)throw new ApplePushError('Choose a reminder within the next seven days.');
    if(!await this.db.prepare('SELECT 1 FROM apple_push_devices WHERE user_id=? AND reminders=1 AND expires_at>? LIMIT 1').bind(user,Number(input.dueAt)).first())throw new ApplePushError('Enable notifications on your device first, or choose a time before your sign-in expires.',409);
    await this.db.prepare(`INSERT INTO apple_push_reminders(id,user_id,title,due_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM apple_push_reminders WHERE user_id=? AND cancelled=0 AND due_at>?)<30 ON CONFLICT(user_id,id) DO NOTHING`).bind(input.id,user,input.title.trim(),Number(input.dueAt),user,time).run();
    const stored=await this.db.prepare('SELECT title,due_at,cancelled FROM apple_push_reminders WHERE user_id=? AND id=?').bind(user,input.id).first<{title:string;due_at:number;cancelled:number}>();
    if(!stored||stored.cancelled||stored.title!==input.title.trim()||stored.due_at!==Number(input.dueAt))throw new ApplePushError('This reminder changed or the reminder limit was reached.',409);
    return {ok:true};
  }
  async test(user:number,installation:unknown){
    const device=await this.db.prepare('SELECT * FROM apple_push_devices WHERE user_id=? AND installation=? AND expires_at>?').bind(user,String(installation),now()).first<Device>();
    if(!device)throw new ApplePushError('Enable notifications first.',409);
    // One test per device per minute. Durable dedupe, including concurrent requests.
    await this.enqueue(device,'test',String(Math.floor(now()/60)),now()+300);return {ok:true};
  }
  private async enqueue(d:Device,kind:Item['kind'],reference:string,expires:number){
    await this.db.prepare(`INSERT OR IGNORE INTO apple_push_outbox(id,installation,user_id,generation,kind,reference,next_attempt,expires_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(randomUUID(),d.installation,d.user_id,d.generation,kind,reference,now(),expires).run();
  }
  async tick(){
    const time=now();
    // Durable reconciliation covers webhook and manual sync without changing either.
    // Bound by recent dates and scalar columns; never fetch activity stream payloads.
    const devices=(await this.db.prepare('SELECT * FROM apple_push_devices WHERE expires_at>?').bind(time).all<Device>()).results;
    for(const d of devices){
      if(d.runs){
        const runs=(await this.db.prepare(`SELECT id FROM activities WHERE user_id=? AND type IN ('Run','VirtualRun','TrailRun') AND julianday(start_date)>=julianday('now','-1 day') AND julianday(created_at)>=julianday(?,'unixepoch') ORDER BY start_date DESC LIMIT 1`).bind(d.user_id,d.enabled_at).all<{id:number}>()).results;
        for(const run of runs)await this.enqueue(d,'run',String(run.id),time+3600);
      }
      if(d.reminders){
        const reminders=(await this.db.prepare('SELECT id,due_at FROM apple_push_reminders WHERE user_id=? AND cancelled=0 AND due_at<=? AND due_at>?').bind(d.user_id,time,time-3600).all<{id:string;due_at:number}>()).results;
        for(const r of reminders)await this.enqueue(d,'reminder',r.id,r.due_at+3600);
      }
    }
    await this.db.prepare("UPDATE apple_push_outbox SET state='unknown',error_code='OUTCOME_UNKNOWN' WHERE state='sending' AND claimed_at<?").bind(time-120).run();
    const items=(await this.db.prepare("SELECT * FROM apple_push_outbox WHERE state='pending' AND next_attempt<=? ORDER BY next_attempt LIMIT 30").bind(time).all<Item>()).results;
    for(const item of items){
      if(!(await this.db.prepare("UPDATE apple_push_outbox SET state='sending',claimed_at=?,attempts=attempts+1 WHERE id=? AND state='pending' RETURNING id").bind(time,item.id).first()))continue;
      const d=await this.db.prepare('SELECT * FROM apple_push_devices WHERE installation=? AND user_id=? AND generation=? AND expires_at>?').bind(item.installation,item.user_id,item.generation,now()).first<Device>();
      const cancelled=item.kind==='reminder'&&!await this.db.prepare('SELECT 1 FROM apple_push_reminders WHERE user_id=? AND id=? AND cancelled=0').bind(item.user_id,item.reference).first();
      if(!d||item.expires_at<=now()||cancelled||(item.kind==='run'&&!d.runs)||(item.kind==='reminder'&&!d.reminders)){
        await this.finish(item.id,'cancelled');continue;
      }
      let result:ApplePushResult;
      try{result=await this.send({id:item.id,token:d.token,environment:d.environment,expires:item.expires_at,kind:item.kind,generation:d.generation});}
      catch{await this.finish(item.id,'unknown','OUTCOME_UNKNOWN');continue;}
      if(result.status===200)await this.finish(item.id,'sent');
      else {
        if(result.status===410||['BadDeviceToken','DeviceTokenNotForTopic'].includes(result.reason))await this.db.prepare('DELETE FROM apple_push_devices WHERE installation=? AND generation=? AND token=?').bind(d.installation,d.generation,d.token).run();
        const retry=[429,500,503].includes(result.status)&&item.attempts<3;
        await this.db.prepare('UPDATE apple_push_outbox SET state=?,error_code=?,next_attempt=? WHERE id=?').bind(retry?'pending':'failed','APNS_'+result.status,now()+60*2**item.attempts,item.id).run();
      }
    }
    await this.db.prepare("DELETE FROM apple_push_outbox WHERE expires_at<? AND state<>'sending'").bind(time-7*86400).run();
    await this.db.prepare('DELETE FROM apple_push_reminders WHERE due_at<?').bind(time-7*86400).run();
    await this.db.prepare('DELETE FROM apple_push_devices WHERE expires_at<?').bind(time-86400).run();
  }
  private async finish(id:string,state:string,code:string|null=null){await this.db.prepare('UPDATE apple_push_outbox SET state=?,error_code=? WHERE id=?').bind(state,code,id).run();}
}

export function applePushConfigured(){return !!(process.env.APNS_KEY_ID&&process.env.APNS_TEAM_ID&&process.env.APNS_PRIVATE_KEY&&process.env.D1_TRANSPORT_SECRET);}
export async function applePushService(){
  if(!applePushConfigured())throw new ApplePushError('Apple notifications are not configured yet.',503);
  const {applicationSqlDatabase}=await import('../d1/runtimeDatabase');
  return new ApplePushService(applicationSqlDatabase,{keyId:process.env.APNS_KEY_ID!,teamId:process.env.APNS_TEAM_ID!,privateKey:process.env.APNS_PRIVATE_KEY!});
}
let active=false;
export function startApplePush(){
  if(!applePushConfigured()||active)return;active=true;
  let running=false;
  const tick=async()=>{if(running)return;running=true;try{await (await applePushService()).tick();}catch{console.error(JSON.stringify({event:'apple_push_tick_failed'}));}finally{running=false;}};
  void tick();setInterval(()=>void tick(),30000).unref();
}
