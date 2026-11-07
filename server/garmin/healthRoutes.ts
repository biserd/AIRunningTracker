import type {Express} from 'express';
import type {GarminRouteDependencies} from './routes';
import {garminConfig} from './client';
import {GarminHealthStore} from './healthStore';
import {GARMIN_HEALTH_CONSENT_VERSION} from '../../shared/garminHealth';
export function registerGarminHealthRoutes(app:Express,deps:GarminRouteDependencies){
  const store=async()=>{(deps.config??garminConfig)();return new GarminHealthStore((await deps.store()).db);};
  app.get('/api/garmin/health/status',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    try{return res.json(await(await store()).status((req as any).user.id));}catch{return res.status(503).json({message:'Garmin health sync is temporarily unavailable.'});}
  });
  app.post('/api/garmin/health/consent',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    if(req.body?.healthConsent!==true||req.body?.version!==GARMIN_HEALTH_CONSENT_VERSION)return res.status(400).json({message:'Please review and agree to health and sleep sharing.'});
    try{return res.json(await(await store()).enable((req as any).user.id));}catch(error){return res.status(error instanceof Error&&error.message==='GARMIN_HEALTH_PERMISSION_REQUIRED'?409:503).json({message:'Connect Garmin and allow health sharing before enabling this dashboard.'});}
  });
  app.delete('/api/garmin/health/consent',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    try{return res.json(await(await store()).disable((req as any).user.id));}catch{return res.status(503).json({message:'Health sync could not be stopped. Please try again.'});}
  });
  app.get('/api/garmin/health/recovery',deps.authenticate,async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    const days=Number(req.query.days??28),timezone=typeof req.query.timezone==='string'?req.query.timezone:'UTC';
    if(![7,28].includes(days)||timezone.length>80)return res.status(400).json({message:'Invalid dashboard range or time zone.'});
    try{new Intl.DateTimeFormat('en-CA',{timeZone:timezone}).format();}catch{return res.status(400).json({message:'Invalid time zone.'});}
    try{return res.json(await(await store()).recovery((req as any).user.id,days,timezone));}catch{return res.status(503).json({message:'Recovery data is temporarily unavailable. Please try again.'});}
  });
  app.get('/api/garmin/health/export',deps.authenticate,async(req,res)=>{
    res.set({'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="runanalytics-garmin-health.json"'});
    try{const health=await store(),userId=(req as any).user.id,status=await health.status(userId);return res.json({source:'Garmin Connect',exportedAt:new Date().toISOString(),retentionDays:90,summaries:status.enabled?await health.records(userId):[],limit:2000});}
    catch{return res.status(503).json({message:'Health export is temporarily unavailable.'});}
  });
}
