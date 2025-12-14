import { storage } from "../storage";
import type { Activity } from "@shared/schema";

interface EffortScoreResult {
  score: number;
  intensity: "recovery" | "easy" | "moderate" | "hard" | "very_hard";
  zoneBreakdown: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
}

interface UserBaseline {
  avgPacePerKm: number;
  avgHeartrate: number;
  avgEffortScore: number;
  avgDistanceKm: number;
  avgDurationMinutes: number;
  totalRuns: number;
  periodDays: number;
}

interface ActivityComparison {
  effortScore: number;
  effortVsAverage: number;
  paceVsAverage: number;
  hrVsAverage: number;
  distanceVsAverage: number;
  consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
  consistencyDescription: string;
}

const ZONE_COEFFICIENTS = [0.5, 1.0, 1.5, 2.5, 4.0];

export class EffortScoreService {
  calculateEffortScore(activity: Activity, maxHR?: number): EffortScoreResult {
    const avgHR = activity.averageHeartrate;
    const durationMinutes = activity.movingTime / 60;
    
    if (!avgHR || !maxHR) {
      const estimatedMaxHR = maxHR || (activity.maxHeartrate ? activity.maxHeartrate * 1.05 : 190);
      const baseScore = this.estimateScoreFromPace(activity);
      return {
        score: Math.round(baseScore),
        intensity: this.getIntensityLabel(baseScore),
        zoneBreakdown: { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }
      };
    }

    const effectiveMaxHR = maxHR || (activity.maxHeartrate ? activity.maxHeartrate * 1.05 : 190);
    const hrPercentage = avgHR / effectiveMaxHR;
    
    let zoneBreakdown = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
    let weightedZoneTime = 0;
    
    if (hrPercentage < 0.6) {
      zoneBreakdown.zone1 = 1;
      weightedZoneTime = durationMinutes * ZONE_COEFFICIENTS[0];
    } else if (hrPercentage < 0.7) {
      zoneBreakdown.zone2 = 1;
      weightedZoneTime = durationMinutes * ZONE_COEFFICIENTS[1];
    } else if (hrPercentage < 0.8) {
      zoneBreakdown.zone3 = 1;
      weightedZoneTime = durationMinutes * ZONE_COEFFICIENTS[2];
    } else if (hrPercentage < 0.9) {
      zoneBreakdown.zone4 = 1;
      weightedZoneTime = durationMinutes * ZONE_COEFFICIENTS[3];
    } else {
      zoneBreakdown.zone5 = 1;
      weightedZoneTime = durationMinutes * ZONE_COEFFICIENTS[4];
    }
    
    const score = Math.round(weightedZoneTime);
    
    return {
      score,
      intensity: this.getIntensityLabel(score),
      zoneBreakdown
    };
  }

  private estimateScoreFromPace(activity: Activity): number {
    const distanceKm = activity.distance / 1000;
    const durationMinutes = activity.movingTime / 60;
    const pacePerKm = durationMinutes / distanceKm;
    
    let intensityMultiplier = 1.0;
    if (pacePerKm < 4.5) intensityMultiplier = 2.5;
    else if (pacePerKm < 5.0) intensityMultiplier = 2.0;
    else if (pacePerKm < 5.5) intensityMultiplier = 1.5;
    else if (pacePerKm < 6.0) intensityMultiplier = 1.2;
    else if (pacePerKm < 7.0) intensityMultiplier = 1.0;
    else intensityMultiplier = 0.7;
    
    return durationMinutes * intensityMultiplier;
  }

  private getIntensityLabel(score: number): "recovery" | "easy" | "moderate" | "hard" | "very_hard" {
    if (score < 25) return "recovery";
    if (score < 50) return "easy";
    if (score < 100) return "moderate";
    if (score < 150) return "hard";
    return "very_hard";
  }

  async calculateUserBaseline(userId: number, periodDays: number = 42): Promise<UserBaseline> {
    const activities = await storage.getActivitiesByUserId(userId, 200);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    
    const recentActivities = activities.filter((a: Activity) => 
      new Date(a.startDate) >= cutoffDate && a.type === "Run"
    );
    
    if (recentActivities.length === 0) {
      return {
        avgPacePerKm: 0,
        avgHeartrate: 0,
        avgEffortScore: 0,
        avgDistanceKm: 0,
        avgDurationMinutes: 0,
        totalRuns: 0,
        periodDays
      };
    }
    
    let totalPace = 0;
    let totalHR = 0;
    let hrCount = 0;
    let totalEffort = 0;
    let totalDistance = 0;
    let totalDuration = 0;
    
    const user = await storage.getUser(userId);
    const estimatedMaxHR = user ? 220 - 30 : 190;
    
    for (const activity of recentActivities) {
      const distanceKm = activity.distance / 1000;
      const durationMinutes = activity.movingTime / 60;
      const pacePerKm = durationMinutes / distanceKm;
      
      totalPace += pacePerKm;
      totalDistance += distanceKm;
      totalDuration += durationMinutes;
      
      if (activity.averageHeartrate) {
        totalHR += activity.averageHeartrate;
        hrCount++;
      }
      
      const effortResult = this.calculateEffortScore(activity as Activity, estimatedMaxHR);
      totalEffort += effortResult.score;
    }
    
    const count = recentActivities.length;
    
    return {
      avgPacePerKm: totalPace / count,
      avgHeartrate: hrCount > 0 ? totalHR / hrCount : 0,
      avgEffortScore: totalEffort / count,
      avgDistanceKm: totalDistance / count,
      avgDurationMinutes: totalDuration / count,
      totalRuns: count,
      periodDays
    };
  }

  async compareActivityToBaseline(activityId: number, userId: number): Promise<ActivityComparison | null> {
    const activity = await storage.getActivityById(activityId);
    if (!activity || activity.userId !== userId) {
      return null;
    }
    
    const baseline = await this.calculateUserBaseline(userId);
    if (baseline.totalRuns < 3) {
      return null;
    }
    
    const user = await storage.getUser(userId);
    const estimatedMaxHR = user ? 220 - 30 : 190;
    
    const effortResult = this.calculateEffortScore(activity, estimatedMaxHR);
    const distanceKm = activity.distance / 1000;
    const durationMinutes = activity.movingTime / 60;
    const pacePerKm = durationMinutes / distanceKm;
    
    const effortVsAverage = baseline.avgEffortScore > 0 
      ? ((effortResult.score - baseline.avgEffortScore) / baseline.avgEffortScore) * 100 
      : 0;
    
    const paceVsAverage = baseline.avgPacePerKm > 0
      ? ((baseline.avgPacePerKm - pacePerKm) / baseline.avgPacePerKm) * 100
      : 0;
    
    const hrVsAverage = baseline.avgHeartrate > 0 && activity.averageHeartrate
      ? ((activity.averageHeartrate - baseline.avgHeartrate) / baseline.avgHeartrate) * 100
      : 0;
    
    const distanceVsAverage = baseline.avgDistanceKm > 0
      ? ((distanceKm - baseline.avgDistanceKm) / baseline.avgDistanceKm) * 100
      : 0;
    
    let consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
    let consistencyDescription: string;
    
    if (effortVsAverage < -30) {
      consistencyLabel = "recovery";
      consistencyDescription = "This was a recovery run - much easier than your typical effort.";
    } else if (effortVsAverage < -10) {
      consistencyLabel = "easier";
      consistencyDescription = "This was an easy effort compared to your recent runs.";
    } else if (effortVsAverage <= 10) {
      consistencyLabel = "consistent";
      consistencyDescription = "This was consistent with your usual training efforts.";
    } else if (effortVsAverage <= 30) {
      consistencyLabel = "harder";
      consistencyDescription = "This was a harder effort than your typical run.";
    } else {
      consistencyLabel = "much_harder";
      consistencyDescription = "This was significantly harder than your usual efforts - consider extra recovery.";
    }
    
    return {
      effortScore: effortResult.score,
      effortVsAverage: Math.round(effortVsAverage),
      paceVsAverage: Math.round(paceVsAverage),
      hrVsAverage: Math.round(hrVsAverage),
      distanceVsAverage: Math.round(distanceVsAverage),
      consistencyLabel,
      consistencyDescription
    };
  }
}

export const effortScoreService = new EffortScoreService();
