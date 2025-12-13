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

  const consistencyFactor =
    profile.consistency === "low" ? 0.9 :
    profile.consistency === "medium" ? 1.0 : 1.0;

  const baseWeeklyKm = profile.baselineWeeklyMileageKm || 20;
  const startKm = Math.max(10, baseWeeklyKm * consistencyFactor);
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
  const runDays = preferred.slice(0, settings.daysPerWeek);

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

  const longRunDay = runDays.includes(normalizedLongRunDay)
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
      if (runDays.includes(next) && template[next] === "easy") template[next] = "recovery";
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
  const peakLongRun = goalLongCapKm(settings.goalType as GoalType);
  
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
}) {
  const { settings, profile, opts, weekType, weekTargetKm, days, prevWeekDistancesByDow } = args;

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

  const maxLongIncrease = (weekType === "recovery" || weekType === "taper") ? 0 : 2.0;
  
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
  
  const prevLong = prevWeekDistancesByDow[normalizedLongRunDay] ?? null;

  let longKm = 0;
  const longestRecentRunKm = profile.longestRecentRunKm || 10;
  const goalLongCap = goalLongCapKm(settings.goalType as GoalType);

  if (raceDay) {
    longKm = raceDay.plannedDistanceKm ?? 0;
  } else if (opts.includeLongRuns && longDay) {
    const raw = W * 0.30;
    const minLong = Math.max(6, longestRecentRunKm * 0.5);
    
    longKm = roundToHalfKm(clamp(raw, minLong, goalLongCap));

    if (prevLong && (weekType === "build" || weekType === "base" || weekType === "peak")) {
      longKm = roundToHalfKm(clamp(longKm, prevLong - 1, prevLong + maxLongIncrease));
    }
    
    if (weekType === "recovery") {
      longKm = roundToHalfKm((prevLong ?? longKm) * 0.75);
    }
    if (weekType === "taper") {
      longKm = roundToHalfKm((prevLong ?? longKm) * 0.70);
    }
    
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
    daysPerWeek: request.daysPerWeek || preferredDays.length,
    preferredLongRunDay,
    preferredDays,
    allowCrossTraining: true,
    paceBasedWorkouts: true,
    totalWeeks,
  };

  const weekStartsOn = opts.weekStartsOn ?? "Mon";
  const planStart = startOfWeek(opts.startDate, weekStartsOn);

  const weeklyTargets = buildWeeklyTargetsKm(settings, profile, planStart);

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
      prevWeekDistancesByDow
    });

    prevWeekDistancesByDow = Object.fromEntries(
      days.map(d => [d.dayOfWeek, d.plannedDistanceKm])
    );

    weeks.push({
      weekNumber: w,
      weekStartDate: toISO(weekStart),
      weekEndDate: toISO(weekEnd),
      plannedDistanceKm: roundToHalfKm(sumWeekKm(days)),
      plannedDurationMins: null,
      weekType,
      coachNotes: null,
      days,
    });
  }

  return {
    trainingPlan: { ...settings, coachNotes: null },
    weeks,
  };
}
