import type {AtomicSqlDatabase} from '../d1/jobStore';
import {garminHash,sealGarmin,openGarmin,garminRandom} from './crypto';
import {normalizeRunDetails,type GarminRunDetails} from '../../shared/garminDetails';
import {normalizeWellnessDetail,GARMIN_WELLNESS_DETAIL_TYPES,coreWellness,type WellnessDetail} from '../../shared/garminWellnessDetails';
import {normalizeGarminRun} from '../../shared/garmin';
type Category='activity'|'recovery'|'additional';
const category=(kind:string):Category=>kind==='activityDetails'||kind==='activityFiles'?'activity':coreWellness.includes(kind)?'recovery':'additional';
const iso=(time:number)=>new Date(time).toISOString();
export function validateFileCallback(value:unknown):string{
 if(typeof value!=='string'||value.length>4096)throw new Error('INVALID_GARMIN_FILE_URL');
 const url=new URL(value);
 if(url.origin!=='https://apis.garmin.com'||url.pathname!=='/wellness-api/rest/activityFile'||url.username||url.password||url.hash||!url.searchParams.get('id')||!url.searchParams.get('token')||Array.from(url.searchParams.keys()).some(k=>!['id','token'].includes(k)))throw new Error('INVALID_GARMIN_FILE_URL');
 return url.toString();
}
const eligibility=(c:Category)=>`g.status IN (${c==='activity'?"'connected'":"'connected','permission_required'"}) AND EXISTS(SELECT 1 FROM json_each(g.permissions) WHERE value='${c==='activity'?'ACTIVITY_EXPORT':'HEALTH_EXPORT'}')${c==='activity'?'':' AND g.health_consented_at IS NOT NULL'}`;
export class GarminDetailsStore{
 constructor(readonly db:AtomicSqlDatabase,private key:string,private clock=()=>Date.now()){}
 async status(userId:number){
  const grants=await this.db.prepare('SELECT category,consented_at FROM garmin_detail_consents WHERE user_id=?').bind(userId).all<{category:Category;consented_at:string}>();
  const connection=await this.db.prepare('SELECT status,permissions,health_consented_at FROM garmin_connections WHERE user_id=?').bind(userId).first<{status:string;permissions:string;health_consented_at:string|null}>();
  const counts=await this.db.prepare('SELECT kind,count(*) AS count,max(received_at) AS lastReceivedAt FROM garmin_detail_records WHERE user_id=? GROUP BY kind').bind(userId).all<{kind:string;count:number;lastReceivedAt:string}>();
  const jobs=await this.db.prepare('SELECT state,count(*) AS count,max(failure) AS failure FROM garmin_file_jobs WHERE user_id=? GROUP BY state').bind(userId).all<{state:string;count:number;failure:string|null}>();
  return {version:'garmin-details-v1',grants:grants.results,feeds:counts.results,files:jobs.results,activityAllowed:connection?.status==='connected'&&JSON.parse(connection.permissions).includes('ACTIVITY_EXPORT'),healthAllowed:!!connection&&['connected','permission_required'].includes(connection.status)&&!!connection.health_consented_at&&JSON.parse(connection.permissions).includes('HEALTH_EXPORT')};
 }
 async enable(userId:number,c:Category){
  const r=await this.db.prepare(`INSERT INTO garmin_detail_consents(user_id,category,consented_at) SELECT g.user_id,?,? FROM garmin_connections g WHERE g.user_id=? AND ${eligibility(c)} ON CONFLICT(user_id,category) DO NOTHING`).bind(c,iso(this.clock()),userId).run();
  if(!r.meta.changes&&!await this.db.prepare('SELECT 1 FROM garmin_detail_consents WHERE user_id=? AND category=?').bind(userId,c).first())throw new Error('GARMIN_DETAIL_PERMISSION_REQUIRED');
  return this.status(userId);
 }
 async disable(userId:number,c:Category){
  const kinds=c==='activity'?['activityDetails']:c==='recovery'?coreWellness:GARMIN_WELLNESS_DETAIL_TYPES.filter(k=>!coreWellness.includes(k));
  await this.db.batch([this.db.prepare('DELETE FROM garmin_detail_consents WHERE user_id=? AND category=?').bind(userId,c),...kinds.map(k=>this.db.prepare('DELETE FROM garmin_detail_records WHERE user_id=? AND kind=?').bind(userId,k)),...(c==='activity'?[this.db.prepare('DELETE FROM garmin_file_jobs WHERE user_id=?').bind(userId)]:[])]);
 }
 async authorized(userId:number,c:Category,consent?:string){return this.db.prepare(`SELECT d.consented_at FROM garmin_detail_consents d JOIN garmin_connections g ON g.user_id=d.user_id WHERE d.user_id=? AND d.category=? AND ${eligibility(c)} AND (? IS NULL OR d.consented_at=?)`).bind(userId,c,consent??null,consent??null).first<{consented_at:string}>();}
 async receive(input:unknown){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('INVALID_GARMIN_PUSH');
  const entries=Object.entries(input);let count=0;
  for(const [kind,values] of entries){
   if(!['activityDetails','activityFiles',...GARMIN_WELLNESS_DETAIL_TYPES].includes(kind)||!Array.isArray(values))throw new Error('UNSUPPORTED_GARMIN_DETAILS');
   for(const raw of values){if(++count>500||!raw||typeof raw!=='object')throw new Error('INVALID_GARMIN_PUSH');const value=raw as Record<string,any>;
    if(typeof value.userId!=='string'||!/^[-\w]{1,128}$/.test(value.userId))throw new Error('INVALID_GARMIN_USER');
    const owner=await this.db.prepare('SELECT user_id FROM garmin_connections WHERE garmin_user_id=?').bind(value.userId).first<{user_id:number}>();if(!owner)continue;
    const grant=await this.authorized(owner.user_id,category(kind));if(!grant)continue;
    const receivedAt=iso(this.clock());
    if(kind==='activityFiles'){
     if(value.fileType!=='FIT')continue;
     // Validate identity/type before retaining even the encrypted one-use URL.
     const run=normalizeGarminRun({...value,durationInSeconds:0,distanceInMeters:0});if(!run)continue;
     const callback=validateFileCallback(value.callbackURL),id=garminHash(owner.user_id+':'+grant.consented_at+':'+callback);
     await this.db.prepare(`INSERT INTO garmin_file_jobs(id,user_id,activity_id,consented_at,metadata,callback,received_at,expires_at,retry_at)
       SELECT ?,g.user_id,?,?,?,?,?,?,? FROM garmin_connections g JOIN garmin_detail_consents d ON d.user_id=g.user_id AND d.category='activity' WHERE g.user_id=? AND d.consented_at=? AND ${eligibility('activity')} AND NOT EXISTS(SELECT 1 FROM garmin_deleted_activities x WHERE x.user_id=g.user_id AND x.activity_id=?) ON CONFLICT(id) DO NOTHING`)
       .bind(id,run.id,grant.consented_at,JSON.stringify({activityId:run.id,activityName:run.name,summaryId:run.id,activityType:run.type,startTimeInSeconds:Date.parse(run.startDate)/1000,deviceName:run.device,manual:run.manual}),sealGarmin(callback,this.key,'garmin:file:'+id),receivedAt,iso(this.clock()+86400000),receivedAt,owner.user_id,grant.consented_at,run.id).run();
    }else if(kind==='activityDetails'){const detail=normalizeRunDetails(value);if(detail)await this.saveRun(owner.user_id,grant.consented_at,detail,receivedAt);}
    else await this.saveWellness(owner.user_id,grant.consented_at,normalizeWellnessDetail(kind,value),receivedAt);
   }
  }
 }
 private async publish(userId:number,kind:string,id:string,date:string,consent:string,summary:object,chunks:unknown[][],receivedAt:string){
  const c=category(kind),generation=garminHash(consent+JSON.stringify(summary)+JSON.stringify(chunks)),encoded=JSON.stringify(summary);
  if(Buffer.byteLength(encoded)>1500000)throw new Error('GARMIN_DETAIL_RECORD_LIMIT');
  const guard=`SELECT g.user_id FROM garmin_connections g JOIN garmin_detail_consents d ON d.user_id=g.user_id WHERE g.user_id=? AND d.category=? AND d.consented_at=? AND ${eligibility(c)}${c==='activity'?" AND NOT EXISTS(SELECT 1 FROM garmin_deleted_activities x WHERE x.user_id=g.user_id AND x.activity_id=?)":''}`;
  const args=[userId,c,consent,...(c==='activity'?[id]:[])];
  await this.db.prepare(`INSERT INTO garmin_detail_records(user_id,kind,record_id,calendar_date,consented_at,received_at,generation,summary) SELECT user_id,?,?,?,?,?,?,? FROM (${guard}) WHERE true ON CONFLICT(user_id,kind,record_id) DO NOTHING`).bind(kind,id,date,consent,receivedAt,'pending','{}',...args).run();
  // Versioned chunks keep an interrupted replacement from corrupting the visible version.
  for(let i=0;i<chunks.length;i++)await this.db.prepare(`INSERT INTO garmin_detail_chunks(user_id,kind,record_id,generation,chunk,payload) SELECT user_id,?,?,?,?,? FROM (${guard}) WHERE EXISTS(SELECT 1 FROM garmin_detail_records WHERE user_id=? AND kind=? AND record_id=?) ON CONFLICT DO NOTHING`).bind(kind,id,generation,i,JSON.stringify(chunks[i]),...args,userId,kind,id).run();
  await this.db.prepare(`UPDATE garmin_detail_records SET calendar_date=?,consented_at=?,received_at=?,generation=?,summary=? WHERE user_id=? AND kind=? AND record_id=? AND received_at<=? AND EXISTS(${guard})${kind==='activityDetails'?" AND NOT (coalesce(json_extract(summary,'$.format'),'')='FIT' AND json_extract(?,'$.format')='JSON')":''}`).bind(date,consent,receivedAt,generation,encoded,userId,kind,id,receivedAt,...args,...(kind==='activityDetails'?[encoded]:[])).run();
  // Do not delete other generations here: another receiver may still be publishing.
 }
 async saveRun(userId:number,consent:string,detail:GarminRunDetails,receivedAt=iso(this.clock())){
  const chunks=[];for(let i=0;i<detail.samples.length;i+=1500)chunks.push(detail.samples.slice(i,i+1500));
  const {samples,...summary}=detail;await this.publish(userId,'activityDetails',detail.run.id,detail.run.startDate.slice(0,10),consent,summary,chunks,receivedAt);
  // Detailed deliveries can arrive before the summary feed. Reuse the existing
  // source table; never insert a Strava record or use Garmin in AI pipelines.
  await this.db.prepare(`INSERT INTO garmin_activity_summaries(user_id,activity_id,start_date,summary,received_at) SELECT g.user_id,?,?,?,? FROM garmin_connections g JOIN garmin_detail_consents d ON d.user_id=g.user_id AND d.category='activity' WHERE g.user_id=? AND d.consented_at=? AND ${eligibility('activity')} AND NOT EXISTS(SELECT 1 FROM garmin_deleted_activities x WHERE x.user_id=g.user_id AND x.activity_id=?) ON CONFLICT(user_id,activity_id) DO NOTHING`).bind(detail.run.id,detail.run.startDate,JSON.stringify(detail.run),receivedAt,userId,consent,detail.run.id).run();
 }
 async saveWellness(userId:number,consent:string,record:WellnessDetail,receivedAt=iso(this.clock())){
  if(record.date<iso(this.clock()-90*86400000).slice(0,10)||Date.parse(record.startAt)>this.clock()+300000)return;
  const id=record.kind+':'+record.startAt;
  const previous=await this.db.prepare('SELECT summary FROM garmin_detail_records WHERE user_id=? AND kind=? AND record_id=?').bind(userId,record.kind,id).first<{summary:string}>();
  if(previous&&(JSON.parse(previous.summary).data?.durationInSeconds??0)>(record.data.durationInSeconds??0))return;
  await this.publish(userId,record.kind,id,record.date,consent,{...record,id},[],receivedAt);
 }
 async run(userId:number,id:string):Promise<GarminRunDetails|null>{
  if(!await this.authorized(userId,'activity'))return null;
  const row=await this.db.prepare("SELECT summary,generation,received_at FROM garmin_detail_records WHERE user_id=? AND kind='activityDetails' AND record_id=? AND generation<>'pending'").bind(userId,id).first<{summary:string;generation:string;received_at:string}>();if(!row)return null;
  const samples=[];for(let offset=0;;offset+=4){const rows=await this.db.prepare("SELECT payload FROM garmin_detail_chunks WHERE user_id=? AND kind='activityDetails' AND record_id=? AND generation=? ORDER BY chunk LIMIT 4 OFFSET ?").bind(userId,id,row.generation,offset).all<{payload:string}>();for(const r of rows.results)samples.push(...JSON.parse(r.payload));if(rows.results.length<4)break;}
  return {...JSON.parse(row.summary),samples,receivedAt:row.received_at};
 }
 async wellness(userId:number,days=28){
  const grants=await Promise.all((['recovery','additional'] as const).map(c=>this.authorized(userId,c)));if(!grants.some(Boolean))return [];
  const output:WellnessDetail[]=[];
  for(let offset=0;;offset+=100){const rows=await this.db.prepare("SELECT kind,summary,received_at,consented_at FROM garmin_detail_records WHERE user_id=? AND kind<>'activityDetails' AND calendar_date>=? AND generation<>'pending' ORDER BY calendar_date DESC,received_at DESC LIMIT 100 OFFSET ?").bind(userId,iso(this.clock()-days*86400000).slice(0,10),offset).all<{kind:string;summary:string;received_at:string;consented_at:string}>();for(const row of rows.results){const grant=grants[coreWellness.includes(row.kind)?0:1];if(grant?.consented_at===row.consented_at)output.push({...JSON.parse(row.summary),receivedAt:row.received_at});}if(rows.results.length<100)break;}
  return output;
 }
 async cleanup(userId?:number){
  for(const c of ['activity','recovery','additional'] as const){const owners=await this.db.prepare(`SELECT d.user_id FROM garmin_detail_consents d LEFT JOIN garmin_connections g ON g.user_id=d.user_id WHERE d.category=? AND (? IS NULL OR d.user_id=?) AND (g.user_id IS NULL OR NOT (${eligibility(c)}))`).bind(c,userId??null,userId??null).all<{user_id:number}>();for(const owner of owners.results)await this.disable(owner.user_id,c);}
  await this.db.batch([this.db.prepare("DELETE FROM garmin_detail_records WHERE kind<>'activityDetails' AND calendar_date<?").bind(iso(this.clock()-90*86400000).slice(0,10)),this.db.prepare('DELETE FROM garmin_file_jobs WHERE expires_at<=?').bind(iso(this.clock())),this.db.prepare("DELETE FROM garmin_detail_chunks WHERE EXISTS(SELECT 1 FROM garmin_detail_records r WHERE r.user_id=garmin_detail_chunks.user_id AND r.kind=garmin_detail_chunks.kind AND r.record_id=garmin_detail_chunks.record_id AND r.generation<>garmin_detail_chunks.generation AND r.received_at<?)").bind(iso(this.clock()-86400000))]);
 }
 async processFiles(limit=2,request:typeof fetch=fetch){
  const {decodeGarminFit}=await import('./fit');await this.cleanup();
  for(let i=0;i<limit;i++){
   const now=iso(this.clock());
   const job=await this.db.prepare(`UPDATE garmin_file_jobs SET lease_until=?,attempts=attempts+1 WHERE id=(SELECT id FROM garmin_file_jobs WHERE state IN ('pending','downloaded') AND retry_at<=? AND expires_at>? AND (lease_until IS NULL OR lease_until<=?) ORDER BY received_at LIMIT 1) RETURNING *`).bind(iso(this.clock()+120000),now,now,now).first<any>();if(!job)return;
   try{
    if(!await this.authorized(job.user_id,'activity',job.consented_at)){await this.db.prepare('DELETE FROM garmin_file_jobs WHERE id=?').bind(job.id).run();continue;}
    let bytes:Uint8Array;
    if(job.state==='downloaded'){const pieces:Uint8Array[]=[];for(let offset=0;;offset+=8){const rows=await this.db.prepare('SELECT payload FROM garmin_file_blobs WHERE job_id=? ORDER BY chunk LIMIT 8 OFFSET ?').bind(job.id,offset).all<{payload:string}>();pieces.push(...rows.results.map(r=>Buffer.from(openGarmin(r.payload,this.key,'garmin:blob:'+job.id),'base64')));if(rows.results.length<8)break;}bytes=Buffer.concat(pieces);}
    else{
     const url=validateFileCallback(openGarmin(job.callback,this.key,'garmin:file:'+job.id));
     const response=await request(url,{redirect:'error',signal:AbortSignal.timeout(45000)});
     if(!response.ok){await response.body?.cancel();throw new Error(response.status===410?'GARMIN_FILE_EXPIRED':response.status===429?'GARMIN_FILE_RATE_LIMIT':'GARMIN_FILE_UNAVAILABLE');}
     const reader=response.body?.getReader();if(!reader)throw new Error('GARMIN_FILE_UNAVAILABLE');const pieces:Uint8Array[]=[];let size=0;
     while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>100*1024*1024){await reader.cancel();throw new Error('GARMIN_FILE_TOO_LARGE');}pieces.push(part.value);}
     bytes=Buffer.concat(pieces);
     // Preserve the one-use download encrypted until decoding commits successfully.
     for(let at=0;at<bytes.length;at+=200000)await this.db.prepare('INSERT INTO garmin_file_blobs(job_id,chunk,payload) VALUES(?,?,?) ON CONFLICT(job_id,chunk) DO UPDATE SET payload=excluded.payload').bind(job.id,at/200000,sealGarmin(Buffer.from(bytes.subarray(at,at+200000)).toString('base64'),this.key,'garmin:blob:'+job.id)).run();
     await this.db.prepare("UPDATE garmin_file_jobs SET state='downloaded',callback=NULL WHERE id=? AND lease_until=?").bind(job.id,job.lease_until).run();
    }
    const detail=decodeGarminFit(bytes,JSON.parse(job.metadata));if(detail)await this.saveRun(job.user_id,job.consented_at,detail,job.received_at);
    await this.db.batch([this.db.prepare("UPDATE garmin_file_jobs SET state=?,callback=NULL,metadata='{}',lease_until=NULL,failure=NULL WHERE id=? AND lease_until=?").bind(detail?'complete':'unsupported',job.id,job.lease_until),this.db.prepare('DELETE FROM garmin_file_blobs WHERE job_id=?').bind(job.id)]);
   }catch(error){const failure=error instanceof Error&&['INVALID_GARMIN_FIT','GARMIN_FILE_EXPIRED','GARMIN_FILE_RATE_LIMIT','GARMIN_FILE_TOO_LARGE'].includes(error.message)?error.message:'GARMIN_FILE_RETRY';const terminal=['INVALID_GARMIN_FIT','GARMIN_FILE_EXPIRED','GARMIN_FILE_TOO_LARGE'].includes(failure)||job.attempts>=5;
    await this.db.prepare("UPDATE garmin_file_jobs SET state=CASE WHEN ? THEN 'failed' WHEN state='downloaded' THEN 'downloaded' ELSE 'pending' END,failure=?,callback=CASE WHEN ? THEN NULL ELSE callback END,lease_until=NULL,retry_at=? WHERE id=? AND lease_until=?").bind(terminal?1:0,failure,terminal?1:0,iso(this.clock()+120000),job.id,job.lease_until).run();
   }
  }
 }
}
