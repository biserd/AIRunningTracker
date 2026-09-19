import {AIError} from './openai';
import {backend,type AccountSnapshot} from './account';
import type {PlanIntent,PlanReview,TrainingContext} from '../shared/training';
export function validatePlanIntent(raw:unknown,context:TrainingContext):PlanIntent{
  if(!context.canWritePlans)throw new AIError('Plan editing is only enabled for the approved test account.',403);
  if(!raw || typeof raw!=='object' || Array.isArray(raw))throw new AIError('Invalid plan request',400);
  const v=raw as Record<string,unknown>;
  const allowed=v.kind==='workout'?['kind','planId','dayId','operation','minutes','date']:v.kind==='create'?['kind','goalType','raceDate','preferredRunDays','maxWeeklyHours','constraints']:v.kind==='adjust'?['kind','planId','feeling']:['kind','planId','raceDate','targetTime'];
  if(Object.keys(v).some(k=>!allowed.includes(k)) || !['workout','create','adjust','settings'].includes(String(v.kind)))throw new AIError('Invalid plan request',400);
  if(v.kind!=='create' && !context.plans.some(p=>p.id===v.planId && p.status==='active'))throw new AIError('Choose your active plan.',400);
  if(v.kind==='workout'){
    const day=workout(context,Number(v.planId),Number(v.dayId));
    let today=new Date().toISOString().slice(0,10);
    try{today=new Intl.DateTimeFormat('en-CA',{timeZone:String(context.profile.coachTimezone||'UTC'),year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch{}
    if(!Number.isSafeInteger(v.dayId)||!day||day.status!=='pending'||String(day.date).slice(0,10)<today||day.workoutType==='rest'||!['shorten','rest','move'].includes(String(v.operation)))throw new AIError('Choose a pending upcoming workout.',400);
    if(v.operation==='shorten'?!(Number.isInteger(v.minutes)&&Number(v.minutes)>=5&&Number(v.minutes)<=240&&typeof day.plannedDurationMins==='number'&&Number(v.minutes)<day.plannedDurationMins&&['easy','recovery','long_run'].includes(String(day.workoutType))):v.minutes!==null)throw new AIError('Choose a shorter duration for a timed easy, recovery or long run.',400);
    if(v.operation==='move'){
      if(typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(Date.parse(v.date))||new Date(v.date).toISOString().slice(0,10)!==v.date||v.date<today||v.date===String(day.date).slice(0,10))throw new AIError('Choose a different upcoming rest day.',400);
      const targets=planDays(context,Number(v.planId)).filter(d=>String(d.date).slice(0,10)===v.date);
      if(targets.length!==1||targets[0].workoutType!=='rest'||targets[0].status!=='pending')throw new AIError('That day is not an available rest day.',409);
    }else if(v.date!==null)throw new AIError('Unexpected move date.',400);
    return {kind:'workout',planId:Number(v.planId),dayId:Number(v.dayId),operation:v.operation as 'shorten'|'rest'|'move',minutes:v.minutes as number|null,date:v.date as string|null};
  }
  if(v.kind==='adjust'){
    if(!['tired','strong'].includes(String(v.feeling)))throw new AIError('Choose an easier or progressive adjustment.',400);
    const plan=context.plans.find(p=>p.id===v.planId)!;
    const weeks=(Array.isArray(plan.weeks)?plan.weeks:[]).filter(w=>Date.parse(w.weekEndDate)>=Date.now()).slice(0,2);
    const today=new Date().toISOString().slice(0,10);
    // The legacy adjustment route does not skip completed/past days. Do not
    // expose that behavior through this new agent, even for the test account.
    if(!weeks.length || weeks.some(w=>!Array.isArray(w.days)||w.days.some((d:Record<string,unknown>)=>d.workoutType!=='rest' && (d.status!=='pending'||String(d.date).slice(0,10)<today))))
      throw new AIError('This week includes past or completed workouts. Use the main plan editor; the coach will not overwrite those workouts.',409);
    return {kind:'adjust',planId:v.planId as number,feeling:v.feeling as 'tired'|'strong'};
  }
  if(typeof v.raceDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.raceDate) || !Number.isFinite(Date.parse(v.raceDate)) || new Date(v.raceDate).toISOString().slice(0,10)!==v.raceDate || Date.parse(v.raceDate)<Date.now() || Date.parse(v.raceDate)>Date.now()+366*86400000)throw new AIError('Choose a future race date within one year.',400);
  if(v.kind==='settings'){
    if(typeof v.targetTime!=='string' || !/^\d{1,2}:[0-5]\d:[0-5]\d$/.test(v.targetTime))throw new AIError('Specify your target time as HH:MM:SS.',400);
    return {kind:'settings',planId:v.planId as number,raceDate:v.raceDate,targetTime:v.targetTime};
  }
  if(!['5k','10k','half_marathon','marathon','50k','50_mile','100k','100_mile','general_fitness'].includes(String(v.goalType)) ||
     !Array.isArray(v.preferredRunDays) || v.preferredRunDays.length<2 || v.preferredRunDays.length>6 || new Set(v.preferredRunDays).size!==v.preferredRunDays.length ||
     v.preferredRunDays.some(d=>!['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(d)) ||
     typeof v.maxWeeklyHours!=='number' || !Number.isFinite(v.maxWeeklyHours) || v.maxWeeklyHours<1 || v.maxWeeklyHours>15 ||
     typeof v.constraints!=='string' || v.constraints.length>500)throw new AIError('Specify the goal, race date, 2 to 6 running days, weekly hours and constraints.',400);
  return {kind:'create',goalType:String(v.goalType),raceDate:v.raceDate,preferredRunDays:v.preferredRunDays as string[],maxWeeklyHours:v.maxWeeklyHours,constraints:v.constraints};
}
function planDays(context:TrainingContext,planId:number):Record<string,unknown>[]{
 const plan=context.plans.find(p=>p.id===planId);
 return (Array.isArray(plan?.weeks)?plan.weeks:[]).flatMap(w=>Array.isArray(w.days)?w.days:[]);
}
function workout(context:TrainingContext,planId:number,dayId:number){return planDays(context,planId).find(d=>d.id===dayId);}
export async function draftPlan(env:Env,sessionId:string,context:TrainingContext,raw:unknown):Promise<PlanReview>{
  const details=validatePlanIntent(raw,context),id=crypto.randomUUID();
  const description=details.kind==='workout'?`${details.operation==='move'?`Move to ${details.date}`:details.operation==='rest'?'Replace with rest':`Shorten to ${details.minutes} minutes`}: ${workout(context,details.planId,details.dayId)?.title}. Only this workout${details.operation==='move'?' and the destination rest day':''} changes.`:details.kind==='create'?`Create a ${details.goalType.replaceAll('_',' ')} plan for ${details.raceDate}. Your existing plans will not be deleted.`:
    details.kind==='settings'?`Set plan ${details.planId} race date to ${details.raceDate} and target time to ${details.targetTime}. This changes settings, not the workout schedule.`:
    `Apply the main site's ${details.feeling==='tired'?'easier (~15% less volume)':'progressive (~8% more volume)'} adjustment to eligible upcoming weeks in plan ${details.planId}.`;
  await env.DB.prepare('INSERT INTO proposals(id,session_id,expected_version,before_state,after_state,description,expires_at) VALUES (?,?,1,?,?,?,?)')
    .bind(id,sessionId,JSON.stringify(context.plans),JSON.stringify({realPlan:details}),description,Math.floor(Date.now()/1000)+600).run();
  return {id,description,details};
}
export async function confirmPlan(env:Env,token:string,sessionId:string,account:AccountSnapshot,context:TrainingContext,input:Record<string,unknown>){
  if(!account.canUseAI || !context.canWritePlans)throw new AIError('Plan editing is not enabled for this account.',403);
  if(input.confirm!==true || typeof input.id!=='string' || Object.keys(input).some(k=>!['id','confirm'].includes(k)))throw new AIError('Review and confirm the plan action.',400);
  const row=await env.DB.prepare('SELECT before_state,after_state FROM proposals WHERE id=? AND session_id=? AND expires_at>?').bind(input.id,sessionId,Math.floor(Date.now()/1000)).first<{before_state:string;after_state:string}>();
  if(!row)throw new AIError('This review expired or was already submitted.',409);
  if(row.before_state!==JSON.stringify(context.plans))throw new AIError('Your plan changed. Ask the coach for a fresh review.',409);
  const intent=validatePlanIntent(JSON.parse(row.after_state).realPlan,context);
  // Claim once before calling a non-idempotent legacy API. Never retry an uncertain write.
  const claimed=await env.DB.prepare('DELETE FROM proposals WHERE id=? AND session_id=? AND expires_at>? RETURNING id').bind(input.id,sessionId,Math.floor(Date.now()/1000)).first();
  if(!claimed)throw new AIError('This action was already submitted.',409);
  try {
    const day=intent.kind==='workout'?workout(context,intent.planId,intent.dayId):undefined;
    const result=await (intent.kind==='workout'?backend(env,'/api/coach/companion/workout-edit',{
      planId:intent.planId,dayId:intent.dayId,operation:intent.operation,minutes:intent.minutes,date:intent.date,
      expectedDate:String(day!.date).slice(0,10),expectedMinutes:day!.plannedDurationMins??null,expectedDistance:day!.plannedDistanceKm??null,expectedType:day!.workoutType,
    },token):intent.kind==='create'?backend(env,'/api/training/plans/generate',{
      goalType:intent.goalType,raceDate:intent.raceDate,preferredRunDays:intent.preferredRunDays,maxWeeklyHours:intent.maxWeeklyHours,constraints:intent.constraints,
    },token):intent.kind==='settings'?backend(env,`/api/training/plans/${intent.planId}/settings`,{raceDate:intent.raceDate,targetTime:intent.targetTime},token,'PATCH'):
      backend(env,`/api/training/plans/${intent.planId}/adjust`,{feeling:intent.feeling,skipSync:true},token));
    const value=result as Record<string,unknown>;
    if(value.success===false)throw new Error('rejected');
    return {ok:true,message:'Saved on AITracker. Refresh your plan to see the result.',planId:intent.kind==='create'?value.planId:intent.planId};
  }catch {throw new AIError('The result could not be confirmed. Check your plan on AITracker before requesting another change. This action will not be retried.',503);}
}
