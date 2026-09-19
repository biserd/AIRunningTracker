import {applicationSqlDatabase as db} from '../d1/runtimeDatabase';

type Day={id:number;plan_id:number;week_id:number;date:string;day_of_week:string;status:string;linked_activity_id:number|null;workout_type:string;planned_duration_mins:number|null;planned_distance_km:number|null};
type Edit={planId:number;dayId:number;operation:'shorten'|'rest'|'move';minutes:number|null;date:string|null;expectedDate:string;expectedMinutes:number|null;expectedDistance:number|null;expectedType:string};
const dateKey=(date:string)=>date.slice(0,10);
export function validateWorkoutEdit(input:Record<string,unknown>):Edit {
 const keys=['planId','dayId','operation','minutes','date','expectedDate','expectedMinutes','expectedDistance','expectedType'];
 if(Object.keys(input).some(k=>!keys.includes(k))||!Number.isSafeInteger(input.planId)||!Number.isSafeInteger(input.dayId)||!['shorten','rest','move'].includes(String(input.operation)))throw new Error('Invalid workout edit.');
 const validDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!validDate(input.expectedDate)||typeof input.expectedType!=='string'||!(input.expectedMinutes===null||Number.isSafeInteger(input.expectedMinutes))||!(input.expectedDistance===null||typeof input.expectedDistance==='number'&&Number.isFinite(input.expectedDistance)))throw new Error('Review the current workout first.');
 if(input.operation==='move'?!validDate(input.date):input.date!==null)throw new Error('Invalid date.');
 if(input.operation==='shorten'?!(Number.isInteger(input.minutes)&&Number(input.minutes)>=5&&Number(input.minutes)<=240):input.minutes!==null)throw new Error('Invalid duration.');
 return input as Edit;
}
/** The authenticated account is supplied by the route, never a model argument. */
export async function editCoachWorkout(user:number,input:Record<string,unknown>,today:string){
 const v=validateWorkoutEdit(input);
 const day=await db.prepare("SELECT d.* FROM plan_days d JOIN training_plans_v2 p ON p.id=d.plan_id WHERE d.id=? AND d.plan_id=? AND p.user_id=? AND p.status='active'").bind(v.dayId,v.planId,user).first<Day>();
 if(!day||day.status!=='pending'||day.linked_activity_id!==null||dateKey(day.date)<today||dateKey(day.date)!==v.expectedDate||day.planned_duration_mins!==v.expectedMinutes||day.planned_distance_km!==v.expectedDistance||day.workout_type!==v.expectedType)throw new Error('Workout changed or is no longer editable. Ask for a new review.');
 const current="id=? AND plan_id=? AND date=? AND planned_duration_mins IS ? AND planned_distance_km IS ? AND workout_type=? AND status='pending' AND linked_activity_id IS NULL AND EXISTS(SELECT 1 FROM training_plans_v2 p WHERE p.id=plan_days.plan_id AND p.user_id=? AND p.status='active')";
 const params=[day.id,v.planId,day.date,v.expectedMinutes,v.expectedDistance,v.expectedType,user];
 let statement;let targetWeek=day.week_id;
 if(v.operation==='move'){
  if(v.date!<today||v.date===v.expectedDate)throw new Error('Choose a different upcoming day.');
  const targets=await db.prepare("SELECT * FROM plan_days WHERE plan_id=? AND substr(date,1,10)=?").bind(v.planId,v.date).all<Day>();
  if(targets.results.length!==1)throw new Error('Choose an existing rest day in this plan.');
  const target=targets.results[0];
  targetWeek=target.week_id;
  if(target.status!=='pending'||target.workout_type!=='rest'||target.linked_activity_id!==null)throw new Error('That day already has a workout. Choose a rest day.');
  // Materialize eligibility before changing either row. Swap the rest day as one
  // statement so a collision or concurrent completion cannot leave half a move.
  statement=db.prepare(`WITH eligible AS MATERIALIZED (SELECT id FROM plan_days WHERE ${current} AND EXISTS(SELECT 1 FROM plan_days t WHERE t.id=? AND t.plan_id=? AND t.date=? AND t.week_id=? AND t.workout_type='rest' AND t.status='pending' AND t.linked_activity_id IS NULL))
   UPDATE plan_days SET date=CASE id WHEN ? THEN ? ELSE ? END,week_id=CASE id WHEN ? THEN ? ELSE ? END,day_of_week=CASE id WHEN ? THEN ? ELSE ? END,was_adjusted=1
   WHERE id IN (?,?) AND EXISTS(SELECT 1 FROM eligible) RETURNING id`)
   .bind(...params,target.id,v.planId,target.date,target.week_id,day.id,target.date,day.date,day.id,target.week_id,day.week_id,day.id,target.day_of_week,day.day_of_week,day.id,target.id);
 }else{
  if(v.operation==='shorten'&&(!['easy','recovery','long_run'].includes(day.workout_type)||day.planned_duration_mins===null||v.minutes!>=day.planned_duration_mins))throw new Error('Shortening needs a timed easy, recovery or long run and a smaller duration.');
  if(day.workout_type==='rest')throw new Error('This is already a rest day.');
  const distance=v.operation==='rest'?0:day.planned_distance_km===null?null:Math.round(day.planned_distance_km*v.minutes!/day.planned_duration_mins!*100)/100;
  statement=db.prepare(`UPDATE plan_days SET original_workout_type=COALESCE(original_workout_type,workout_type),original_distance_km=COALESCE(original_distance_km,planned_distance_km),was_adjusted=1,planned_duration_mins=?,planned_distance_km=?,title=?,description=?,workout_type=?,workout_structure=NULL,target_pace=NULL,target_hr_zone=NULL,planned_vert_gain_m=NULL WHERE ${current} RETURNING id`)
   .bind(v.operation==='rest'?0:v.minutes,distance,v.operation==='rest'?'Rest day':`${v.minutes} minute ${day.workout_type.replaceAll('_',' ')} run`,v.operation==='rest'?'Rest day, changed with your approval.':'Shortened with your approval. Run at a comfortable effort.',v.operation==='rest'?'rest':day.workout_type,...params);
 }
 const results=await db.batch([
  statement,
  db.prepare(`UPDATE plan_weeks SET planned_distance_km=COALESCE((SELECT SUM(planned_distance_km) FROM plan_days WHERE week_id=plan_weeks.id),0),planned_duration_mins=(SELECT SUM(planned_duration_mins) FROM plan_days WHERE week_id=plan_weeks.id),was_adjusted=1,adjustment_reason='manual' WHERE plan_id=? AND id IN (?,?) AND EXISTS(SELECT 1 FROM training_plans_v2 p WHERE p.id=plan_weeks.plan_id AND p.user_id=?) AND changes()>0`).bind(v.planId,day.week_id,targetWeek,user),
 ]);
 if(!results[0].meta?.changes)throw new Error('Workout changed. Ask for a fresh review.');
 return {ok:true,planId:v.planId,message:'Your workout is updated.'};
}
