/** Explicit administrative seed: no runtime seeding, tokens, coordinates or personal text copied. */
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import bcrypt from 'bcrypt';
import {migrationTarget} from './target';
import {REVIEW_EMAIL,REVIEW_USERNAME} from '../../server/services/reviewerAccess';
if(!process.argv.includes('--create-isolated-review-account'))throw new Error('EXPLICIT_REVIEW_SEED_REQUIRED');
const target=migrationTarget();
const query=async(sql:string,params:(string|number|null)[]=[]) => (await target.query([{sql,params}]))[0].results;
const credentialPath='.tmp/app-review-credentials.json';
mkdirSync('.tmp',{recursive:true});
const saved=existsSync(credentialPath)?JSON.parse(readFileSync(credentialPath,'utf8')):{email:REVIEW_EMAIL,password:randomBytes(24).toString('base64url')};
if(saved.email!==REVIEW_EMAIL||typeof saved.password!=='string'||saved.password.length<30)throw new Error('REVIEW_CREDENTIAL_FILE_INVALID');
if(!existsSync(credentialPath))writeFileSync(credentialPath,JSON.stringify(saved,null,2),{flag:'wx',mode:0o600});
const found=await query('SELECT id,username FROM users WHERE email=?',[REVIEW_EMAIL]);
if(found.length&&found[0].username!==REVIEW_USERNAME)throw new Error('REVIEW_IDENTITY_COLLISION');
if(!found.length)await query(`INSERT INTO users(email,username,password,first_name,last_name,subscription_plan,subscription_status,
  strava_connected,is_admin,coach_goal,coach_timezone,coach_onboarding_completed,marketing_opt_out,marketing_consent_status,
  marketing_suppression_reason,coach_notify_recap,coach_notify_weekly_summary,notify_post_run,coach_daily_briefing_enabled,coach_preferred_channel)
  VALUES(?,?,?,'Sample','Runner','premium','active',0,0,'half_marathon','America/New_York',1,1,'unsubscribed','isolated_app_review',0,0,0,0,'none')`,
  [REVIEW_EMAIL,REVIEW_USERNAME,await bcrypt.hash(saved.password,12)]);
const [review]=await query(`SELECT id,password,strava_athlete_id,strava_access_token,strava_refresh_token,stripe_customer_id,stripe_subscription_id,is_admin FROM users WHERE email=? AND username=?`,[REVIEW_EMAIL,REVIEW_USERNAME]);
if(!review||review.is_admin||review.strava_athlete_id||review.strava_access_token||review.strava_refresh_token||review.stripe_customer_id||review.stripe_subscription_id||!await bcrypt.compare(saved.password,String(review.password)))throw new Error('REVIEW_ACCOUNT_NOT_ISOLATED');
const user=Number(review.id);
const [owner]=await query('SELECT id FROM users WHERE email=?',['biserd@gmail.com']);
if(!owner||Number(owner.id)===user)throw new Error('SOURCE_IDENTITY_INVALID');
// Only allowlisted numeric metrics leave the source account. Never copy names, IDs, routes, streams, device or coaching text.
const source=await query(`SELECT distance,moving_time,total_elevation_gain,average_speed,max_speed,average_heartrate,max_heartrate,average_cadence
 FROM activities WHERE user_id=? AND type='Run' AND distance>0 ORDER BY start_date DESC LIMIT 40`,[Number(owner.id)]);
if(!source.length)throw new Error('NO_SOURCE_RUNS');
const today=new Date();today.setUTCHours(12,0,0,0);
for(let i=0;i<source.length;i++){
 const run=source[i],date=new Date(today.getTime()-i*2*86400000).toISOString(),key=`review-sample-v1-${i+1}`;
 if((await query('SELECT id FROM activities WHERE user_id=? AND strava_id=?',[user,key])).length)continue;
 // Round and lightly perturb metrics so this is a sample dataset, not a traceable exact copy.
 const distance=Math.max(1000,Math.round(Number(run.distance)*(i%2?0.96:1.04)/100)*100);
 const duration=Math.max(300,Math.round(Number(run.moving_time)*(i%2?0.97:1.03)/60)*60);
 const average=distance/duration,elevation=Math.round(Number(run.total_elevation_gain)/10)*10;
 await query(`INSERT INTO activities(user_id,strava_id,name,distance,moving_time,total_elevation_gain,average_speed,max_speed,average_heartrate,max_heartrate,
   average_cadence,start_date,type,has_heartrate,elapsed_time,hydration_status,hydrated_at,timezone)
   VALUES(?,?,'Sample run',?,?,?,?,?,?,?,?,?,'Run',?,?,'complete',?,'America/New_York')`,
   [user,key,distance,duration,elevation,average,Math.max(average,Number(run.max_speed)),run.average_heartrate?Math.round(Number(run.average_heartrate)/5)*5:null,
    run.max_heartrate?Math.round(Number(run.max_heartrate)/5)*5:null,run.average_cadence?Math.round(Number(run.average_cadence)):null,date,run.average_heartrate?1:0,duration,date]);
}
const runs=await query('SELECT id,strava_id,start_date,distance,moving_time FROM activities WHERE user_id=? ORDER BY start_date DESC',[user]);
for(const run of runs.slice(0,8)){
 if((await query('SELECT id FROM coach_recaps WHERE user_id=? AND activity_id=?',[user,Number(run.id)])).length)continue;
 await query(`INSERT INTO coach_recaps(user_id,activity_id,strava_activity_id,recap_bullets,coaching_cue,next_step,next_step_rationale,activity_name,activity_date,distance_km,duration_mins,coach_tone,prompt_version,model_version,notification_sent)
 VALUES(?,?,?,?,'Keep the next easy run conversational.','Easy Run','Allow recovery before another hard session.','Sample run',?,?,?,'direct','review-sample-v1','sample-fixture',1)`,
 [user,Number(run.id),String(run.strava_id),JSON.stringify([`Sample analysis: ${(Number(run.distance)/1000).toFixed(1)} km completed.`,`Moving time: ${Math.round(Number(run.moving_time)/60)} minutes.`,`Review your effort and recovery before the next session.`]),String(run.start_date),Number(run.distance)/1000,Math.round(Number(run.moving_time)/60)]);
}
let plans=await query('SELECT id FROM training_plans_v2 WHERE user_id=?',[user]);
if(!plans.length){
 await query(`INSERT INTO training_plans_v2(user_id,goal_type,race_date,days_per_week,status,total_weeks,coach_notes,enrichment_status,enriched_weeks)
 VALUES(?,'half_marathon',?,4,'active',4,'Sample plan for App Review. All edits apply only to this account.','complete',4)`,[user,new Date(today.getTime()+28*86400000).toISOString()]);
 plans=await query('SELECT id FROM training_plans_v2 WHERE user_id=?',[user]);
}
const plan=Number(plans[0].id),monday=new Date(today.getTime()-((today.getUTCDay()+6)%7)*86400000);
for(let w=0;w<4;w++){
 const start=new Date(monday.getTime()+w*7*86400000),end=new Date(start.getTime()+6*86400000);
 let weeks=await query('SELECT id FROM plan_weeks WHERE plan_id=? AND week_number=?',[plan,w+1]);
 if(!weeks.length){await query(`INSERT INTO plan_weeks(plan_id,week_number,week_start_date,week_end_date,planned_distance_km,planned_duration_mins,week_type,phase_name,enriched)
 VALUES(?,?,?,?,24,160,'build','Sample training',1)`,[plan,w+1,start.toISOString(),end.toISOString()]);weeks=await query('SELECT id FROM plan_weeks WHERE plan_id=? AND week_number=?',[plan,w+1]);}
 for(let d=0;d<7;d++){
  const date=new Date(start.getTime()+d*86400000).toISOString();
  if((await query('SELECT id FROM plan_days WHERE plan_id=? AND date=?',[plan,date])).length)continue;
  const distance=[0,5,0,6,5,0,8][d];
  await query(`INSERT INTO plan_days(week_id,plan_id,date,day_of_week,workout_type,title,description,planned_distance_km,planned_duration_mins,intensity)
   VALUES(?,?,?,?,?,?,?,?,?,'low')`,[Number(weeks[0].id),plan,date,['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][d],distance?(d===6?'long':'easy'):'rest',distance?(d===6?'Sample long run':'Sample easy run'):'Rest day','Illustrative plan. Keep the effort comfortable.',distance,Math.round(distance*6.7)]);
 }
}
if(!(await query('SELECT id FROM ai_insights WHERE user_id=?',[user])).length)await query(`INSERT INTO ai_insights(user_id,type,title,content,confidence) VALUES(?,'training','Sample training insight','Consistency and recovery are the focus of this sample plan. Ask the coach to explain an upcoming workout.',0.8)`,[user]);
console.log(JSON.stringify({reviewUserId:user,runs:runs.length,planId:plan,credentialsFile:credentialPath,sourceUnchanged:true}));
