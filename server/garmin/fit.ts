// Garmin's official SDK applies FIT scales/offsets; no third-party decoder service.
import {Decoder,Stream} from '@garmin/fitsdk';
import {normalizeRunDetails,finite,type GarminRunDetails} from '../../shared/garminDetails';
const timestamp=(v:any)=>v instanceof Date?v.getTime()/1000:null;
const steps=(v:any,fraction:any)=>typeof v==='number'?(v+(typeof fraction==='number'?fraction:0))*2:undefined;
export function decodeGarminFit(bytes:Uint8Array,metadata:Record<string,any>):GarminRunDetails|null{
  const decoder=new Decoder(Stream.fromByteArray(bytes));
  if(!decoder.isFIT()||!decoder.checkIntegrity())throw new Error('INVALID_GARMIN_FIT');
  const {messages,errors}=decoder.read({includeUnknownData:false,convertDateTimesToDates:true,applyScaleAndOffset:true,convertTypesToStrings:true});
  if(errors.length)throw new Error('INVALID_GARMIN_FIT');
  const sessions=(messages.sessionMesgs||[]).filter((s:any)=>s.sport==='running');
  // Never flatten multisport sessions into a fictitious single run.
  if(sessions.length!==1)return null;
  const s=sessions[0],start=timestamp(s.startTime);if(start===null)throw new Error('INVALID_GARMIN_FIT');
  const elapsed=finite(s.totalElapsedTime,0,2592000);
  const end=timestamp(s.timestamp)??(elapsed===null?null:start+elapsed);
  if(end===null||!Number.isFinite(end)||end<start)throw new Error('INVALID_GARMIN_FIT');
  const events=(messages.eventMesgs||[]).filter((e:any)=>e.event==='timer'&&timestamp(e.timestamp)!==null).sort((a:any,b:any)=>timestamp(a.timestamp)!-timestamp(b.timestamp)!);
  const timer=(at:number)=>{let stopped:number|null=null,pause=0;for(const event of events){const time=timestamp(event.timestamp)!;if(time<start||time>at)continue;if(String(event.eventType).startsWith('stop')){if(stopped===null)stopped=time;}else if(event.eventType==='start'&&stopped!==null){pause+=time-stopped;stopped=null;}}return at-start-pause-(stopped===null?0:at-stopped);};
  const result=normalizeRunDetails({activityId:metadata.activityId,summaryId:metadata.summaryId,summary:{...metadata,activityType:'RUNNING',startTimeInSeconds:start,durationInSeconds:s.totalTimerTime??s.totalElapsedTime,distanceInMeters:s.totalDistance,averageSpeedInMetersPerSecond:s.enhancedAvgSpeed??s.avgSpeed,averageHeartRateInBeatsPerMinute:s.avgHeartRate,maxHeartRateInBeatsPerMinute:s.maxHeartRate,averageRunCadenceInStepsPerMinute:steps(s.avgCadence,s.avgFractionalCadence),totalElevationGainInMeters:s.totalAscent,activeKilocalories:s.totalCalories},
    samples:(messages.recordMesgs||[]).filter((r:any)=>{const t=timestamp(r.timestamp);return t!==null&&t>=start&&t<=end;}).map((r:any)=>({startTimeInSeconds:timestamp(r.timestamp),latitudeInDegree:typeof r.positionLat==='number'?r.positionLat*180/2147483648:null,longitudeInDegree:typeof r.positionLong==='number'?r.positionLong*180/2147483648:null,elevationInMeters:r.enhancedAltitude??r.altitude,heartRate:r.heartRate,stepsPerMinute:steps(r.cadence,r.fractionalCadence),speedMetersPerSecond:r.enhancedSpeed??r.speed,totalDistanceInMeters:r.distance,timerDurationInSeconds:timer(timestamp(r.timestamp)!),powerInWatts:r.power,airTemperatureCelcius:r.temperature,verticalOscillation:r.verticalOscillation,groundContactTime:r.stanceTime,strideLength:typeof r.stepLength==='number'?r.stepLength/1000:null,stamina:r.stamina})),laps:[]});
  if(!result)return null;
  result.format='FIT';result.trainingEffect=finite(s.totalTrainingEffect,0,5);result.anaerobicTrainingEffect=finite(s.totalAnaerobicTrainingEffect,0,5);
  result.laps=(messages.lapMesgs||[]).filter((l:any)=>{const t=timestamp(l.startTime);return t!==null&&t>=start&&t<end;}).map((l:any,index:number)=>{const distance=finite(l.totalDistance,0,2000000),duration=finite(l.totalTimerTime,0,2592000);return {number:index+1,seconds:(timestamp(l.startTime)??start)-start,duration,distance,heartRate:finite(l.avgHeartRate,1,300),cadence:finite(steps(l.avgCadence,l.avgFractionalCadence),0,400),ascent:finite(l.totalAscent,0,100000),pace:distance&&duration?duration/distance*1000:null,estimated:false};});
  return result;
}
