import { storage } from "../storage";
import type { Activity, PlanDay } from "@shared/schema";

interface LinkCandidate {
  day: PlanDay;
  activity: Activity;
  score: number;
}

interface LinkResult {
  dayId: number;
  activityId: number;
  status: "completed" | "partial" | "missed";
  matchScore: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function calculateMatchScore(day: PlanDay, activity: Activity): number | null {
  if (activity.type !== "Run") {
    return null;
  }

  const dayDate = new Date(day.date);
  const activityDate = new Date(activity.startDate);
  
  dayDate.setHours(0, 0, 0, 0);
  activityDate.setHours(0, 0, 0, 0);
  
  const dateDiffMs = Math.abs(dayDate.getTime() - activityDate.getTime());
  if (dateDiffMs > ONE_DAY_MS) {
    return null;
  }

  const plannedKm = day.plannedDistanceKm || 0;
  const actualKm = activity.distance / 1000;
  
  if (plannedKm === 0) {
    return dateDiffMs === 0 ? 50 : 25;
  }
  
  const distanceRatio = actualKm / plannedKm;
  const distanceDiff = Math.abs(1 - distanceRatio);
  
  if (distanceDiff > 0.5) {
    return null;
  }

  let score = 100;
  
  if (dateDiffMs > 0) {
    score -= 20;
  }
  
  score -= distanceDiff * 100;
  
  return Math.max(0, Math.round(score));
}

function determineStatus(day: PlanDay, activity: Activity): "completed" | "partial" {
  const plannedKm = day.plannedDistanceKm || 0;
  const actualKm = activity.distance / 1000;
  
  if (plannedKm === 0) {
    return "completed";
  }
  
  const completionRatio = actualKm / plannedKm;
  
  if (completionRatio >= 0.8) {
    return "completed";
  }
  
  return "partial";
}

export async function autoLinkActivitiesForPlan(planId: number, userId: number): Promise<LinkResult[]> {
  const [planDays, planWeeks] = await Promise.all([
    storage.getPlanDaysByPlanId(planId),
    storage.getPlanWeeks(planId),
  ]);
  
  if (!planDays.length || !planWeeks.length) {
    return [];
  }
  
  const unlinkdDays = planDays.filter(
    day => !day.linkedActivityId && 
           day.workoutType !== "rest" && 
           day.status !== "skipped"
  );
  
  if (!unlinkdDays.length) {
    return [];
  }
  
  const planStartDate = planWeeks[0].weekStartDate;
  const planEndDate = planWeeks[planWeeks.length - 1].weekEndDate;
  
  const searchStart = new Date(planStartDate);
  searchStart.setDate(searchStart.getDate() - 1);
  
  const activities = await storage.getActivitiesByUserId(
    userId, 
    500, 
    searchStart
  );
  
  const linkedActivityIds = new Set(
    planDays
      .filter(d => d.linkedActivityId)
      .map(d => d.linkedActivityId!)
  );
  
  const availableActivities = activities.filter(
    a => !linkedActivityIds.has(a.id) && 
         new Date(a.startDate) <= planEndDate
  );

  const allCandidates: LinkCandidate[] = [];
  
  for (const day of unlinkdDays) {
    for (const activity of availableActivities) {
      const score = calculateMatchScore(day, activity);
      if (score !== null) {
        allCandidates.push({ day, activity, score });
      }
    }
  }
  
  allCandidates.sort((a, b) => b.score - a.score);

  const linkedDays = new Set<number>();
  const linkedActivities = new Set<number>();
  const results: LinkResult[] = [];
  
  for (const candidate of allCandidates) {
    if (linkedDays.has(candidate.day.id) || linkedActivities.has(candidate.activity.id)) {
      continue;
    }
    
    const status = determineStatus(candidate.day, candidate.activity);
    const actualKm = candidate.activity.distance / 1000;
    const actualMins = Math.round(candidate.activity.movingTime / 60);
    const paceSecondsPerKm = candidate.activity.movingTime / actualKm;
    const paceMinutes = Math.floor(paceSecondsPerKm / 60);
    const paceSeconds = Math.round(paceSecondsPerKm % 60);
    const actualPace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
    
    await storage.linkActivityToPlanDay(candidate.day.id, candidate.activity.id, {
      distanceKm: actualKm,
      durationMins: actualMins,
      pace: actualPace,
    });
    
    if (status === "partial") {
      await storage.updatePlanDay(candidate.day.id, { status: "partial" });
    }
    
    linkedDays.add(candidate.day.id);
    linkedActivities.add(candidate.activity.id);
    
    results.push({
      dayId: candidate.day.id,
      activityId: candidate.activity.id,
      status,
      matchScore: candidate.score,
    });
  }
  
  await markMissedDays(planId);
  
  return results;
}

async function markMissedDays(planId: number): Promise<void> {
  const planDays = await storage.getPlanDaysByPlanId(planId);
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  
  for (const day of planDays) {
    if (day.workoutType === "rest" || day.status === "skipped") {
      continue;
    }
    
    const dayDate = new Date(day.date);
    dayDate.setHours(23, 59, 59, 999);
    
    if (dayDate < now && !day.linkedActivityId && day.status === "pending") {
      await storage.updatePlanDay(day.id, { status: "missed" });
    }
  }
}

export async function autoLinkActivitiesForUser(userId: number): Promise<Map<number, LinkResult[]>> {
  const activePlan = await storage.getActiveTrainingPlan(userId);
  
  if (!activePlan) {
    return new Map();
  }
  
  const results = await autoLinkActivitiesForPlan(activePlan.id, userId);
  return new Map([[activePlan.id, results]]);
}
