import type {Express} from 'express';
import type {GarminRouteDependencies} from './routes';
import {GarminClient,garminConfig} from './client';
import {GarminSendService,GarminSendError} from './send';
import {calendarDate,courseDraft,planWorkout,type GarminPlanDay} from '../../shared/garminSend';
import {garminHash} from './crypto';
export function registerGarminSendRoutes(app:Express,deps:GarminRouteDependencies){
 const service=async()=>new GarminSendService(await deps.store(),(deps.client??(c=>new GarminClient(c)))((deps.config??garminConfig)()));
 const fail=(res:any,error:unknown)=>res.status(error instanceof GarminSendError?error.status:503).json({message:error instanceof GarminSendError?error.message:'Garmin sending is temporarily unavailable.'});
 const plan=async(userId:number,id:number)=>{if(!Number.isSafeInteger(id)||id<1||!deps.planDays)throw new GarminSendError('Training plan not found.',404);const days=await deps.planDays(userId,id);if(!days)throw new GarminSendError('Training plan not found.',404);return days;};
 const preview=(day:GarminPlanDay,notesOnly:boolean)=>{const date=calendarDate(day.date),converted=planWorkout(day,notesOnly),payload=converted.workout;return {dayId:day.id,date,title:day.title,...converted,hash:garminHash(JSON.stringify({payload,date}))};};
 app.get('/api/garmin/send/status',deps.authenticate,async(req,res)=>{res.set('Cache-Control','private, no-store');try{const s=await service(),id=(req as any).user.id;return res.json({...await s.capabilities(id),history:await s.history(id)});}catch(e){return fail(res,e);}});
 app.get('/api/garmin/send/plans/:id',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');try{const id=(req as any).user.id,days=await plan(id,Number(req.params.id)),s=await service();let start:string,end:string;try{start=calendarDate(String(req.query.start||new Date().toISOString()));end=calendarDate(String(req.query.end||start));}catch{throw new GarminSendError('Choose a valid date range.',400);}if(end<start||Date.parse(end)-Date.parse(start)>30*86400000)throw new GarminSendError('Choose up to 31 days at a time.',400);const items=[];for(const day of days){const date=calendarDate(day.date);if(date<start||date>end||['rest','cross_training'].includes(day.workoutType))continue;try{const value=preview(day,req.query.notes==='true');items.push({...value,status:day.status,receipt:await s.status(id,'workout','day:'+day.id,value.hash)});}catch(e){items.push({dayId:day.id,date:calendarDate(day.date),title:day.title,status:day.status,error:e instanceof GarminSendError?e.message:e instanceof Error?e.message:'Unable to convert workout.'});}}return res.json({items});}catch(e){return fail(res,e);}
 });
 app.post('/api/garmin/send/plans/:id/days/:dayId',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');try{if(req.body?.confirmed!==true)throw new GarminSendError('Review and confirm the workout before sending.',400);const id=(req as any).user.id,days=await plan(id,Number(req.params.id)),day=days.find(d=>d.id===Number(req.params.dayId));if(!day)throw new GarminSendError('Workout not found.',404);if(day.status&&day.status!=='pending')throw new GarminSendError('Only upcoming, pending workouts can be sent.');const value=preview(day,req.body.notesOnly===true),today=calendarDate(req.body.today);const now=Date.now();if(Math.abs(Date.parse(today+'T12:00:00Z')-now)>36*3600000||value.date<today)throw new GarminSendError('Choose an upcoming workout.');const s=await service();return res.json(await s.send(id,'workout','day:'+day.id,value.workout,value.date,req.body.hash));}catch(e){return fail(res,e);}
 });
 app.post('/api/garmin/send/courses/preview',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');try{let course;try{course=courseDraft(req.body?.course);}catch(e){throw new GarminSendError((e as Error).message,400);}const source='route:'+garminHash(JSON.stringify(course.geoPoints.map(p=>[p.latitude,p.longitude]))),hash=garminHash(JSON.stringify({payload:course,date:null}));const s=await service();return res.json({course,source,hash,receipt:await s.status((req as any).user.id,'course',source,hash)});}catch(e){return fail(res,e);}
 });
 app.post('/api/garmin/send/courses',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');try{if(req.body?.confirmed!==true)throw new GarminSendError('Review and confirm the route before sending.',400);let course;try{course=courseDraft(req.body?.course);}catch(e){throw new GarminSendError((e as Error).message,400);}const source='route:'+garminHash(JSON.stringify(course.geoPoints.map(p=>[p.latitude,p.longitude]))),s=await service();return res.json(await s.send((req as any).user.id,'course',source,course,null,req.body.hash));}catch(e){return fail(res,e);}
 });
}
