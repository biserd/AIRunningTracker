import {createHash} from 'node:crypto';
import type {SqlDatabase} from '../d1/activities';

// Public identity, not a credential. The password is generated outside source control.
export const REVIEW_EMAIL = 'app-review@review.aitracker.invalid';
export const REVIEW_USERNAME = 'app-store-review-sample-v1';
export function isReviewAccount(user: {email?:string|null;username?:string|null;isAdmin?:boolean}|null|undefined) {
  return !!user && user.email === REVIEW_EMAIL && user.username === REVIEW_USERNAME && user.isAdmin !== true;
}

/** A restricted entry point into normal password authentication, never a bypass. */
export async function reviewerLogin(db:SqlDatabase,input:unknown,ip:string,
  login:(credentials:{email:string;password:string})=>Promise<{token:string;user:{id:number}}>) {
  const now=new Date(), cutoff=new Date(now.getTime()-600000).toISOString();
  const key='review-login:'+createHash('sha256').update(ip).digest('hex');
  const limit=await db.prepare(`INSERT INTO mcp_rate_limits(key,window_started_at,count,updated_at) VALUES(?,?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_started_at<=? THEN 1 ELSE count+1 END,
    window_started_at=CASE WHEN window_started_at<=? THEN excluded.window_started_at ELSE window_started_at END,
    updated_at=excluded.updated_at RETURNING count`).bind(key,now.toISOString(),now.toISOString(),cutoff,cutoff).first<{count:number}>();
  if(!limit||limit.count>20)throw new Error('REVIEW_RATE_LIMIT');
  const body=input as {email?:unknown;password?:unknown}|null;
  if(!body||typeof body.email!=='string'||body.email.trim().toLowerCase()!==REVIEW_EMAIL||
    typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new Error('REVIEW_CREDENTIALS');
  const user=await db.prepare('SELECT id,email,username,is_admin AS isAdmin FROM users WHERE email=? AND username=? AND is_admin=0')
    .bind(REVIEW_EMAIL,REVIEW_USERNAME).first<{id:number;email:string;username:string}>();
  if(!user||!isReviewAccount(user))throw new Error('REVIEW_CREDENTIALS');
  const result=await login({email:REVIEW_EMAIL,password:body.password});
  if(result.user.id!==user.id)throw new Error('REVIEW_CREDENTIALS');
  return {token:result.token};
}
