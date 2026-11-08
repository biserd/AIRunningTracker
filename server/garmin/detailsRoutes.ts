import type {Express} from 'express';
import type {GarminRouteDependencies} from './routes';
import {GarminDetailsStore} from './detailsStore';
import {garminConfig} from './client';
import {garminEqual} from './crypto';
import {GARMIN_DETAIL_CONSENT_VERSION} from '../../shared/garminDetails';
import {parseGarminPush,GARMIN_PUSH_TYPES} from '../../shared/garmin';
import {GarminHealthStore} from './healthStore';
export function registerGarminDetailRoutes(app:Express,deps:GarminRouteDependencies){
 const store=async()=>new GarminDetailsStore((await deps.store()).db,(deps.config??garminConfig)().encryptionKey);
 app.post('/internal/garmin/ingest',async(req,res)=>{
  const secret=process.env.GARMIN_WEBHOOK_SECRET||'';
  if(secret.length<32||!garminEqual(req.get('X-RunAnalytics-Garmin-Internal')||'',secret))return res.sendStatus(404);
  try{
   const base=await deps.store(),legacy=Object.fromEntries(Object.entries(req.body||{}).filter(([kind])=>(GARMIN_PUSH_TYPES as readonly string[]).includes(kind)));
   if(Object.keys(legacy).length){const push=parseGarminPush(legacy);await base.receive(push);await new GarminHealthStore(base.db).receive(push);}
   const detail=Object.fromEntries(Object.entries(req.body||{}).filter(([kind])=>!['activities','manuallyUpdatedActivities','deregistrations','userPermissionsChange'].includes(kind)));
   if(Object.keys(detail).length)await(await store()).receive(detail);
   return res.set('Cache-Control','no-store').sendStatus(200);
  }catch{return res.status(503).json({message:'Garmin detail receipt deferred.'});}
 });
 app.get('/api/garmin/details/status',deps.authenticate,async(req,res)=>{res.set('Cache-Control','private, no-store');try{return res.json(await(await store()).status((req as any).user.id));}catch{return res.status(503).json({message:'Detailed Garmin sync is temporarily unavailable.'});}});
 app.post('/api/garmin/details/consent',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');const {category,consent,version}=req.body||{};
  if(!['activity','recovery','additional'].includes(category)||consent!==true||version!==GARMIN_DETAIL_CONSENT_VERSION)return res.status(400).json({message:'Review the detailed-data sharing notice first.'});
  try{return res.json(await(await store()).enable((req as any).user.id,category));}catch{return res.status(409).json({message:'Enable the corresponding Garmin activity or health sharing first.'});}
 });
 app.delete('/api/garmin/details/consent',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');const {category}=req.body||{};if(!['activity','recovery','additional'].includes(category))return res.sendStatus(400);
  try{const s=await store();await s.disable((req as any).user.id,category);return res.json(await s.status((req as any).user.id));}catch{return res.status(503).json({message:'Detailed sync could not be stopped.'});}
 });
 app.get('/api/garmin/details/run/:id',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');if(!/^[-\w]{1,128}$/.test(req.params.id))return res.sendStatus(400);
  try{return res.json({details:await(await store()).run((req as any).user.id,req.params.id)});}catch{return res.status(503).json({message:'Garmin run details are temporarily unavailable.'});}
 });
 app.get('/api/garmin/details/wellness',deps.authenticate,async(req,res)=>{
  res.set('Cache-Control','private, no-store');const days=Number(req.query.days||28);if(![7,28,90].includes(days))return res.sendStatus(400);
  try{return res.json({records:await(await store()).wellness((req as any).user.id,days)});}catch{return res.status(503).json({message:'Detailed wellness data is temporarily unavailable.'});}
 });
 app.get('/api/garmin/details/export',deps.authenticate,async(req,res)=>{
  res.set({'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="runanalytics-garmin-details.json"'});
  try{const s=await store(),id=(req as any).user.id,activities:unknown[]=[];if(await s.authorized(id,'activity')){const rows=await s.db.prepare("SELECT record_id FROM garmin_detail_records WHERE user_id=? AND kind='activityDetails' ORDER BY calendar_date DESC LIMIT 100").bind(id).all<{record_id:string}>();for(const row of rows.results)activities.push(await s.run(id,row.record_id));}return res.json({source:'Garmin Connect',exportedAt:new Date().toISOString(),activityLimit:100,activities,wellness:await s.wellness(id,90)});}catch{return res.status(503).json({message:'Detailed data export is temporarily unavailable.'});}
 });
}
