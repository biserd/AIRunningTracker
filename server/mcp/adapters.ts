import { storage, RUNNING_ACTIVITY_TYPES } from "../storage";
import { fitnessService } from "../services/fitness";
import { runnerScoreService } from "../services/runnerScore";
import { toolsContent } from "../ssr/toolsContent";
import { getFreeActivityLimit, isPaidPlan } from "../rateLimits";
import type { Activity, RunningShoe } from "@shared/schema";

export class McpToolError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "McpToolError";
  }
}

export function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function requireOwnedRecord<T extends { userId: number }>(
  record: T | undefined,
  userId: number,
  label: string,
): T {
  if (!record || record.userId !== userId) throw new McpToolError("not_found", `${label} not found`);
  return record;
}

export function normalizeDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  defaultDays = 90,
  maxDays = 365,
) {
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();
  if (!Number.isFinite(end.getTime())) throw new McpToolError("invalid_arguments", "endDate must be YYYY-MM-DD");
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(end.getTime() - defaultDays * 86400000);
  if (!Number.isFinite(start.getTime())) throw new McpToolError("invalid_arguments", "startDate must be YYYY-MM-DD");
  if (start > end) throw new McpToolError("invalid_arguments", "startDate must not be after endDate");
  if (end.getTime() - start.getTime() > maxDays * 86400000) {
    throw new McpToolError("invalid_arguments", `Date range cannot exceed ${maxDays} days`);
  }
  return { start, end, startDate: start.toISOString(), endDate: end.toISOString().slice(0, 10) };
}

function sanitizeActivity(activity: Activity, includeLaps = false) {
  const distanceKm = activity.distance / 1000;
  const paceSecondsPerKm = distanceKm > 0 ? activity.movingTime / distanceKm : null;
  const base: Record<string, unknown> = {
    activityId: activity.id,
    name: activity.name,
    type: activity.type,
    startDate: activity.startDate,
    distanceMeters: activity.distance,
    movingTimeSeconds: activity.movingTime,
    elapsedTimeSeconds: activity.elapsedTime,
    elevationGainMeters: activity.totalElevationGain,
    averageSpeedMetersPerSecond: activity.averageSpeed,
    maxSpeedMetersPerSecond: activity.maxSpeed,
    paceSecondsPerKm,
    averageHeartRate: activity.averageHeartrate,
    maxHeartRate: activity.maxHeartrate,
    averageCadenceSpm: activity.averageCadence,
    maxCadenceSpm: activity.maxCadence,
    averageWatts: activity.averageWatts,
    maxWatts: activity.maxWatts,
    calories: activity.calories,
    averageTemperatureC: activity.averageTemp,
    workoutType: activity.workoutType,
    grade: activity.cachedGrade,
  };
  if (includeLaps && activity.lapsData) {
    try {
      const parsed = typeof activity.lapsData === "string" ? JSON.parse(activity.lapsData) : activity.lapsData;
      const laps = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      base.laps = laps.slice(0, 100).map((lap: any, index: number) => ({
        lap: index + 1,
        distanceMeters: Number(lap.distance || 0),
        movingTimeSeconds: Number(lap.moving_time || lap.movingTime || 0),
        elapsedTimeSeconds: Number(lap.elapsed_time || lap.elapsedTime || 0),
        averageSpeedMetersPerSecond: lap.average_speed ?? lap.averageSpeed ?? null,
        averageHeartRate: lap.average_heartrate ?? lap.averageHeartrate ?? null,
        averageCadenceSpm: lap.average_cadence ?? lap.averageCadence ?? null,
      }));
      base.lapsTruncated = laps.length > 100;
    } catch {
      base.laps = [];
      base.lapsTruncated = false;
    }
  }
  return base;
}

async function getVisibility(userId: number) {
  const user = await storage.getUser(userId);
  if (!user) throw new McpToolError("not_found", "Runner account was not found");
  const paid = isPaidPlan(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null);
  return { user, paid, freeLimit: getFreeActivityLimit(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null) };
}

export async function readRunnerProfile(userId: number) {
  const { user } = await getVisibility(userId);
  const athleteProfile = await storage.getAthleteProfile(userId, "run");
  return {
    profile: {
      displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Runner",
      email: user.email,
      unitPreference: user.unitPreference || "km",
      activityViewMode: user.activityViewMode || "story",
      stravaConnected: !!user.stravaConnected,
    },
    preferences: {
      coachGoal: user.coachGoal,
      coachRaceDate: user.coachRaceDate,
      coachTargetTime: user.coachTargetTime,
      coachDaysAvailable: user.coachDaysAvailable || [],
      coachWeeklyMileageCapKm: user.coachWeeklyMileageCap,
      coachTone: user.coachTone,
      notifyPostRun: user.notifyPostRun,
      postRunEmailFrequency: user.postRunEmailFrequency,
      coachNotifyRecap: user.coachNotifyRecap,
      coachNotifyWeeklySummary: user.coachNotifyWeeklySummary,
    },
    computedRunningProfile: athleteProfile ? {
      baselineWeeklyMileageKm: athleteProfile.baselineWeeklyMileageKm,
      longestRecentRunKm: athleteProfile.longestRecentRunKm,
      averageRunsPerWeek: athleteProfile.avgRunsPerWeek,
      typicalEasyPaceMinPerKm: athleteProfile.typicalEasyPaceMin,
      typicalEasyPaceMaxPerKm: athleteProfile.typicalEasyPaceMax,
      maxHeartRate: athleteProfile.maxHr,
      restingHeartRate: athleteProfile.restingHr,
      preferredRunDays: athleteProfile.preferredRunDays || [],
      maxDaysPerWeek: athleteProfile.maxDaysPerWeek,
      estimatedVdot: athleteProfile.estimatedVdot,
      estimatedRaceTimes: athleteProfile.estimatedRaceTimes,
      lastComputedAt: athleteProfile.lastComputedAt,
    } : null,
  };
}

export async function listRunnerActivities(userId: number, input: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  minDistanceMeters?: number;
  maxDistanceMeters?: number;
}) {
  const { paid, freeLimit } = await getVisibility(userId);
  const page = clampInteger(input.page, 1, 1, 10000);
  const pageSize = clampInteger(input.pageSize, 25, 1, 100);
  const range = normalizeDateRange(input.startDate, input.endDate, 90, 365);
  let effectiveStart = range.startDate;
  if (!paid && freeLimit !== null) {
    const newest = await storage.getActivitiesByUserId(userId, freeLimit, undefined, { excludeLockedForFree: true });
    if (newest.length === 0) return { activities: [], page, pageSize, total: 0, totalPages: 0, range: { startDate: range.startDate, endDate: range.endDate }, truncatedByPlan: true };
    const cutoff = new Date(newest[newest.length - 1].startDate);
    if (cutoff > range.start) effectiveStart = cutoff.toISOString();
  }
  const result = await storage.getActivitiesByUserIdPaginated(userId, {
    page,
    pageSize,
    startDate: effectiveStart,
    endDate: range.endDate,
    minDistance: input.minDistanceMeters,
    maxDistance: input.maxDistanceMeters,
    excludeLockedForFree: !paid,
  });
  const cappedTotal = freeLimit === null ? result.total : Math.min(result.total, freeLimit);
  return {
    activities: result.activities.map((activity) => sanitizeActivity(activity, false)),
    page,
    pageSize,
    total: cappedTotal,
    totalPages: Math.ceil(cappedTotal / pageSize),
    range: { startDate: range.start.toISOString().slice(0, 10), endDate: range.endDate },
    truncatedByPlan: !paid,
  };
}

export async function readRunnerActivity(userId: number, activityId: number, includeLaps = false) {
  const { paid } = await getVisibility(userId);
  const activity = await storage.getActivityById(activityId);
  // Return the same not-found response for absent and foreign records to avoid IDOR enumeration.
  const ownedActivity = requireOwnedRecord(activity, userId, "Activity");
  if (!!ownedActivity.lockedForFree && !paid) {
    throw new McpToolError("not_found", "Activity not found");
  }
  return { activity: sanitizeActivity(ownedActivity, includeLaps) };
}

function runningOnly(activities: Activity[]) {
  return activities.filter((activity) => RUNNING_ACTIVITY_TYPES.includes(activity.type));
}

function summarizeActivities(activities: Activity[]) {
  const distanceMeters = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  const movingTimeSeconds = activities.reduce((sum, activity) => sum + (activity.movingTime || 0), 0);
  return {
    runs: activities.length,
    distanceMeters,
    movingTimeSeconds,
    elevationGainMeters: activities.reduce((sum, activity) => sum + (activity.totalElevationGain || 0), 0),
    averageDistanceMeters: activities.length ? distanceMeters / activities.length : 0,
    averagePaceSecondsPerKm: distanceMeters > 0 ? movingTimeSeconds / (distanceMeters / 1000) : null,
  };
}

export async function readDashboardTrends(userId: number, daysInput = 30) {
  const { paid } = await getVisibility(userId);
  const days = clampInteger(daysInput, 30, 7, 180);
  const now = new Date();
  const start = new Date(now.getTime() - days * 2 * 86400000);
  const activities = runningOnly(await storage.getActivitiesByUserId(userId, 500, start, { excludeLockedForFree: !paid }));
  const midpoint = new Date(now.getTime() - days * 86400000);
  const current = activities.filter((activity) => new Date(activity.startDate) >= midpoint && new Date(activity.startDate) <= now);
  const previous = activities.filter((activity) => new Date(activity.startDate) >= start && new Date(activity.startDate) < midpoint);
  const currentSummary = summarizeActivities(current);
  const previousSummary = summarizeActivities(previous);
  const percentChange = (currentValue: number, priorValue: number) => priorValue > 0 ? Math.round(((currentValue - priorValue) / priorValue) * 1000) / 10 : null;
  return {
    periodDays: days,
    current: currentSummary,
    previous: previousSummary,
    change: {
      runsPercent: percentChange(currentSummary.runs, previousSummary.runs),
      distancePercent: percentChange(currentSummary.distanceMeters, previousSummary.distanceMeters),
      movingTimePercent: percentChange(currentSummary.movingTimeSeconds, previousSummary.movingTimeSeconds),
    },
    generatedAt: now.toISOString(),
  };
}

export async function readFitnessMetrics(userId: number, daysInput = 90) {
  const { paid } = await getVisibility(userId);
  const days = clampInteger(daysInput, 90, 30, 180);
  const start = new Date(Date.now() - days * 2 * 86400000);
  const activities = runningOnly(await storage.getActivitiesByUserId(userId, 500, start, { excludeLockedForFree: !paid }));
  const metrics = await fitnessService.calculateFitnessMetrics(activities, days);
  const current = metrics.at(-1) || null;
  return {
    periodDays: days,
    current,
    interpretation: current ? fitnessService.getFormInterpretation(current.tsb) : null,
    daily: metrics.slice(-days),
  };
}

export async function readRecoveryStatus(userId: number) {
  const { paid } = await getVisibility(userId);
  const now = new Date();
  const start = new Date(now.getTime() - 28 * 86400000);
  const activities = runningOnly(await storage.getActivitiesByUserId(userId, 100, start, { excludeLockedForFree: !paid }))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const lastRun = activities[0] || null;
  const daysSinceLastRun = lastRun ? Math.max(0, Math.floor((now.getTime() - new Date(lastRun.startDate).getTime()) / 86400000)) : null;
  const distanceInWindow = (days: number) => activities
    .filter((activity) => new Date(activity.startDate).getTime() >= now.getTime() - days * 86400000)
    .reduce((sum, activity) => sum + activity.distance / 1000, 0);
  const acuteLoadKm = distanceInWindow(7);
  const chronicWeeklyKm = distanceInWindow(28) / 4;
  const ratio = chronicWeeklyKm > 0 ? acuteLoadKm / chronicWeeklyKm : null;
  const riskLevel = ratio === null ? "unknown" : ratio >= 1.5 ? "critical" : ratio >= 1.3 ? "high" : ratio >= 1.1 ? "moderate" : "low";
  return {
    generatedAt: now.toISOString(),
    lastRun: lastRun ? { activityId: lastRun.id, name: lastRun.name, startDate: lastRun.startDate } : null,
    daysSinceLastRun,
    acuteLoadKm: Math.round(acuteLoadKm * 10) / 10,
    chronicWeeklyLoadKm: Math.round(chronicWeeklyKm * 10) / 10,
    acuteChronicRatio: ratio === null ? null : Math.round(ratio * 100) / 100,
    riskLevel,
    limitation: "Training-load context only; not a diagnosis, injury prediction, or medical clearance.",
  };
}

export async function readRunnerScore(userId: number) {
  await getVisibility(userId);
  return { score: await runnerScoreService.calculateRunnerScore(userId) };
}

export async function listRunnerGoals(userId: number, status?: "active" | "completed") {
  await getVisibility(userId);
  const goals = await storage.getGoalsByUserId(userId, status);
  return {
    goals: goals.slice(0, 100).map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      description: goal.description,
      type: goal.type,
      targetValue: goal.targetValue,
      currentProgress: goal.currentProgress,
      status: goal.status,
      source: goal.source,
      completedAt: goal.completedAt,
      createdAt: goal.createdAt,
    })),
    truncated: goals.length > 100,
  };
}

function sanitizePlan(plan: any) {
  return {
    planId: plan.id,
    goalType: plan.goalType,
    raceDate: plan.raceDate,
    targetTime: plan.targetTime,
    terrainType: plan.terrainType,
    daysPerWeek: plan.daysPerWeek,
    preferredLongRunDay: plan.preferredLongRunDay,
    preferredDays: plan.preferredDays || [],
    allowCrossTraining: plan.allowCrossTraining,
    paceBasedWorkouts: plan.paceBasedWorkouts,
    status: plan.status,
    totalWeeks: plan.totalWeeks,
    currentWeek: plan.currentWeek,
    coachNotes: plan.coachNotes,
    enrichmentStatus: plan.enrichmentStatus,
    enrichedWeeks: plan.enrichedWeeks,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export async function listRunnerTrainingPlans(userId: number) {
  await getVisibility(userId);
  const plans = await storage.getTrainingPlansByUserId(userId);
  return { plans: plans.slice(0, 50).map(sanitizePlan), truncated: plans.length > 50 };
}

export async function readRunnerTrainingPlan(userId: number, planId: number) {
  await getVisibility(userId);
  const plan = requireOwnedRecord(await storage.getTrainingPlanById(planId), userId, "Training plan");
  const allWeeks = await storage.getPlanWeeks(planId);
  const weeks = allWeeks.slice(0, 32);
  const [weekRows, planGoals] = await Promise.all([
    Promise.all(weeks.map(async (week: any) => ({
      weekId: week.id,
      weekNumber: week.weekNumber,
      phase: week.phase,
      title: week.title,
      description: week.description,
      targetMileageKm: week.targetMileageKm,
      days: (await storage.getPlanDays(week.id)).slice(0, 7).map((day: any) => ({
        dayId: day.id,
        dayOfWeek: day.dayOfWeek,
        date: day.date,
        workoutType: day.workoutType,
        title: day.title,
        description: day.description,
        targetDistanceKm: day.targetDistanceKm,
        targetDurationMins: day.targetDurationMins,
        targetPace: day.targetPace,
        intensity: day.intensity,
        completed: day.completed,
      })),
    }))),
    storage.getPlanGoals(planId),
  ]);
  return {
    ...sanitizePlan(plan),
    weeks: weekRows,
    goals: planGoals.slice(0, 10).map((goal: any) => ({ type: goal.goalType, priority: goal.priority, raceDate: goal.raceDate, targetTime: goal.targetTime })),
    weeksTruncated: allWeeks.length > 32,
  };
}

function sanitizeShoe(shoe: RunningShoe) {
  return {
    slug: shoe.slug,
    brand: shoe.brand,
    model: shoe.model,
    seriesName: shoe.seriesName,
    versionNumber: shoe.versionNumber,
    category: shoe.category,
    weightOunces: shoe.weight,
    heelStackHeightMm: shoe.heelStackHeight,
    forefootStackHeightMm: shoe.forefootStackHeight,
    heelToToeDropMm: shoe.heelToToeDrop,
    cushioningLevel: shoe.cushioningLevel,
    stability: shoe.stability,
    hasCarbonPlate: shoe.hasCarbonPlate,
    hasSuperFoam: shoe.hasSuperFoam,
    priceUsd: shoe.price,
    bestFor: shoe.bestFor,
    durabilityRating: shoe.durabilityRating,
    responsivenessRating: shoe.responsivenessRating,
    comfortRating: shoe.comfortRating,
    releaseYear: shoe.releaseYear,
    description: shoe.description,
    mileageEstimate: shoe.aiMileageEstimate,
    targetUsage: shoe.aiTargetUsage,
    lastVerified: shoe.lastVerified,
  };
}

export async function searchPublicShoes(input: {
  query?: string;
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  hasCarbonPlate?: boolean;
  stability?: string;
  limit?: number;
}) {
  const limit = clampInteger(input.limit, 20, 1, 50);
  const shoes = await storage.getShoes({
    brand: input.brand,
    category: input.category,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    hasCarbonPlate: input.hasCarbonPlate,
    stability: input.stability,
  });
  const query = input.query?.trim().toLowerCase();
  const filtered = query ? shoes.filter((shoe) => `${shoe.brand} ${shoe.model} ${shoe.seriesName || ""} ${shoe.category}`.toLowerCase().includes(query)) : shoes;
  return { shoes: filtered.slice(0, limit).map(sanitizeShoe), returned: Math.min(filtered.length, limit), totalMatches: filtered.length, truncated: filtered.length > limit };
}

export async function readPublicShoe(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw new McpToolError("invalid_arguments", "A valid shoe slug is required");
  const shoe = await storage.getShoeBySlug(slug);
  if (!shoe) throw new McpToolError("not_found", "Shoe not found");
  return { shoe: sanitizeShoe(shoe) };
}

export function listPublicTools(input: { query?: string; limit?: number }) {
  const limit = clampInteger(input.limit, 20, 1, 50);
  const query = input.query?.trim().toLowerCase();
  const filtered = query ? toolsContent.filter((tool) => `${tool.title} ${tool.description} ${tool.keywords}`.toLowerCase().includes(query)) : toolsContent;
  return {
    tools: filtered.slice(0, limit).map((tool) => ({
      slug: tool.slug,
      title: tool.title,
      description: tool.description,
      url: `https://aitracker.run/tools/${tool.slug}`,
      features: tool.features.slice(0, 10),
      howItWorks: tool.howItWorks,
      benefits: tool.benefits.slice(0, 10),
    })),
    returned: Math.min(filtered.length, limit),
    totalMatches: filtered.length,
    truncated: filtered.length > limit,
  };
}
