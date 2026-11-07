import type {AtomicSqlDatabase} from '../d1/jobStore';
import {normalizeGarminHealth,type GarminHealthSummary} from '../../shared/garminHealth';
export interface VisibleGarminNight {
  date:string; missing?:boolean; score?:number; qualifier?:string; sleepDuration?:string;
  deep?:string; light?:string; rem?:string; awake?:string; hrv?:number|null;
  startLocal?:string; endLocal?:string; sourceUrl:string; displayTimezone?:string;
}
function seconds(value:unknown):number {
  if(typeof value!=='string'||! /^(?:(\d+)h\s*)?(?:(\d+)m)?$/.test(value.trim())||!value.trim())throw Error('Invalid displayed duration');
  const parts=value.trim().match(/^(?:(\d+)h\s*)?(?:(\d+)m)?$/)!;
  const total=Number(parts[1]??0)*3600+Number(parts[2]??0)*60;
  if(total>86400||Number(parts[2]??0)>=60)throw Error('Invalid displayed duration');
  return total;
}
/** Resolve displayed local clocks with IANA DST rules; reject missing/ambiguous clocks. */
export function garminLocalTime(value:string,timezone:string):number {
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))throw Error('Invalid displayed time');
  const desired=Date.parse(value.replace(' ','T')+'Z');if(!Number.isFinite(desired))throw Error('Invalid displayed time');
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const display=(time:number)=>{const parts=Object.fromEntries(formatter.formatToParts(time).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;};
  let candidate=desired;
  for(let i=0;i<4;i++)candidate+=desired-Date.parse(display(candidate).replace(' ','T')+'Z');
  if(display(candidate)!==value||display(candidate-3600000)===value||display(candidate+3600000)===value)throw Error('Ambiguous or nonexistent local time');
  return candidate;
}
export function prepareGarminHistory(input:unknown,now=Date.now()):GarminHealthSummary[]{
  if(!Array.isArray(input)||!input.length||input.length>31)throw Error('Provide at most 31 explicitly selected Garmin dates');
  const seen=new Set<string>(),records:GarminHealthSummary[]=[];
  for(const raw of input){
    const row=raw as VisibleGarminNight;
    if(!row||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||seen.has(row.date))throw Error('Invalid or duplicate Garmin date');
    seen.add(row.date);
    if(typeof row.sourceUrl!=='string'||!new RegExp('^https://connect\\.garmin\\.com/app/sleep/'+row.date+'(?:/0)?$').test(row.sourceUrl))throw Error('Unverified Garmin source page');
    if(Date.parse(row.date+'T00:00:00Z')<now-90*86400000||Date.parse(row.date+'T00:00:00Z')>now)throw Error('History must be inside the 90-day retention window');
    if(row.missing===true)continue;
    if(!row.displayTimezone||!row.startLocal||!row.endLocal||!row.endLocal.startsWith(row.date))throw Error('Missing source sleep window');
    const start=garminLocalTime(row.startLocal,row.displayTimezone),end=garminLocalTime(row.endLocal,row.displayTimezone);
    const asleep=seconds(row.sleepDuration),awake=seconds(row.awake),deep=seconds(row.deep),light=seconds(row.light),rem=seconds(row.rem);
    // Do not infer stages from FIT transition timestamps or fill missing nights.
    if(end<=start||end>now||Math.abs((end-start)/1000-asleep-awake)>60||Math.abs(deep+light+rem-asleep)>60)throw Error('Garmin sleep totals do not reconcile');
    if(typeof row.score!=='number'||!Number.isInteger(row.score)||row.score<0||row.score>100)throw Error('Invalid displayed Garmin sleep score');
    if(typeof row.qualifier!=='string'||! /^[A-Za-z ]{1,40}$/.test(row.qualifier))throw Error('Invalid Garmin sleep qualifier');
    if(row.hrv!=null&&(typeof row.hrv!=='number'||!Number.isFinite(row.hrv)||row.hrv<=0||row.hrv>1000))throw Error('Invalid overnight HRV average');
    const offset=(Date.parse(row.startLocal.replace(' ','T')+'Z')-start)/1000;
    const base={summaryId:'history-'+row.date,calendarDate:row.date,startTimeInSeconds:start/1000,startTimeOffsetInSeconds:offset};
    records.push({...normalizeGarminHealth('sleeps',{...base,durationInSeconds:asleep,awakeDurationInSeconds:awake,deepSleepDurationInSeconds:deep,lightSleepDurationInSeconds:light,remSleepInSeconds:rem,overallSleepScore:{value:row.score,qualifierKey:row.qualifier},validation:'IMPORTED_GARMIN_SUMMARY'}),source:'garmin_connect_history',importedAt:new Date(now).toISOString()});
    if(row.hrv!=null)records.push({...normalizeGarminHealth('hrv',{...base,durationInSeconds:(end-start)/1000,lastNightAvg:row.hrv}),source:'garmin_connect_history',importedAt:new Date(now).toISOString()});
  }
  return records;
}
export function historyInsertSql(ownerExpression:string){return `INSERT INTO garmin_health_summaries(user_id,kind,start_at,calendar_date,summary,received_at)
  SELECT g.user_id,?,?,?,?,? FROM garmin_connections g JOIN users u ON u.id=g.user_id WHERE ${ownerExpression}
  AND g.health_consented_at IS NOT NULL AND g.status IN ('connected','permission_required')
  AND EXISTS(SELECT 1 FROM json_each(g.permissions) WHERE value='HEALTH_EXPORT')
  AND NOT EXISTS(SELECT 1 FROM garmin_health_summaries h WHERE h.user_id=g.user_id AND h.kind=? AND h.calendar_date=?)
  ON CONFLICT(user_id,kind,start_at) DO NOTHING`;}
export async function importGarminHistory(db:AtomicSqlDatabase,userId:number,records:GarminHealthSummary[],now=Date.now()){
  // A history import cannot overwrite a live reading, revive withdrawn consent,
  // populate another runner, or fabricate a Garmin delivery notification.
  return db.batch(records.map(record=>db.prepare(historyInsertSql('g.user_id=?'))
    .bind(record.kind,record.startAt,record.date,JSON.stringify(record),new Date(now).toISOString(),userId,record.kind,record.date)));
}
