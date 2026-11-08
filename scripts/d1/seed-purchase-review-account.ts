/** Explicit isolated application-entitlement fixture. Never fabricate an Apple transaction. */
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import bcrypt from 'bcrypt';
import {migrationTarget} from './target';
import {PURCHASE_REVIEW_EMAIL as email,PURCHASE_REVIEW_USERNAME as username} from '../../server/services/reviewerAccess';
if(!process.argv.includes('--create-isolated-purchase-review-account'))throw new Error('EXPLICIT_REVIEW_SEED_REQUIRED');
const target=migrationTarget();
const query=async(sql:string,params:(string|number|null)[]=[]) => (await target.query([{sql,params}]))[0].results;
const credentialPath='.tmp/app-review-purchase-credentials.json';
mkdirSync('.tmp',{recursive:true});
const saved=existsSync(credentialPath)?JSON.parse(readFileSync(credentialPath,'utf8')):{email,password:randomBytes(24).toString('base64url')};
if(saved.email!==email||typeof saved.password!=='string'||saved.password.length<30)throw new Error('REVIEW_CREDENTIAL_FILE_INVALID');
if(!existsSync(credentialPath))writeFileSync(credentialPath,JSON.stringify(saved,null,2),{flag:'wx',mode:0o600});
const found=await query('SELECT id,username FROM users WHERE email=?',[email]);
if(found.length&&found[0].username!==username)throw new Error('REVIEW_IDENTITY_COLLISION');
if(!found.length)await query(`INSERT INTO users(email,username,password,first_name,last_name,subscription_plan,subscription_status,trial_ends_at,
 strava_connected,is_admin,coach_onboarding_completed,marketing_opt_out,marketing_consent_status,marketing_suppression_reason,
 coach_notify_recap,coach_notify_weekly_summary,notify_post_run,coach_daily_briefing_enabled,coach_preferred_channel)
 VALUES(?,?,?,'Purchase','Review','premium','canceled',?,0,0,1,1,'unsubscribed','isolated_purchase_review',0,0,0,0,'none')`,
 [email,username,await bcrypt.hash(saved.password,12),new Date(Date.now()-7*86400000).toISOString()]);
const [review]=await query(`SELECT id,password,subscription_plan,subscription_status,trial_ends_at,strava_athlete_id,strava_access_token,strava_refresh_token,
 stripe_customer_id,stripe_subscription_id,is_admin FROM users WHERE email=? AND username=?`,[email,username]);
if(!review||review.is_admin||review.strava_athlete_id||review.strava_access_token||review.strava_refresh_token||review.stripe_customer_id||review.stripe_subscription_id||
 review.subscription_plan!=='premium'||review.subscription_status!=='canceled'||Date.parse(String(review.trial_ends_at))>=Date.now()||
 !await bcrypt.compare(saved.password,String(review.password)))throw new Error('PURCHASE_REVIEW_ACCOUNT_NOT_ISOLATED_OR_EXPIRED');
const [transactions]=await query('SELECT count(*) AS count FROM apple_subscriptions WHERE user_id=?',[Number(review.id)]);
if(Number(transactions?.count)!==0)throw new Error('REVIEW_ACCOUNT_HAS_APPLE_TRANSACTIONS');
console.log(JSON.stringify({reviewUserId:Number(review.id),expiredApplicationEntitlement:true,appleTransactions:0,credentialsFile:credentialPath,existingAccountsUnchanged:true}));
