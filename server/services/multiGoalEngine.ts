import type { GoalType, PhaseType, TerrainType, AthleteProfile } from "@shared/schema";
import type { PlanGenerationRequest } from "./planGenerator";

export interface GoalConfig {
  goalType: GoalType;
  raceDate?: string;
  targetTime?: string;
  priority: "primary" | "secondary";
  terrainType?: TerrainType;
}

export interface ConflictWarning {
  type: "taper_overlap" | "peak_overlap" | "too_close" | "same_date" | "insufficient_rebuild";
  severity: "error" | "warning" | "info";
  message: string;
  recommendation?: string;
}

export interface MultiGoalAnalysis {
  isMultiGoal: boolean;
  goals: GoalConfig[];
  primaryGoal: GoalConfig;
  secondaryGoal?: GoalConfig;
  conflicts: ConflictWarning[];
  canDualPeak: boolean;
  recommendedMode: "single" | "dual_peak" | "primary_secondary" | "training_race";
  totalWeeks: number;
  phaseTimeline: MultiGoalPhase[];
}

export interface MultiGoalPhase {
  weekStart: number;
  weekEnd: number;
  phase: PhaseType;
  primaryFocus: GoalType;
  goalSplit: Record<string, number>;
  description: string;
}

const GOAL_LABELS: Record<GoalType, string> = {
  "5k": "5K", "10k": "10K", "half_marathon": "Half Marathon", "marathon": "Marathon",
  "50k": "50K Ultra", "50_mile": "50 Mile Ultra", "100k": "100K Ultra", "100_mile": "100 Mile Ultra",
  "general_fitness": "General Fitness"
};

function getTaperWeeks(goal: GoalType): number {
  const map: Record<GoalType, number> = {
    "5k": 1, "10k": 1, "half_marathon": 2, "marathon": 3,
    "50k": 3, "50_mile": 3, "100k": 4, "100_mile": 5,
    "general_fitness": 1
  };
  return map[goal] ?? 1;
}

function getPeakWeeks(goal: GoalType): number {
  const map: Record<GoalType, number> = {
    "5k": 1, "10k": 1, "half_marathon": 2, "marathon": 2,
    "50k": 2, "50_mile": 2, "100k": 3, "100_mile": 3,
    "general_fitness": 1
  };
  return map[goal] ?? 1;
}

function getMinBuildWeeks(goal: GoalType): number {
  const map: Record<GoalType, number> = {
    "5k": 3, "10k": 4, "half_marathon": 6, "marathon": 8,
    "50k": 8, "50_mile": 10, "100k": 12, "100_mile": 14,
    "general_fitness": 4
  };
  return map[goal] ?? 6;
}

function isSpeedGoal(goal: GoalType): boolean {
  return ["5k", "10k", "half_marathon"].includes(goal);
}

function isEnduranceGoal(goal: GoalType): boolean {
  return ["marathon", "50k", "50_mile", "100k", "100_mile"].includes(goal);
}

function daysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
}

function isSameDate(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export function detectConflicts(goals: GoalConfig[]): ConflictWarning[] {
  if (goals.length < 2) return [];

  const warnings: ConflictWarning[] = [];
  const primary = goals.find(g => g.priority === "primary") || goals[0];
  const secondary = goals.find(g => g.priority === "secondary") || goals[1];

  if (!primary.raceDate || !secondary.raceDate) {
    return warnings;
  }

  const primaryDate = new Date(primary.raceDate);
  const secondaryDate = new Date(secondary.raceDate);
  const days = daysBetween(primaryDate, secondaryDate);
  const gap = Math.ceil(days / 7);

  if (isSameDate(primaryDate, secondaryDate)) {
    warnings.push({
      type: "same_date",
      severity: "error",
      message: `Both races are on the same date. You can only prepare for one race on a given date.`,
      recommendation: "Move one race to a different date, or choose one as your focus race."
    });
    return warnings;
  }

  const primaryTaper = getTaperWeeks(primary.goalType);
  const secondaryTaper = getTaperWeeks(secondary.goalType);
  const primaryPeak = getPeakWeeks(primary.goalType);

  const [first, second] = primaryDate < secondaryDate
    ? [primary, secondary]
    : [secondary, primary];

  const firstTaper = getTaperWeeks(first.goalType);
  const firstPeak = getPeakWeeks(first.goalType);
  const secondBuild = getMinBuildWeeks(second.goalType);

  if (gap < firstTaper + firstPeak + 2) {
    warnings.push({
      type: "too_close",
      severity: "error",
      message: `Only ${gap} weeks between races. Need at least ${firstTaper + firstPeak + 2} weeks to taper for ${GOAL_LABELS[first.goalType]} and recover before ${GOAL_LABELS[second.goalType]}.`,
      recommendation: `Consider making the first race a training race (B-race) — run it at moderate effort without a full taper.`
    });
  }

  if (gap < firstTaper + secondBuild) {
    warnings.push({
      type: "insufficient_rebuild",
      severity: "warning",
      message: `With ${gap} weeks between races, there isn't enough time for a full rebuild after ${GOAL_LABELS[first.goalType]}. The second race preparation will be compressed.`,
      recommendation: `The ${GOAL_LABELS[second.goalType]} will use fitness from the first block. You won't peak as high but should still perform well.`
    });
  }

  const taperOverlap = Math.max(0, (primaryTaper + secondaryTaper) - gap);
  if (taperOverlap > 0 && gap >= firstTaper + firstPeak + 2) {
    warnings.push({
      type: "taper_overlap",
      severity: "warning",
      message: `Taper periods would overlap by ${taperOverlap} week(s). The secondary race taper will be shortened.`,
      recommendation: `We'll prioritize the primary race taper and use a compressed taper for the secondary race.`
    });
  }

  return warnings;
}

export function analyzeMultiGoalPlan(
  request: PlanGenerationRequest,
  profile: AthleteProfile
): MultiGoalAnalysis {
  const goals = (request.goals || []).map(g => ({
    goalType: g.goalType as GoalType,
    raceDate: g.raceDate,
    targetTime: g.targetTime,
    priority: g.priority as "primary" | "secondary",
    terrainType: (g.terrainType as TerrainType) || "road" as TerrainType,
  }));

  if (goals.length < 2) {
    return {
      isMultiGoal: false,
      goals,
      primaryGoal: goals[0] || { goalType: request.goalType as GoalType, priority: "primary" as const, raceDate: request.raceDate },
      conflicts: [],
      canDualPeak: false,
      recommendedMode: "single",
      totalWeeks: 0,
      phaseTimeline: [],
    };
  }

  const primary = goals.find(g => g.priority === "primary") || goals[0];
  const secondary = goals.find(g => g.priority === "secondary") || goals[1];

  const conflicts = detectConflicts(goals);
  const hasError = conflicts.some(c => c.severity === "error");

  let canDualPeak = false;
  let recommendedMode: MultiGoalAnalysis["recommendedMode"] = "primary_secondary";

  if (!hasError && primary.raceDate && secondary.raceDate) {
    const gap = Math.ceil(daysBetween(new Date(primary.raceDate), new Date(secondary.raceDate)) / 7);
    const minForDualPeak = getTaperWeeks(primary.goalType) + getPeakWeeks(primary.goalType) +
      getMinBuildWeeks(secondary.goalType) + getTaperWeeks(secondary.goalType) + 4;

    if (gap >= minForDualPeak) {
      canDualPeak = true;
      recommendedMode = "dual_peak";
    } else if (gap < getTaperWeeks(primary.goalType) + getPeakWeeks(primary.goalType) + 2) {
      recommendedMode = "training_race";
    }
  }

  const now = new Date();
  const raceDates = goals.filter(g => g.raceDate).map(g => new Date(g.raceDate!));
  const latestRace = raceDates.length > 0 ? new Date(Math.max(...raceDates.map(d => d.getTime()))) : null;
  const totalWeeks = latestRace ? Math.max(8, Math.min(30, Math.ceil(daysBetween(now, latestRace) / 7))) : 16;

  const phaseTimeline = buildMultiGoalPhaseTimeline(primary, secondary, totalWeeks, recommendedMode);

  return {
    isMultiGoal: true,
    goals,
    primaryGoal: primary,
    secondaryGoal: secondary,
    conflicts,
    canDualPeak,
    recommendedMode,
    totalWeeks,
    phaseTimeline,
  };
}

function buildMultiGoalPhaseTimeline(
  primary: GoalConfig,
  secondary: GoalConfig,
  totalWeeks: number,
  mode: MultiGoalAnalysis["recommendedMode"]
): MultiGoalPhase[] {
  const phases: MultiGoalPhase[] = [];

  if (mode === "dual_peak" && primary.raceDate && secondary.raceDate) {
    const primaryDate = new Date(primary.raceDate);
    const secondaryDate = new Date(secondary.raceDate);
    const [first, second] = primaryDate < secondaryDate
      ? [primary, secondary]
      : [secondary, primary];

    const now = new Date();
    const firstRaceWeek = Math.ceil(daysBetween(now, new Date(first.raceDate!)) / 7);
    const secondRaceWeek = Math.ceil(daysBetween(now, new Date(second.raceDate!)) / 7);

    const firstTaper = getTaperWeeks(first.goalType);
    const firstPeakWeeks = getPeakWeeks(first.goalType);
    const firstBuildEnd = firstRaceWeek - firstTaper;
    const firstPeakStart = firstBuildEnd - firstPeakWeeks;

    const recoveryWeeks = 2;
    const secondBuildStart = firstRaceWeek + recoveryWeeks + 1;
    const secondTaper = getTaperWeeks(second.goalType);
    const secondBuildEnd = secondRaceWeek - secondTaper;

    const baseEnd = Math.max(2, Math.floor(firstPeakStart * 0.3));

    phases.push({
      weekStart: 1, weekEnd: baseEnd, phase: "base",
      primaryFocus: first.goalType,
      goalSplit: { [first.goalType]: 50, [second.goalType]: 50 },
      description: `Shared base building for both ${GOAL_LABELS[first.goalType]} and ${GOAL_LABELS[second.goalType]}`
    });

    if (firstPeakStart > baseEnd + 1) {
      phases.push({
        weekStart: baseEnd + 1, weekEnd: firstPeakStart, phase: "build",
        primaryFocus: first.goalType,
        goalSplit: { [first.goalType]: 65, [second.goalType]: 35 },
        description: `Building toward ${GOAL_LABELS[first.goalType]} with ${GOAL_LABELS[second.goalType]} maintenance`
      });
    }

    phases.push({
      weekStart: firstPeakStart + 1, weekEnd: firstBuildEnd, phase: "peak",
      primaryFocus: first.goalType,
      goalSplit: { [first.goalType]: 80, [second.goalType]: 20 },
      description: `Peak training for ${GOAL_LABELS[first.goalType]}`
    });

    phases.push({
      weekStart: firstBuildEnd + 1, weekEnd: firstRaceWeek, phase: "taper",
      primaryFocus: first.goalType,
      goalSplit: { [first.goalType]: 90, [second.goalType]: 10 },
      description: `Taper for ${GOAL_LABELS[first.goalType]} race`
    });

    if (secondBuildStart <= secondBuildEnd) {
      phases.push({
        weekStart: firstRaceWeek + 1, weekEnd: secondBuildStart - 1, phase: "recovery",
        primaryFocus: second.goalType,
        goalSplit: { [first.goalType]: 10, [second.goalType]: 90 },
        description: `Recovery from ${GOAL_LABELS[first.goalType]}, transition to ${GOAL_LABELS[second.goalType]}`
      });

      phases.push({
        weekStart: secondBuildStart, weekEnd: secondBuildEnd, phase: "build2_specific",
        primaryFocus: second.goalType,
        goalSplit: { [first.goalType]: 15, [second.goalType]: 85 },
        description: `Race-specific build for ${GOAL_LABELS[second.goalType]}`
      });
    }

    if (secondRaceWeek > secondBuildEnd) {
      phases.push({
        weekStart: secondBuildEnd + 1, weekEnd: Math.min(secondRaceWeek, totalWeeks), phase: "taper",
        primaryFocus: second.goalType,
        goalSplit: { [first.goalType]: 5, [second.goalType]: 95 },
        description: `Taper for ${GOAL_LABELS[second.goalType]} race`
      });
    }
  } else {
    const taperWeeks = getTaperWeeks(primary.goalType);
    const peakWeeks = getPeakWeeks(primary.goalType);
    const buildWeeks = totalWeeks - taperWeeks;
    const baseEnd = Math.max(2, Math.floor(buildWeeks * 0.2));
    const peakStart = buildWeeks - peakWeeks;

    const isComplementary = (isSpeedGoal(primary.goalType) && isEnduranceGoal(secondary.goalType)) ||
                            (isEnduranceGoal(primary.goalType) && isSpeedGoal(secondary.goalType));

    const primaryPct = 60;
    const secondaryPct = 40;

    phases.push({
      weekStart: 1, weekEnd: baseEnd, phase: "base",
      primaryFocus: primary.goalType,
      goalSplit: { [primary.goalType]: 50, [secondary.goalType]: 50 },
      description: `Shared aerobic base for ${GOAL_LABELS[primary.goalType]} and ${GOAL_LABELS[secondary.goalType]}`
    });

    phases.push({
      weekStart: baseEnd + 1, weekEnd: peakStart, phase: "build",
      primaryFocus: primary.goalType,
      goalSplit: {
        [primary.goalType]: isComplementary ? primaryPct : 65,
        [secondary.goalType]: isComplementary ? secondaryPct : 35
      },
      description: isComplementary
        ? `Complementary training: speed work for ${GOAL_LABELS[primary.goalType]}, endurance for ${GOAL_LABELS[secondary.goalType]}`
        : `Progressive build with ${GOAL_LABELS[primary.goalType]} emphasis`
    });

    if (peakStart < buildWeeks) {
      phases.push({
        weekStart: peakStart + 1, weekEnd: buildWeeks, phase: "peak",
        primaryFocus: primary.goalType,
        goalSplit: { [primary.goalType]: 75, [secondary.goalType]: 25 },
        description: `Peak training focused on ${GOAL_LABELS[primary.goalType]}`
      });
    }

    phases.push({
      weekStart: buildWeeks + 1, weekEnd: totalWeeks, phase: "taper",
      primaryFocus: primary.goalType,
      goalSplit: { [primary.goalType]: 85, [secondary.goalType]: 15 },
      description: `Taper for ${GOAL_LABELS[primary.goalType]} race`
    });
  }

  return phases.filter(p => p.weekStart <= p.weekEnd && p.weekStart <= totalWeeks);
}

export interface MultiGoalWorkoutTag {
  goalContribution: Record<string, number>;
  primaryGoalTag: GoalType;
}

export function tagWorkoutForGoals(
  workoutType: string,
  dayOfWeek: string,
  weekPhase: MultiGoalPhase,
  primaryGoal: GoalConfig,
  secondaryGoal: GoalConfig
): MultiGoalWorkoutTag {
  const pGoal = primaryGoal.goalType;
  const sGoal = secondaryGoal.goalType;

  if (workoutType === "rest" || workoutType === "cross_training") {
    return {
      goalContribution: { [pGoal]: 50, [sGoal]: 50 },
      primaryGoalTag: pGoal,
    };
  }

  const pIsSpeed = isSpeedGoal(pGoal);
  const sIsSpeed = isSpeedGoal(sGoal);
  const pIsEndurance = isEnduranceGoal(pGoal);
  const sIsEndurance = isEnduranceGoal(sGoal);

  if (workoutType === "tempo" || workoutType === "intervals" || workoutType === "fartlek") {
    if (pIsSpeed) {
      return { goalContribution: { [pGoal]: 80, [sGoal]: 20 }, primaryGoalTag: pGoal };
    }
    if (sIsSpeed) {
      return { goalContribution: { [pGoal]: 20, [sGoal]: 80 }, primaryGoalTag: sGoal };
    }
    return {
      goalContribution: { [pGoal]: weekPhase.goalSplit[pGoal] ?? 60, [sGoal]: weekPhase.goalSplit[sGoal] ?? 40 },
      primaryGoalTag: pGoal,
    };
  }

  if (workoutType === "long_run" || workoutType === "back_to_back_long") {
    if (pIsEndurance) {
      return { goalContribution: { [pGoal]: 80, [sGoal]: 20 }, primaryGoalTag: pGoal };
    }
    if (sIsEndurance) {
      return { goalContribution: { [pGoal]: 30, [sGoal]: 70 }, primaryGoalTag: sGoal };
    }
    return {
      goalContribution: { [pGoal]: weekPhase.goalSplit[pGoal] ?? 60, [sGoal]: weekPhase.goalSplit[sGoal] ?? 40 },
      primaryGoalTag: pGoal,
    };
  }

  if (workoutType === "hills" || workoutType === "progression") {
    return {
      goalContribution: { [pGoal]: 50, [sGoal]: 50 },
      primaryGoalTag: pGoal,
    };
  }

  if (workoutType === "fueling_practice") {
    const ultraGoal = pIsEndurance ? pGoal : sGoal;
    const otherGoal = ultraGoal === pGoal ? sGoal : pGoal;
    return {
      goalContribution: { [ultraGoal]: 90, [otherGoal]: 10 },
      primaryGoalTag: ultraGoal,
    };
  }

  return {
    goalContribution: weekPhase.goalSplit,
    primaryGoalTag: weekPhase.primaryFocus,
  };
}

export function getPhaseForWeek(
  weekNumber: number,
  timeline: MultiGoalPhase[]
): MultiGoalPhase | null {
  return timeline.find(p => weekNumber >= p.weekStart && weekNumber <= p.weekEnd) || null;
}

export function computeWeekGoalSplit(
  phase: MultiGoalPhase | null,
  workoutTags: MultiGoalWorkoutTag[]
): Record<string, number> {
  if (!phase) return {};

  if (workoutTags.length === 0) return phase.goalSplit;

  const totals: Record<string, number> = {};
  let count = 0;

  for (const tag of workoutTags) {
    for (const [goal, pct] of Object.entries(tag.goalContribution)) {
      totals[goal] = (totals[goal] || 0) + pct;
    }
    count++;
  }

  if (count === 0) return phase.goalSplit;

  const result: Record<string, number> = {};
  for (const [goal, total] of Object.entries(totals)) {
    result[goal] = Math.round(total / count);
  }

  return result;
}
