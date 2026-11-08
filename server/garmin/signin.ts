import {garminHash,garminRandom,openGarmin,sealGarmin} from './crypto';
import {GarminStore} from './store';
import type {GarminTokens} from './client';
import {sanitizeReturnTo} from '../../shared/upgradeIntent';

export function garminReturnTo(value:unknown) {
  if(value==='/recovery')return value;
  return typeof value==='string'?sanitizeReturnTo(value)||null:null;
}

export class GarminSignin {
  constructor(private store:GarminStore,private key:string,private clock=()=>Date.now()){}
  async start(returnTo:unknown) {
    const state=garminRandom(),verifier=garminRandom(),now=this.clock();
    await this.store.db.prepare('DELETE FROM garmin_signin_sessions WHERE expires_at<=?').bind(new Date(now).toISOString()).run();
    const result=await this.store.db.prepare(`INSERT INTO garmin_signin_sessions(state_hash,verifier,return_to,created_at,expires_at)
      SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM garmin_signin_sessions WHERE created_at>?)<60`)
      .bind(garminHash(state),sealGarmin(verifier,this.key,`garmin:signin:${garminHash(state)}`),garminReturnTo(returnTo),new Date(now).toISOString(),new Date(now+600_000).toISOString(),new Date(now-60_000).toISOString()).run();
    if(result.meta.changes!==1)throw new Error('GARMIN_SIGNIN_RATE_LIMIT');
    return {state,verifier};
  }
  async consume(state:string) {
    const row=await this.store.db.prepare('DELETE FROM garmin_signin_sessions WHERE state_hash=? AND expires_at>? RETURNING verifier,return_to,created_at')
      .bind(garminHash(state),new Date(this.clock()).toISOString()).first<{verifier:string;return_to:string|null;created_at:string}>();
    if(!row)throw new Error('GARMIN_INVALID_STATE');
    return {verifier:openGarmin(row.verifier,this.key,`garmin:signin:${garminHash(state)}`),returnTo:garminReturnTo(row.return_to),consentStartedAt:Date.parse(row.created_at)};
  }
  async resolve(identity:{userId:string;permissions:string[]},tokens:GarminTokens,consentStartedAt:number) {
    if(!/^[\w-]{1,128}$/.test(identity.userId))throw new Error('GARMIN_IDENTITY_FAILED');
    const username='garmin_'+garminRandom(),now=new Date(this.clock()).toISOString();
    // D1 batches are atomic. Concurrent callbacks for one Garmin identity create
    // one account and one binding. Never match by an unverified email or name.
    const [created]=await this.store.db.batch([
      this.store.db.prepare(`INSERT INTO users(username,subscription_plan,marketing_opt_out,marketing_consent_status)
        SELECT ?,'free',1,'unknown' WHERE NOT EXISTS(SELECT 1 FROM garmin_connections WHERE garmin_user_id=?)`).bind(username,identity.userId),
      this.store.db.prepare(`INSERT INTO garmin_connections(user_id,garmin_user_id,status,connected_at)
        SELECT id,?,'not_connected',? FROM users WHERE username=?`).bind(identity.userId,now,username),
    ]);
    const owner=await this.store.db.prepare('SELECT user_id FROM garmin_connections WHERE garmin_user_id=?').bind(identity.userId).first<{user_id:number}>();
    if(!owner)throw new Error('GARMIN_ACCOUNT_UNAVAILABLE');
    const status=await this.store.save(owner.user_id,identity,tokens,consentStartedAt);
    return {userId:owner.user_id,isNew:created.meta.changes===1,status};
  }
}

/** Same-origin token handoff, with no credentials in URLs or readable cookies. */
export function garminSigninHtml(token:string,target:string,nonce:string) {
  const safe=(value:string)=>JSON.stringify(value).replace(/</g,'\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Signing in to RunAnalytics</title></head><body><p>Signing you in to RunAnalytics…</p><script nonce="${nonce}">try{localStorage.setItem("auth_token",${safe(token)});window.location.replace(${safe(target)})}catch{window.location.replace("/auth?error=garmin_failed")}</script></body></html>`;
}
