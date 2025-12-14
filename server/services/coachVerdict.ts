import { storage } from "../storage";
import { effortScoreService } from "./effortScore";
import type { Activity } from "@shared/schema";

interface VerdictEvidence {
  type: "positive" | "neutral" | "negative";
  text: string;
}

interface CoachVerdict {
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  summary: string;
  evidenceBullets: VerdictEvidence[];
  effortScore: number;
  consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
  consistencyDescription: string;
  comparison: {
    paceVsAvg: number;
    hrVsAvg: number;
    effortVsAvg: number;
    distanceVsAvg: number;
  };
  nextSteps: string[];
}

export class CoachVerdictService {
  async generateVerdict(activityId: number, userId: number): Promise<CoachVerdict | null> {
    const activity = await storage.getActivityById(activityId);
    if (!activity || activity.userId !== userId) {
      return null;
    }
    
    const comparison = await effortScoreService.compareActivityToBaseline(activityId, userId);
    if (!comparison) {
      return this.generateBasicVerdict(activity);
    }
    
    const distanceKm = activity.distance / 1000;
    const durationMinutes = activity.movingTime / 60;
    const pacePerKm = durationMinutes / distanceKm;
    
    const evidenceBullets: VerdictEvidence[] = [];
    let positiveCount = 0;
    let negativeCount = 0;
    
    if (comparison.paceVsAverage > 5) {
      evidenceBullets.push({
        type: "positive",
        text: `Pace was ${comparison.paceVsAverage}% faster than your recent average`
      });
      positiveCount++;
    } else if (comparison.paceVsAverage < -5) {
      evidenceBullets.push({
        type: "negative",
        text: `Pace was ${Math.abs(comparison.paceVsAverage)}% slower than your recent average`
      });
      negativeCount++;
    }
    
    if (activity.averageHeartrate && comparison.hrVsAverage !== 0) {
      if (comparison.hrVsAverage < -5 && comparison.paceVsAverage >= 0) {
        evidenceBullets.push({
          type: "positive",
          text: `Heart rate was ${Math.abs(comparison.hrVsAverage)}% lower - good aerobic efficiency`
        });
        positiveCount++;
      } else if (comparison.hrVsAverage > 10) {
        evidenceBullets.push({
          type: "neutral",
          text: `Heart rate was ${comparison.hrVsAverage}% higher than usual`
        });
      }
    }
    
    if (comparison.consistencyLabel === "recovery" || comparison.consistencyLabel === "easier") {
      evidenceBullets.push({
        type: "neutral",
        text: "Good recovery effort - lower intensity supports adaptation"
      });
    } else if (comparison.consistencyLabel === "much_harder") {
      evidenceBullets.push({
        type: "negative",
        text: "High intensity effort - ensure adequate recovery before next hard session"
      });
      negativeCount++;
    }
    
    if (comparison.distanceVsAverage > 20) {
      evidenceBullets.push({
        type: "positive",
        text: `Covered ${comparison.distanceVsAverage}% more distance than typical`
      });
      positiveCount++;
    }
    
    if (evidenceBullets.length < 2) {
      evidenceBullets.push({
        type: "neutral",
        text: `${distanceKm.toFixed(1)}km in ${this.formatDuration(durationMinutes)}`
      });
    }
    
    const { grade, gradeLabel } = this.calculateGrade(comparison, activity);
    const summary = this.generateSummary(grade, comparison, activity);
    const nextSteps = this.generateNextSteps(comparison, activity);
    
    return {
      grade,
      gradeLabel,
      summary,
      evidenceBullets: evidenceBullets.slice(0, 3),
      effortScore: comparison.effortScore,
      consistencyLabel: comparison.consistencyLabel,
      consistencyDescription: comparison.consistencyDescription,
      comparison: {
        paceVsAvg: comparison.paceVsAverage,
        hrVsAvg: comparison.hrVsAverage,
        effortVsAvg: comparison.effortVsAverage,
        distanceVsAvg: comparison.distanceVsAverage
      },
      nextSteps
    };
  }

  private generateBasicVerdict(activity: Activity): CoachVerdict {
    const distanceKm = activity.distance / 1000;
    const durationMinutes = activity.movingTime / 60;
    const pacePerKm = durationMinutes / distanceKm;
    
    const user = { id: activity.userId };
    const estimatedMaxHR = 190;
    const effortResult = effortScoreService.calculateEffortScore(activity, estimatedMaxHR);
    
    return {
      grade: "B",
      gradeLabel: "Good Run",
      summary: `You completed ${distanceKm.toFixed(1)}km at ${this.formatPace(pacePerKm)} pace. Keep it up!`,
      evidenceBullets: [
        { type: "neutral", text: `Distance: ${distanceKm.toFixed(1)}km in ${this.formatDuration(durationMinutes)}` },
        { type: "neutral", text: `Need more runs to compare against your baseline` }
      ],
      effortScore: effortResult.score,
      consistencyLabel: "consistent",
      consistencyDescription: "Complete more runs to see how this compares to your usual efforts.",
      comparison: {
        paceVsAvg: 0,
        hrVsAvg: 0,
        effortVsAvg: 0,
        distanceVsAvg: 0
      },
      nextSteps: ["Keep training consistently to build your baseline data"]
    };
  }

  private calculateGrade(comparison: any, activity: Activity): { grade: "A" | "B" | "C" | "D" | "F"; gradeLabel: string } {
    let score = 70;
    
    if (comparison.paceVsAverage > 10) score += 15;
    else if (comparison.paceVsAverage > 5) score += 10;
    else if (comparison.paceVsAverage > 0) score += 5;
    else if (comparison.paceVsAverage < -10) score -= 10;
    
    if (comparison.hrVsAverage < -5 && comparison.paceVsAverage >= 0) {
      score += 10;
    }
    
    if (comparison.consistencyLabel === "consistent") score += 5;
    else if (comparison.consistencyLabel === "recovery") score += 3;
    
    if (activity.prCount && activity.prCount > 0) score += 10;
    
    if (score >= 90) return { grade: "A", gradeLabel: "Excellent Run" };
    if (score >= 80) return { grade: "B", gradeLabel: "Good Run" };
    if (score >= 70) return { grade: "C", gradeLabel: "Solid Effort" };
    if (score >= 60) return { grade: "D", gradeLabel: "Room for Improvement" };
    return { grade: "F", gradeLabel: "Tough Day" };
  }

  private generateSummary(grade: string, comparison: any, activity: Activity): string {
    const distanceKm = activity.distance / 1000;
    
    if (grade === "A") {
      return `Outstanding performance! You crushed this ${distanceKm.toFixed(1)}km run.`;
    } else if (grade === "B") {
      return `Solid run today. You're training at a good level.`;
    } else if (grade === "C") {
      return `A consistent effort that supports your training goals.`;
    } else if (grade === "D") {
      if (comparison.consistencyLabel === "recovery") {
        return `Good recovery run - easy days are important for adaptation.`;
      }
      return `Today was tougher. Consider what factors may have affected performance.`;
    } else {
      return `Every runner has off days. Rest up and come back stronger.`;
    }
  }

  private generateNextSteps(comparison: any, activity: Activity): string[] {
    const steps: string[] = [];
    
    if (comparison.consistencyLabel === "much_harder" || comparison.consistencyLabel === "harder") {
      steps.push("Take it easy tomorrow - your body needs time to adapt to today's effort");
    } else if (comparison.consistencyLabel === "recovery" || comparison.consistencyLabel === "easier") {
      steps.push("Ready for a quality session in the next 24-48 hours");
    } else {
      steps.push("Consistent training is key - keep up this pattern");
    }
    
    if (comparison.hrVsAverage > 10) {
      steps.push("Monitor your resting HR - elevated readings may indicate fatigue");
    }
    
    return steps.slice(0, 2);
  }

  private formatPace(pacePerKm: number): string {
    const minutes = Math.floor(pacePerKm);
    const seconds = Math.round((pacePerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }

  private formatDuration(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}min`;
  }
}

export const coachVerdictService = new CoachVerdictService();
