import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {GarminPush} from '../../shared/garmin';
import {GARMIN_HEALTH_TYPES,GARMIN_HEALTH_RETENTION_DAYS,recoveryOverview,type GarminHealthSummary,type GarminHealthStatus,type GarminHealthRecord} from '../../shared/garminHealth';
import {garminHash} from './crypto';
import {GarminDetailsStore} from './detailsStore';
const iso=(value:number)=>new Date(value).toISOString();
const permitted=`health_consented_at IS NOT NULL AND status IN ('connected','permission_required') AND EXISTS(SELECT 1 FROM json_each(permissions) WHERE value='HEALTH_EXPORT')`;
export class GarminHealthStore {
  constructor(readonly db:AtomicSqlDatabase,private clock=()=>Date.now()){}
  async status(userId:number):Promise<GarminHealthStatus>{
    const row=await this.db.prepare('SELECT status,permissions,health_consented_at,health_last_push_at FROM garmin_connections WHERE user_id=?').bind(userId)
      .first<{status:string;permissions:string;health_consented_at:string|null;health_last_push_at:string|null}>();
    const count=await this.db.prepare('SELECT count(*) AS n FROM garmin_health_summaries WHERE user_id=? AND calendar_date>=?').bind(userId,iso(this.clock()-90*86400000).slice(0,10)).first<{n:number}>();
    const connected=!!row&&['connected','permission_required'].includes(row.status),hasPermission=!!row&&JSON.parse(row.permissions).includes('HEALTH_EXPORT'),consented=!!row?.health_consented_at;
    return {connected,hasPermission,consented,enabled:connected&&hasPermission&&consented,consentedAt:row?.health_consented_at??null,lastSyncAt:row?.health_last_push_at??null,summaryCount:count?.n??0,retentionDays:GARMIN_HEALTH_RETENTION_DAYS};
  }
  async enable(userId:number){
    const result=await this.db.prepare(`UPDATE garmin_connections SET health_consented_at=COALESCE(health_consented_at,?) WHERE user_id=? AND status IN ('connected','permission_required') AND EXISTS(SELECT 1 FROM json_each(permissions) WHERE value='HEALTH_EXPORT')`)
      .bind(iso(this.clock()),userId).run();
    if(result.meta.changes!==1)throw new Error('GARMIN_HEALTH_PERMISSION_REQUIRED');
    return this.status(userId);
  }
  async disable(userId:number){
    const details=new GarminDetailsStore(this.db,'',this.clock);
    await details.disable(userId,'recovery');await details.disable(userId,'additional');
    await this.db.batch([
      this.db.prepare('UPDATE garmin_connections SET health_consented_at=NULL,health_last_push_at=NULL WHERE user_id=?').bind(userId),
      this.db.prepare('DELETE FROM garmin_health_summaries WHERE user_id=?').bind(userId),
      this.db.prepare('DELETE FROM garmin_health_inbox WHERE user_id=?').bind(userId),
    ]);
    return this.status(userId);
  }
  async clearIfUnauthorized(userId:number){
    const revoked=`user_id=? AND (status NOT IN ('connected','permission_required') OR NOT EXISTS(SELECT 1 FROM json_each(permissions) WHERE value='HEALTH_EXPORT'))`;
    await this.db.batch([
      this.db.prepare(`UPDATE garmin_connections SET health_consented_at=NULL,health_last_push_at=NULL WHERE ${revoked}`).bind(userId),
      this.db.prepare(`DELETE FROM garmin_health_summaries WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM garmin_connections WHERE user_id=? AND ${permitted})`).bind(userId,userId),
      this.db.prepare(`DELETE FROM garmin_health_inbox WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM garmin_connections WHERE user_id=? AND ${permitted})`).bind(userId,userId),
    ]);
  }
  async receive(push:GarminPush){
    const entries=Object.entries(push).filter(([kind])=>(GARMIN_HEALTH_TYPES as readonly string[]).includes(kind))
      .flatMap(([,values])=>values!.map(entry=>({garminUserId:entry.userId,summary:entry.health as GarminHealthSummary})));
    const now=this.clock(),statements=[];
    for(let i=0;i<entries.length;i+=20){
      const payload=JSON.stringify(entries.slice(i,i+20)),hash=garminHash(payload);
      // Consent is checked inside the same write that persists the receipt.
      // Unknown or unconsented users' health data never enters durable storage.
      statements.push(this.db.prepare(`INSERT INTO garmin_health_inbox(id,user_id,consented_at,payload,received_at,retry_at,expires_at)
        SELECT ?||':'||g.user_id||':'||g.health_consented_at,g.user_id,g.health_consented_at,json_group_array(json_extract(j.value,'$.summary')),?,?,?
        FROM json_each(?) j JOIN garmin_connections g ON g.garmin_user_id=json_extract(j.value,'$.garminUserId')
        WHERE ${permitted} GROUP BY g.user_id ON CONFLICT(id) DO NOTHING`).bind(hash,iso(now),iso(now),iso(now+7*86400000),payload));
    }
    if(statements.length)await this.db.batch(statements);
  }
  async process(limit=3){
    const now=iso(this.clock()),cutoff=iso(this.clock()-GARMIN_HEALTH_RETENTION_DAYS*86400000).slice(0,10);
    await this.db.batch([this.db.prepare('DELETE FROM garmin_health_inbox WHERE expires_at<=?').bind(now),this.db.prepare('DELETE FROM garmin_health_summaries WHERE calendar_date<?').bind(cutoff)]);
    for(let i=0;i<limit;i++){
      const item=await this.db.prepare(`UPDATE garmin_health_inbox SET lease_until=? WHERE id=(SELECT id FROM garmin_health_inbox WHERE completed_at IS NULL AND retry_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY received_at,id LIMIT 1) RETURNING *`)
        .bind(iso(this.clock()+120000),now,now).first<{id:string;user_id:number;consented_at:string;payload:string;received_at:string;lease_until:string}>();
      if(!item)return;
      try{
        const statements=[];
        for(const summary of JSON.parse(item.payload) as GarminHealthSummary[]){
          if(summary.date<cutoff||Date.parse(summary.startAt)>this.clock()+300000)continue;
          statements.push(this.db.prepare(`INSERT INTO garmin_health_summaries(user_id,kind,start_at,calendar_date,summary,received_at)
            SELECT user_id,?,?,?,?,? FROM garmin_connections WHERE user_id=? AND health_consented_at=? AND health_consented_at<=? AND ${permitted}
            ON CONFLICT(user_id,kind,start_at) DO UPDATE SET calendar_date=excluded.calendar_date,summary=excluded.summary,received_at=excluded.received_at
            WHERE garmin_health_summaries.received_at<=excluded.received_at AND (json_extract(garmin_health_summaries.summary,'$.source')='garmin_connect_history' OR json_extract(garmin_health_summaries.summary,'$.duration')<=json_extract(excluded.summary,'$.duration'))`)
            .bind(summary.kind,summary.startAt,summary.date,JSON.stringify(summary),item.received_at,item.user_id,item.consented_at,item.received_at));
        }
        statements.push(this.db.prepare(`UPDATE garmin_connections SET health_last_push_at=CASE WHEN health_last_push_at IS NULL OR health_last_push_at<? THEN ? ELSE health_last_push_at END WHERE user_id=? AND health_consented_at=? AND ${permitted}`).bind(item.received_at,item.received_at,item.user_id,item.consented_at));
        statements.push(this.db.prepare("UPDATE garmin_health_inbox SET payload='[]',completed_at=?,lease_until=NULL WHERE id=? AND lease_until=?").bind(now,item.id,item.lease_until));
        await this.db.batch(statements);
      }catch{
        await this.db.prepare('UPDATE garmin_health_inbox SET retry_at=?,lease_until=NULL WHERE id=? AND lease_until=?').bind(iso(this.clock()+60000),item.id,item.lease_until).run();
      }
    }
  }
  async records(userId:number,days=90):Promise<GarminHealthRecord[]>{
    const rows=await this.db.prepare('SELECT summary,received_at FROM garmin_health_summaries WHERE user_id=? AND calendar_date>=? ORDER BY calendar_date,start_at,received_at LIMIT 2000')
      .bind(userId,iso(this.clock()-days*86400000).slice(0,10)).all<{summary:string;received_at:string}>();
    return rows.results.map(row=>({...JSON.parse(row.summary),receivedAt:row.received_at}));
  }
  async recovery(userId:number,days=28,timezone='UTC'){
    const status=await this.status(userId);
    return recoveryOverview(status.enabled?await this.records(userId,45):[],status,days,timezone,this.clock());
  }
}
