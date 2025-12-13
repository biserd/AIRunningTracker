import type { AthleteProfile } from "@shared/schema";
import type { PlanGenerationRequest } from "./planGenerator";

type GoalType = "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
type WeekType = "base" | "build" | "peak" | "recovery" | "taper";
type WorkoutType =
  | "easy"
  | "tempo"
  | "intervals"
  | "long_run"
  | "recovery"
  | "rest"
  | "cross_training"
  | "race"
  | "fartlek"
  | "hills"
  | "progression";
type Intensity = "low" | "moderate" | "high";

type TrainingPlanSettings = {
  userId?: number;
  goalType: GoalType;
  raceDate: Date | null;
  targetTime: string | null;
  daysPerWeek: number;
  preferredLongRunDay: string;
  preferredDays: string[];
  allowCrossTraining: boolean;
  paceBasedWorkouts: boolean;
  totalWeeks: number;
};

export interface SkeletonDay {
  date: string;
  dayOfWeek: string;
  workoutType: WorkoutType;
  title: string;
  description: string | null;
  plannedDistanceKm: number | null;
  plannedDurationMins: number | null;
  targetPace: string | null;
  targetHrZone: string | null;
  intensity: Intensity;
  workoutStructure: {
    warmup: string;
    main: string;
    cooldown: string;
    intervals?: Array<{ reps: number; distance: string; pace: string; rest: string }>;
  } | null;
}

export interface SkeletonWeek {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  plannedDistanceKm: number;
  plannedDurationMins: number | null;
  weekType: WeekType;
  qualityLevel: 1 | 2 | 3 | 4 | 5;
  coachNotes: string | null;
  days: SkeletonDay[];
}

export interface PlanSkeleton {
  trainingPlan: TrainingPlanSettings & { coachNotes: string | null };
  weeks: SkeletonWeek[];
}

type ScheduleTemplate = Record<string, WorkoutType>;

type EngineOptions = {
  startDate: Date;
  includeSpeedwork: boolean;
  includeLongRuns: boolean;
  weekStartsOn?: typeof DOW[number];
};

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d: Date, weekStartsOn: typeof DOW[number] = "Mon"): Date {
  const x = new Date(d);
  const jsDay = x.getDay();
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const target = map[weekStartsOn];
  const delta = (jsDay - target + 7) % 7;
  return addDays(x, -delta);
}

function dayOfWeekFromDate(d: Date): typeof DOW[number] {
  const js = d.getDay();
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][js] as typeof DOW[number];
}

function roundToHalfKm(x: number): number {
  return Math.round(x * 2) / 2;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function sumWeekKm(days: SkeletonDay[]): number {
  return days.reduce((acc, d) => acc + (d.plannedDistanceKm ?? 0), 0);
}

function goalDistanceKm(goal: GoalType): number {
  if (goal === "5k") return 5;
  if (goal === "10k") return 10;
  if (goal === "half_marathon") return 21.0975;
  if (goal === "marathon") return 42.195;
  return 0;
}

function goalLongCapKm(goal: GoalType): number {
  if (goal === "marathon") return 35;
  if (goal === "half_marathon") return 24;
  if (goal === "10k") return 16;
  if (goal === "5k") return 14;
  return 20;
}

function nextDow(d: string): string {
  const idx = DOW.indexOf(d as typeof DOW[number]);
  return DOW[(idx + 1) % 7];
}

function pickQualityDay(
  runDays: string[],
  longRunDay: string,
  preferEarly: boolean,
  exclude: Set<string> = new Set()
): string | null {
  const longIdx = DOW.indexOf(longRunDay as typeof DOW[number]);
  const candidates = runDays
    .filter(d => d !== longRunDay && !exclude.has(d))
    .filter(d => {
      const idx = DOW.indexOf(d as typeof DOW[number]);
      return idx !== (longIdx + 6) % 7;
    });

  if (candidates.length === 0) return null;
  return preferEarly ? candidates[0] : candidates[Math.floor(candidates.length / 2)];
}

function getTargetPeakMileage(goalType: GoalType, baselineKm: number): number {
  const peakTargets: Record<GoalType, number> = {
    marathon: 80,
    half_marathon: 60,
    "10k": 50,
    "5k": 40,
    general_fitness: baselineKm * 1.5,
  };
  return Math.max(peakTargets[goalType], baselineKm * 1.4);
}

function buildWeeklyTargetsKm(
  settings: TrainingPlanSettings,
  profile: AthleteProfile,
  _planStart: Date
): number[] {
  const W = settings.totalWeeks;

  const taperWeeks =
    settings.goalType === "marathon" ? 3 :
    settings.goalType === "half_marathon" ? 2 :
    (settings.goalType === "10k" || settings.goalType === "5k") ? 1 :
    1;

  const recoveryEvery = 4;
  const buildWeeks = W - taperWeeks;

  const consistency = (profile as { consistency?: string }).consistency ?? "medium";
  const consistencyFactor =
    consistency === "low" ? 0.9 :
    consistency === "medium" ? 1.0 : 1.0;

  const baseWeeklyKm = profile.baselineWeeklyMileageKm || 20;
  // Week 1 should start at ~85% of baseline to allow adjustment to new training structure
  // This prevents an aggressive start and gives the body time to adapt
  const week1Factor = 0.85;
  const startKm = Math.max(10, baseWeeklyKm * consistencyFactor * week1Factor);
  const peakKm = getTargetPeakMileage(settings.goalType as GoalType, baseWeeklyKm);

  const targets: number[] = [];
  
  const recoveryWeeks = Math.floor((buildWeeks - 1) / recoveryEvery);
  const actualBuildWeeks = buildWeeks - recoveryWeeks;
  const weeklyIncrement = (peakKm - startKm) / Math.max(1, actualBuildWeeks - 1);

  let buildWeekIndex = 0;
  let peakValue = startKm;

  for (let i = 1; i <= W; i++) {
    const isTaper = i > buildWeeks;
    const isRecovery = !isTaper && (i % recoveryEvery === 0) && i < buildWeeks;

    if (isTaper) {
      const taperIndex = i - buildWeeks;
      const factors = taperWeeks === 3 ? [0.75, 0.60, 0.45]
                    : taperWeeks === 2 ? [0.75, 0.55]
                    : [0.70];
      const taperValue = peakValue * factors[taperIndex - 1];
      targets.push(roundToHalfKm(taperValue));
    } else if (isRecovery) {
      targets.push(roundToHalfKm(peakValue * 0.80));
    } else {
      const currentValue = startKm + (weeklyIncrement * buildWeekIndex);
      peakValue = currentValue;
      targets.push(roundToHalfKm(currentValue));
      buildWeekIndex++;
    }
  }

  return targets;
}

function buildScheduleTemplate(
  settings: TrainingPlanSettings,
  includeSpeedwork: boolean,
  includeLongRuns: boolean
): ScheduleTemplate {
  const preferred = DOW.filter(d => {
    const normalizedPreferred = settings.preferredDays.map(pd => {
      const lower = pd.toLowerCase();
      if (lower === "sunday") return "Sun";
      if (lower === "monday") return "Mon";
      if (lower === "tuesday") return "Tue";
      if (lower === "wednesday") return "Wed";
      if (lower === "thursday") return "Thu";
      if (lower === "friday") return "Fri";
      if (lower === "saturday") return "Sat";
      return pd.charAt(0).toUpperCase() + pd.slice(1, 3);
    });
    return normalizedPreferred.includes(d);
  });
  
  // Enforce maximum 5-6 running days to ensure 1-2 rest days per week
  // Even if user selects 7 days, cap at 6 to prevent overtraining
  const maxRunDays = Math.min(settings.daysPerWeek, 6);
  const runDays = preferred.slice(0, maxRunDays);

  const normalizedLongRunDay = (() => {
    const lower = settings.preferredLongRunDay.toLowerCase();
    if (lower === "sunday") return "Sun";
    if (lower === "monday") return "Mon";
    if (lower === "tuesday") return "Tue";
    if (lower === "wednesday") return "Wed";
    if (lower === "thursday") return "Thu";
    if (lower === "friday") return "Fri";
    if (lower === "saturday") return "Sat";
    return settings.preferredLongRunDay.charAt(0).toUpperCase() + settings.preferredLongRunDay.slice(1, 3);
  })();

  const longRunDay = runDays.includes(normalizedLongRunDay as typeof DOW[number])
    ? normalizedLongRunDay
    : runDays[runDays.length - 1] || "Sun";

  const template: ScheduleTemplate = {};
  for (const d of DOW) template[d] = "rest";

  for (const d of runDays) template[d] = "easy";

  if (includeLongRuns) template[longRunDay] = "long_run";

  if (includeSpeedwork) {
    const maxQuality = settings.daysPerWeek <= 4 ? 1 : 2;

    const q1 = pickQualityDay(runDays, longRunDay, true);
    if (q1) template[q1] = "tempo";

    if (maxQuality === 2) {
      const q2 = pickQualityDay(runDays, longRunDay, false, new Set([q1 || ""]));
      if (q2) template[q2] = "intervals";
    }
  }

  for (const d of runDays) {
    if (template[d] === "tempo" || template[d] === "intervals" || template[d] === "hills") {
      const next = nextDow(d);
      if (runDays.includes(next as typeof DOW[number]) && template[next] === "easy") template[next] = "recovery";
    }
  }

  return template;
}

function buildWeekDays(
  weekStart: Date,
  settings: TrainingPlanSettings,
  template: ScheduleTemplate
): SkeletonDay[] {
  const days: SkeletonDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const dow = dayOfWeekFromDate(d);

    const workoutType = template[dow] ?? "rest";

    days.push({
      date: toISO(d),
      dayOfWeek: dow,
      workoutType,
      title: "",
      description: null,
      plannedDistanceKm: workoutType === "rest" ? null : (workoutType === "cross_training" ? null : 0),
      plannedDurationMins: workoutType === "cross_training" ? 30 : null,
      targetPace: null,
      targetHrZone: null,
      intensity: workoutType === "tempo" || workoutType === "intervals" || workoutType === "hills" ? "high" :
                 workoutType === "long_run" ? "moderate" :
                 workoutType === "recovery" ? "low" :
                 workoutType === "easy" ? "low" : "low",
      workoutStructure: null
    });
  }

  return days;
}

function pickWeekType(
  settings: TrainingPlanSettings,
  weekNumber: number,
  _weekStart: Date,
  _weeklyTargets: number[]
): WeekType {
  const W = settings.totalWeeks;

  const taperWeeks =
    settings.goalType === "marathon" ? 3 :
    settings.goalType === "half_marathon" ? 2 :
    (settings.goalType === "10k" || settings.goalType === "5k") ? 1 : 1;

  const buildWeeks = W - taperWeeks;

  if (weekNumber > buildWeeks) return "taper";
  
  if (weekNumber === buildWeeks) return "peak";
  
  if (weekNumber % 4 === 0 && weekNumber < buildWeeks) return "recovery";

  if (weekNumber <= 2) return "base";
  return "build";
}

function computeQualityLevel(
  weekType: WeekType,
  weekNumber: number,
  totalWeeks: number
): 1 | 2 | 3 | 4 | 5 {
  switch (weekType) {
    case "base":
      return weekNumber === 1 ? 1 : 2;
    case "build": {
      const buildProgress = weekNumber / totalWeeks;
      return buildProgress < 0.5 ? 3 : 4;
    }
    case "peak":
      return 5;
    case "recovery":
      return 2;
    case "taper":
      return 3;
    default:
      return 2;
  }
}

function generateWeekCoachNotes(
  weekType: WeekType,
  weekNumber: number,
  totalWeeks: number,
  qualityLevel: 1 | 2 | 3 | 4 | 5,
  goalType: GoalType
): string {
  const goalLabel = goalType === "5k" ? "5K" :
    goalType === "10k" ? "10K" :
    goalType === "half_marathon" ? "half marathon" :
    goalType === "marathon" ? "marathon" : "fitness";

  switch (weekType) {
    case "base":
      if (weekNumber === 1) {
        return `Week 1: Foundation Building - This opening week establishes your training rhythm. Focus on finding your easy pace and getting comfortable with the schedule. Don't push too hard—consistency matters more than intensity right now.`;
      }
      return `Week ${weekNumber}: Base Development - Continue building your aerobic foundation. Keep runs conversational and prioritize proper form. Your body is adapting to the training load.`;
    
    case "build":
      if (qualityLevel === 3) {
        return `Week ${weekNumber}: Progressive Build - You're in the growth phase now. Workouts are getting more structured. Pay attention to how your body responds to the increased intensity and volume.`;
      }
      return `Week ${weekNumber}: Intensive Build - This is challenging training with higher quality sessions. Trust the process and nail your key workouts. Recovery between hard sessions is crucial.`;
    
    case "peak":
      return `Week ${weekNumber}: Peak Training - This is your highest training load week. You've built up to this—embrace the challenge. After this week, you'll begin tapering for race day. Push yourself but stay smart.`;
    
    case "recovery":
      return `Week ${weekNumber}: Recovery Week - A planned lower-volume week to let your body absorb recent training adaptations. Keep the effort easy—this is where fitness gains actually happen. Don't skip this!`;
    
    case "taper":
      const weeksToRace = totalWeeks - weekNumber;
      if (weeksToRace === 0) {
        return `Week ${weekNumber}: Race Week - The hay is in the barn! Trust your training. Light shakeout runs only, plenty of sleep, and stay off your feet. Visualize your ${goalLabel} success.`;
      }
      if (weeksToRace === 1) {
        return `Week ${weekNumber}: Final Taper - One week to go! Reduce volume significantly while maintaining some intensity. Focus on rest, nutrition, and mental preparation for your ${goalLabel}.`;
      }
      return `Week ${weekNumber}: Taper Phase - Begin reducing training load. Your body needs time to fully recover and peak on race day. Maintain quality in shorter sessions while cutting overall volume.`;
    
    default:
      return `Week ${weekNumber}: Training continues. Stay consistent and listen to your body.`;
  }
}

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

function inferExperienceLevel(profile: AthleteProfile): ExperienceLevel {
  const weeklyKm = profile.baselineWeeklyMileageKm ?? 0;
  const longestRun = profile.longestRecentRunKm ?? 0;
  const fitnessLevel = (profile as { fitnessLevel?: string }).fitnessLevel;
  
  if (fitnessLevel === "advanced" || weeklyKm >= 50 || longestRun >= 20) {
    return "advanced";
  }
  if (fitnessLevel === "intermediate" || weeklyKm >= 25 || longestRun >= 12) {
    return "intermediate";
  }
  return "beginner";
}

function getMaxLongRunDelta(
  experience: ExperienceLevel,
  consistency: string
): number {
  const baseDelta: Record<ExperienceLevel, number> = {
    beginner: 10,
    intermediate: 14,
    advanced: 16,
  };
  
  let delta = baseDelta[experience];
  
  if (consistency === "low") {
    delta -= 2;
  } else if (consistency === "high") {
    delta += 2;
  }
  
  return delta;
}

function buildLongRunProgression(
  settings: TrainingPlanSettings,
  profile: AthleteProfile,
  totalWeeks: number
): number[] {
  const taperWeeks =
    settings.goalType === "marathon" ? 3 :
    settings.goalType === "half_marathon" ? 2 :
    (settings.goalType === "10k" || settings.goalType === "5k") ? 1 : 1;

  const buildWeeks = totalWeeks - taperWeeks;
  const longestRecentRun = profile.longestRecentRunKm || 8;
  
  const experience = inferExperienceLevel(profile);
  const consistency = (profile as { consistency?: string }).consistency ?? "medium";
  const maxDelta = getMaxLongRunDelta(experience, consistency);
  
  const goalCap = goalLongCapKm(settings.goalType as GoalType);
  const peakLongRun = Math.min(goalCap, longestRecentRun + maxDelta);
  
  const startLongRun = Math.max(longestRecentRun * 0.8, 6);

  const longRuns: number[] = [];
  
  const recoveryWeeks = Math.floor((buildWeeks - 1) / 4);
  const actualBuildWeeks = buildWeeks - recoveryWeeks;
  const weeklyIncrement = (peakLongRun - startLongRun) / Math.max(1, actualBuildWeeks - 1);

  let buildWeekIndex = 0;
  let currentPeakLong = startLongRun;

  for (let i = 1; i <= totalWeeks; i++) {
    const isTaper = i > buildWeeks;
    const isRecovery = !isTaper && (i % 4 === 0) && i < buildWeeks;

    if (isTaper) {
      const taperIndex = i - buildWeeks;
      const factors = taperWeeks === 3 ? [0.60, 0.50, 0.40]
                    : taperWeeks === 2 ? [0.65, 0.50]
                    : [0.60];
      longRuns.push(roundToHalfKm(currentPeakLong * factors[taperIndex - 1]));
    } else if (isRecovery) {
      longRuns.push(roundToHalfKm(currentPeakLong * 0.70));
    } else {
      const current = startLongRun + (weeklyIncrement * buildWeekIndex);
      currentPeakLong = current;
      longRuns.push(roundToHalfKm(current));
      buildWeekIndex++;
    }
  }

  return longRuns;
}

function reconcileWeekTotal(days: SkeletonDay[], targetW: number, avoidDow: string | null) {
  let current = roundToHalfKm(sumWeekKm(days));
  let diff = roundToHalfKm(targetW - current);
  if (Math.abs(diff) < 0.25) return;

  const adjustable = days
    .filter(d => d.plannedDistanceKm && d.workoutType === "easy")
    .filter(d => d.dayOfWeek !== avoidDow)
    .sort((a, b) => (a.plannedDistanceKm! - b.plannedDistanceKm!));

  while (Math.abs(diff) >= 0.5 && adjustable.length > 0) {
    const d = adjustable[0];
    const step = diff > 0 ? 0.5 : -0.5;
    const next = (d.plannedDistanceKm ?? 0) + step;

    if (next >= 4) {
      d.plannedDistanceKm = roundToHalfKm(next);
      diff = roundToHalfKm(targetW - roundToHalfKm(sumWeekKm(days)));
    } else {
      adjustable.shift();
    }
  }
}

function allocateDistancesForWeek(args: {
  settings: TrainingPlanSettings;
  profile: AthleteProfile;
  opts: EngineOptions;
  weekType: WeekType;
  weekTargetKm: number;
  weekStart: Date;
  days: SkeletonDay[];
  prevWeekDistancesByDow: Record<string, number | null>;
  longRunTarget: number;
}) {
  const { settings, opts, weekType, weekTargetKm, days, prevWeekDistancesByDow, longRunTarget } = args;

  const raceKm = goalDistanceKm(settings.goalType as GoalType);
  const raceDateISO = settings.raceDate ? toISO(settings.raceDate) : null;

  if (raceDateISO) {
    const raceDay = days.find(d => d.date === raceDateISO);
    if (raceDay) {
      raceDay.workoutType = "race";
      raceDay.plannedDistanceKm = raceKm;
      raceDay.intensity = "high";
    }
  }

  const runDays = days.filter(d =>
    d.workoutType !== "rest" && d.workoutType !== "cross_training"
  );

  const hasRace = runDays.some(d => d.workoutType === "race");

  const W = weekTargetKm;

  const qualityDays = runDays.filter(d =>
    ["tempo", "intervals", "hills", "fartlek", "progression"].includes(d.workoutType)
  );
  const longDay = runDays.find(d => d.workoutType === "long_run");
  const raceDay = runDays.find(d => d.workoutType === "race");

  let longKm = 0;

  if (raceDay) {
    longKm = raceDay.plannedDistanceKm ?? 0;
  } else if (opts.includeLongRuns && longDay) {
    longKm = longRunTarget;
    longDay.plannedDistanceKm = longKm;
    longDay.intensity = "moderate";
  }

  for (const q of qualityDays) {
    const raw = W * 0.20;
    const prev = prevWeekDistancesByDow[q.dayOfWeek] ?? null;
    let qKm = roundToHalfKm(clamp(raw, 6, 14));

    if (prev && weekType === "build") qKm = roundToHalfKm(clamp(qKm, prev - 2, prev + 2));
    if (weekType === "taper") qKm = roundToHalfKm(Math.max(6, qKm * 0.8));

    q.plannedDistanceKm = qKm;
    q.intensity = "high";
  }

  const fixedKm = sumWeekKm(days);
  let remaining = roundToHalfKm(Math.max(0, W - fixedKm));

  const easyDays = runDays.filter(d =>
    d.plannedDistanceKm === 0 || d.plannedDistanceKm === null
  ).filter(d => d.workoutType === "easy" || d.workoutType === "recovery" || d.workoutType === "long_run");

  if (hasRace) remaining = Math.min(remaining, 12);

  if (easyDays.length > 0) {
    const per = roundToHalfKm(remaining / easyDays.length);

    for (const d of easyDays) {
      const min = d.workoutType === "recovery" ? 4 : 5;
      const prev = prevWeekDistancesByDow[d.dayOfWeek] ?? null;

      let km = roundToHalfKm(Math.max(min, per));

      if (prev && weekType === "build") km = roundToHalfKm(clamp(km, prev - 2, prev + 2));
      if (weekType === "taper") km = roundToHalfKm(Math.max(min, km * 0.8));

      if (longDay?.plannedDistanceKm) km = Math.min(km, (longDay.plannedDistanceKm ?? km) - 1);

      d.plannedDistanceKm = km;
      d.intensity = "low";
    }
  }

  reconcileWeekTotal(days, W, longDay?.dayOfWeek ?? null);
}

export interface PlanRealismWarning {
  type: "aggressive_volume" | "aggressive_long_run" | "insufficient_time" | "low_baseline";
  severity: "info" | "warning" | "critical";
  message: string;
}

export function computePlanRealism(
  skeleton: PlanSkeleton,
  profile: AthleteProfile,
  request: PlanGenerationRequest
): PlanRealismWarning[] {
  const warnings: PlanRealismWarning[] = [];
  
  const baselineWeeklyKm = profile.baselineWeeklyMileageKm ?? 0;
  const longestRecentRunKm = profile.longestRecentRunKm ?? 0;
  const experience = inferExperienceLevel(profile);
  const consistency = (profile as { consistency?: string }).consistency ?? "medium";
  
  const peakWeek = skeleton.weeks.reduce((max, w) => 
    w.plannedDistanceKm > max.plannedDistanceKm ? w : max, skeleton.weeks[0]);
  const peakWeeklyKm = peakWeek?.plannedDistanceKm ?? 0;
  
  const peakLongRunKm = Math.max(...skeleton.weeks.map(w => {
    const lr = w.days.find(d => d.workoutType === "long_run");
    return lr?.plannedDistanceKm ?? 0;
  }));
  
  if (baselineWeeklyKm < 15 && skeleton.trainingPlan.goalType !== "5k") {
    warnings.push({
      type: "low_baseline",
      severity: "warning",
      message: `Your current weekly mileage (${baselineWeeklyKm.toFixed(0)}km) is quite low. Consider building a stronger base before starting this plan.`,
    });
  }
  
  const volumeRatio = peakWeeklyKm / Math.max(baselineWeeklyKm, 10);
  if (volumeRatio > 2.5) {
    warnings.push({
      type: "aggressive_volume",
      severity: "critical",
      message: `Peak weekly volume (${peakWeeklyKm.toFixed(0)}km) is ${volumeRatio.toFixed(1)}x your current ${baselineWeeklyKm.toFixed(0)}km. This increases injury risk significantly.`,
    });
  } else if (volumeRatio > 2.0) {
    warnings.push({
      type: "aggressive_volume",
      severity: "warning",
      message: `Peak weekly volume (${peakWeeklyKm.toFixed(0)}km) is ${volumeRatio.toFixed(1)}x your current ${baselineWeeklyKm.toFixed(0)}km. Listen to your body and reduce if needed.`,
    });
  }
  
  const safeMaxDelta = experience === "beginner" ? 10 : experience === "intermediate" ? 14 : 18;
  const adjustedMaxDelta = consistency === "low" ? safeMaxDelta - 2 : consistency === "high" ? safeMaxDelta + 2 : safeMaxDelta;
  const longRunDelta = peakLongRunKm - longestRecentRunKm;
  
  if (longRunDelta > adjustedMaxDelta + 4) {
    warnings.push({
      type: "aggressive_long_run",
      severity: "critical",
      message: `Peak long run (${peakLongRunKm.toFixed(0)}km) is ${longRunDelta.toFixed(0)}km more than your recent longest (${longestRecentRunKm.toFixed(0)}km). This is a significant jump.`,
    });
  } else if (longRunDelta > adjustedMaxDelta) {
    warnings.push({
      type: "aggressive_long_run",
      severity: "warning",
      message: `Peak long run (${peakLongRunKm.toFixed(0)}km) increases ${longRunDelta.toFixed(0)}km from your recent longest. Progress carefully.`,
    });
  }
  
  const goalType = skeleton.trainingPlan.goalType;
  const totalWeeks = skeleton.weeks.length;
  const minSafeWeeks: Record<string, number> = {
    marathon: 16,
    half_marathon: 12,
    "10k": 8,
    "5k": 6,
    general_fitness: 4,
  };
  const minWeeks = minSafeWeeks[goalType] ?? 8;
  
  if (totalWeeks < minWeeks) {
    const weekDeficit = minWeeks - totalWeeks;
    warnings.push({
      type: "insufficient_time",
      severity: weekDeficit >= 4 ? "critical" : "warning",
      message: `${totalWeeks} weeks may not be enough for a ${goalType.replace("_", " ")} build. Ideally you'd have ${minWeeks}+ weeks.`,
    });
  }
  
  if (experience === "beginner" && totalWeeks < minWeeks + 2) {
    warnings.push({
      type: "insufficient_time",
      severity: "info",
      message: `As a beginner, extra preparation time helps. Consider a race date ${minWeeks + 4}+ weeks away.`,
    });
  }
  
  return warnings;
}

export function generateSkeleton(
  request: PlanGenerationRequest,
  profile: AthleteProfile,
  totalWeeks: number
): PlanSkeleton {
  const opts: EngineOptions = {
    startDate: new Date(),
    includeSpeedwork: request.includeSpeedwork !== false,
    includeLongRuns: request.includeLongRuns !== false,
    weekStartsOn: "Mon",
  };

  const preferredDays = request.preferredRunDays?.map(d => d.toLowerCase()) ||
    ["tuesday", "thursday", "saturday", "sunday"];

  const preferredLongRunDay = preferredDays.includes("sunday") ? "sunday" :
    preferredDays.includes("saturday") ? "saturday" :
    preferredDays[preferredDays.length - 1] || "sunday";

  const settings: TrainingPlanSettings = {
    goalType: request.goalType as GoalType,
    raceDate: request.raceDate ? new Date(request.raceDate) : null,
    targetTime: request.goalTimeTarget || null,
    daysPerWeek: preferredDays.length,
    preferredLongRunDay,
    preferredDays,
    allowCrossTraining: true,
    paceBasedWorkouts: true,
    totalWeeks,
  };

  const weekStartsOn = opts.weekStartsOn ?? "Mon";
  const planStart = startOfWeek(opts.startDate, weekStartsOn);

  const weeklyTargets = buildWeeklyTargetsKm(settings, profile, planStart);
  const longRunTargets = buildLongRunProgression(settings, profile, settings.totalWeeks);

  const scheduleTemplate = buildScheduleTemplate(settings, opts.includeSpeedwork, opts.includeLongRuns);

  const weeks: SkeletonWeek[] = [];
  let prevWeekDistancesByDow: Record<string, number | null> = {};

  for (let w = 1; w <= settings.totalWeeks; w++) {
    const weekStart = addDays(planStart, (w - 1) * 7);
    const weekEnd = addDays(weekStart, 6);

    const weekType = pickWeekType(settings, w, weekStart, weeklyTargets);
    const targetKm = weeklyTargets[w - 1];

    const days = buildWeekDays(weekStart, settings, scheduleTemplate);

    allocateDistancesForWeek({
      settings,
      profile,
      opts,
      weekType,
      weekTargetKm: targetKm,
      weekStart,
      days,
      prevWeekDistancesByDow,
      longRunTarget: longRunTargets[w - 1]
    });

    prevWeekDistancesByDow = Object.fromEntries(
      days.map(d => [d.dayOfWeek, d.plannedDistanceKm])
    );

    const qualityLevel = computeQualityLevel(weekType, w, settings.totalWeeks);
    const coachNotes = generateWeekCoachNotes(
      weekType,
      w,
      settings.totalWeeks,
      qualityLevel,
      settings.goalType
    );

    weeks.push({
      weekNumber: w,
      weekStartDate: toISO(weekStart),
      weekEndDate: toISO(weekEnd),
      plannedDistanceKm: roundToHalfKm(sumWeekKm(days)),
      plannedDurationMins: null,
      weekType,
      qualityLevel,
      coachNotes,
      days,
    });
  }

  return {
    trainingPlan: { ...settings, coachNotes: null },
    weeks,
  };
}

export function runSkeletonInvariantTests(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(message);
    }
  }

  // Use partial profiles for testing - only fields actually used by skeleton generator
  const testProfiles = [
    { id: 1, userId: 1, sport: "run" as const, baselineWeeklyMileageKm: 20, longestRecentRunKm: 10, weeklyMileageLast12Weeks: null, avgRunsPerWeek: null, typicalEasyPaceMin: null, typicalEasyPaceMax: null, typicalTempoPace: null, typicalIntervalPace: null, hrZones: null, maxHr: null, restingHr: null, avgElevationGainPerKm: null, preferredRunDays: null, injuryFlags: null, maxDaysPerWeek: null, estimatedVdot: null, estimatedRaceTimes: null, lastComputedAt: null, createdAt: new Date() },
    { id: 2, userId: 2, sport: "run" as const, baselineWeeklyMileageKm: 40, longestRecentRunKm: 18, weeklyMileageLast12Weeks: null, avgRunsPerWeek: null, typicalEasyPaceMin: null, typicalEasyPaceMax: null, typicalTempoPace: null, typicalIntervalPace: null, hrZones: null, maxHr: null, restingHr: null, avgElevationGainPerKm: null, preferredRunDays: null, injuryFlags: null, maxDaysPerWeek: null, estimatedVdot: null, estimatedRaceTimes: null, lastComputedAt: null, createdAt: new Date() },
    { id: 3, userId: 3, sport: "run" as const, baselineWeeklyMileageKm: 60, longestRecentRunKm: 25, weeklyMileageLast12Weeks: null, avgRunsPerWeek: null, typicalEasyPaceMin: null, typicalEasyPaceMax: null, typicalTempoPace: null, typicalIntervalPace: null, hrZones: null, maxHr: null, restingHr: null, avgElevationGainPerKm: null, preferredRunDays: null, injuryFlags: null, maxDaysPerWeek: null, estimatedVdot: null, estimatedRaceTimes: null, lastComputedAt: null, createdAt: new Date() },
  ] as AthleteProfile[];

  // Use partial requests for testing - userId not needed for skeleton generation
  const testRequests = [
    { userId: 0, goalType: "marathon", preferredRunDays: ["tuesday", "thursday", "saturday", "sunday"], includeSpeedwork: true, includeLongRuns: true },
    { userId: 0, goalType: "half_marathon", preferredRunDays: ["monday", "wednesday", "friday", "sunday"], includeSpeedwork: true, includeLongRuns: true },
    { userId: 0, goalType: "10k", preferredRunDays: ["tuesday", "thursday", "saturday"], includeSpeedwork: true, includeLongRuns: true },
    { userId: 0, goalType: "5k", preferredRunDays: ["monday", "wednesday", "friday", "saturday"], includeSpeedwork: true, includeLongRuns: true },
  ] as PlanGenerationRequest[];

  const weekLengths = [8, 12, 16];

  for (const profile of testProfiles) {
    for (const request of testRequests) {
      for (const totalWeeks of weekLengths) {
        const label = `[${request.goalType}, ${totalWeeks}wk, baseline=${profile.baselineWeeklyMileageKm}km]`;
        
        let skeleton: PlanSkeleton;
        try {
          skeleton = generateSkeleton(request, profile, totalWeeks);
        } catch (e) {
          errors.push(`${label} generateSkeleton threw: ${e}`);
          failed++;
          continue;
        }

        assert(skeleton.weeks.length === totalWeeks, `${label} week count mismatch: ${skeleton.weeks.length} != ${totalWeeks}`);

        for (let i = 0; i < skeleton.weeks.length; i++) {
          const week = skeleton.weeks[i];
          const weekLabel = `${label} Week ${week.weekNumber}`;
          
          const daySum = week.days.reduce((sum, d) => sum + (d.plannedDistanceKm ?? 0), 0);
          assert(
            Math.abs(daySum - week.plannedDistanceKm) < 1,
            `${weekLabel} sum mismatch: days=${daySum.toFixed(1)} vs week=${week.plannedDistanceKm}`
          );

          assert(
            week.qualityLevel >= 1 && week.qualityLevel <= 5,
            `${weekLabel} invalid qualityLevel: ${week.qualityLevel}`
          );

          if (week.weekType === "base") {
            assert(week.qualityLevel <= 2, `${weekLabel} base week should have qualityLevel 1-2, got ${week.qualityLevel}`);
          } else if (week.weekType === "peak") {
            assert(week.qualityLevel >= 4, `${weekLabel} peak week should have qualityLevel 4-5, got ${week.qualityLevel}`);
          } else if (week.weekType === "recovery") {
            assert(week.qualityLevel <= 3, `${weekLabel} recovery week should have qualityLevel 1-3, got ${week.qualityLevel}`);
          }

          if (i > 0) {
            const prevWeek = skeleton.weeks[i - 1];
            const increase = week.plannedDistanceKm - prevWeek.plannedDistanceKm;
            const maxIncrease = prevWeek.plannedDistanceKm * 0.25;
            
            if (week.weekType !== "recovery" && prevWeek.weekType !== "recovery" && 
                week.weekType !== "taper" && prevWeek.weekType !== "taper") {
              assert(
                increase <= maxIncrease + 0.5,
                `${weekLabel} excessive weekly jump: ${increase.toFixed(1)}km (max ${maxIncrease.toFixed(1)}km from ${prevWeek.plannedDistanceKm}km)`
              );
            }
          }

          const longRunDay = week.days.find(d => d.workoutType === "long_run");
          if (longRunDay && longRunDay.plannedDistanceKm) {
            const otherRuns = week.days.filter(d => 
              d.workoutType !== "long_run" && 
              d.workoutType !== "rest" && 
              d.workoutType !== "cross_training" &&
              d.workoutType !== "race" &&
              d.plannedDistanceKm
            );
            for (const other of otherRuns) {
              assert(
                (other.plannedDistanceKm ?? 0) <= longRunDay.plannedDistanceKm,
                `${weekLabel} long run (${longRunDay.plannedDistanceKm}km) should be longest, but ${other.workoutType} is ${other.plannedDistanceKm}km`
              );
            }
          }

          for (let d = 0; d < week.days.length - 1; d++) {
            const today = week.days[d];
            const tomorrow = week.days[d + 1];
            if (today.intensity === "high" && tomorrow.intensity === "high") {
              assert(
                false,
                `${weekLabel} back-to-back high intensity: ${today.dayOfWeek} (${today.workoutType}) and ${tomorrow.dayOfWeek} (${tomorrow.workoutType})`
              );
            }
          }

          // Verify at least 1 rest day per week (prevents overtraining)
          const restDays = week.days.filter(d => d.workoutType === "rest");
          assert(
            restDays.length >= 1,
            `${weekLabel} should have at least 1 rest day, but has ${restDays.length}`
          );
        }

        const weekTypes = skeleton.weeks.map(w => w.weekType);
        const hasBase = weekTypes.includes("base");
        const hasBuild = weekTypes.includes("build") || weekTypes.includes("peak");
        const hasTaper = weekTypes.includes("taper");

        assert(hasBase || hasBuild, `${label} should have base or build weeks`);
        if (request.goalType !== "general_fitness") {
          assert(hasTaper, `${label} race plan should have taper weeks`);
        }

        const taperIdx = weekTypes.findIndex(t => t === "taper");
        if (taperIdx > 0) {
          const beforeTaper = weekTypes.slice(0, taperIdx);
          assert(
            beforeTaper.every(t => t !== "taper"),
            `${label} taper should be at the end of the plan`
          );
        }

        const peakLongRun = Math.max(...skeleton.weeks.map(w => {
          const lr = w.days.find(d => d.workoutType === "long_run");
          return lr?.plannedDistanceKm ?? 0;
        }));
        const longestRecent = profile.longestRecentRunKm ?? 8;
        const experience = inferExperienceLevel(profile);
        const maxExpectedDelta = experience === "beginner" ? 12 : experience === "intermediate" ? 16 : 20;
        
        assert(
          peakLongRun <= longestRecent + maxExpectedDelta,
          `${label} peak long run (${peakLongRun}km) exceeds safe progression from ${longestRecent}km`
        );
      }
    }
  }

  return { passed, failed, errors };
}
