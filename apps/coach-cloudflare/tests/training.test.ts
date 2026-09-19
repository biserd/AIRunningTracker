import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trainingContext} from '../worker/training-context';
import {validatePlanIntent,draftPlan,confirmPlan} from '../worker/plan-actions';
import {voiceInstructions} from '../worker/coach-instructions';
import {fixture} from './reminder-fixture';
import {seed} from '../shared/coach';
import type {AccountSnapshot} from '../worker/account';
import type {TrainingContext} from '../shared/training';
const account:AccountSnapshot={runner:{id:105,name:'Runner',timezone:'UTC',unitPreference:'km'},canUseAI:true,state:{...seed(),source:'production_account'}};
const context:TrainingContext={loadedAt:'2026-09-14',profile:{},plans:[{id:76,status:'active',weeks:[{weekEndDate:new Date(Date.now()+7*86400000).toISOString(),days:[{workoutType:'easy',status:'pending',date:new Date(Date.now()+86400000).toISOString()}]}]}],goals:[],metrics:{},unavailable:[],canWritePlans:true,coverage:'test'};
test('full active plan context is owner-scoped, preloaded for voice, and omits secrets',async()=>{
  const urls:string[]=[];
  const env={BACKEND:{fetch:async(url:string,init:RequestInit)=>{
    urls.push(url);assert.equal(new Headers(init.headers).get('Authorization'),'Bearer synthetic');
    if(url.endsWith('/api/user'))return Response.json({id:105,email:'biserd@gmail.com',firstName:'Runner',stravaAccessToken:'SECRET'});
    if(url.endsWith('/api/training/plans'))return Response.json([{id:76,userId:105,status:'active'},{id:99,userId:999,status:'active'}]);
    if(url.endsWith('/plans/76'))return Response.json({id:76,userId:105,weeks:[{weekNumber:18,days:[{id:11,planId:76,title:'Race day',description:'Full race strategy',targetPace:'5:00/km',workoutStructure:{main:'Race'}},{id:12,planId:999,title:'FOREIGN'}]}]});
    if(url.includes('/recovery/'))return new Response('',{status:503});
    return Response.json({});
  }}} as unknown as Env;
  const result=await trainingContext(env,'synthetic',account);
  assert.equal(result.canWritePlans,true);assert.equal(result.plans.length,1);
  assert.ok(JSON.stringify(result).includes('Race day'));assert.ok(result.unavailable.includes('recovery'));
  assert.ok(!JSON.stringify(result).includes('SECRET'));assert.ok(!JSON.stringify(result).includes('biserd@gmail.com'));assert.ok(!JSON.stringify(result).includes('FOREIGN'));
  assert.ok(!urls.some(u=>u.includes('999')||u.endsWith('/99')));
  const prompt=voiceInstructions({...account.state,trainingContext:result});assert.ok(prompt.includes('Delegate detailed training'));assert.ok(JSON.stringify(result).includes('Full race strategy'));
  const other=await trainingContext(env,'synthetic',{...account,runner:{...account.runner,id:106}});assert.equal(other.canWritePlans,false);
});
test('precise workout edits validate operation, duration, ownership and occupied dates',()=>{
 const day=new Date(Date.now()+86400000).toISOString().slice(0,10),rest=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
 const c={...context,plans:[{id:76,status:'active',weeks:[{days:[{id:1,date:day,workoutType:'easy',status:'pending',plannedDurationMins:40},{id:2,date:rest,workoutType:'rest',status:'pending'}]}]}]};
 const intent={kind:'workout',planId:76,dayId:1,operation:'shorten',minutes:25,date:null};
 assert.deepEqual(validatePlanIntent(intent,c),intent);
 assert.throws(()=>validatePlanIntent({...intent,minutes:50},c));
 assert.throws(()=>validatePlanIntent({...intent,dayId:3},c));
 assert.throws(()=>validatePlanIntent({...intent,userId:105},c));
 assert.equal(validatePlanIntent({...intent,operation:'move',minutes:null,date:rest},c).kind,'workout');
 assert.throws(()=>validatePlanIntent({...intent,operation:'move',minutes:null,date:day},c));
});
test('plan actions reject other accounts, foreign plans and caller IDs',()=>{
  assert.throws(()=>validatePlanIntent({kind:'adjust',planId:76,feeling:'tired'},{...context,canWritePlans:false}));
  assert.throws(()=>validatePlanIntent({kind:'adjust',planId:99,feeling:'tired'},context));
  assert.throws(()=>validatePlanIntent({kind:'adjust',planId:76,feeling:'tired',userId:999},context));
  assert.deepEqual(validatePlanIntent({kind:'adjust',planId:76,feeling:'tired'},context),{kind:'adjust',planId:76,feeling:'tired'});
  const completed=JSON.parse(JSON.stringify(context));completed.plans[0].weeks[0].days[0].status='completed';
  assert.throws(()=>validatePlanIntent({kind:'adjust',planId:76,feeling:'tired'},completed),/completed/);
});
test('plan confirmation is explicit, owner scoped, stale-safe and once-only',async(t)=>{
  const f=fixture();t.after(()=>f.db.close());let writes=0;
  f.env.BACKEND={fetch:async(url:string,init:RequestInit)=>{writes++;assert.equal(url,'https://aitracker.run/api/training/plans/76/adjust');assert.deepEqual(JSON.parse(String(init.body)),{feeling:'tired',skipSync:true});return Response.json({success:true});}} as unknown as Fetcher;
  const draft=await draftPlan(f.env,'a',context,{kind:'adjust',planId:76,feeling:'tired'});
  assert.equal(writes,0);
  await assert.rejects(confirmPlan(f.env,'synthetic','b',account,context,{id:draft.id,confirm:true}));
  await assert.rejects(confirmPlan(f.env,'synthetic','a',account,context,{id:draft.id,confirm:false}));
  await assert.rejects(confirmPlan(f.env,'synthetic','a',account,{...context,plans:[]},{id:draft.id,confirm:true}));
  const results=await Promise.allSettled([1,2].map(()=>confirmPlan(f.env,'synthetic','a',account,context,{id:draft.id,confirm:true})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(writes,1);
});
test('an uncertain write cannot be retried',async(t)=>{
  const f=fixture();t.after(()=>f.db.close());let writes=0;
  f.env.BACKEND={fetch:async()=>{writes++;throw new Error('test failure');}} as unknown as Fetcher;
  const draft=await draftPlan(f.env,'a',context,{kind:'adjust',planId:76,feeling:'tired'});
  await assert.rejects(confirmPlan(f.env,'synthetic','a',account,context,{id:draft.id,confirm:true}),/could not be confirmed/);
  await assert.rejects(confirmPlan(f.env,'synthetic','a',account,context,{id:draft.id,confirm:true}));assert.equal(writes,1);
});
test('new plan creation sends only reviewed fields to the existing generator',async(t)=>{
  const f=fixture();t.after(()=>f.db.close());
  const intent={kind:'create',goalType:'half_marathon',raceDate:new Date(Date.now()+90*86400000).toISOString().slice(0,10),preferredRunDays:['tuesday','thursday','sunday'],maxWeeklyHours:5,constraints:'Keep two rest days'};
  f.env.BACKEND={fetch:async(url:string,init:RequestInit)=>{
    assert.equal(url,'https://aitracker.run/api/training/plans/generate');
    assert.deepEqual(JSON.parse(String(init.body)),{goalType:intent.goalType,raceDate:intent.raceDate,preferredRunDays:intent.preferredRunDays,maxWeeklyHours:5,constraints:intent.constraints});
    return Response.json({success:true,planId:77});
  }} as unknown as Fetcher;
  const review=await draftPlan(f.env,'a',context,intent);
  assert.equal((await confirmPlan(f.env,'synthetic','a',account,context,{id:review.id,confirm:true})).planId,77);
  assert.throws(()=>validatePlanIntent({...intent,userId:999},context));
  assert.throws(()=>validatePlanIntent({...intent,raceDate:'2026-99-99'},context));
});
