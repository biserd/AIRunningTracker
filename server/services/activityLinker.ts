import { storage } from "../storage";
import type { Activity, PlanDay, PlanWeek } from "@shared/schema";
import {
  deriveCalendarWeekNumber,
  instantDateKey,
  planDateKey,
} from "@shared/trainingPlanProgress";
import { actualMetrics, calculateMatchScore, determineLinkedStatus } from "@shared/trainingPlanMatching";

export { actualMetrics, calculateMatchScore, determineLinkedStatus } from "@shared/trainingPlanMatching";

interface LinkCandidate {
  day: PlanDay;
  activity: Activity;
  score: number;
}

export interface LinkResult {
  dayId: number;
  activityId: number;
  status: "completed" | "partial";
  matchScore: number;
}

export interface PlanReconciliationResult {
  currentWeek: number;
  missedDayIds: number[];
  weeksUpdated: number;
}

function elapsedWorkoutDays(days: PlanDay[], today: string): PlanDay[] {
  return days.filter((day) => day.workoutType !== "rest" && planDateKey(day.date) <= today);
}

function completionCredit(day: PlanDay): number {
  if (day.linkedActivityId || day.status === "completed") return 1;
  if (day.status === "partial") return 0.5;
  return 0;
}

async function updateWeekTotals(week: PlanWeek, days: PlanDay[], today: string): Promise<void> {
  const completedDistanceKm = days.reduce((sum, day) => sum + (day.actualDistanceKm || 0), 0);
  const completedDurationMins = days.reduce((sum, day) => sum + (day.actualDurationMins || 0), 0);
  const elapsed = elapsedWorkoutDays(days, today);
  const adherenceScore = elapsed.length
    ? elapsed.reduce((sum, day) => sum + completionCredit(day), 0) / elapsed.length
    : null;

  await storage.updatePlanWeek(week.id, {
    completedDistanceKm: Math.round(completedDistanceKm * 100) / 100,
    completedDurationMins,
    adherenceScore,
  });
}

export async function reconcileTrainingPlanProgress(
  planId: number,
  userId: number,
  now: Date = new Date(),
): Promise<PlanReconciliationResult> {
  const [plan, weeks, days, user] = await Promise.all([
    storage.getTrainingPlanById(planId),
    storage.getPlanWeeks(planId),
    storage.getPlanDaysByPlanId(planId),
    storage.getUser(userId),
  ]);
  if (!plan || plan.userId !== userId || !weeks.length) {
    return { currentWeek: 1, missedDayIds: [], weeksUpdated: 0 };
  }

  const timeZone = user?.coachTimezone || "UTC";
  const today = instantDateKey(now, timeZone);
  const missedDayIds: number[] = [];

  for (const day of days) {
    if (
      day.workoutType !== "rest" &&
      day.status === "pending" &&
      !day.linkedActivityId &&
      planDateKey(day.date) < today
    ) {
      await storage.updatePlanDay(day.id, { status: "missed" });
      day.status = "missed";
      missedDayIds.push(day.id);
    }
  }

  const daysByWeek = new Map<number, PlanDay[]>();
  for (const day of days) {
    const bucket = daysByWeek.get(day.weekId) || [];
    bucket.push(day);
    daysByWeek.set(day.weekId, bucket);
  }
  await Promise.all(weeks.map((week) => updateWeekTotals(week, daysByWeek.get(week.id) || [], today)));

  const currentWeek = deriveCalendarWeekNumber(weeks, now, timeZone);
  if (plan.currentWeek !== currentWeek) await storage.updateTrainingPlan(planId, { currentWeek });

  return { currentWeek, missedDayIds, weeksUpdated: weeks.length };
}

export async function autoLinkActivitiesForPlan(planId: number, userId: number): Promise<LinkResult[]> {
  const [plan, planDays, planWeeks, user] = await Promise.all([
    storage.getTrainingPlanById(planId),
    storage.getPlanDaysByPlanId(planId),
    storage.getPlanWeeks(planId),
    storage.getUser(userId),
  ]);
  if (!plan || plan.userId !== userId || !planDays.length || !planWeeks.length) return [];

  const unlinkedDays = planDays.filter((day) => (
    !day.linkedActivityId &&
    day.workoutType !== "rest" &&
    day.workoutType !== "cross_training" &&
    day.status !== "skipped"
  ));

  const searchStart = new Date(planWeeks[0].weekStartDate);
  searchStart.setUTCDate(searchStart.getUTCDate() - 1);
  const activities = await storage.getActivitiesByUserId(userId, 500, searchStart);
  const linkedActivityIds = new Set(planDays.flatMap((day) => day.linkedActivityId ? [day.linkedActivityId] : []));
  const planEndDate = planDateKey(planWeeks[planWeeks.length - 1].weekEndDate);
  const timeZone = user?.coachTimezone || "UTC";
  const availableActivities = activities.filter((activity) => (
    !linkedActivityIds.has(activity.id) &&
    instantDateKey(activity.startDate, timeZone) <= planEndDate
  ));

  const candidates: LinkCandidate[] = [];
  for (const day of unlinkedDays) {
    for (const activity of availableActivities) {
      const score = calculateMatchScore(day, activity, timeZone);
      if (score != null) candidates.push({ day, activity, score });
    }
  }
  candidates.sort((left, right) => right.score - left.score);

  const linkedDays = new Set<number>();
  const linkedActivities = new Set<number>();
  const results: LinkResult[] = [];
  for (const candidate of candidates) {
    if (linkedDays.has(candidate.day.id) || linkedActivities.has(candidate.activity.id)) continue;

    const status = determineLinkedStatus(candidate.day, candidate.activity);
    await storage.linkActivityToPlanDay(candidate.day.id, candidate.activity.id, actualMetrics(candidate.activity));
    if (status === "partial") await storage.updatePlanDay(candidate.day.id, { status });

    linkedDays.add(candidate.day.id);
    linkedActivities.add(candidate.activity.id);
    results.push({
      dayId: candidate.day.id,
      activityId: candidate.activity.id,
      status,
      matchScore: candidate.score,
    });
  }

  await reconcileTrainingPlanProgress(planId, userId);
  return results;
}

export async function autoLinkActivitiesForUser(userId: number): Promise<Map<number, LinkResult[]>> {
  const activePlan = await storage.getActiveTrainingPlan(userId);
  if (!activePlan) return new Map();

  const results = await autoLinkActivitiesForPlan(activePlan.id, userId);
  return new Map([[activePlan.id, results]]);
}
