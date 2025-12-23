import { storage } from "../storage";
import type { Activity, User } from "@shared/schema";

export interface RecoveryState {
  daysSinceLastRun: number;
  lastRunDate: Date | null;
  lastRunName: string | null;
  
  acuteLoadKm: number;
  chronicLoadKm: number;
  acuteChronicRatio: number;
  
  freshnessScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  originalRiskLevel: "low" | "moderate" | "high" | "critical";
  riskReduced: boolean;
  
  readyToRun: boolean;
  recommendedNextStep: "rest" | "easy" | "workout" | "long_run" | "recovery";
  statusMessage: string;
  recoveryMessage: string;
}

const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 28;

export async function getRecoveryState(userId: number): Promise<RecoveryState | null> {
  const user = await storage.getUser(userId);
  if (!user) {
    return null;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentActivities = await storage.getActivitiesByUserId(userId, 100, thirtyDaysAgo);
  
  const runningActivities = recentActivities.filter(a => 
    a.type?.toLowerCase().includes("run")
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const lastRun = runningActivities[0] || null;
  const lastRunDate = lastRun ? new Date(lastRun.startDate) : null;
  const daysSinceLastRun = lastRunDate 
    ? Math.floor((now.getTime() - lastRunDate.getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  const acuteLoadKm = calculateLoadForPeriod(runningActivities, now, DAYS_IN_WEEK);
  const chronicLoadKm = calculateLoadForPeriod(runningActivities, now, DAYS_IN_MONTH) / 4;

  const acuteChronicRatio = chronicLoadKm > 0 ? acuteLoadKm / chronicLoadKm : 1.0;

  const originalRiskLevel = calculateRiskLevel(acuteChronicRatio, daysSinceLastRun, false);
  
  const { adjustedRiskLevel, freshnessScore, riskReduced } = adjustRiskForRest(
    originalRiskLevel,
    acuteChronicRatio,
    daysSinceLastRun
  );

  const { readyToRun, recommendedNextStep, statusMessage, recoveryMessage } = 
    generateRecommendations(adjustedRiskLevel, daysSinceLastRun, acuteChronicRatio, freshnessScore);

  return {
    daysSinceLastRun,
    lastRunDate,
    lastRunName: lastRun?.name || null,
    
    acuteLoadKm: Math.round(acuteLoadKm * 10) / 10,
    chronicLoadKm: Math.round(chronicLoadKm * 10) / 10,
    acuteChronicRatio: Math.round(acuteChronicRatio * 100) / 100,
    
    freshnessScore: Math.round(freshnessScore),
    riskLevel: adjustedRiskLevel,
    originalRiskLevel,
    riskReduced,
    
    readyToRun,
    recommendedNextStep,
    statusMessage,
    recoveryMessage,
  };
}

function calculateLoadForPeriod(
  activities: Activity[],
  now: Date,
  days: number
): number {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  return activities
    .filter(a => new Date(a.startDate) >= cutoff)
    .reduce((sum, a) => sum + (a.distance / 1000), 0);
}

function calculateRiskLevel(
  acuteChronicRatio: number,
  daysSinceLastRun: number,
  ignoreRest: boolean
): "low" | "moderate" | "high" | "critical" {
  if (acuteChronicRatio >= 1.5) return "critical";
  if (acuteChronicRatio >= 1.3) return "high";
  if (acuteChronicRatio >= 1.1) return "moderate";
  return "low";
}

function adjustRiskForRest(
  originalRisk: "low" | "moderate" | "high" | "critical",
  acuteChronicRatio: number,
  daysSinceLastRun: number
): { adjustedRiskLevel: "low" | "moderate" | "high" | "critical"; freshnessScore: number; riskReduced: boolean } {
  
  const baseRecoveryPerDay = 15;
  const restBonus = Math.min(daysSinceLastRun * baseRecoveryPerDay, 60);
  
  let freshnessScore = 50;
  
  if (acuteChronicRatio >= 1.5) {
    freshnessScore = 10;
  } else if (acuteChronicRatio >= 1.3) {
    freshnessScore = 25;
  } else if (acuteChronicRatio >= 1.1) {
    freshnessScore = 40;
  } else if (acuteChronicRatio >= 0.8) {
    freshnessScore = 60;
  } else {
    freshnessScore = 75;
  }
  
  freshnessScore = Math.min(100, freshnessScore + restBonus);
  
  let adjustedRisk = originalRisk;
  let riskReduced = false;
  
  if (daysSinceLastRun >= 1) {
    if (originalRisk === "critical" && daysSinceLastRun >= 3) {
      adjustedRisk = "moderate";
      riskReduced = true;
    } else if (originalRisk === "critical" && daysSinceLastRun >= 2) {
      adjustedRisk = "high";
      riskReduced = true;
    } else if (originalRisk === "high" && daysSinceLastRun >= 2) {
      adjustedRisk = "low";
      riskReduced = true;
    } else if (originalRisk === "high" && daysSinceLastRun >= 1) {
      adjustedRisk = "moderate";
      riskReduced = true;
    } else if (originalRisk === "moderate" && daysSinceLastRun >= 1) {
      adjustedRisk = "low";
      riskReduced = true;
    }
  }
  
  if (daysSinceLastRun >= 4) {
    adjustedRisk = "low";
    if (originalRisk !== "low") riskReduced = true;
  }
  
  return { adjustedRiskLevel: adjustedRisk, freshnessScore, riskReduced };
}

function generateRecommendations(
  riskLevel: "low" | "moderate" | "high" | "critical",
  daysSinceLastRun: number,
  acuteChronicRatio: number,
  freshnessScore: number
): { 
  readyToRun: boolean; 
  recommendedNextStep: "rest" | "easy" | "workout" | "long_run" | "recovery";
  statusMessage: string;
  recoveryMessage: string;
} {
  let readyToRun = false;
  let recommendedNextStep: "rest" | "easy" | "workout" | "long_run" | "recovery" = "rest";
  let statusMessage = "";
  let recoveryMessage = "";

  if (daysSinceLastRun === 0) {
    recoveryMessage = "You ran today";
  } else if (daysSinceLastRun === 1) {
    recoveryMessage = "1 day since your last run";
  } else if (daysSinceLastRun < 999) {
    recoveryMessage = `${daysSinceLastRun} days since your last run`;
  } else {
    recoveryMessage = "No recent running activity";
  }

  switch (riskLevel) {
    case "critical":
      readyToRun = false;
      recommendedNextStep = "rest";
      statusMessage = "Your training load is very high. Take a complete rest day to recover.";
      break;
      
    case "high":
      if (daysSinceLastRun >= 1) {
        readyToRun = true;
        recommendedNextStep = "recovery";
        statusMessage = "Your load was high but you've had some rest. A short, easy recovery run is okay.";
      } else {
        readyToRun = false;
        recommendedNextStep = "rest";
        statusMessage = "Training load is elevated. Take a rest day before your next run.";
      }
      break;
      
    case "moderate":
      readyToRun = true;
      if (daysSinceLastRun >= 2) {
        recommendedNextStep = "easy";
        statusMessage = "You're well recovered. Ready for an easy run or light workout.";
      } else {
        recommendedNextStep = "easy";
        statusMessage = "Moderate load - stick to easy running today.";
      }
      break;
      
    case "low":
      readyToRun = true;
      if (freshnessScore >= 70 && daysSinceLastRun >= 1) {
        recommendedNextStep = "workout";
        statusMessage = "You're fresh and ready! Great day for a quality workout or long run.";
      } else if (freshnessScore >= 50) {
        recommendedNextStep = "easy";
        statusMessage = "Good recovery. You're ready for any type of run.";
      } else {
        recommendedNextStep = "easy";
        statusMessage = "Training load is balanced. You're good to run.";
      }
      break;
  }

  if (daysSinceLastRun >= 7) {
    readyToRun = true;
    recommendedNextStep = "easy";
    statusMessage = "It's been a week since your last run. Start back with an easy effort.";
  }

  return { readyToRun, recommendedNextStep, statusMessage, recoveryMessage };
}
