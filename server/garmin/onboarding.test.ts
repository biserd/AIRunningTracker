import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type {AddressInfo} from 'node:net';
import type {GarminRun} from '../../shared/garmin';
import {garminRunPreview} from '../../shared/garminOnboarding';
import {registerGarminOnboarding} from './onboarding';
const now=Date.parse('2026-11-09T12:00:00Z');
const run:GarminRun={id:'123',name:'Fixture run',type:'RUNNING',startDate:'2026-11-08T12:00:00Z',offsetSeconds:0,distance:5000,duration:1800,averageSpeed:5000/1800,averageHeartRate:150,maxHeartRate:null,cadence:null,elevationGain:null,calories:null,device:null,manual:false};
test('Garmin preview uses recorded arithmetic in account units, never an effort diagnosis',()=>{
  const km=garminRunPreview([run],'km',now)!;
  assert.match(km.findings[0],/5.00 km in 30:00/);assert.match(km.findings[0],/6:00 \/km/);assert.match(km.findings[1],/150 bpm/);
  assert.match(garminRunPreview([run],'miles',now)!.findings[0],/3.11 mi/);
  assert.equal(km.kind,'rules_based_garmin');assert.match(km.nextAction,/not AI/);assert.equal(km.detailUrl,'/runs/garmin/123');
  assert.doesNotMatch(JSON.stringify(km),/Garmin user|access_token|recoveryScore|sleep|coordinates/);
});
test('missing sensors are not inferred; invalid, old, tiny and future runs do not fabricate a preview',()=>{
  for(const changed of [{distance:999},{duration:0},{distance:NaN},{startDate:'invalid'},{startDate:'2026-11-10T00:00:00Z'},{startDate:'2026-01-01T00:00:00Z'}])assert.equal(garminRunPreview([{...run,...changed}],'km',now),null);
  const p=garminRunPreview([{...run,averageHeartRate:null,elevationGain:null}],'km',now)!;assert.match(p.findings[1],/not estimated/);
  assert.match(garminRunPreview([{...run,averageHeartRate:null,elevationGain:100}],'miles',now)!.findings[1],/328 ft/);
  assert.equal(garminRunPreview([],'km',now),null);
});
test('onboarding is owner scoped, private, available to free users and clears preview after consent withdrawal',async()=>{
  const app=express();let connected=true,reads:number[]=[],revoke=false;
  const store={status:async(id:number)=>{reads.push(id);return {connected,status:connected?'connected':'not_connected',activityCount:connected?1:0};},activities:async(id:number)=>{reads.push(id);if(revoke)connected=false;return [run];}};
  registerGarminOnboarding(app,{authenticate:(req,res,next)=>{if(req.headers.authorization!=='Bearer test')return void res.sendStatus(401);(req as any).user={id:7};next();},store:async()=>store as any,user:async id=>{assert.equal(id,7);return {email:null,unitPreference:'km',subscriptionPlan:'free'};},now:()=>now});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/garmin/onboarding?userId=99';
  try{
    assert.equal((await fetch(url)).status,401);
    const response=await fetch(url,{headers:{Authorization:'Bearer test'}});assert.match(response.headers.get('cache-control')!,/private, no-store/);const body=await response.json();
    assert.equal(body.state,'ready');assert.equal(body.hasPremium,false);assert.equal(body.hasEmail,false);assert.equal(body.preview.kind,'rules_based_garmin');assert.ok(reads.every(id=>id===7));
    revoke=true;const withdrawn=await(await fetch(url,{headers:{Authorization:'Bearer test'}})).json();assert.equal(withdrawn.state,'not_connected');assert.equal(withdrawn.preview,null);assert.equal(withdrawn.activityCount,0);
  }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
