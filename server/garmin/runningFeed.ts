import type {Express,RequestHandler} from 'express';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import {garminFeedRun,mergeRunningFeed,type FeedRun} from '../../shared/runningFeed';
import type {GarminRun} from '../../shared/garmin';
import {FREE_ACTIVITY_LIMIT,hasPremiumAccess} from '../../shared/entitlements';
import {getDashboardCalendarPeriods,getLastMonthComparisonEnd,partitionDashboardActivities} from '../services/dashboardPeriods';
interface StravaRow {id:number;name:string;start_date:string;type:string;distance:number;moving_time:number;elapsed_time:number|null;average_speed:number;average_heartrate:number|null;total_elevation_gain:number|null;cached_grade:string|null;locked_for_free:number|null;}
function stravaRun(row:StravaRow):FeedRun {
  return {id:'strava:'+row.id,source:'strava',sources:['strava'],stravaRecordId:row.id,garminActivityId:null,name:row.name,startDate:row.start_date,type:row.type,distance:row.distance,movingTime:row.moving_time,elapsedTime:row.elapsed_time,averageSpeed:row.average_speed,averageHeartrate:row.average_heartrate,totalElevationGain:row.total_elevation_gain,grade:row.cached_grade,detailUrl:'/activity/'+row.id,deleteUrl:'/api/activities/'+row.id};
}
export class RunningFeed {
  constructor(private db:AtomicSqlDatabase){}
  async read(userId:number){
    const user=await this.db.prepare('SELECT unit_preference,subscription_plan,subscription_status,strava_connected FROM users WHERE id=?').bind(userId).first<{unit_preference:string;subscription_plan:string|null;subscription_status:string|null;strava_connected:number}>();
    if(!user)throw new Error('RUNNER_NOT_FOUND');
    const cap=hasPremiumAccess({subscriptionPlan:user.subscription_plan,subscriptionStatus:user.subscription_status})?null:FREE_ACTIVITY_LIMIT;
    const strava:FeedRun[]=[];
    // Fetch bounded transport pages, not a truncated history. Deduplicate before
    // distance/date filtering or pagination so page boundaries cannot double-count.
    for(let offset=0;;offset+=1000){
      const rows=await this.db.prepare(`SELECT id,name,start_date,type,distance,moving_time,elapsed_time,average_speed,average_heartrate,total_elevation_gain,cached_grade,locked_for_free FROM activities
        WHERE user_id=? AND type IN ('Run','TrailRun','VirtualRun') AND (?=0 OR coalesce(locked_for_free,0)=0) ORDER BY start_date DESC,id DESC LIMIT 1000 OFFSET ?`).bind(userId,cap===null?0:1,offset).all<StravaRow>();
      strava.push(...rows.results.map(stravaRun));if(rows.results.length<1000)break;
    }
    const connection=await this.db.prepare('SELECT status FROM garmin_connections WHERE user_id=?').bind(userId).first<{status:string}>();
    const garmin:FeedRun[]=[];
    if(connection&&!['not_connected','disconnect_pending'].includes(connection.status)){
      for(let offset=0;;offset+=1000){
        const rows=await this.db.prepare('SELECT summary FROM garmin_activity_summaries WHERE user_id=? ORDER BY start_date DESC,activity_id DESC LIMIT 1000 OFFSET ?').bind(userId,offset).all<{summary:string}>();
        garmin.push(...rows.results.map(row=>garminFeedRun(JSON.parse(row.summary) as GarminRun)));if(rows.results.length<1000)break;
      }
    }
    const exclusions=await this.db.prepare('SELECT strava_record_id,garmin_activity_id FROM garmin_run_match_exclusions WHERE user_id=?').bind(userId).all<{strava_record_id:number;garmin_activity_id:string}>();
    return {unitPreference:user.unit_preference||'km',garminConnected:connection?.status==='connected',stravaConnected:!!user.strava_connected,
      all:mergeRunningFeed(strava,garmin,exclusions.results),visible:mergeRunningFeed(cap===null?strava:strava.slice(0,cap),garmin,exclusions.results),freeTier:cap!==null&&strava.length>cap?{capped:true as const,limit:cap,source:'strava'}:undefined};
  }
}
const distance=(rows:FeedRun[])=>rows.reduce((sum,row)=>sum+row.distance,0);
const duration=(rows:FeedRun[])=>rows.reduce((sum,row)=>sum+row.movingTime,0);
function pace(meters:number,seconds:number,divisor:number){if(meters<=0||seconds<=0)return '—';const total=Math.round(seconds/meters*divisor);return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;}
export function runningOverview(rows:FeedRun[],units:string,range:string,now=new Date()){
  const divisor=units==='miles'?1609.344:1000,p=getDashboardCalendarPeriods(now),periods=partitionDashboardActivities(rows,p);
  const previousMonth=periods.lastMonth.filter(row=>new Date(row.startDate)<=getLastMonthComparisonEnd(p));
  const change=(current:number,previous:number)=>previous>0?Math.round((current-previous)/previous*100):null;
  const month=periods.thisMonth,week=periods.thisWeek,lastWeek=periods.lastWeek;
  const stats={asOf:now.toISOString(),unitPreference:units,recovery:'See Recovery',
    monthlyTotalDistance:(distance(month)/divisor).toFixed(1),monthlyAvgPace:pace(distance(month),duration(month),divisor),monthlyTotalMinutes:Math.round(duration(month)/60),monthlyTotalActivities:month.length,monthlyPreviousActivities:previousMonth.length,
    weeklyTotalDistance:(distance(week)/divisor).toFixed(1),weeklyAvgPace:pace(distance(week),duration(week),divisor),weeklyTotalMinutes:Math.round(duration(week)/60),weeklyTotalActivities:week.length,weeklyPreviousActivities:lastWeek.length,
    monthlyDistanceChange:change(distance(month),distance(previousMonth)),monthlyActivitiesChange:change(month.length,previousMonth.length),monthlyRunningTimeChange:change(duration(month),duration(previousMonth)),monthlyPaceChange:null,
    weeklyDistanceChange:change(distance(week),distance(lastWeek)),weeklyActivitiesChange:change(week.length,lastWeek.length),weeklyRunningTimeChange:change(duration(week),duration(lastWeek)),weeklyPaceChange:null,
    totalDistance:(distance(month)/divisor).toFixed(1),avgPace:pace(distance(month),duration(month),divisor),runningTimeMinutes:Math.round(duration(month)/60),totalActivities:month.length};
  const start=new Date(now);start.setHours(0,0,0,0);
  if(range==='year')start.setMonth(0,1);else if(range==='1year')start.setFullYear(start.getFullYear()-1);else start.setDate(start.getDate()-({'7days':6,'30days':29,'3months':89,'6months':179}[range]??29));
  const buckets=new Map<string,FeedRun[]>();
  for(const row of rows){const date=new Date(row.startDate);if(date<start||date>now)continue;
    if(range==='year'||range==='1year')date.setDate(1);else if(range!=='7days')date.setDate(date.getDate()-(date.getDay()+6)%7);
    const key=date.toISOString().slice(0,10);buckets.set(key,[...(buckets.get(key)||[]),row]);
  }
  const chartData=Array.from(buckets).sort(([a],[b])=>a.localeCompare(b)).map(([key,runs])=>({week:key,pace:distance(runs)>0?duration(runs)/60/(distance(runs)/divisor):null,distance:distance(runs)/divisor}));
  return {stats,chartData};
}
export function registerRunningFeed(app:Express,deps:{authenticate:RequestHandler;db:()=>Promise<AtomicSqlDatabase>;now?:()=>Date}){
  const read=async(userId:number)=>new RunningFeed(await deps.db()).read(userId);
  app.get('/api/runs/overview',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');const range=String(req.query.range||'30days');
    if(!['7days','30days','3months','6months','year','1year'].includes(range))return res.status(400).json({message:'Invalid date range.'});
    try{const feed=await read((req as any).user.id);return res.json({...runningOverview(feed.all,feed.unitPreference,range,deps.now?.()||new Date()),recent:feed.visible.slice(0,10),garminConnected:feed.garminConnected,stravaConnected:feed.stravaConnected,unitPreference:feed.unitPreference});}
    catch{return res.status(503).json({message:'Your running overview is temporarily unavailable.'});}
  });
  app.get('/api/runs/calendar',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    try{const feed=await read((req as any).user.id),now=deps.now?.()||new Date(),start=new Date(now);start.setMonth(start.getMonth()-6);start.setHours(0,0,0,0);
      const days=[];for(let at=new Date(start);at<=now;at.setDate(at.getDate()+1)){const date=at.toISOString().slice(0,10),runs=feed.visible.filter(run=>run.startDate.slice(0,10)===date&&new Date(run.startDate)<=now);days.push({date,totalDistanceKm:distance(runs)/1000,activities:runs.map(run=>({id:run.id,name:run.name,distanceKm:run.distance/1000,detailUrl:run.detailUrl}))});}
      return res.json({days,maxDistance:Math.max(0,...days.map(day=>day.totalDistanceKm)),rangeStart:start.toISOString(),rangeEnd:now.toISOString(),unitPreference:feed.unitPreference,combinedSources:true,hasStrava:feed.visible.some(run=>run.sources.includes('strava'))});
    }catch{return res.status(503).json({message:'Your activity calendar is temporarily unavailable.'});}
  });
  app.get('/api/runs/garmin/:id',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');if(!/^[\w-]{1,128}$/.test(req.params.id))return res.sendStatus(400);
    try{const db=await deps.db(),row=await db.prepare(`SELECT s.summary FROM garmin_activity_summaries s JOIN garmin_connections c ON c.user_id=s.user_id
      WHERE s.user_id=? AND s.activity_id=? AND c.status NOT IN ('not_connected','disconnect_pending')`).bind((req as any).user.id,req.params.id).first<{summary:string}>();
      return row?res.json({activity:garminFeedRun(JSON.parse(row.summary))}):res.status(404).json({message:'Garmin run not found.'});
    }catch{return res.status(503).json({message:'Your Garmin run is temporarily unavailable.'});}
  });
  app.get('/api/runs',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    const page=Number(req.query.page||1),pageSize=Number(req.query.pageSize||25),min=req.query.minDistance===undefined?undefined:Number(req.query.minDistance),max=req.query.maxDistance===undefined?undefined:Number(req.query.maxDistance);
    const start=req.query.startDate===undefined?undefined:String(req.query.startDate),end=req.query.endDate===undefined?undefined:String(req.query.endDate);
    if(!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100||[min,max].some(value=>value!==undefined&&(!Number.isFinite(value)||value<0))||(min!==undefined&&max!==undefined&&min>max)||[start,end].some(value=>value!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))||(start&&end&&start>end))return res.status(400).json({message:'Invalid activity filters.'});
    try{const feed=await read((req as any).user.id),divisor=feed.unitPreference==='miles'?1609.344:1000;
      const filtered=feed.visible.filter(run=>(min===undefined||run.distance>=min*divisor)&&(max===undefined||run.distance<=max*divisor)&&(!start||run.startDate>=start)&&(!end||run.startDate<=end+'T23:59:59.999Z'));
      return res.json({activities:filtered.slice((page-1)*pageSize,page*pageSize),total:filtered.length,page,pageSize,totalPages:Math.ceil(filtered.length/pageSize),freeTier:feed.freeTier,unitPreference:feed.unitPreference,garminConnected:feed.garminConnected,stravaConnected:feed.stravaConnected});
    }catch{return res.status(503).json({message:'Your activities are temporarily unavailable.'});}
  });
  for(const method of ['post','delete'] as const)app[method]('/api/runs/keep-separate',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');const {stravaRecordId,garminActivityId}=req.body||{};
    if(!Number.isSafeInteger(stravaRecordId)||stravaRecordId<=0||typeof garminActivityId!=='string'||! /^[\w-]{1,128}$/.test(garminActivityId))return res.status(400).json({message:'Invalid source copies.'});
    try{const db=await deps.db(),userId=(req as any).user.id;
      if(method==='delete'){await db.prepare('DELETE FROM garmin_run_match_exclusions WHERE user_id=? AND strava_record_id=? AND garmin_activity_id=?').bind(userId,stravaRecordId,garminActivityId).run();return res.json({separated:false});}
      const result=await db.prepare(`INSERT INTO garmin_run_match_exclusions(user_id,strava_record_id,garmin_activity_id,created_at)
        SELECT a.user_id,a.id,g.activity_id,? FROM activities a JOIN garmin_activity_summaries g ON g.user_id=a.user_id
        WHERE a.user_id=? AND a.id=? AND g.activity_id=?
        ON CONFLICT(user_id,strava_record_id,garmin_activity_id) DO UPDATE SET created_at=excluded.created_at`).bind(new Date().toISOString(),userId,stravaRecordId,garminActivityId).run();
      return result.meta.changes===1?res.json({separated:true}):res.status(404).json({message:'Source copies not found.'});
    }catch{return res.status(503).json({message:'The matching preference could not be saved.'});}
  });
}
