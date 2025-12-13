import type { AthleteProfile } from "@shared/schema";
import type { PlanGenerationRequest } from "./planGenerator";

// Race distances in kilometers
const RACE_DISTANCES_KM: Record<string, number> = {
  marathon: 42.195,
  half_marathon: 21.0975,
  "10k": 10,
  "5k": 5,
  general_fitness: 0,
};

// Taper weeks by goal type
const TAPER_WEEKS: Record<string, number> = {
  marathon: 3,
  half_marathon: 2,
  "10k": 1,
  "5k": 1,
  general_fitness: 0,
};

// Week types
type WeekType = "base" | "build" | "peak" | "recovery" | "taper";

// Workout types from the schema
type WorkoutType = "easy" | "tempo" | "intervals" | "long_run" | "recovery" | "rest" | "cross_training" | "fartlek" | "hills" | "progression";

// Day of week type
const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

// Skeleton day structure (LLM fills null fields)
export interface SkeletonDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  workoutType: WorkoutType;
  title: string | null; // LLM fills
  description: string | null; // LLM fills
  plannedDistanceKm: number | null;
  plannedDurationMins: number | null;
  targetPace: string | null; // LLM fills
  targetHrZone: string | null; // LLM fills
  intensity: "low" | "moderate" | "high" | null; // LLM fills
  workoutStructure: {
    warmup: string;
    main: string;
    cooldown: string;
    intervals?: Array<{ reps: number; distance: string; pace: string; rest: string }>;
  } | null; // LLM fills
}

// Skeleton week structure
export interface SkeletonWeek {
  weekNumber: number;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  plannedDistanceKm: number;
  plannedDurationMins: number | null;
  weekType: WeekType;
  coachNotes: string | null; // LLM fills
  days: SkeletonDay[];
}

// Full skeleton structure
export interface PlanSkeleton {
  trainingPlan: {
    goalType: string;
    raceDate: string | null;
    targetTime: string | null;
    daysPerWeek: number;
    preferredLongRunDay: string;
    preferredDays: string[];
    allowCrossTraining: boolean;
    paceBasedWorkouts: boolean;
    totalWeeks: number;
    coachNotes: string | null; // LLM fills
  };
  weeks: SkeletonWeek[];
}

// Configuration for skeleton generation
interface SkeletonConfig {
  maxWeeklyIncreasePercent: number;
  recoveryWeekFrequency: number;
  recoveryWeekReduction: number;
  longRunPercentOfWeekly: number;
  peakLongRunPercentOfRace: number;
  maxEasyRunPercentOfRace: number;
  minEasyRunKm: number;
  maxQualityWorkoutsPerWeek: number;
}

const DEFAULT_CONFIG: SkeletonConfig = {
  maxWeeklyIncreasePercent: 12,
  recoveryWeekFrequency: 4,
  recoveryWeekReduction: 25,
  longRunPercentOfWeekly: 30,
  peakLongRunPercentOfRace: 90,
  maxEasyRunPercentOfRace: 50,
  minEasyRunKm: 5,
  maxQualityWorkoutsPerWeek: 2,
};

/**
 * Generates a training plan skeleton with fixed dates, distances, and workout types.
 * The LLM only needs to fill coaching content (titles, descriptions, paces, etc.)
 */
export function generateSkeleton(
  request: PlanGenerationRequest,
  profile: AthleteProfile,
  totalWeeks: number
): PlanSkeleton {
  const config = DEFAULT_CONFIG;
  
  // Calculate start date (next Monday or today if Monday)
  const startDate = getNextMonday(new Date());
  
  // Determine race date
  const raceDate = request.raceDate ? new Date(request.raceDate) : null;
  
  // Get race distance
  const raceDistanceKm = RACE_DISTANCES_KM[request.goalType] || 0;
  
  // Get preferred days (default to 4 days if not specified)
  const preferredDays = request.preferredRunDays?.map(d => d.toLowerCase()) || 
    ["tuesday", "thursday", "saturday", "sunday"];
  
  // Determine long run day (default to sunday)
  const preferredLongRunDay = preferredDays.includes("sunday") ? "sunday" : 
    preferredDays.includes("saturday") ? "saturday" : 
    preferredDays[preferredDays.length - 1] || "sunday";
  
  // Calculate baseline weekly mileage
  const baselineMileageKm = profile.baselineWeeklyMileageKm || 20;
  
  // Calculate taper weeks
  const taperWeeks = TAPER_WEEKS[request.goalType] || 0;
  
  // Get longest recent run from profile
  const longestRecentRunKm = profile.longestRecentRunKm || baselineMileageKm * 0.25;
  
  // Check if long runs are enabled (default true)
  const includeLongRuns = request.includeLongRuns !== false;
  
  // Generate week-by-week structure
  const weeks = generateWeeklyStructure(
    totalWeeks,
    baselineMileageKm,
    raceDistanceKm,
    taperWeeks,
    config,
    startDate,
    preferredDays,
    preferredLongRunDay,
    request.goalType,
    request.includeSpeedwork !== false,
    longestRecentRunKm,
    includeLongRuns
  );
  
  return {
    trainingPlan: {
      goalType: request.goalType,
      raceDate: raceDate ? formatDate(raceDate) : null,
      targetTime: request.goalTimeTarget || null,
      daysPerWeek: preferredDays.length,
      preferredLongRunDay,
      preferredDays,
      allowCrossTraining: true,
      paceBasedWorkouts: true,
      totalWeeks,
      coachNotes: null, // LLM fills
    },
    weeks,
  };
}

/**
 * Generate the weekly structure with progressive distances
 */
function generateWeeklyStructure(
  totalWeeks: number,
  baselineMileageKm: number,
  raceDistanceKm: number,
  taperWeeks: number,
  config: SkeletonConfig,
  startDate: Date,
  preferredDays: string[],
  preferredLongRunDay: string,
  goalType: string,
  includeSpeedwork: boolean,
  longestRecentRunKm: number,
  includeLongRuns: boolean
): SkeletonWeek[] {
  const weeks: SkeletonWeek[] = [];
  
  // Calculate target peak weekly mileage
  // For marathon: aim for 60-80km peak, half: 50-60km, 10k: 40-50km, 5k: 30-40km
  const peakWeeklyTargets: Record<string, number> = {
    marathon: 70,
    half_marathon: 55,
    "10k": 45,
    "5k": 35,
    general_fitness: baselineMileageKm * 1.5,
  };
  
  const targetPeakMileage = Math.max(
    peakWeeklyTargets[goalType] || 50,
    baselineMileageKm * 1.3 // At least 30% increase from baseline
  );
  
  // Calculate peak long run distance (90% of race distance, capped by weekly volume limits)
  const peakLongRunKm = raceDistanceKm > 0 
    ? Math.min(raceDistanceKm * (config.peakLongRunPercentOfRace / 100), 38) // Cap at 38km (marathon training)
    : targetPeakMileage * 0.30;
  
  // Plan phase distribution
  const buildWeeks = totalWeeks - taperWeeks;
  const peakWeekNumber = buildWeeks; // Last non-taper week is peak
  
  // Calculate weekly distances with progression
  const weeklyDistances = calculateWeeklyProgression(
    totalWeeks,
    baselineMileageKm,
    targetPeakMileage,
    taperWeeks,
    config
  );
  
  // Calculate long run progression to reach peak (only if long runs enabled)
  const longRunProgression = includeLongRuns 
    ? calculateLongRunProgression(
        totalWeeks,
        longestRecentRunKm,
        peakLongRunKm,
        taperWeeks,
        config
      )
    : Array(totalWeeks).fill(0);
  
  // Generate each week
  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (weekNum - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    // Determine week type
    const weekType = determineWeekType(
      weekNum,
      totalWeeks,
      taperWeeks,
      peakWeekNumber,
      config
    );
    
    // Get planned weekly distance
    const plannedDistanceKm = weeklyDistances[weekNum - 1];
    
    // Get long run distance for this week
    const longRunKm = longRunProgression[weekNum - 1];
    
    // Generate daily workouts
    const days = generateDailyWorkouts(
      weekStartDate,
      plannedDistanceKm,
      longRunKm,
      preferredDays,
      preferredLongRunDay,
      weekType,
      includeSpeedwork,
      raceDistanceKm,
      config
    );
    
    weeks.push({
      weekNumber: weekNum,
      weekStartDate: formatDate(weekStartDate),
      weekEndDate: formatDate(weekEndDate),
      plannedDistanceKm: Math.round(plannedDistanceKm * 10) / 10,
      plannedDurationMins: null,
      weekType,
      coachNotes: null, // LLM fills
      days,
    });
  }
  
  return weeks;
}

/**
 * Calculate weekly distance progression with recovery weeks
 * Uses forward simulation to count actual build weeks, then distributes increments
 * Respects caps throughout - no forced overrides that violate progression limits
 */
function calculateWeeklyProgression(
  totalWeeks: number,
  baselineMileage: number,
  targetPeakMileage: number,
  taperWeeks: number,
  config: SkeletonConfig
): number[] {
  const distances: number[] = [];
  const buildWeeks = totalWeeks - taperWeeks;
  
  // Max increase per week: 10-15% of current mileage
  const maxIncreasePercent = config.maxWeeklyIncreasePercent / 100;
  
  // First pass: identify which weeks are recovery weeks
  const isRecoveryWeekArr: boolean[] = [];
  let weeksSinceRecovery = 0;
  for (let week = 1; week <= buildWeeks; week++) {
    weeksSinceRecovery++;
    const isRecovery = weeksSinceRecovery >= config.recoveryWeekFrequency && week < buildWeeks;
    isRecoveryWeekArr.push(isRecovery);
    if (isRecovery) weeksSinceRecovery = 0;
  }
  
  // Count actual build weeks (non-recovery weeks)
  const actualBuildWeeks = isRecoveryWeekArr.filter(r => !r).length;
  
  // Calculate the maximum achievable peak given caps
  // Each week we can increase by maxIncreasePercent, compounding
  // achievablePeak = baseline * (1 + maxIncreasePercent)^actualBuildWeeks
  const maxAchievablePeak = baselineMileage * Math.pow(1 + maxIncreasePercent, actualBuildWeeks);
  
  // Use the lesser of target and achievable peak
  const effectivePeakMileage = Math.min(targetPeakMileage, maxAchievablePeak);
  
  // Second pass: calculate distances with even distribution
  let currentMileage = baselineMileage;
  
  for (let week = 1; week <= buildWeeks; week++) {
    const isRecoveryWeek = isRecoveryWeekArr[week - 1];
    
    if (isRecoveryWeek) {
      // Recovery week - reduce by 20-25% but DON'T reset currentMileage baseline
      const recoveryMileage = currentMileage * (1 - config.recoveryWeekReduction / 100);
      distances.push(Math.round(recoveryMileage * 10) / 10);
    } else {
      // Count remaining build weeks (non-recovery) from this week onwards
      let remainingBuildWeeks = 0;
      for (let w = week; w <= buildWeeks; w++) {
        if (!isRecoveryWeekArr[w - 1]) remainingBuildWeeks++;
      }
      
      // Calculate even increment to reach effective peak
      const remainingDistance = effectivePeakMileage - currentMileage;
      const evenIncrement = remainingBuildWeeks > 0 ? remainingDistance / remainingBuildWeeks : 0;
      
      // Apply cap: max 10-15% of current mileage
      const maxIncrease = currentMileage * maxIncreasePercent;
      const actualIncrement = Math.min(Math.max(evenIncrement, 0), maxIncrease);
      
      currentMileage = Math.min(currentMileage + actualIncrement, effectivePeakMileage);
      distances.push(Math.round(currentMileage * 10) / 10);
    }
  }
  
  // Taper phase - progressive reduction from the achieved peak (last build week)
  const achievedPeak = distances.length > 0 ? distances[distances.length - 1] : baselineMileage;
  for (let week = 1; week <= taperWeeks; week++) {
    const reductionPercent = 20 + (week * 10); // 30%, 40%, 50% reduction
    const taperMileage = achievedPeak * (1 - reductionPercent / 100);
    distances.push(Math.round(taperMileage * 10) / 10);
  }
  
  return distances;
}

/**
 * Calculate long run progression to reach peak
 * Uses forward simulation to count actual build weeks, then distributes increments
 * Respects caps throughout - no forced overrides that violate progression limits
 */
function calculateLongRunProgression(
  totalWeeks: number,
  startingLongRun: number,
  peakLongRun: number,
  taperWeeks: number,
  config: SkeletonConfig
): number[] {
  const longRuns: number[] = [];
  const buildWeeks = totalWeeks - taperWeeks;
  
  // Ensure starting long run is at least minEasyRunKm + 2
  const adjustedStart = Math.max(startingLongRun, config.minEasyRunKm + 2);
  
  // Max increase per week: ~1-2km or 15% of current, whichever is smaller
  const maxAbsoluteIncreaseKm = 2.0;
  const maxIncreasePercent = 0.15;
  
  // First pass: identify which weeks are recovery weeks
  const isRecoveryWeekArr: boolean[] = [];
  let weeksSinceRecovery = 0;
  for (let week = 1; week <= buildWeeks; week++) {
    weeksSinceRecovery++;
    const isRecovery = weeksSinceRecovery >= config.recoveryWeekFrequency && week < buildWeeks;
    isRecoveryWeekArr.push(isRecovery);
    if (isRecovery) weeksSinceRecovery = 0;
  }
  
  // Count actual build weeks (non-recovery weeks)
  const actualBuildWeeks = isRecoveryWeekArr.filter(r => !r).length;
  
  // Calculate the maximum achievable peak given caps
  // For long runs, we use the more restrictive cap: min(2km, 15% of current)
  // Estimate using 15% compound growth (conservative estimate)
  const maxAchievablePeak = adjustedStart * Math.pow(1 + maxIncreasePercent, actualBuildWeeks);
  
  // Use the lesser of target and achievable peak
  const effectivePeakLongRun = Math.min(peakLongRun, maxAchievablePeak);
  
  // Second pass: calculate distances with even distribution
  let currentLongRun = adjustedStart;
  
  for (let week = 1; week <= buildWeeks; week++) {
    const isRecoveryWeek = isRecoveryWeekArr[week - 1];
    
    if (isRecoveryWeek) {
      // Recovery week - reduce long run by 25% but DON'T reset baseline
      const recoveryLongRun = currentLongRun * 0.75;
      longRuns.push(Math.round(recoveryLongRun * 10) / 10);
    } else {
      // Count remaining build weeks (non-recovery) from this week onwards
      let remainingBuildWeeks = 0;
      for (let w = week; w <= buildWeeks; w++) {
        if (!isRecoveryWeekArr[w - 1]) remainingBuildWeeks++;
      }
      
      // Calculate even increment to reach effective peak
      const remainingDistance = effectivePeakLongRun - currentLongRun;
      const evenIncrement = remainingBuildWeeks > 0 ? remainingDistance / remainingBuildWeeks : 0;
      
      // Apply caps: max 2km or 15% of current
      const maxIncrease = Math.min(maxAbsoluteIncreaseKm, currentLongRun * maxIncreasePercent);
      const actualIncrement = Math.min(Math.max(evenIncrement, 0), maxIncrease);
      
      currentLongRun = Math.min(currentLongRun + actualIncrement, effectivePeakLongRun);
      longRuns.push(Math.round(currentLongRun * 10) / 10);
    }
  }
  
  // Taper phase - reduce long runs from the achieved peak (last build week)
  const achievedPeak = longRuns.length > 0 ? longRuns[longRuns.length - 1] : adjustedStart;
  for (let week = 1; week <= taperWeeks; week++) {
    const reductionPercent = 25 + (week * 15); // 40%, 55%, 70% reduction
    const taperLongRun = achievedPeak * (1 - reductionPercent / 100);
    longRuns.push(Math.round(Math.max(taperLongRun, config.minEasyRunKm) * 10) / 10);
  }
  
  return longRuns;
}

/**
 * Determine the type of week based on position in plan
 */
function determineWeekType(
  weekNum: number,
  totalWeeks: number,
  taperWeeks: number,
  peakWeekNumber: number,
  config: SkeletonConfig
): WeekType {
  const buildWeeks = totalWeeks - taperWeeks;
  
  // Taper weeks
  if (weekNum > buildWeeks) {
    return "taper";
  }
  
  // Peak week (last week before taper)
  if (weekNum === peakWeekNumber) {
    return "peak";
  }
  
  // Recovery weeks (every 4 weeks)
  if (weekNum % config.recoveryWeekFrequency === 0 && weekNum < peakWeekNumber) {
    return "recovery";
  }
  
  // First few weeks are base building
  if (weekNum <= 3) {
    return "base";
  }
  
  // Everything else is build phase
  return "build";
}

/**
 * Generate daily workout structure for a week
 * Ensures daily distances sum exactly to weekly total
 */
function generateDailyWorkouts(
  weekStartDate: Date,
  weeklyDistanceKm: number,
  longRunKm: number,
  preferredDays: string[],
  preferredLongRunDay: string,
  weekType: WeekType,
  includeSpeedwork: boolean,
  raceDistanceKm: number,
  config: SkeletonConfig
): SkeletonDay[] {
  const days: SkeletonDay[] = [];
  
  // Calculate remaining distance after long run
  const remainingDistance = Math.max(0, weeklyDistanceKm - longRunKm);
  
  // Determine run days excluding long run
  const otherRunDays = preferredDays.filter(d => d !== preferredLongRunDay);
  const numOtherRuns = otherRunDays.length;
  
  // Calculate base easy run distance - NO minimum floor to ensure totals match
  // The weekly distance is the source of truth
  const baseEasyDistance = numOtherRuns > 0 ? remainingDistance / numOtherRuns : 0;
  
  // Apply max cap only (not min floor to preserve total)
  const maxEasyRun = raceDistanceKm > 0 
    ? raceDistanceKm * (config.maxEasyRunPercentOfRace / 100)
    : 15;
  const cappedEasyDistance = Math.min(baseEasyDistance, maxEasyRun);
  
  // Determine quality workout days (tempo, intervals, etc.)
  // No quality workouts in recovery or taper weeks
  const qualityWorkoutDays: string[] = [];
  if (includeSpeedwork && weekType !== "recovery" && weekType !== "taper") {
    // Place quality workouts on mid-week days
    const midweekDays = preferredDays.filter(d => 
      d !== preferredLongRunDay && 
      !["saturday", "sunday"].includes(d)
    );
    
    // Add up to 2 quality workout days
    const qualityCount = Math.min(config.maxQualityWorkoutsPerWeek, midweekDays.length);
    
    // Spread them out - prefer Tuesday and Thursday pattern
    if (midweekDays.includes("tuesday")) qualityWorkoutDays.push("tuesday");
    if (midweekDays.includes("thursday") && qualityWorkoutDays.length < qualityCount) {
      qualityWorkoutDays.push("thursday");
    }
    // If we still need more, add from remaining
    if (qualityWorkoutDays.length < qualityCount) {
      for (const day of midweekDays) {
        if (!qualityWorkoutDays.includes(day)) {
          qualityWorkoutDays.push(day);
          if (qualityWorkoutDays.length >= qualityCount) break;
        }
      }
    }
  }
  
  // Check if long runs are enabled (longRunKm > 0)
  const longRunsEnabled = longRunKm > 0;
  
  // When long runs are disabled, treat the long run day as a regular run day
  // All preferred days get an equal share of the weekly distance
  const effectiveNumRunDays = longRunsEnabled ? numOtherRuns : preferredDays.length;
  const distancePerRunDay = effectiveNumRunDays > 0 
    ? (longRunsEnabled ? cappedEasyDistance : weeklyDistanceKm / effectiveNumRunDays) 
    : 0;
  
  // First pass: assign distances and track total
  interface DayData {
    date: Date;
    dayOfWeek: string;
    isPreferredDay: boolean;
    isLongRunDay: boolean;
    isQualityDay: boolean;
    workoutType: WorkoutType;
    plannedDistanceKm: number;
  }
  
  const dayDataList: DayData[] = [];
  let totalAssigned = 0;
  
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayDate = new Date(weekStartDate);
    dayDate.setDate(dayDate.getDate() + dayIndex);
    
    const dayOfWeek = DAYS_OF_WEEK[dayDate.getDay()];
    const isPreferredDay = preferredDays.includes(dayOfWeek);
    const isLongRunDay = dayOfWeek === preferredLongRunDay && longRunsEnabled;
    const isQualityDay = qualityWorkoutDays.includes(dayOfWeek);
    
    let workoutType: WorkoutType;
    let plannedDistance = 0;
    
    if (!isPreferredDay) {
      workoutType = "rest";
    } else if (isLongRunDay) {
      workoutType = "long_run";
      plannedDistance = longRunKm;
    } else if (isQualityDay) {
      workoutType = qualityWorkoutDays.indexOf(dayOfWeek) % 2 === 0 ? "tempo" : "intervals";
      plannedDistance = (longRunsEnabled ? cappedEasyDistance : distancePerRunDay) * 0.9;
    } else {
      workoutType = "easy";
      plannedDistance = longRunsEnabled ? cappedEasyDistance : distancePerRunDay;
    }
    
    totalAssigned += plannedDistance;
    dayDataList.push({
      date: dayDate,
      dayOfWeek,
      isPreferredDay,
      isLongRunDay,
      isQualityDay,
      workoutType,
      plannedDistanceKm: plannedDistance,
    });
  }
  
  // Distribute any rounding difference across runs
  // IMPORTANT: Never adjust the long run - only easy and quality runs
  const difference = weeklyDistanceKm - totalAssigned;
  
  if (Math.abs(difference) > 0.01) {
    // Prefer easy runs for adjustment
    const easyRunIndices = dayDataList
      .map((d, i) => (d.workoutType === "easy" ? i : -1))
      .filter(i => i >= 0);
    
    // Fallback to quality runs (tempo, intervals) but exclude long runs
    const qualityRunIndices = dayDataList
      .map((d, i) => (["tempo", "intervals", "fartlek", "hills", "progression"].includes(d.workoutType) ? i : -1))
      .filter(i => i >= 0);
    
    // Non-rest, non-long-run days
    const adjustableRunIndices = dayDataList
      .map((d, i) => (d.workoutType !== "rest" && d.workoutType !== "long_run" ? i : -1))
      .filter(i => i >= 0);
    
    // Pick the best set of indices: easy > quality > any adjustable
    let adjustIndices: number[] = [];
    if (easyRunIndices.length > 0) {
      adjustIndices = easyRunIndices;
    } else if (qualityRunIndices.length > 0) {
      adjustIndices = qualityRunIndices;
    } else if (adjustableRunIndices.length > 0) {
      adjustIndices = adjustableRunIndices;
    }
    
    if (adjustIndices.length > 0) {
      const adjustPerRun = difference / adjustIndices.length;
      for (const idx of adjustIndices) {
        dayDataList[idx].plannedDistanceKm += adjustPerRun;
      }
    }
    // If no adjustable runs exist (edge case), the difference remains unallocated
    // This ensures long run distances are preserved at their progression targets
  }
  
  // Build final day objects with rounded distances
  for (const dayData of dayDataList) {
    days.push({
      date: formatDate(dayData.date),
      dayOfWeek: dayData.dayOfWeek,
      workoutType: dayData.workoutType,
      title: null, // LLM fills
      description: null, // LLM fills
      plannedDistanceKm: dayData.workoutType === "rest" 
        ? null 
        : Math.round(dayData.plannedDistanceKm * 10) / 10,
      plannedDurationMins: null,
      targetPace: null, // LLM fills
      targetHrZone: null, // LLM fills
      intensity: null, // LLM fills
      workoutStructure: null, // LLM fills
    });
  }
  
  return days;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get the next Monday (or today if it's Monday)
 */
function getNextMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}
