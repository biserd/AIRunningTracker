import {createHash,randomBytes} from 'node:crypto';
import type {AtomicSqlDatabase} from '../d1/jobStore';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
/** No user record or session is created until the email challenge is consumed. */
export class NativeSignup {
  constructor(private db:AtomicSqlDatabase,private send:(email:string,token:string)=>Promise<void>,private clock=()=>Math.floor(Date.now()/1000)){}
  async request(email:string){
    const normalized=email.trim().toLowerCase();
    if(normalized.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new Error('INVALID_EMAIL');
    const token='signup_'+randomBytes(32).toString('hex'),time=this.clock();
    const issued=await this.db.prepare(`INSERT INTO native_signup_challenges(token_hash,email,issued_at,expires_at) SELECT ?,?,?,? WHERE (SELECT count(*) FROM native_signup_challenges WHERE issued_at>?)<30
      ON CONFLICT(email) DO UPDATE SET token_hash=excluded.token_hash,issued_at=excluded.issued_at,expires_at=excluded.expires_at
      WHERE native_signup_challenges.issued_at<=? RETURNING email`).bind(hash(token),normalized,time,time+900,time-60,time-60).first<{email:string}>();
    if(!issued)return;
    try {await this.send(normalized,token);}catch{
      await this.db.prepare('DELETE FROM native_signup_challenges WHERE token_hash=?').bind(hash(token)).run();
      throw new Error('EMAIL_DELIVERY_FAILED');
    }
    await this.db.prepare('DELETE FROM native_signup_challenges WHERE expires_at<?').bind(time).run();
  }
  async verify(token:string):Promise<number>{
    if(!/^signup_[a-f0-9]{64}$/.test(token))throw new Error('INVALID_TOKEN');
    const challenge=await this.db.prepare('DELETE FROM native_signup_challenges WHERE token_hash=? AND expires_at>? RETURNING email')
      .bind(hash(token),this.clock()).first<{email:string}>();
    if(!challenge)throw new Error('INVALID_TOKEN');
    // Case-insensitive lookup prevents a second account for an existing address.
    const existing=await this.db.prepare('SELECT id FROM users WHERE lower(email)=?').bind(challenge.email).first<{id:number}>();
    if(existing)return existing.id;
    await this.db.prepare(`INSERT INTO users(email,username,subscription_plan,subscription_status,marketing_opt_out,marketing_consent_status)
      VALUES(?,?,'free','active',1,'unknown') ON CONFLICT(email) DO NOTHING`).bind(challenge.email,challenge.email).run();
    const user=await this.db.prepare('SELECT id FROM users WHERE email=?').bind(challenge.email).first<{id:number}>();
    if(!user)throw new Error('ACCOUNT_CREATE_FAILED');
    return user.id;
  }
}
