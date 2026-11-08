import {garminHealthFields} from './garminHealthFields';
import {finite,object} from './garminDetails';
export const GARMIN_WELLNESS_DETAIL_TYPES=[...Object.keys(garminHealthFields),'pulseox','allDayRespiration'];
export const coreWellness=['dailies','sleeps','hrv','stressDetails','breathingVariations'];
export const wellnessLabels:Record<string,string>={dailies:'Daily heart rate',sleeps:'Sleep stages and overnight sensors',hrv:'Overnight HRV',stressDetails:'Stress and Body Battery',epochs:'Daily movement intervals',bodyComps:'Body composition',pulseOx:'Pulse oxygen',respiration:'Breathing rate',healthSnapshot:'Health Snapshot',userMetrics:'VO₂ max and fitness age',skinTemp:'Skin temperature deviation',bloodPressures:'Blood pressure',hydration:'Hydration',solarIntensity:'Solar intensity',nutrition:'Nutrition',breathingVariations:'Sleep breathing variations',moveIQActivities:'Automatically detected movement'};
export type WellnessDetail={kind:string;id:string;date:string;startAt:string;data:Record<string,any>;receivedAt?:string};
function sanitize(value:unknown,shape:any,depth=0,key=''):any{
 if(depth>8)return null;
 if(shape==='number'||shape==='integer'){
  if(/offsetinseconds/i.test(key))return finite(value,-86400,86400);
  if(key==='avgDeviationCelsius')return finite(value,-15,15);
  if(/heartrate|^pulse$/.test(key.toLowerCase()))return finite(value,1,300);
  if(/stresslevel|bodybattery.*values/i.test(key))return finite(value,0,100);
  if(/spo2/i.test(key))return finite(value,1,100);
  if(/breaths|respiration/i.test(key))return finite(value,1,100);
  if(/hrvvalues|lastnight/i.test(key))return finite(value,1,1000);
  if(key==='systolic'||key==='diastolic')return finite(value,1,400);
  if(key==='vo2Max'||key==='vo2MaxCycling')return finite(value,1,120);
  if(key==='fitnessAge')return finite(value,1,150);
  return finite(value,0,1e12);
 }
 if(shape==='boolean')return typeof value==='boolean'?value:null;
 if(shape==='string')return typeof value==='string'?value.replace(/[\u0000-\u001f]/g,'').slice(0,180):null;
 if(Array.isArray(shape)){if(!Array.isArray(value))return [];if(value.length>2000)throw new Error('GARMIN_HEALTH_ARRAY_LIMIT');return value.map(v=>sanitize(v,shape[0],depth+1,key));}
 const input=object(value),result:Record<string,any>={};
 if(shape['*']){const entries=Object.entries(input);if(entries.length>20000)throw new Error('GARMIN_HEALTH_SERIES_LIMIT');for(const [sampleKey,v] of entries){if(/^\d+(\.\d+)?$/.test(sampleKey)||['deep','light','rem','awake','unmeasurable'].includes(sampleKey)||/^[A-Z_a-z]{1,60}$/.test(sampleKey))result[sampleKey]=sanitize(v,shape['*'],depth+1,key);}}
 else for(const [childKey,child] of Object.entries(shape))if(input[childKey]!==undefined)result[childKey]=sanitize(input[childKey],child,depth+1,childKey);
 return result;
}
export function normalizeWellnessDetail(kind:string,input:Record<string,unknown>):WellnessDetail{
 kind=kind==='pulseox'?'pulseOx':kind==='allDayRespiration'?'respiration':kind;
 const shape=(garminHealthFields as any)[kind];if(!shape)throw new Error('UNSUPPORTED_GARMIN_HEALTH');
 const data=sanitize(input,shape),id=data.summaryId;
 if(typeof id!=='string'||!/^[-\w]{1,128}$/.test(id))throw new Error('INVALID_GARMIN_HEALTH');
 const offset=finite(data.startTimeOffsetInSeconds??data.measurementTimeOffsetInSeconds??data.offsetInSeconds??data.timeOffsetInSeconds,-86400,86400)??0;
 let start=finite(data.startTimeInSeconds??data.measurementTimeInSeconds??data.readings?.[0]?.startTimeInSeconds,946684800,4102444800),date=data.calendarDate;
 if(start===null&&typeof date==='string')start=Date.parse(date+'T00:00:00Z')/1000;
 if(start===null||!Number.isFinite(start))throw new Error('INVALID_GARMIN_HEALTH');
 if(!date)date=new Date((start+offset)*1000).toISOString().slice(0,10);
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('INVALID_GARMIN_HEALTH');
 return {kind,id,date,startAt:new Date(start*1000).toISOString(),data};
}
export function wellnessSeries(record:WellnessDetail,key:string,min:number,max:number){
 const duration=finite(record.data.durationInSeconds,0,172800)??86400;
 return Object.entries(object(record.data[key])).map(([offset,value])=>({seconds:Number(offset),value:finite(value,min,max)})).filter(p=>Number.isFinite(p.seconds)&&p.seconds>=0&&p.seconds<=duration).sort((a,b)=>a.seconds-b.seconds);
}
