import {normalizeGarminRun,type GarminRun} from './garmin';
export const GARMIN_DETAIL_CONSENT_VERSION='garmin-details-v1';
export interface RunSample {seconds:number;distance:number|null;latitude:number|null;longitude:number|null;elevation:number|null;heartRate:number|null;cadence:number|null;speed:number|null;power:number|null;temperature:number|null;timer:number|null;verticalOscillation:number|null;groundContactTime:number|null;strideLength:number|null;stamina:number|null}
export interface RunLap {number:number;seconds:number;duration:number|null;distance:number|null;heartRate:number|null;cadence:number|null;ascent:number|null;pace:number|null;estimated:boolean}
export interface GarminRunDetails {run:GarminRun;samples:RunSample[];laps:RunLap[];format:'JSON'|'FIT';receivedAt?:string;trainingEffect?:number|null;anaerobicTrainingEffect?:number|null;recoveryHours?:number|null;vo2Max?:number|null}
export const finite=(v:unknown,min:number,max:number):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
export const object=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
export function normalizeRunDetails(input:Record<string,unknown>):GarminRunDetails|null{
  const summary={...object(input.summary),activityId:input.activityId??object(input.summary).activityId,summaryId:input.summaryId??object(input.summary).summaryId};
  const run=normalizeGarminRun(summary);if(!run)return null;
  const start=Date.parse(run.startDate)/1000,raw=Array.isArray(input.samples)?input.samples:[];
  if(raw.length>500000)throw new Error('GARMIN_DETAIL_SAMPLE_LIMIT');
  const byTime=new Map<number,RunSample>();
  for(const value of raw){const s=object(value),seconds=finite(typeof s.startTimeInSeconds==='number'?s.startTimeInSeconds-start:null,0,Math.max(run.duration+86400,172800));if(seconds===null)continue;
    let latitude=finite(s.latitudeInDegree,-90,90),longitude=finite(s.longitudeInDegree,-180,180);
    if(latitude===null||longitude===null||(latitude===0&&longitude===0)){latitude=null;longitude=null;}
    byTime.set(seconds,{seconds,distance:finite(s.totalDistanceInMeters,0,2000000),latitude,longitude,elevation:finite(s.elevationInMeters,-1000,10000),heartRate:finite(s.heartRate,1,300),cadence:finite(s.stepsPerMinute,0,400),speed:finite(s.speedMetersPerSecond,0,40),power:finite(s.powerInWatts,0,5000),temperature:finite(s.airTemperatureCelcius,-80,80),timer:finite(s.timerDurationInSeconds,0,2592000),verticalOscillation:finite(s.verticalOscillation,0,1000),groundContactTime:finite(s.groundContactTime,0,2000),strideLength:finite(s.strideLength,0,10),stamina:finite(s.stamina,0,100)});
  }
  const samples=Array.from(byTime.values()).sort((a,b)=>a.seconds-b.seconds);
  const boundaries=Array.from(new Set((Array.isArray(input.laps)?input.laps:[]).map(v=>finite(object(v).startTimeInSeconds-start,0,2592000)).filter((v):v is number=>v!==null))).sort((a,b)=>a-b);
  if(boundaries.length>2000)throw new Error('GARMIN_LAP_LIMIT');
  const laps=boundaries.map((seconds,index):RunLap=>{const end=boundaries[index+1]??samples.at(-1)?.seconds??run.duration,points=samples.filter(s=>s.seconds>=seconds&&s.seconds<=end),first=points[0],last=points.at(-1);
    const distance=first?.distance!=null&&last?.distance!=null&&last.distance>=first.distance?last.distance-first.distance:null;
    const duration=first?.timer!=null&&last?.timer!=null&&last.timer>=first.timer?last.timer-first.timer:end-seconds;
    // JSON lap entries contain only a timestamp. Derivations are explicitly marked.
    const mean=(field:'heartRate'|'cadence')=>{let sum=0,weight=0;for(let i=0;i<points.length-1;i++){const value=points[i][field],span=Math.min(30,points[i+1].seconds-points[i].seconds);if(value!==null&&span>0){sum+=value*span;weight+=span;}}return weight?sum/weight:null;};
    return {number:index+1,seconds,duration:duration>0?duration:null,distance,heartRate:mean('heartRate'),cadence:mean('cadence'),ascent:null,pace:distance&&duration>0?duration/distance*1000:null,estimated:true};
  });
  return {run,samples,laps,format:'JSON'};
}
/** Distance splits require a continuous, monotonic recorded distance/timer series. */
export function distanceSplits(samples:RunSample[],meters=1000):RunLap[]{
  const splits:RunLap[]=[];let next=meters,lastDistance=0,lastTime=0,previous:RunSample|undefined;
  for(const current of samples){if(current.distance===null||current.timer===null){previous=undefined;continue;}
    if(previous?.distance!=null&&previous.timer!=null&&current.distance>=previous.distance&&current.timer>=previous.timer&&current.seconds-previous.seconds<=30){
      while(current.distance>=next&&current.distance>previous.distance&&splits.length<2000){const t=previous.timer+(current.timer-previous.timer)*(next-previous.distance)/(current.distance-previous.distance),duration=t-lastTime;
        if(next-previous.distance>meters*2)break;
        splits.push({number:splits.length+1,seconds:lastTime,duration,distance:next-lastDistance,heartRate:null,cadence:null,ascent:null,pace:duration/(next-lastDistance)*1000,estimated:true});lastTime=t;lastDistance=next;next+=meters;}
    }else if(current.distance>=next){return [];}
    previous=current;
  }
  return splits;
}
