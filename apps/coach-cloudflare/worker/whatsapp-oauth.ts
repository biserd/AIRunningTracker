import {backend} from './account';
import {boundedJSON} from './openai';
import {hash, budget, ReminderError} from './reminders';
import type {State} from '../shared/coach';
import type {Facts} from '../shared/training';

const issuer='https://aitracker.run', resource=issuer+'/mcp';
const scopes='mcp:profile.read mcp:activities.read mcp:analytics.read mcp:goals.read mcp:plans.read';
const now=()=>Math.floor(Date.now()/1000);
const fail=()=>new ReminderError('Reconnect WhatsApp in Settings to authorize your running data.',409);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const obj=(v:unknown):Facts=>v && typeof v==='object' && !Array.isArray(v)?v as Facts:{};
const b64=(v:Uint8Array)=>{let s='';for(let i=0;i<v.length;i+=8192)s+=String.fromCharCode(...v.subarray(i,i+8192));return btoa(s);};
const bytes=(v:string)=>Uint8Array.from(atob(v),x=>x.charCodeAt(0));
type Grant={session_id:string;client_id:string;email_hash:string;credentials:string;access_expires:number;expires_at:number;generation:string;refresh_lock:number};
type Tokens={access_token:string;refresh_token:string;expires_in:number};
export const oauthConfigured=(env:Env)=>/^[a-f0-9]{64}$/.test(env.WHATSAPP_GRANT_KEY||'');
export async function crypt(env:Env,id:string,value:string,decrypt=false){
 if(!oauthConfigured(env))throw fail();
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(env.WHATSAPP_GRANT_KEY.match(/../g)!,x=>parseInt(x,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
 if(decrypt){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:new TextEncoder().encode(id)},key,bytes(data)));}
 const iv=crypto.getRandomValues(new Uint8Array(12));
 return b64(iv)+'.'+b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},key,new TextEncoder().encode(value))));
}
async function post(env:Env,path:string,body:URLSearchParams|Facts,token?:string){
 const response=await env.BACKEND.fetch(issuer+path,{method:'POST',redirect:'manual',headers:{'Content-Type':body instanceof URLSearchParams?'application/x-www-form-urlencoded':'application/json',Accept:'application/json, text/event-stream',...(token?{Authorization:'Bearer '+token,'MCP-Protocol-Version':'2025-11-25'}:{})},body:body instanceof URLSearchParams?body.toString():JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!response.ok){await response.body?.cancel();throw fail();}
 if(path.endsWith('/revoke')){await response.body?.cancel();return {};}
 return obj(await boundedJSON(response,300000));
}
function tokens(value:Facts):Tokens{
 if(typeof value.access_token!=='string'||typeof value.refresh_token!=='string'||value.token_type!=='Bearer'||value.resource!==resource||typeof value.scope!=='string'||scopes.split(' ').some(s=>!String(value.scope).split(' ').includes(s))||typeof value.expires_in!=='number'||value.expires_in<1||value.expires_in>3600)throw fail();
 return value as Tokens;
}
// Fixed tool allowlist. Neither a prompt nor an incoming message supplies routes.
async function read(env:Env,token:string,name:'get_runner_profile'|'get_runner_coach_snapshot'|'get_training_plan',args:Facts={}){
 const data=await post(env,'/mcp',{jsonrpc:'2.0',id:crypto.randomUUID(),method:'tools/call',params:{name,arguments:args}},token);
 const result=obj(data.result);if(data.error||result.isError)throw fail();
 if(result.structuredContent)return obj(result.structuredContent);
 const content=Array.isArray(result.content)?obj(result.content[0]):{};
 if(typeof content.text!=='string')throw fail();return obj(JSON.parse(content.text));
}
async function checkIdentity(env:Env,t:Tokens,emailHash:string){
 const result=await read(env,t.access_token,'get_runner_profile');
 const email=obj(result.profile).email;
 if(typeof email!=='string'||await hash(email.trim().toLowerCase())!==emailHash)throw fail();
}
export async function hasGrant(env:Env,id:string){return !!await env.DB.prepare('SELECT session_id FROM whatsapp_oauth_grants WHERE session_id=? AND expires_at>?').bind(id,now()).first();}
export async function startAuthorization(env:Env,id:string,webToken:string){
 if(!oauthConfigured(env))throw new ReminderError('WhatsApp authorization setup is not ready.',503);
 if(!await budget(env,'wa-oauth:'+id,3,3600))throw new ReminderError('Please wait before reconnecting.',429);
 const user=obj(await backend(env,'/api/user',undefined,webToken));if(typeof user.email!=='string')throw fail();
 const redirect=env.PUBLIC_ORIGIN+'/whatsapp/callback';
 const client=await post(env,'/mcp/oauth/register',{client_name:'AITracker WhatsApp coach',redirect_uris:[redirect],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']});
 if(typeof client.client_id!=='string')throw fail();
 const state=random(),verifier=random();
 const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 await env.DB.prepare('INSERT INTO whatsapp_oauth_pending(session_id,state_hash,verifier,client_id,email_hash,expires_at) VALUES (?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET state_hash=excluded.state_hash,verifier=excluded.verifier,client_id=excluded.client_id,email_hash=excluded.email_hash,expires_at=excluded.expires_at').bind(id,await hash(state),await crypt(env,id,verifier),client.client_id,await hash(user.email.trim().toLowerCase()),now()+600).run();
 return {authorizationUrl:issuer+'/mcp/oauth/authorize?'+new URLSearchParams({response_type:'code',client_id:client.client_id,redirect_uri:redirect,scope:scopes,resource,state,code_challenge:challenge,code_challenge_method:'S256'})};
}
export async function finishAuthorization(env:Env,id:string,input:Facts){
 if(typeof input.state!=='string'||!/^[a-f0-9]{64}$/.test(input.state)||typeof input.code!=='string'||input.code.length>512)throw fail();
 // Single-use state bound to the currently signed-in runner. Consume before exchange.
 const pending=await env.DB.prepare('DELETE FROM whatsapp_oauth_pending WHERE session_id=? AND state_hash=? AND expires_at>? RETURNING *').bind(id,await hash(input.state),now()).first<{verifier:string;client_id:string;email_hash:string}>();
 if(!pending)throw fail();
 const t=tokens(await post(env,'/mcp/oauth/token',new URLSearchParams({grant_type:'authorization_code',client_id:pending.client_id,redirect_uri:env.PUBLIC_ORIGIN+'/whatsapp/callback',code:input.code,code_verifier:await crypt(env,id,pending.verifier,true),resource})));
 try{await checkIdentity(env,t,pending.email_hash);}catch(e){await post(env,'/mcp/oauth/revoke',new URLSearchParams({client_id:pending.client_id,token:t.refresh_token})).catch(()=>{});throw e;}
 await revokeGrant(env,id);
 await env.DB.prepare('INSERT INTO whatsapp_oauth_grants(session_id,client_id,email_hash,credentials,access_expires,expires_at,generation) VALUES (?,?,?,?,?,?,?)').bind(id,pending.client_id,pending.email_hash,await crypt(env,id,JSON.stringify(t)),now()+t.expires_in,now()+30*86400,crypto.randomUUID()).run();
 // Session contains history, not authorization. Keep it for the consent lifetime.
 await env.DB.prepare('UPDATE sessions SET expires_at=MAX(expires_at,?) WHERE id=?').bind(now()+30*86400,id).run();
 return {ok:true};
}
export async function revokeGrant(env:Env,id:string){
 await env.DB.prepare('DELETE FROM whatsapp_context_cache WHERE session_id=?').bind(id).run();
 await env.DB.prepare('DELETE FROM whatsapp_oauth_pending WHERE session_id=?').bind(id).run();
 const grant=await env.DB.prepare('DELETE FROM whatsapp_oauth_grants WHERE session_id=? RETURNING *').bind(id).first<Grant>();
 if(grant){try{const t=JSON.parse(await crypt(env,id,grant.credentials,true)) as Tokens;await post(env,'/mcp/oauth/revoke',new URLSearchParams({client_id:grant.client_id,token:t.refresh_token}));}catch{/* Local deletion is fail-closed even if the issuer is unavailable. */}}
}
async function authorized(env:Env,id:string){
 let g=await env.DB.prepare('SELECT * FROM whatsapp_oauth_grants WHERE session_id=? AND expires_at>?').bind(id,now()).first<Grant>();if(!g)throw fail();
 let t=JSON.parse(await crypt(env,id,g.credentials,true)) as Tokens;
 if(g.access_expires<now()+60){
  const claim=await env.DB.prepare('UPDATE whatsapp_oauth_grants SET refresh_lock=? WHERE session_id=? AND generation=? AND refresh_lock=0 RETURNING session_id').bind(now(),id,g.generation).first();
  if(!claim)throw fail(); // An uncertain rotation must not reuse an old refresh token.
  try{
   t=tokens(await post(env,'/mcp/oauth/token',new URLSearchParams({grant_type:'refresh_token',client_id:g.client_id,refresh_token:t.refresh_token,resource})));
   const saved=await env.DB.prepare('UPDATE whatsapp_oauth_grants SET credentials=?,access_expires=?,refresh_lock=0 WHERE session_id=? AND generation=? RETURNING session_id').bind(await crypt(env,id,JSON.stringify(t)),now()+t.expires_in,id,g.generation).first();
   if(!saved){await post(env,'/mcp/oauth/revoke',new URLSearchParams({client_id:g.client_id,token:t.refresh_token})).catch(()=>{});throw fail();}
   // Continue a live, refreshable consent without tying reminders to a browser
   // session. Revocation and identity are still checked on every operation.
   await env.DB.batch([
    env.DB.prepare('UPDATE whatsapp_oauth_grants SET expires_at=? WHERE session_id=? AND generation=?').bind(now()+30*86400,id,g.generation),
    env.DB.prepare('UPDATE sessions SET expires_at=MAX(expires_at,?) WHERE id=?').bind(now()+30*86400,id),
   ]);
  }catch(e){await env.DB.prepare('DELETE FROM whatsapp_oauth_grants WHERE session_id=? AND generation=?').bind(id,g.generation).run();throw e;}
 }
 await checkIdentity(env,t,g.email_hash);
 return {t,g};
}
export async function validateGrant(env:Env,id:string){await authorized(env,id);}
// Only read-only, bounded MCP contracts enter the model. Never emails or tokens.
export function clean(value:unknown):unknown{
 if(Array.isArray(value))return value.slice(0,224).map(clean);
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!/(email|token|secret|credential)/i.test(k)).map(([k,v])=>[k,clean(v)]));
 return typeof value==='string'?value.slice(0,2000):value;
}
export async function whatsappContext(env:Env,id:string,refresh=false):Promise<State>{
 // Always validate the live OAuth subject, even on a cache hit.
 const {t,g}=await authorized(env,id);
 const aad='context:'+id+':'+g.generation;
 if(!refresh){
  const cached=await env.DB.prepare('SELECT payload FROM whatsapp_context_cache WHERE session_id=? AND generation=? AND expires_at>?').bind(id,g.generation,now()).first<{payload:string}>();
  if(cached){try{return JSON.parse(await crypt(env,aad,cached.payload,true)) as State;}catch{/* Corrupt or incompatible cache: reload, never use another grant. */}}
 }
 const loadedAt=new Date().toISOString();
 const snapshot=obj(clean(await read(env,t.access_token,'get_runner_coach_snapshot',{days:90})));
 const active=obj(snapshot.activePlan);let plan=active;
 if(Number.isSafeInteger(active.planId))plan=obj(clean(await read(env,t.access_token,'get_training_plan',{planId:active.planId})));
 const profile=obj(snapshot.profile), prefs=obj(profile.preferences);
 const timezone=typeof prefs.coachTimezone==='string'?prefs.coachTimezone:'UTC';
 let today=new Date().toISOString().slice(0,10);try{today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch{}
 const activities=(Array.isArray(snapshot.recentActivities)?snapshot.recentActivities:[]).map(obj).filter(a=>typeof a.startDate==='string'&&Number.isFinite(Date.parse(a.startDate))&&typeof a.distanceMeters==='number'&&typeof a.movingTimeSeconds==='number').map(a=>({date:String(a.startDate).slice(0,10),km:Number(a.distanceMeters)/1000,minutes:Number(a.movingTimeSeconds)/60})).sort((a,b)=>a.date.localeCompare(b.date));
 const state:State={source:'production_account',updatedAt:loadedAt,timezone,today,historyLimit:20,historyDays:90,goal:String(plan.goalType||prefs.coachGoal||'Discuss your running goals'),days:[],activities,
  companion:obj(snapshot.companion),
  trainingContext:{loadedAt,canWritePlans:false,profile,plans:Object.keys(plan).length?[plan]:[],goals:Array.isArray(snapshot.activeGoals)?snapshot.activeGoals as Facts[]:[],metrics:{snapshot},unavailable:[],coverage:'Read-only MCP snapshot, loaded at loadedAt and reused for at most two minutes. Up to 20 runs in 90 days and up to 32 weeks of the active plan. Full details are in metrics.snapshot and plans. Missing fields are unknown, not zero. Send /refresh to reload immediately after a sync or plan change. WhatsApp cannot change plans. Separate WhatsApp reminder tools save or cancel on explicit clear requests without codes.'}};
 const serialized=JSON.stringify(state);
 // Bounded below D1 row limits, including encryption overhead. A revoked or
 // replaced grant cannot repopulate the cache while an old fetch finishes.
 if(new TextEncoder().encode(serialized).length<=400000){
  const payload=await crypt(env,aad,serialized);
  await env.DB.prepare('INSERT INTO whatsapp_context_cache(session_id,generation,payload,expires_at) SELECT session_id,generation,?,? FROM whatsapp_oauth_grants WHERE session_id=? AND generation=? AND expires_at>? ON CONFLICT(session_id) DO UPDATE SET generation=excluded.generation,payload=excluded.payload,expires_at=excluded.expires_at').bind(payload,Math.floor(Date.parse(loadedAt)/1000)+120,id,g.generation,now()).run();
 }
 return state;
}
