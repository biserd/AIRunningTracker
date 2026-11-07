/** Garmin Health API 2.1. Only the four recovery feeds below are collected. */
export const GARMIN_HEALTH_TYPES = ['dailies','sleeps','hrv','stressDetails'] as const;
export type GarminHealthType = typeof GARMIN_HEALTH_TYPES[number];
export const GARMIN_HEALTH_RETENTION_DAYS = 90;
export const GARMIN_HEALTH_CONSENT_VERSION = 'health-sleep-v1';
export interface GarminHealthSummary {
  id: string; kind: GarminHealthType; date: string; startAt: string; duration: number; offset: number;
  restingHeartRate?: number | null; steps?: number | null; activeCalories?: number | null;
  averageStress?: number | null; batteryCharged?: number | null; batteryDrained?: number | null;
  sleepSeconds?: number | null; deepSeconds?: number | null; lightSeconds?: number | null;
  remSeconds?: number | null; awakeSeconds?: number | null; unmeasurableSeconds?: number | null;
  napSeconds?: number | null; sleepScore?: number | null; sleepQualifier?: string | null;
  validation?: string | null; tentative?: boolean;
  hrvAverage?: number | null; hrvHigh?: number | null;
  bodyBattery?: number | null; bodyBatteryAt?: string | null;
}
const numeric = (value: unknown, max: number, min = 0) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
const text = (value: unknown) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g,'').slice(0,80) : null;
export function normalizeGarminHealth(kind: GarminHealthType, input: Record<string,unknown>): GarminHealthSummary {
  const id = typeof input.summaryId==='string'?input.summaryId:null, date = input.calendarDate;
  const start = numeric(input.startTimeInSeconds,4102444800,946684800), duration = numeric(input.durationInSeconds,172800);
  if (!id || !/^[\w-]{1,128}$/.test(id) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date+'T00:00:00Z')) || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date || start===null || duration===null) throw new Error('INVALID_GARMIN_HEALTH');
  const offset = numeric(input.startTimeOffsetInSeconds,86400,-86400) ?? 0;
  const result: GarminHealthSummary = {id,kind,date,startAt:new Date(start*1000).toISOString(),duration,offset};
  if (kind==='dailies') return {...result,restingHeartRate:numeric(input.restingHeartRateInBeatsPerMinute,300,1),
    steps:numeric(input.steps,500000),activeCalories:numeric(input.activeKilocalories,50000),
    averageStress:numeric(input.averageStressLevel,100),batteryCharged:numeric(input.bodyBatteryChargedValue,1000),batteryDrained:numeric(input.bodyBatteryDrainedValue,1000)};
  if (kind==='sleeps') {
    const score = input.overallSleepScore && typeof input.overallSleepScore==='object' ? input.overallSleepScore as Record<string,unknown> : {};
    const validation = text(input.validation);
    return {...result,sleepSeconds:duration,deepSeconds:numeric(input.deepSleepDurationInSeconds,172800),lightSeconds:numeric(input.lightSleepDurationInSeconds,172800),
      remSeconds:numeric(input.remSleepInSeconds,172800),awakeSeconds:numeric(input.awakeDurationInSeconds,172800),unmeasurableSeconds:numeric(input.unmeasurableSleepInSeconds,172800),
      napSeconds:numeric(input.totalNapDurationInSeconds,86400),sleepScore:numeric(score.value,100),sleepQualifier:text(score.qualifierKey),validation,tentative:validation?.includes('TENTATIVE')??false};
  }
  if (kind==='hrv') return {...result,hrvAverage:numeric(input.lastNightAvg,1000,1),hrvHigh:numeric(input.lastNight5MinHigh,1000,1)};
  let battery: number | null = null, latest = -1;
  const samples=input.timeOffsetBodyBatteryValues;
  if (samples && typeof samples==='object' && !Array.isArray(samples)) {
    const entries=Object.entries(samples);if(entries.length>10000)throw new Error('INVALID_GARMIN_HEALTH');
    for(const [offset,value] of entries){const at=numeric(Number(offset),duration),level=numeric(value,100);if(at!==null&&level!==null&&at>latest){latest=at;battery=level;}}
  }
  return {...result,averageStress:numeric(input.averageStressLevel,100),bodyBattery:battery,bodyBatteryAt:latest<0?null:new Date((start+latest)*1000).toISOString()};
}
export interface GarminHealthStatus {
  connected: boolean; hasPermission: boolean; consented: boolean; enabled: boolean;
  consentedAt: string | null; lastSyncAt: string | null; summaryCount: number; retentionDays: number;
}
export interface GarminHealthRecord extends GarminHealthSummary {receivedAt: string}
export interface RecoveryDay {date:string; sleep:GarminHealthRecord|null; daily:GarminHealthRecord|null; hrv:GarminHealthRecord|null; stress:GarminHealthRecord|null}
export interface RecoveryMetric {value:number|null; date:string|null; observedAt:string|null; receivedAt:string|null; baseline:number|null; baselineDays:number; stale:boolean; tentative:boolean}
export interface GarminRecovery {
  status: GarminHealthStatus; today:string; timezone:string; days:number; series:RecoveryDay[];
  metrics:Record<'sleep'|'sleepScore'|'restingHeartRate'|'hrv'|'stress'|'bodyBattery',RecoveryMetric>;
}
export function recoveryOverview(records: GarminHealthRecord[], status: GarminHealthStatus, days=28, timezone='UTC', now=Date.now()): GarminRecovery {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const dayMs=86400000, todayMs=Date.parse(today+'T00:00:00Z');
  const series:RecoveryDay[]=Array.from({length:42},(_,i)=>({date:new Date(todayMs-(41-i)*dayMs).toISOString().slice(0,10),sleep:null,daily:null,hrv:null,stress:null}));
  const byDate=new Map(series.map(day=>[day.date,day]));
  // A replacement summary supersedes its earlier version. Never add overlapping
  // all-day summaries or multiple devices together. Sleep shows the longest window.
  for(const record of records){
    const day=byDate.get(record.date);if(!day)continue;
    const key=({sleeps:'sleep',dailies:'daily',hrv:'hrv',stressDetails:'stress'} as const)[record.kind], previous=day[key];
    if(!previous || (record.kind==='sleeps' ? record.duration>previous.duration || (record.duration===previous.duration&&record.receivedAt>previous.receivedAt) : record.receivedAt>previous.receivedAt))day[key]=record;
  }
  const metric=(source:'sleep'|'daily'|'hrv'|'stress',field:keyof GarminHealthSummary):RecoveryMetric=>{
    const valid=series.map(day=>day[source]).filter((record):record is GarminHealthRecord=>!!record&&typeof record[field]==='number'&&record.date<=today&&Date.parse(record.startAt)<=now+300000);
    const latest=valid.at(-1),value=latest?Number(latest[field]):null;
    // Compare with distinct prior Garmin dates; at least 7 of the previous 14
    // days are required. Tentative/off-wrist/manual sleep is not baseline data.
    const cutoff=latest?Date.parse(latest.date+'T00:00:00Z')-14*dayMs:0;
    const prior=valid.filter(row=>row.date<latest!.date&&Date.parse(row.date+'T00:00:00Z')>=cutoff&&!row.tentative&&row.validation!=='OFF_WRIST'&&row.validation!=='MANUAL');
    const values=prior.map(row=>Number(row[field])).sort((a,b)=>a-b),n=values.length;
    const baseline=n>=7?(n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2):null;
    const observedAt=latest?(field==='bodyBattery'?latest.bodyBatteryAt??latest.startAt:new Date(Date.parse(latest.startAt)+(latest.duration+(latest.kind==='sleeps'?(latest.awakeSeconds??0):0))*1000).toISOString()):null;
    return {value,date:latest?.date??null,observedAt,receivedAt:latest?.receivedAt??null,baseline,baselineDays:n,
      stale:!latest||todayMs-Date.parse(latest.date+'T00:00:00Z')>dayMs||!!observedAt&&now-Date.parse(observedAt)>36*3600000,tentative:latest?.tentative??false};
  };
  return {status,today,timezone,days,series:series.slice(-days),metrics:{sleep:metric('sleep','sleepSeconds'),sleepScore:metric('sleep','sleepScore'),restingHeartRate:metric('daily','restingHeartRate'),
    hrv:metric('hrv','hrvAverage'),stress:metric('daily','averageStress'),bodyBattery:metric('stress','bodyBattery')}};
}
