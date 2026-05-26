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
  async generateVerdict(activityId: number, userId: number, unitPreference: string = 'km'): Promise<CoachVerdict | null> {
    const activity = await storage.getActivityById(activityId);
    if (!activity || activity.userId !== userId) {
      return null;
    }
    
    const comparison = await effortScoreService.compareActivityToBaseline(activityId, userId);
    if (!comparison) {
      return this.generateBasicVerdict(activity, unitPreference);
    }
    
    // Convert distance based on unit preference
    const distanceKm = activity.distance / 1000;
    const distanceMiles = distanceKm * 0.621371;
    const displayDistance = unitPreference === 'miles' ? distanceMiles : distanceKm;
    const distanceUnit = unitPreference === 'miles' ? 'mi' : 'km';
    
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
        text: `${displayDistance.toFixed(1)}${distanceUnit} in ${this.formatDuration(durationMinutes)}`
      });
    }
    
    const { grade, gradeLabel } = this.calculateGrade(comparison, activity);
    const summary = this.generateSummary(grade, comparison, activity, unitPreference);
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

  private generateBasicVerdict(activity: Activity, unitPreference: string = 'km'): CoachVerdict {
    const distanceKm = activity.distance / 1000;
    const distanceMiles = distanceKm * 0.621371;
    const displayDistance = unitPreference === 'miles' ? distanceMiles : distanceKm;
    const distanceUnit = unitPreference === 'miles' ? 'mi' : 'km';
    
    const durationMinutes = activity.movingTime / 60;
    const pacePerKm = durationMinutes / distanceKm;
    
    const estimatedMaxHR = 190;
    const effortResult = effortScoreService.calculateEffortScore(activity, estimatedMaxHR);
    
    const hasHR = !!activity.averageHeartrate;
    const hasPR = activity.prCount && activity.prCount > 0;

    // Build a specific summary from what we actually know about this run
    const summaryParts: string[] = [];
    if (hasPR) {
      summaryParts.push(`You hit a personal record on this run — a great milestone.`);
    } else if (effortResult.score >= 80) {
      summaryParts.push(`This was a hard effort — your effort score of ${effortResult.score} puts it in the upper range of your recent sessions.`);
    } else if (effortResult.score <= 40) {
      summaryParts.push(`A low-intensity session — ideal for active recovery and letting your aerobic base consolidate.`);
    } else {
      summaryParts.push(`A solid ${displayDistance.toFixed(1)}${distanceUnit} run at a moderate effort level.`);
    }
    if (hasHR) {
      summaryParts.push(`Run more sessions to unlock pace and HR comparisons against your personal baseline.`);
    } else {
      summaryParts.push(`Connect a heart rate monitor for richer training insights.`);
    }

    return {
      grade: "B",
      gradeLabel: "Good Run",
      summary: summaryParts.join(' '),
      evidenceBullets: [
        { type: "neutral", text: `Effort score: ${effortResult.score}/100` },
        { type: "neutral", text: `Need more runs to build your comparison baseline` }
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
      nextSteps: ["Log a few more runs to unlock pace and effort comparisons"]
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

  private generateSummary(grade: string, comparison: any, activity: Activity, unitPreference: string = 'km'): string {
    const parts: string[] = [];
    const paceVsAvg   = Math.round(comparison.paceVsAverage ?? 0);
    const hrVsAvg     = Math.round(comparison.hrVsAverage ?? 0);
    const distVsAvg   = Math.round(comparison.distanceVsAverage ?? 0);
    const consistency = comparison.consistencyLabel as string;
    const hasPR       = activity.prCount && activity.prCount > 0;
    const hasHR       = !!activity.averageHeartrate;

    // ── Lead sentence: what made this run notable ──────────────────
    if (hasPR) {
      parts.push(`You set a personal record on this run — a standout effort.`);
    } else if (consistency === 'much_harder') {
      parts.push(`This was a high-intensity effort — significantly above your usual training load.`);
    } else if (consistency === 'recovery' || consistency === 'easier') {
      parts.push(`A well-judged easy run — exactly the kind of session that lets your body absorb training.`);
    } else if (paceVsAvg >= 8 && hasHR && hrVsAvg <= 0) {
      parts.push(`Strong aerobic performance: you ran ${paceVsAvg}% faster than your recent average with a lower heart rate — a sign of real fitness gains.`);
    } else if (paceVsAvg >= 5) {
      parts.push(`Your pace was ${paceVsAvg}% faster than your recent average — a noticeably sharper effort.`);
    } else if (paceVsAvg <= -8) {
      parts.push(`You ran ${Math.abs(paceVsAvg)}% slower than your recent average — either a deliberate easy day or an off day.`);
    } else if (distVsAvg >= 25) {
      parts.push(`You pushed your distance ${distVsAvg}% beyond your typical run — good work extending your range.`);
    } else {
      // Neutral — at least say something specific
      parts.push(`A consistent effort that sits right in line with your recent training.`);
    }

    // ── Second sentence: HR efficiency or load insight ─────────────
    if (hasHR) {
      if (hrVsAvg <= -8 && paceVsAvg >= 0) {
        parts.push(`Your heart rate was ${Math.abs(hrVsAvg)}% lower than usual for this pace — a clear aerobic efficiency win.`);
      } else if (hrVsAvg >= 12 && consistency !== 'much_harder') {
        parts.push(`Heart rate ran ${hrVsAvg}% higher than normal — watch for signs of fatigue or dehydration.`);
      } else if (consistency === 'much_harder') {
        parts.push(`With this kind of effort, prioritise 48 hours of easy running before your next hard session.`);
      }
    } else if (consistency === 'harder' || consistency === 'much_harder') {
      parts.push(`Give yourself adequate recovery before your next quality session.`);
    }

    return parts.join(' ');
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

  private formatPace(pacePerKm: number, unitPreference: string = 'km'): string {
    const paceToShow = unitPreference === 'miles' ? pacePerKm / 0.621371 : pacePerKm;
    const paceUnit = unitPreference === 'miles' ? '/mi' : '/km';
    const minutes = Math.floor(paceToShow);
    const seconds = Math.round((paceToShow - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}${paceUnit}`;
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
