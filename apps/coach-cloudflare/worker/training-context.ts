import {backend,type AccountSnapshot} from './account';
import type {Facts,TrainingContext} from '../shared/training';
const object=(v:unknown):Facts=>v && typeof v==='object' && !Array.isArray(v)?v as Facts:{};
export function pick(value:unknown,fields:string[]):Facts {
  const input=object(value),out:Facts={};
  for(const key of fields){const v=input[key];
    if(typeof v==='string')out[key]=v.slice(0,1500);
    else if(typeof v==='number' && Number.isFinite(v) || typeof v==='boolean' || v===null)out[key]=v;
    else if(Array.isArray(v))out[key]=v.slice(0,14).filter(x=>typeof x==='string'||typeof x==='number');
  }return out;
}
const planFields=['id','name','goalType','targetTime','raceDate','status','totalWeeks','currentWeek','preferredDays','preferredLongRunDay','daysPerWeek','terrainType','coachNotes','createdAt'];
const dayFields=['id','date','dayOfWeek','workoutType','title','description','plannedDistanceKm','plannedDurationMins','targetPace','targetHrZone','intensity','status','actualDistanceKm','actualDurationMins','actualPace','userNotes','perceivedEffort'];
export async function trainingContext(env:Env,token:string,account:AccountSnapshot):Promise<TrainingContext>{
  const id=account.runner.id,unavailable:string[]=[];
  async function read(name:string,path:string){try{return await backend(env,path,undefined,token);}catch{unavailable.push(name);return null;}}
  const [profile,listed,goals,fitness,recovery,score,athlete]=await Promise.all([
    read('profile','/api/user'),read('plans','/api/training/plans'),read('goals',`/api/goals/${id}`),
    read('fitness',`/api/fitness/${id}`),read('recovery',`/api/performance/recovery/${id}`),read('runner score',`/api/runner-score/${id}`),
    read('athlete profile','/api/training/profile'),
  ]);
  const user=object(profile);
  // Only the explicitly approved test runner can write through this new surface.
  const canWritePlans=account.canUseAI && user.id===id && user.email==='biserd@gmail.com';
  const owned=(Array.isArray(listed)?listed:[]).map(object).filter(p=>p.userId===id);
  const plans=owned.slice(0,30).map(p=>pick(p,planFields));
  // Full active plan, including past and future weeks. No 7-day-only context.
  for(const p of owned.filter(p=>p.status==='active').slice(0,3)){
    if(!Number.isSafeInteger(p.id))continue;
    const full=object(await read('plan details',`/api/training/plans/${p.id}`));
    if(full.userId!==id){unavailable.push('plan ownership');continue;}
    const target=plans.find(x=>x.id===p.id);if(!target)continue;
    target.goals=(Array.isArray(full.goals)?full.goals:[]).slice(0,10).filter(g=>object(g).planId===p.id).map(g=>pick(g,['goalType','raceDate','targetTime','priority','terrainType','notes']));
    target.weeks=(Array.isArray(full.weeks)?full.weeks:[]).slice(0,52).map(w=>{
      const week=object(w);return {...pick(week,['weekNumber','weekStartDate','weekEndDate','plannedDistanceKm','plannedDurationMins','weekType','phaseName','completedDistanceKm','completedDurationMins','adherenceScore','coachNotes','whyThisWeek']),
        days:(Array.isArray(week.days)?week.days:[]).slice(0,7).filter(d=>object(d).planId===p.id).map(d=>{
          const structure=object(object(d).workoutStructure);return {...pick(d,dayFields),workoutStructure:{...pick(structure,['warmup','main','cooldown']),intervals:(Array.isArray(structure.intervals)?structure.intervals:[]).slice(0,30).map(i=>pick(i,['reps','distance','pace','rest']))}};
        })};
    });
  }
  return {loadedAt:new Date().toISOString(),canWritePlans,unavailable,
    coverage:'Up to 30 plan summaries; up to 3 full active plans, 52 weeks each. Activity history: up to 200 runs in 90 days, subject to subscription. Missing sections are unavailable, never zero. Raw GPS and sensor streams are not included.',
    profile:{...pick(user,['firstName','unitPreference','lastSyncAt','coachGoal','coachRaceDate','coachTargetTime','coachDaysAvailable','coachWeeklyMileageCap','coachTone','coachTimezone','coachDailyAvailability','coachDailyAvailabilityDate','coachWeatherEnabled','onboardingGoal','onboardingStruggle']),
      athlete:object(athlete).userId===id?{...pick(athlete,['baselineWeeklyMileageKm','weeklyMileageLast12Weeks','longestRecentRunKm','avgRunsPerWeek','typicalEasyPaceMin','typicalEasyPaceMax','typicalTempoPace','typicalIntervalPace','maxHr','restingHr','avgElevationGainPerKm','preferredRunDays','injuryFlags','maxDaysPerWeek','estimatedVdot','lastComputedAt']),estimatedRaceTimes:pick(object(athlete).estimatedRaceTimes,['fiveK','tenK','halfMarathon','marathon'])}:null},plans,
    goals:(Array.isArray(goals)?goals:[]).slice(0,30).filter(g=>object(g).userId===id).map(g=>pick(g,['id','type','title','targetValue','currentProgress','status','completedAt','description'])),
    metrics:{fitness:{...pick(object(fitness).currentForm,['date','ctl','atl','tsb']),interpretation:pick(object(fitness).interpretation,['status','description','recommendation'])},
      recovery:pick(recovery,['freshnessScore','riskLevel','daysSinceLastRun','lastRunDate','acuteLoadKm','chronicLoadKm','acuteChronicRatio','readyToRun','recommendedNextStep','statusMessage','recoveryMessage']),
      runnerScore:{...pick(score,['totalScore','grade','sampleSize','recentRunCount','isProvisional','percentile','badges']),components:pick(object(score).components,['consistency','performance','volume','improvement']),trends:pick(object(score).trends,['weeklyChange','monthlyChange'])}},
  };
}
