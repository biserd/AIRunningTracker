import type {GarminStore,GarminConnection} from './store';
import {GarminClient} from './client';
import {garminHash,garminRandom} from './crypto';
import type {GarminSendReceipt,GarminSendState} from '../../shared/garminSend';
type Kind='workout'|'course';
interface Row {payload_hash:string;state:GarminSendState;remote_id:string|null;schedule_id:string|null;calendar_date:string|null;error_code:string|null;updated_at:string}
export class GarminSendError extends Error {constructor(message:string,readonly status=409){super(message);}}
export class GarminProviderError extends Error {constructor(readonly code:number,readonly ambiguous:boolean){super('Garmin request failed');}}
const providerOrigin='https://apis.garmin.com';
export class GarminOutboundClient {
 constructor(private request:typeof fetch=fetch){}
 async post(path:string,token:string,body:unknown):Promise<Record<string,unknown>>{
  let response:Response;try{response=await this.request(providerOrigin+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15_000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});}catch{throw new GarminProviderError(0,true);}
  if(!response.ok)throw new GarminProviderError(response.status,response.status>=500||response.status===408);
  try{const text=await response.text();if(text.length>1000000)throw new Error();return text?JSON.parse(text):{};}catch{throw new GarminProviderError(response.status,true);}
 }
}
const remoteId=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):typeof v==='string'&&/^[1-9]\d{0,15}$/.test(v)&&Number.isSafeInteger(Number(v))?v:null;
const messages:Record<string,string>={sent:'Sent to Garmin Connect. Sync your compatible watch to use it.',created:'Workout saved in Garmin Connect; scheduling still needs to finish.',creating:'Garmin may have received this item. Check Garmin Connect before making another copy.',scheduling:'Garmin may have scheduled this workout. Check Garmin Connect before making another copy.',uncertain:'Garmin did not confirm the result. Check Garmin Connect; automatic resend is blocked to avoid duplicates.',failed:'Garmin rejected this request. Review the details and try again.',ready:'Ready to send.'};
export class GarminSendService {
 constructor(private store:GarminStore,private oauth:GarminClient,private provider=new GarminOutboundClient(),private clock=()=>Date.now()){}
 private async identity(userId:number,kind:Kind){const row=await this.store.connection(userId);if(!row?.tokens||!['connected','permission_required'].includes(row.status))throw new GarminSendError('Connect Garmin in Settings before sending.',403);let permissions:string[]=[];try{permissions=JSON.parse(row.permissions);}catch{}if(!permissions.includes(kind==='workout'?'WORKOUT_IMPORT':'COURSE_IMPORT'))throw new GarminSendError('Reconnect Garmin and allow '+(kind==='workout'?'workouts':'courses')+' to be sent.',403);return row;}
 private account(row:GarminConnection){return garminHash(row.garmin_user_id);}
 private async row(userId:number,account:string,kind:Kind,source:string){return this.store.db.prepare('SELECT * FROM garmin_outbound WHERE user_id=? AND account_hash=? AND kind=? AND source_key=?').bind(userId,account,kind,source).first<Row>();}
 private receipt(kind:Kind,sourceKey:string,row:Row|null,hash?:string):GarminSendReceipt{return {kind,sourceKey,state:row?.state||'ready',remoteId:row?.remote_id||null,scheduleId:row?.schedule_id||null,message:row?messages[row.state]||messages.uncertain:messages.ready,updatedAt:row?.updated_at||'',changed:!!row&&!!hash&&row.payload_hash!==hash&&(row.state!=='failed'||!!row.remote_id)};}
 async status(userId:number,kind:Kind,source:string,hash?:string){const connection=await this.identity(userId,kind);return this.receipt(kind,source,await this.row(userId,this.account(connection),kind,source),hash);}
 async capabilities(userId:number){const row=await this.store.connection(userId);let permissions:string[]=[];try{permissions=JSON.parse(row?.permissions||'[]');}catch{}const connected=!!row?.tokens&&['connected','permission_required'].includes(row.status);return {connected,workouts:connected&&permissions.includes('WORKOUT_IMPORT'),courses:connected&&permissions.includes('COURSE_IMPORT')};}
 async history(userId:number){const row=await this.store.connection(userId);if(!row)return [];const rows=await this.store.db.prepare('SELECT * FROM garmin_outbound WHERE user_id=? AND account_hash=? ORDER BY updated_at DESC LIMIT 50').bind(userId,this.account(row)).all<Row&{kind:Kind;source_key:string}>();return rows.results.map(r=>({...this.receipt(r.kind,r.source_key,r),date:r.calendar_date}));}
 private async budget(userId:number){const now=new Date(this.clock()).toISOString(),minute=new Date(this.clock()-60000).toISOString(),day=new Date(this.clock()-86400000).toISOString();await this.store.db.prepare('DELETE FROM garmin_outbound_calls WHERE created_at<?').bind(day).run();const result=await this.store.db.prepare(`INSERT INTO garmin_outbound_calls(id,user_id,created_at) SELECT ?,?,? WHERE (SELECT count(*) FROM garmin_outbound_calls WHERE created_at>?)<80 AND (SELECT count(*) FROM garmin_outbound_calls WHERE user_id=? AND created_at>?)<180`).bind(garminRandom(),userId,now,minute,userId,day).run();if(result.meta.changes!==1)throw new GarminSendError('The Garmin send limit has been reached. Try again later.',429);}
 async send(userId:number,kind:Kind,source:string,payload:unknown,date:string|null,expectedHash:string):Promise<GarminSendReceipt>{
  const hash=garminHash(JSON.stringify({payload,date}));if(expectedHash!==hash)throw new GarminSendError('This item changed. Review the latest preview before sending.');
  const lease=await this.store.claimOperation(userId);if(!lease)throw new GarminSendError('Another Garmin operation is running. Try again in a moment.');
  try{
   let connection=await this.identity(userId,kind);const account=this.account(connection);let row=await this.row(userId,account,kind,source);
   if(row){if(row.payload_hash!==hash&&(row.remote_id||row.state!=='failed'))throw new GarminSendError('This item was already sent or has an unconfirmed result. Review it in Garmin Connect before changing it.');if(['sent','creating','scheduling','uncertain'].includes(row.state))return this.receipt(kind,source,row,hash);}
   let tokens=this.store.tokenValue(connection);if(Date.parse(connection.access_expires_at)<=this.clock()+30000){try{tokens=await this.oauth.refresh(tokens.refresh_token);await this.store.rotate(connection,tokens);}catch{throw new GarminSendError('Garmin authorization needs attention. Reconnect in Settings.',403);}connection=await this.identity(userId,kind);}
   const now=()=>new Date(this.clock()).toISOString();
   const save=async(state:GarminSendState,remote:string|null=row?.remote_id||null,schedule:string|null=null,error:string|null=null)=>{
    await this.store.db.prepare(`INSERT INTO garmin_outbound(user_id,account_hash,kind,source_key,payload_hash,state,remote_id,schedule_id,calendar_date,error_code,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,account_hash,kind,source_key) DO UPDATE SET payload_hash=excluded.payload_hash,state=excluded.state,remote_id=excluded.remote_id,schedule_id=excluded.schedule_id,calendar_date=excluded.calendar_date,error_code=excluded.error_code,updated_at=excluded.updated_at`).bind(userId,account,kind,source,hash,state,remote,schedule,date,error,now(),now()).run();row=await this.row(userId,account,kind,source);
   };
   if(!row?.remote_id){
    await this.budget(userId);await save('creating');
    let response:Record<string,unknown>;try{
     // Training API V2 2.0 PDF §3.3 explicitly uses workoutportal for creation.
     // Do not retry at alternate paths: an ambiguous response can represent a created workout.
     response=await this.provider.post(kind==='workout'?'/workoutportal/workout/v2':'/training-api/courses/v1/course',tokens.access_token,payload);
    }catch(error){const e=error instanceof GarminProviderError?error:new GarminProviderError(0,true);await save(e.ambiguous?'uncertain':'failed',null,null,String(e.code));if(e.code===401||e.code===403||e.code===412)throw new GarminSendError('Garmin denied this send. Check permissions or reconnect Garmin.',403);if(e.code===429)throw new GarminSendError('Garmin is rate limiting sends. Try again later.',429);return this.receipt(kind,source,row,hash);}
    const id=remoteId(response[kind==='workout'?'workoutId':'courseId']);if(!id){await save('uncertain',null,null,'MISSING_ID');return this.receipt(kind,source,row,hash);}
    await save(kind==='course'?'sent':'created',id);
   }
   if(kind==='workout'&&row?.remote_id&&date){
    await this.identity(userId,kind);await this.budget(userId);const id=row.remote_id;await save('scheduling',id);
    try{const response=await this.provider.post('/training-api/schedule/',tokens.access_token,{workoutId:Number(id),date});const schedule=remoteId(response.scheduleId);await save('sent',id,schedule);}
    catch(error){const e=error instanceof GarminProviderError?error:new GarminProviderError(0,true);await save(e.ambiguous?'uncertain':'created',id,null,String(e.code));}
   }
   return this.receipt(kind,source,row,hash);
  }finally{await this.store.releaseOperation(userId,lease);}
 }
}
