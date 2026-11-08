import {garminHealthFields} from './garminHealthFields';
import {finite,object} from './garminDetails';
export const GARMIN_WELLNESS_DETAIL_TYPES=[...Object.keys(garminHealthFields),'pulseox','allDayRespiration'];
export const coreWellness=['dailies','sleeps','hrv','stressDetails','breathingVariations'];
export const wellnessLabels:Record<string,string>={dailies:'Daily heart rate',sleeps:'Sleep stages and overnight sensors',hrv:'Overnight HRV',stressDetails:'Stress and Body Battery',epochs:'Daily movement intervals',bodyComps:'Body composition',pulseOx:'Pulse oxygen',respiration:'Breathing rate',healthSnapshot:'Health Snapshot',userMetrics:'VO₂ max and fitness age',skinTemp:'Skin temperature deviation',bloodPressures:'Blood pressure',hydration:'Hydration',solarIntensity:'Solar intensity',nutrition:'Nutrition',breathingVariations:'Sleep breathing variations',moveIQActivities:'Automatically detected movement'};
export type WellnessDetail={kind:string;id:string;date:string;startAt:string;data:Record<string,any>;receivedAt?:string};
function sanitize(value:unknown,shape:any,depth=0):any{
 if(depth>8)return null;
 if(shape==='number'||shape==='integer')return finite(value,-1e12,1e12);
 if(shape==='boolean')return typeof value==='boolean'?value:null;
 if(shape==='string')return typeof value==='string'?value.replace(/[\u0000-\u001f]/g,'').slice(0,180):null;
 if(Array.isArray(shape)){if(!Array.isArray(value))return [];if(value.length>2000)throw new Error('GARMIN_HEALTH_ARRAY_LIMIT');return value.map(v=>sanitize(v,shape[0],depth+1));}
 const input=object(value),result:Record<string,any>={};
 if(shape['*']){const entries=Object.entries(input);if(entries.length>20000)throw new Error('GARMIN_HEALTH_SERIES_LIMIT');for(const [key,v] of entries){if(/^\d+(\.\d+)?$/.test(key)||['deep','light','rem','awake','unmeasurable'].includes(key)||/^[A-Z_a-z]{1,60}$/.test(key))result[key]=sanitize(v,shape['*'],depth+1);}}
 else for(const [key,child] of Object.entries(shape))if(input[key]!==undefined)result[key]=sanitize(input[key],child,depth+1);
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
