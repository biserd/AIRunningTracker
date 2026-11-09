import type {Express,RequestHandler} from 'express';
import {hasPremiumAccess,type EntitlementSubject} from '../../shared/entitlements';
import {garminRunPreview,type GarminOnboarding} from '../../shared/garminOnboarding';
import type {GarminStore} from './store';

export function registerGarminOnboarding(app:Express,deps:{authenticate:RequestHandler;store:()=>Promise<GarminStore>;user:(id:number)=>Promise<(EntitlementSubject&{email?:string|null;unitPreference?:string|null})|undefined>;now?:()=>number}) {
  app.get('/api/garmin/onboarding',deps.authenticate,async(req,res)=>{
    res.set({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
    try {
      const user=await deps.user((req as any).user.id);
      if(!user)return res.status(401).json({message:'Sign in again.'});
      const store=await deps.store(),status=await store.status((req as any).user.id,true);
      const runs=status.connected?await store.activities((req as any).user.id,100):[];
      const current=await store.status((req as any).user.id,true);
      const preview=current.connected?garminRunPreview(runs,user.unitPreference,deps.now?.()):null;
      const result:GarminOnboarding={connected:current.connected,connectionStatus:current.status,activityCount:current.connected?current.activityCount:0,hasEmail:!!user.email,hasPremium:hasPremiumAccess(user),state:!current.connected?'not_connected':preview?'ready':'waiting_for_run',preview};
      return res.json(result);
    } catch {return res.status(503).json({message:'Your Garmin setup could not load. Please try again.'});}
  });
}
