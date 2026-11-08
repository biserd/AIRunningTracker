import type {GarminRun} from './garmin';
export type RunSource='garmin'|'strava'|'phone';
export interface FeedRun {
  id:string; source:RunSource; sources:RunSource[]; name:string; startDate:string; type:string;
  distance:number; movingTime:number; elapsedTime:number|null; averageSpeed:number;
  averageHeartrate:number|null; totalElevationGain:number|null; grade:string|null;
  garminActivityId:string|null; stravaRecordId:number|null; detailUrl:string; deleteUrl:string;
  effort?:number;notes?:string;splits?:unknown;laps?:unknown;
  manual?:boolean; possibleDuplicate?:boolean;
  separateMatch?:{stravaRecordId:number;garminActivityId:string};
}
export function garminFeedRun(run:GarminRun):FeedRun {
  return {id:'garmin:'+run.id,source:'garmin',sources:['garmin'],name:run.name,startDate:run.startDate,type:'Run',distance:run.distance,movingTime:run.duration,elapsedTime:run.duration,averageSpeed:run.averageSpeed,averageHeartrate:run.averageHeartRate,totalElevationGain:run.elevationGain,grade:null,garminActivityId:run.id,stravaRecordId:null,detailUrl:'/runs/garmin/'+encodeURIComponent(run.id),deleteUrl:'/api/garmin/activities/'+encodeURIComponent(run.id),manual:run.manual};
}
function near(a:FeedRun,b:FeedRun) {
  return !a.manual&&!b.manual&&a.distance>0&&b.distance>0&&Math.abs(Date.parse(a.startDate)-Date.parse(b.startDate))<=60_000&&Math.abs(a.distance-b.distance)<=Math.max(25,Math.max(a.distance,b.distance)*0.02);
}
function sameRun(a:FeedRun,b:FeedRun) {
  if(!near(a,b)||a.movingTime<=0||b.movingTime<=0)return false;
  return [b.movingTime,b.elapsedTime].some(duration=>duration!==null&&duration>0&&Math.abs(a.movingTime-duration)<=Math.max(60,Math.max(a.movingTime,duration)*0.05));
}
/** Merge only mutual, unique cross-provider matches. Never delete or alter a source. */
export function mergeRunningFeed(strava:FeedRun[],garmin:FeedRun[],exclusions:{strava_record_id:number;garmin_activity_id:string}[]=[]):FeedRun[] {
  const left=strava.map(run=>({...run,sources:[...run.sources]})),right=garmin.map(run=>({...run,sources:[...run.sources]}));
  const candidates=new Map<string,FeedRun[]>(),reverse=new Map<string,FeedRun[]>();
  const separated=new Set(exclusions.map(pair=>pair.strava_record_id+':'+pair.garmin_activity_id));
  const chronological=[...left].sort((a,b)=>Date.parse(a.startDate)-Date.parse(b.startDate));
  let first=0;
  for(const g of [...right].sort((a,b)=>Date.parse(a.startDate)-Date.parse(b.startDate))){
    const at=Date.parse(g.startDate);
    while(first<chronological.length&&Date.parse(chronological[first].startDate)<at-60_000)first++;
    for(let i=first;i<chronological.length&&Date.parse(chronological[i].startDate)<=at+60_000;i++){
      const s=chronological[i];
      if(separated.has(s.stravaRecordId+':'+g.garminActivityId)){
        const pair={stravaRecordId:s.stravaRecordId!,garminActivityId:g.garminActivityId!};s.separateMatch=pair;g.separateMatch=pair;continue;
      }
      if(!near(g,s))continue;
      g.possibleDuplicate=true;s.possibleDuplicate=true;
      if(sameRun(g,s)){candidates.set(g.id,[...(candidates.get(g.id)||[]),s]);reverse.set(s.id,[...(reverse.get(s.id)||[]),g]);}
    }
  }
  const consumed=new Set<string>();
  for(const g of right){const matches=candidates.get(g.id)||[];
    if(matches.length===1&&(reverse.get(matches[0].id)||[]).length===1){
      const s=matches[0];s.sources=['strava','garmin'];s.garminActivityId=g.garminActivityId;s.possibleDuplicate=false;consumed.add(g.id);
    }
  }
  return [...left,...right.filter(run=>!consumed.has(run.id))].sort((a,b)=>Date.parse(b.startDate)-Date.parse(a.startDate)||a.id.localeCompare(b.id));
}
export function sourceLabel(run:Pick<FeedRun,'sources'|'possibleDuplicate'>) {
  return run.sources[0]==='phone'?'RunAnalytics':run.sources.length===2?'Strava + Garmin · counted once':run.sources[0]==='garmin'?'Garmin':'Strava';
}
