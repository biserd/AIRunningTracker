import type { Activity, PlanDay } from "./schema";
import { calendarDayDifference, instantDateKey, planDateKey } from "./trainingPlanProgress";

const RUNNING_ACTIVITY_TYPES = ["Run", "TrailRun", "VirtualRun"];
const LONG_WORKOUTS = new Set(["long_run", "back_to_back_long", "fueling_practice"]);
const QUALITY_WORKOUTS = new Set(["tempo", "intervals", "fartlek", "hills", "progression"]);

function activityIntent(activity: Activity): "race" | "long" | "quality" | "easy" {
  const name = activity.name.toLowerCase();
  if (activity.workoutType === 1 || /\b(race|5k|10k|half marathon|marathon)\b/.test(name)) return "race";
  if (activity.workoutType === 2 || /\blong\b/.test(name)) return "long";
  if (activity.workoutType === 3 || /\b(interval|tempo|threshold|fartlek|hill|progression|workout)\b/.test(name)) return "quality";
  return "easy";
}

function workoutIntent(day: PlanDay): "race" | "long" | "quality" | "easy" {
  if (day.workoutType === "race") return "race";
  if (LONG_WORKOUTS.has(day.workoutType)) return "long";
  if (QUALITY_WORKOUTS.has(day.workoutType)) return "quality";
  return "easy";
}

export function calculateMatchScore(day: PlanDay, activity: Activity, timeZone = "UTC"): number | null {
  if (!RUNNING_ACTIVITY_TYPES.includes(activity.type)) return null;

  const plannedDate = planDateKey(day.date);
  const actualDate = instantDateKey(activity.startDate, timeZone);
  const dateDifference = Math.abs(calendarDayDifference(plannedDate, actualDate));
  if (dateDifference > 1) return null;

  const plannedKm = day.plannedDistanceKm || 0;
  const actualKm = activity.distance > 0 ? activity.distance / 1000 : 0;
  const distanceRatio = plannedKm > 0 ? actualKm / plannedKm : null;
  if (plannedKm >= 3 && distanceRatio != null && (distanceRatio < 0.3 || distanceRatio > 2)) return null;

  let score = dateDifference === 0 ? 100 : 45;
  const plannedIntent = workoutIntent(day);
  const actualIntent = activityIntent(activity);
  if (plannedIntent === actualIntent) score += plannedIntent === "easy" ? 10 : 30;
  else if (actualIntent !== "easy" && plannedIntent !== "easy") score -= 30;
  else if (plannedIntent !== "easy") score -= 10;

  if (distanceRatio != null) {
    const difference = Math.abs(1 - distanceRatio);
    if (difference <= 0.15) score += 35;
    else if (difference <= 0.3) score += 25;
    else if (difference <= 0.5) score += 12;
    else if (difference > 0.75) score -= 20;
  }

  if (day.plannedDurationMins && activity.movingTime > 0) {
    const durationRatio = activity.movingTime / 60 / day.plannedDurationMins;
    const difference = Math.abs(1 - durationRatio);
    if (difference <= 0.2) score += 20;
    else if (difference <= 0.4) score += 10;
  }

  const minimumScore = dateDifference === 0 ? 70 : 85;
  return score >= minimumScore ? Math.round(score) : null;
}

export function determineLinkedStatus(day: PlanDay, activity: Activity): "completed" | "partial" {
  const plannedKm = day.plannedDistanceKm || 0;
  const plannedMins = day.plannedDurationMins || 0;
  if (plannedKm <= 0 && plannedMins <= 0) return "completed";

  const distanceRatio = plannedKm > 0 ? activity.distance / 1000 / plannedKm : 0;
  const durationRatio = plannedMins > 0 ? activity.movingTime / 60 / plannedMins : 0;
  return Math.max(distanceRatio, durationRatio) >= 0.8 ? "completed" : "partial";
}

export function actualMetrics(activity: Activity): { distanceKm: number; durationMins: number; pace?: string } {
  const distanceKm = Math.max(0, activity.distance / 1000);
  const durationMins = Math.max(0, Math.round(activity.movingTime / 60));
  if (distanceKm <= 0 || activity.movingTime <= 0) return { distanceKm, durationMins };

  const roundedPace = Math.round(activity.movingTime / distanceKm);
  return {
    distanceKm,
    durationMins,
    pace: `${Math.floor(roundedPace / 60)}:${String(roundedPace % 60).padStart(2, "0")}/km`,
  };
}
