import {applicationSqlDatabase as db} from '../d1/runtimeDatabase';
import {storage} from '../storage';
import {canAccessCapability} from '../../shared/entitlements';
export type CompanionPreferences={notes:string;evening:boolean;weekly:boolean;hour:number;quietStart:number;quietEnd:number};
export const defaultCompanionPreferences:CompanionPreferences={notes:'',evening:false,weekly:false,hour:18,quietStart:21,quietEnd:7};
export function validateCompanionPreferences(v:Record<string,unknown>):CompanionPreferences {
 if(typeof v.notes!=='string'||v.notes.length>1500||typeof v.evening!=='boolean'||typeof v.weekly!=='boolean'||![v.hour,v.quietStart,v.quietEnd].every(x=>Number.isInteger(x)&&Number(x)>=0&&Number(x)<=23))throw new Error('Invalid coaching preferences.');
 return {notes:v.notes.trim(),evening:v.evening,weekly:v.weekly,hour:Number(v.hour),quietStart:Number(v.quietStart),quietEnd:Number(v.quietEnd)};
}
export function companionLocal(now:Date,timezone:string){
 let zone=timezone;try{new Intl.DateTimeFormat('en-US',{timeZone:zone});}catch{zone='UTC';}
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(now);
 const get=(type:string)=>parts.find(x=>x.type===type)?.value||'';
 return {date:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour')),weekday:get('weekday')};
}
export function quiet(p:CompanionPreferences,hour:number){return p.quietStart===p.quietEnd?false:p.quietStart<p.quietEnd?hour>=p.quietStart&&hour<p.quietEnd:hour>=p.quietStart||hour<p.quietEnd;}
export async function companionContext(user:number,today:string){
 const row=await db.prepare('SELECT settings FROM coach_companion_preferences WHERE user_id=?').bind(user).first<{settings:string}>();
 const preferences=row?validateCompanionPreferences(JSON.parse(row.settings)):defaultCompanionPreferences;
 const checkins=(await db.prepare('SELECT date,activity_id AS activityId,feeling FROM coach_companion_checkins WHERE user_id=? AND date>=? ORDER BY date DESC LIMIT 14').bind(user,new Date(new Date(today+'T12:00:00Z').getTime()-7*86400000).toISOString().slice(0,10)).all()).results;
 const briefings=(await db.prepare('SELECT kind,reference,title,body,created_at AS date FROM coach_companion_briefings WHERE user_id=? ORDER BY created_at DESC LIMIT 3').bind(user).all()).results;
 return {preferences,checkins,briefings};
}
export async function companionAction(user:number,action:string,input:Record<string,unknown>){
 const runner=await storage.getUser(user);if(!runner)throw new Error('Account unavailable.');
 const local=companionLocal(new Date(),runner.coachTimezone||'UTC');
 if(action==='preferences'){
  const value=validateCompanionPreferences(input);
  await db.prepare('INSERT INTO coach_companion_preferences(user_id,settings,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings,updated_at=excluded.updated_at').bind(user,JSON.stringify(value),new Date().toISOString()).run();return {ok:true};
 }
 if(action==='checkin'){
  if(!['good','tired','sore','short_on_time'].includes(String(input.feeling)))throw new Error('Choose how you feel.');
  const activity=Number(input.activityId||0);if(!Number.isSafeInteger(activity)||activity<0)throw new Error('Invalid run.');
  if(activity&&!await db.prepare('SELECT 1 FROM activities WHERE id=? AND user_id=?').bind(activity,user).first())throw new Error('Run unavailable.');
  await db.prepare('INSERT INTO coach_companion_checkins(user_id,date,activity_id,feeling,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,date,activity_id) DO UPDATE SET feeling=excluded.feeling,updated_at=excluded.updated_at').bind(user,local.date,activity,String(input.feeling),new Date().toISOString()).run();
  return {ok:true};
 }
 if(action==='read'){
  await buildCompanionBriefings(user);
  const context=await companionContext(user,local.date);
  const insights=canAccessCapability(runner,'ai_coach')?(await storage.getAIInsightsByUserId(user)).slice(0,20).map(i=>({id:i.id,title:i.title,content:i.content.slice(0,4000),date:i.createdAt})):[];
  const briefings=(await db.prepare('SELECT kind,reference,title,body,created_at AS date FROM coach_companion_briefings WHERE user_id=? ORDER BY created_at DESC LIMIT 10').bind(user).all()).results;
  return {...context,insights,briefings};
 }
 throw new Error('Unknown coaching action.');
}
export function weeklyStory(runs:{date:string;km:number}[],today:string,unit:string){
 const end=new Date(today+'T12:00:00Z').getTime(),key=(n:number)=>new Date(end-n*86400000).toISOString().slice(0,10);
 const recent=runs.filter(r=>r.date>=key(7)&&r.date<today),prior=runs.filter(r=>r.date>=key(14)&&r.date<key(7));
 const total=recent.reduce((s,r)=>s+r.km,0),previous=prior.reduce((s,r)=>s+r.km,0),factor=unit==='miles'?0.621371:1,label=unit==='miles'?'mi':'km';
 return `Your available synced history shows ${recent.length} runs and ${(total*factor).toFixed(1)} ${label} in the last seven complete days. ${prior.length?`That is ${Math.abs((total-previous)*factor).toFixed(1)} ${label} ${total>=previous?'more':'less'} than the previous seven days.`:'There is not enough earlier history to compare yet.'} Next week, aim for a rhythm you can recover from rather than chasing a bigger total.`;
}
async function tomorrowWeather(user:any,date:string){
 const location=user.coachWeatherLocation;
 if(!user.coachWeatherEnabled||!Number.isFinite(location?.latitude)||!Number.isFinite(location?.longitude))return 'Weather is not connected.';
 try{
  const params=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),daily:'precipitation_probability_max,temperature_2m_max',timezone:user.coachTimezone||'UTC',forecast_days:'3'});
  const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error();
  const data:any=await response.json(),i=data.daily?.time?.indexOf(date);if(!(i>=0))throw new Error();
  const rain=data.daily.precipitation_probability_max[i],temp=data.daily.temperature_2m_max[i];if(!Number.isFinite(rain)||!Number.isFinite(temp))throw new Error();
  const fahrenheit=user.unitPreference==='miles';
  return `Forecast: ${rain}% rain chance, high ${Math.round(fahrenheit?temp*9/5+32:temp)}°${fahrenheit?'F':'C'}. ${rain>=60?'Consider a grippy route and flexible timing.':'Check conditions again before heading out.'}`;
 }catch{return 'The forecast is unavailable right now.';}
}
export async function buildCompanionBriefings(user:number,now=new Date()){
 const runner=await storage.getUser(user);if(!runner||!canAccessCapability(runner,'ai_coach'))return;
 const local=companionLocal(now,runner.coachTimezone||'UTC'),{preferences:p}=await companionContext(user,local.date);
 if(quiet(p,local.hour)||local.hour!==p.hour||runner.coachEnabled===false)return;
 if(runner.coachSnoozedUntil&&new Date(runner.coachSnoozedUntil)>now)return;
 const candidates=p.weekly&&local.weekday==='Sun'?['weekly']:p.evening?['evening']:[];
 for(const kind of candidates){
  if(await db.prepare('SELECT 1 FROM coach_companion_briefings WHERE user_id=? AND kind=? AND reference=?').bind(user,kind,local.date).first())continue;
  const {coachExperience}=await import('./coachExperience');const snapshot=await coachExperience(user,now);if(!snapshot)continue;
  let title='Your week in running',body='';
  if(kind==='weekly')body=weeklyStory(snapshot.state.activities,local.date,runner.unitPreference||'km');
  else {
   const tomorrow=new Date(new Date(local.date+'T12:00:00Z').getTime()+86400000).toISOString().slice(0,10),day=snapshot.state.days.find(d=>d.date===tomorrow&&d.kind!=='rest');
   if(!day)continue;title="Tomorrow’s run";body=`${day.title} is planned for tomorrow. ${await tomorrowWeather(runner,tomorrow)} How are your legs feeling?`;
  }
  await db.prepare('INSERT OR IGNORE INTO coach_companion_briefings(user_id,kind,reference,title,body,created_at) VALUES (?,?,?,?,?,?)').bind(user,kind,local.date,title,body,now.toISOString()).run();
 }
}
export async function companionAllowed(user:number,reference?:string){
 const runner=await storage.getUser(user);if(!runner||runner.coachEnabled===false)return false;
 if(runner.coachSnoozedUntil&&new Date(runner.coachSnoozedUntil)>new Date())return false;
 const local=companionLocal(new Date(),runner.coachTimezone||'UTC'),{preferences:p}=await companionContext(user,local.date);
 if(quiet(p,local.hour))return false;
 if(reference?.startsWith('coach:evening:'))return p.evening;
 if(reference?.startsWith('coach:weekly:'))return p.weekly;
 return true;
}
