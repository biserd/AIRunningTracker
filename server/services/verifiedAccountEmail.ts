import {createHash,randomBytes} from 'node:crypto';
import type {AtomicSqlDatabase} from '../d1/jobStore';
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
export class VerifiedAccountEmail {
  constructor(private db:AtomicSqlDatabase,private send:(email:string,token:string)=>Promise<void>,private clock=()=>Date.now()){}
  async request(userId:number,email:string,marketingConsent:boolean) {
    const normalized=email.trim().toLowerCase(), now=this.clock();
    if(normalized.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new Error('INVALID_EMAIL');
    const user=await this.db.prepare('SELECT id,email FROM users WHERE id=?').bind(userId).first<{id:number;email:string|null}>();
    if(!user||user.email)throw new Error('EMAIL_ALREADY_SET');
    const existing=await this.db.prepare('SELECT id FROM users WHERE lower(email)=? AND id<>?').bind(normalized,userId).first();
    if(existing)throw new Error('EMAIL_IN_USE');
    const token='email_link_'+randomBytes(32).toString('hex');
    const issued=await this.db.prepare(`INSERT INTO account_email_challenges(user_id,token_hash,email,marketing_consent,issued_at,expires_at)
      SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM account_email_challenges WHERE issued_at>?)<30
      ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,email=excluded.email,marketing_consent=excluded.marketing_consent,issued_at=excluded.issued_at,expires_at=excluded.expires_at
      WHERE account_email_challenges.issued_at<=? RETURNING user_id`)
      .bind(userId,hash(token),normalized,marketingConsent?1:0,now,now+900000,now-60000,now-60000).first();
    if(!issued)throw new Error('EMAIL_RATE_LIMIT');
    try { await this.send(normalized,token); } catch {
      await this.db.prepare('DELETE FROM account_email_challenges WHERE token_hash=?').bind(hash(token)).run();
      throw new Error('EMAIL_DELIVERY_FAILED');
    }
    await this.db.prepare('DELETE FROM account_email_challenges WHERE expires_at<?').bind(now).run();
  }
  async verify(token:string) {
    if(!/^email_link_[a-f0-9]{64}$/.test(token))throw new Error('INVALID_EMAIL_LINK');
    const now=this.clock(), digest=hash(token);
    const challenge=await this.db.prepare('SELECT user_id,email,marketing_consent,issued_at FROM account_email_challenges WHERE token_hash=? AND expires_at>?').bind(digest,now)
      .first<{user_id:number;email:string;marketing_consent:number;issued_at:number}>();
    if(!challenge)throw new Error('INVALID_EMAIL_LINK');
    // Recheck identity, uniqueness, current unsubscribe/suppression and the active
    // challenge inside the atomic write. Never merge an email-owned account.
    const [updated]=await this.db.batch([
      this.db.prepare(`UPDATE users SET email=?,
        marketing_opt_out=CASE WHEN ?=1 AND marketing_consent_status NOT IN ('unsubscribed','suppressed') THEN 0 ELSE 1 END,
        marketing_consented_at=CASE WHEN ?=1 AND marketing_consent_status NOT IN ('unsubscribed','suppressed') THEN ? ELSE marketing_consented_at END,
        marketing_consent_source=CASE WHEN ?=1 AND marketing_consent_status NOT IN ('unsubscribed','suppressed') THEN 'verified_account_email' ELSE marketing_consent_source END,
        marketing_consent_status=CASE WHEN ?=1 AND marketing_consent_status NOT IN ('unsubscribed','suppressed') THEN 'consented' ELSE marketing_consent_status END
        WHERE id=? AND email IS NULL AND NOT EXISTS(SELECT 1 FROM users WHERE lower(email)=? AND id<>?)
        AND EXISTS(SELECT 1 FROM account_email_challenges WHERE token_hash=? AND user_id=? AND expires_at>?)`)
        .bind(challenge.email,challenge.marketing_consent,challenge.marketing_consent,new Date(now).toISOString(),challenge.marketing_consent,challenge.marketing_consent,challenge.user_id,challenge.email,challenge.user_id,digest,challenge.user_id,now),
      this.db.prepare('DELETE FROM account_email_challenges WHERE token_hash=?').bind(digest),
    ]);
    if(updated.meta.changes!==1)throw new Error('INVALID_EMAIL_LINK');
    return challenge.user_id;
  }
}
