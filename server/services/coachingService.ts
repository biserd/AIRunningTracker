import OpenAI from "openai";
import { storage } from "../storage";
import type { Activity, User, CoachRecap } from "@shared/schema";
import { getRecoveryState, type RecoveryState } from "./recoveryService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RecapContent {
  recapBullets: string[];
  coachingCue: string;
  nextStep: "rest" | "easy" | "workout" | "long_run" | "recovery";
  nextStepRationale: string;
  confidenceFlags: string[];
}

export async function generateCoachRecap(
  userId: number,
  activityId: number,
  stravaId: string
): Promise<CoachRecap | null> {
  const user = await storage.getUser(userId);
  if (!user) {
    console.log(`[Coach] User ${userId} not found`);
    return null;
  }

  if (user.subscriptionPlan !== "premium" || user.subscriptionStatus !== "active") {
    console.log(`[Coach] User ${userId} is not a Premium subscriber`);
    return null;
  }

  if (!user.coachOnboardingCompleted) {
    console.log(`[Coach] User ${userId} has not completed coach onboarding`);
    return null;
  }

  const activity = await storage.getActivityById(activityId);
  if (!activity) {
    console.log(`[Coach] Activity ${activityId} not found`);
    return null;
  }

  if (!activity.type?.toLowerCase().includes("run")) {
    console.log(`[Coach] Activity ${activityId} is not a running activity`);
    return null;
  }

  const existingRecap = await storage.getCoachRecapByActivityId(activityId);
  if (existingRecap) {
    console.log(`[Coach] Recap already exists for activity ${activityId}`);
    return existingRecap;
  }

  const recentActivities = await storage.getActivitiesByUserId(userId, 10);
  const trainingPlan = await storage.getActiveTrainingPlan(userId);
  const recoveryState = await getRecoveryState(userId);
  
  const recapContent = await generateRecapWithAI(user, activity, recentActivities, trainingPlan, recoveryState);
  
  if (!recapContent) {
    console.log(`[Coach] Failed to generate recap content for activity ${activityId}`);
    return null;
  }

  const distanceKm = activity.distance / 1000;
  const durationMins = Math.round(activity.movingTime / 60);

  const recap = await storage.createCoachRecap({
    userId,
    activityId,
    stravaActivityId: stravaId,
    recapBullets: recapContent.recapBullets,
    coachingCue: recapContent.coachingCue,
    nextStep: recapContent.nextStep,
    nextStepRationale: recapContent.nextStepRationale,
    confidenceFlags: recapContent.confidenceFlags,
    activityName: activity.name,
    activityDate: activity.startDate,
    distanceKm,
    durationMins,
    coachTone: user.coachTone || "direct",
    promptVersion: "v1.0",
    modelVersion: "gpt-4o",
  });

  console.log(`[Coach] Created recap for activity ${activityId}`);
  
  const dedupeKey = `recap:${userId}:${activityId}:v1.0`;
  await storage.createAgentRun({
    userId,
    runType: "activity_recap",
    triggeredBy: "sync",
    activityId,
    dedupeKey,
    inputSnapshot: { activityId, stravaId, distanceKm, durationMins },
    outputRecapId: recap.id,
    promptVersion: "v1.0",
    stagesCompleted: ["fetch", "metrics", "coaching", "persist"],
  });

  if (user.coachNotifyRecap && user.email) {
    const notifyDedupeKey = `notification:recap:${userId}:${activityId}`;
    await storage.createNotification({
      userId,
      type: "activity_recap",
      channel: "email",
      title: `Coach Recap: ${activity.name}`,
      body: recapContent.recapBullets.join(" "),
      data: {
        recapId: recap.id,
        activityName: activity.name,
        nextStep: recapContent.nextStep,
      },
      dedupeKey: notifyDedupeKey,
    });
    console.log(`[Coach] Queued email notification for recap ${recap.id}`);
  }

  return recap;
}

async function generateRecapWithAI(
  user: User,
  activity: Activity,
  recentActivities: Activity[],
  trainingPlan: any,
  recoveryState: RecoveryState | null
): Promise<RecapContent | null> {
  try {
    const unitLabel = user.unitPreference === "miles" ? "mi" : "km";
    const distanceKm = activity.distance / 1000;
    const displayDistance = user.unitPreference === "miles" 
      ? (distanceKm * 0.621371).toFixed(2) 
      : distanceKm.toFixed(2);
    
    const paceMinPerKm = activity.movingTime / 60 / distanceKm;
    const displayPace = user.unitPreference === "miles"
      ? paceMinPerKm / 0.621371
      : paceMinPerKm;
    const paceFormatted = `${Math.floor(displayPace)}:${String(Math.round((displayPace % 1) * 60)).padStart(2, "0")}`;

    const recentStats = recentActivities.slice(0, 5).map(a => ({
      name: a.name,
      distance: (a.distance / 1000).toFixed(1),
      date: new Date(a.startDate).toLocaleDateString(),
    }));

    const goalContext = user.coachGoal 
      ? `Training goal: ${user.coachGoal.replace("_", " ")}` 
      : "General fitness";
    
    const raceContext = user.coachRaceDate 
      ? `Race date: ${new Date(user.coachRaceDate).toLocaleDateString()}` 
      : "";

    const toneInstruction = getToneInstruction(user.coachTone || "direct");

    const confidenceFlags: string[] = [];
    if (!activity.averageHeartrate) confidenceFlags.push("missing_hr_data");
    if (!activity.averageCadence) confidenceFlags.push("missing_cadence_data");
    if (!activity.streamsData) confidenceFlags.push("no_detailed_streams");

    const recoveryContext = recoveryState ? `
CURRENT RECOVERY STATUS (as of today):
- Days since last run: ${recoveryState.daysSinceLastRun}
- Acute/Chronic Load Ratio: ${recoveryState.acuteChronicRatio.toFixed(2)} (${recoveryState.acuteChronicRatio >= 1.3 ? 'elevated' : recoveryState.acuteChronicRatio >= 1.1 ? 'moderate' : 'balanced'})
- Freshness Score: ${recoveryState.freshnessScore}%
- Current Risk Level: ${recoveryState.riskLevel}${recoveryState.riskReduced ? ' (reduced from ' + recoveryState.originalRiskLevel + ' due to rest)' : ''}
- Ready to run: ${recoveryState.readyToRun ? 'Yes' : 'No'}
- System recommendation: ${recoveryState.recommendedNextStep}

IMPORTANT: Use this recovery data to inform your "nextStep" recommendation. If the athlete has taken rest days and their risk has reduced, acknowledge their recovery. If load is high, prioritize rest or easy running.` : '';

    const prompt = `You are an expert running coach providing a post-activity recap for an athlete.

${toneInstruction}

ATHLETE CONTEXT:
- ${goalContext}
${raceContext ? `- ${raceContext}` : ""}
- Training days available: ${user.coachDaysAvailable?.join(", ") || "flexible"}
- Weekly mileage cap: ${user.coachWeeklyMileageCap || "no limit"} ${unitLabel}/week

TODAY'S ACTIVITY:
- Name: ${activity.name}
- Distance: ${displayDistance} ${unitLabel}
- Duration: ${Math.floor(activity.movingTime / 60)}:${String(activity.movingTime % 60).padStart(2, "0")}
- Pace: ${paceFormatted} min/${unitLabel}
- Elevation gain: ${activity.totalElevationGain}m
${activity.averageHeartrate ? `- Avg HR: ${activity.averageHeartrate} bpm` : ""}
${activity.averageCadence ? `- Cadence: ${Math.round(activity.averageCadence * 2)} spm` : ""}

RECENT TRAINING (last 5 activities):
${recentStats.map(r => `- ${r.name}: ${r.distance}km on ${r.date}`).join("\n")}

${trainingPlan ? `CURRENT TRAINING PLAN: Week ${trainingPlan.currentWeek || 1} of ${trainingPlan.totalWeeks || 12}` : ""}
${recoveryContext}

Generate a coaching recap in JSON format:
{
  "recapBullets": ["3-5 specific bullet point observations about this run, including pace analysis, effort level, and notable patterns"],
  "coachingCue": "One specific form or technique cue to focus on for the next run",
  "nextStep": "rest|easy|workout|long_run|recovery (choose the most appropriate next session type)",
  "nextStepRationale": "2-3 sentence explanation of why this next step makes sense given the training load and goals"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log("[Coach] No content in OpenAI response");
      return null;
    }

    try {
      const parsed = JSON.parse(content) as Omit<RecapContent, "confidenceFlags">;
      if (!parsed.recapBullets || !parsed.coachingCue || !parsed.nextStep) {
        console.log("[Coach] Invalid recap structure from OpenAI");
        return null;
      }
      return { ...parsed, confidenceFlags };
    } catch (parseError: any) {
      console.error("[Coach] Failed to parse OpenAI response:", parseError.message);
      return null;
    }
  } catch (error: any) {
    console.error("[Coach] Error generating recap:", error.message);
    return null;
  }
}

function getToneInstruction(tone: string): string {
  switch (tone) {
    case "gentle":
      return "Use an encouraging, supportive tone. Focus on positives and frame improvements gently. Be warm and empathetic.";
    case "data_nerd":
      return "Be analytical and data-focused. Reference specific metrics, percentages, and comparisons. Speak like a sports scientist.";
    case "direct":
    default:
      return "Be direct and clear. Give honest feedback without excessive praise. Focus on actionable insights.";
  }
}

export async function processCoachRecapJob(
  userId: number,
  activityId: number,
  stravaId: string
): Promise<{ success: boolean; recapId?: number; error?: string }> {
  try {
    const recap = await generateCoachRecap(userId, activityId, stravaId);
    if (recap) {
      return { success: true, recapId: recap.id };
    }
    return { success: true };
  } catch (error: any) {
    console.error(`[Coach] Failed to process recap job:`, error.message);
    return { success: false, error: error.message };
  }
}
