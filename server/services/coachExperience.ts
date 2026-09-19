import { storage, RUNNING_ACTIVITY_TYPES } from "../storage";
import { getFreeActivityLimit } from "../rateLimits";
import { canAccessCapability } from "../../shared/entitlements";

/** A bounded, explicit DTO. No raw account records or activity sensor payloads. */
export async function coachExperience(userId: number, now = new Date()) {
  const user = await storage.getUser(userId);
  if (!user) return null;
  let timezone = user.coachTimezone || "UTC";
  try { new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now); }
  catch { timezone = "UTC"; }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const cutoff = new Date(now.getTime() - 90 * 86400000);
  const freeLimit = getFreeActivityLimit(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null);
  const activities = await storage.getActivitiesByUserId(userId, freeLimit ?? 200, cutoff, {
    summaryOnly: true, excludeLockedForFree: freeLimit !== null,
  });
  const plans = await storage.getTrainingPlansByUserId(userId);
  const plan = plans.find(p => p.userId === userId && p.status === "active");
  const weeks = plan ? await storage.getPlanWeeks(plan.id) : [];
  const week = weeks.find(w => new Date(w.weekStartDate).toISOString().slice(0,10) <= today &&
    new Date(w.weekEndDate).toISOString().slice(0,10) >= today);
  const days = plan ? (await storage.getPlanDaysByPlanId(plan.id)).filter(d => {
    const date = new Date(d.date).toISOString().slice(0,10);
    return date >= (week ? new Date(week.weekStartDate).toISOString().slice(0,10) : today) &&
      date <= new Date(new Date(today+'T12:00:00Z').getTime()+20*86400000).toISOString().slice(0,10);
  }).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()) : [];
  const {companionContext}=await import('./coachCompanion');
  const companion=await companionContext(userId,today);
  return {
    runner: { id: userId, name: user.firstName || user.username || "Runner", timezone, unitPreference: user.unitPreference || "km" },
    canUseAI: canAccessCapability(user, "ai_coach"),
    state: {
      source: "production_account",
      updatedAt: now.toISOString(),
      timezone,
      today,
      companion,
      plan: plan ? {id:plan.id,name:plan.goalType.replaceAll('_',' ')+' training',raceDate:plan.raceDate?new Date(plan.raceDate).toISOString().slice(0,10):null,totalWeeks:plan.totalWeeks,weekNumber:week?.weekNumber ?? null} : null,
      goal: plan?.goalType || user.coachGoal || "No running goal set",
      historyLimit: freeLimit ?? 200,
      historyDays: 90,
      days: days.filter(d => d.planId === plan!.id).slice(0, 28).map(d => ({
        id: String(d.id), date: new Date(d.date).toISOString().slice(0,10),
        title: d.title, kind: d.workoutType === "rest" ? "rest" : d.workoutType.includes("long") ? "long" :
          ["easy","recovery"].includes(d.workoutType) ? "easy" : "quality",
        minutes: d.plannedDurationMins ?? 0, distanceKm: d.plannedDistanceKm,
        description:d.description,targetPace:d.targetPace,
        completed: d.status === "completed", status: d.status,
      })),
      activities: activities.filter(a => RUNNING_ACTIVITY_TYPES.includes(a.type) && a.distance > 0)
        .map(a => ({ id: a.id, name:a.name, date: new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date(a.startDate)),
          km: a.distance / 1000, minutes: a.movingTime / 60 }))
        .sort((a,b) => a.date.localeCompare(b.date)),
    },
  };
}
