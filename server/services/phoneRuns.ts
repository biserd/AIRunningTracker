import type {Express,RequestHandler} from 'express';
import {z} from 'zod';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {FeedRun} from '../../shared/runningFeed';
const uuid=z.string().uuid();
const split=z.object({number:z.number().int().min(1).max(1000),distance:z.number().finite().min(0).max(1_000_000),seconds:z.number().finite().min(0).max(7*86400)}).strict();
export const phoneRunInput=z.object({
  id:uuid, name:z.string().trim().min(1).max(120),
  startDate:z.string().datetime({offset:true}),
  distance:z.number().finite().min(0).max(1_000_000),
  movingTime:z.number().int().min(1).max(7*86400),
  effort:z.number().int().min(1).max(10).optional(),notes:z.string().max(2000).optional(),
  averageHeartrate:z.number().int().min(25).max(250).optional(),splits:z.array(split).max(1000).optional(),laps:z.array(split).max(1000).optional(),
  elapsedTime:z.number().int().min(1).max(7*86400),
}).strict().refine(run=>run.elapsedTime>=run.movingTime,'Elapsed time cannot be shorter than running time.');
export interface PhoneRunRow {id:string;name:string;start_date:string;distance:number;moving_time:number;elapsed_time:number;metadata?:string;}
export function phoneFeedRun(row:PhoneRunRow):FeedRun {
  const details=JSON.parse(row.metadata||'{}') as {effort?:number;notes?:string;averageHeartrate?:number;splits?:unknown;laps?:unknown};
  return {effort:details.effort,notes:details.notes,splits:details.splits,laps:details.laps,id:'phone:'+row.id,source:'phone',sources:['phone'],name:row.name,startDate:row.start_date,type:'Run',distance:row.distance,movingTime:row.moving_time,elapsedTime:row.elapsed_time,averageSpeed:row.distance/row.moving_time,
    averageHeartrate:details.averageHeartrate??null,totalElevationGain:null,grade:null,garminActivityId:null,stravaRecordId:null,detailUrl:'/runs/phone/'+row.id,deleteUrl:'/api/native/runs/'+row.id};
}
export function registerPhoneRuns(app:Express,deps:{authenticate:RequestHandler;db:()=>Promise<AtomicSqlDatabase>;now?:()=>Date}) {
  app.post('/api/native/runs',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    const input=phoneRunInput.safeParse(req.body),now=deps.now?.()??new Date();
    if(!input.success || Date.parse(input.data.startDate)>now.getTime()+300_000)return res.status(400).json({message:'Invalid run summary.'});
    const run=input.data,owner=(req as any).user.id,start=new Date(run.startDate).toISOString();
    const metadata=JSON.stringify({effort:run.effort,notes:run.notes,averageHeartrate:run.averageHeartrate,splits:run.splits,laps:run.laps});
    try {
      const db=await deps.db();
      // Retries after an interrupted response must never insert a second run or overwrite one.
      await db.prepare('INSERT INTO phone_runs(user_id,id,name,start_date,distance,moving_time,elapsed_time,created_at,metadata) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO NOTHING')
        .bind(owner,run.id.toLowerCase(),run.name,start,run.distance,run.movingTime,run.elapsedTime,now.toISOString(),metadata).run();
      const saved=await db.prepare('SELECT * FROM phone_runs WHERE user_id=? AND id=?').bind(owner,run.id.toLowerCase()).first<PhoneRunRow>();
      if(!saved)throw new Error('RUN_NOT_SAVED');
      if(saved.name!==run.name||saved.start_date!==start||saved.distance!==run.distance||saved.moving_time!==run.movingTime||saved.elapsed_time!==run.elapsedTime||(saved.metadata||'{}')!==metadata)return res.status(409).json({message:'This recording ID already belongs to a different saved run.'});
      return res.json({activity:phoneFeedRun(saved)});
    }catch{return res.status(503).json({message:'Your run could not sync yet. Your device can retry safely.'});}
  });
  app.get('/api/runs/phone/:id',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    if(!uuid.safeParse(req.params.id).success)return res.sendStatus(400);
    try {const row=await (await deps.db()).prepare('SELECT * FROM phone_runs WHERE user_id=? AND id=?').bind((req as any).user.id,req.params.id.toLowerCase()).first<PhoneRunRow>();
      return row?res.json({activity:phoneFeedRun(row)}):res.sendStatus(404);
    }catch{return res.status(503).json({message:'Run unavailable. Please retry.'});}
  });
  app.delete('/api/native/runs/:id',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    if(!uuid.safeParse(req.params.id).success)return res.sendStatus(400);
    try {await (await deps.db()).prepare('DELETE FROM phone_runs WHERE user_id=? AND id=?').bind((req as any).user.id,req.params.id.toLowerCase()).run();return res.json({deleted:true});}
    catch{return res.status(503).json({message:'Run could not be deleted. Please retry.'});}
  });
}
