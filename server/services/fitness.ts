import { Activity } from "@shared/schema";

/**
 * FitnessService handles CTL/ATL/TSB calculations for the Fitness/Fatigue/Form chart
 * 
 * Key Concepts:
 * - CTL (Chronic Training Load) = Fitness (42-day exponential weighted average)
 * - ATL (Acute Training Load) = Fatigue (7-day exponential weighted average)
 * - TSB (Training Stress Balance) = Form (CTL - ATL)
 * 
 * Formula uses exponential weighted moving average (EWMA):
 * - CTL: EMA with 42-day time constant
 * - ATL: EMA with 7-day time constant
 */

interface DailyMetric {
  date: string; // YYYY-MM-DD format
  trainingLoad: number;
  ctl: number; // Chronic Training Load (Fitness)
  atl: number; // Acute Training Load (Fatigue)
  tsb: number; // Training Stress Balance (Form)
}

export class FitnessService {
  /**
   * Calculate daily training load from an activity
   * Formula: distance (km) * intensity factor
   * Intensity factor based on pace: faster pace = higher intensity
   */
  private calculateActivityLoad(activity: Activity): number {
    const distanceKm = activity.distance / 1000;
    const paceMinPerKm = activity.movingTime > 0 
      ? (activity.movingTime / 60) / distanceKm 
      : 0;
    
    // Intensity factor: faster pace (lower number) = higher intensity
    // Base of 6 min/km, anything faster increases load
    const intensityFactor = paceMinPerKm > 0 ? Math.max(0.5, 6 - paceMinPerKm) : 1;
    
    return distanceKm * intensityFactor;
  }

  /**
   * Group activities by day and sum training load
   */
  private groupActivitiesByDay(activities: Activity[]): Map<string, number> {
    const dailyLoads = new Map<string, number>();
    
    activities.forEach(activity => {
      const dateKey = new Date(activity.startDate).toISOString().split('T')[0];
      const load = this.calculateActivityLoad(activity);
      
      dailyLoads.set(dateKey, (dailyLoads.get(dateKey) || 0) + load);
    });
    
    return dailyLoads;
  }

  /**
   * Fill in missing days with zero training load
   * Ensures continuous data for proper CTL/ATL calculation
   */
  private fillMissingDays(dailyLoads: Map<string, number>, startDate: Date, endDate: Date): Map<string, number> {
    const filled = new Map<string, number>();
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      filled.set(dateKey, dailyLoads.get(dateKey) || 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return filled;
  }

  /**
   * Calculate exponential weighted moving average (EWMA)
   * @param currentValue - Today's value
   * @param previousEMA - Yesterday's EMA
   * @param timeConstant - Days (42 for CTL, 7 for ATL)
   */
  private calculateEWMA(currentValue: number, previousEMA: number, timeConstant: number): number {
    const alpha = 2 / (timeConstant + 1);
    return alpha * currentValue + (1 - alpha) * previousEMA;
  }

  /**
   * Calculate CTL, ATL, TSB for the last N days
   * Returns daily metrics with fitness, fatigue, and form values
   */
  async calculateFitnessMetrics(activities: Activity[], days: number = 90): Promise<DailyMetric[]> {
    if (activities.length === 0) {
      return [];
    }

    // Sort activities by date (oldest first)
    const sortedActivities = activities.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Determine date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    // Get daily training loads
    const activityLoads = this.groupActivitiesByDay(sortedActivities);
    const dailyLoads = this.fillMissingDays(activityLoads, startDate, endDate);

    // Calculate CTL, ATL, TSB for each day
    const metrics: DailyMetric[] = [];
    let ctl = 0; // Start at 0 (no prior fitness assumed)
    let atl = 0; // Start at 0 (no prior fatigue assumed)

    // Sort dates for chronological calculation
    const dates = Array.from(dailyLoads.keys()).sort();

    dates.forEach(date => {
      const trainingLoad = dailyLoads.get(date) || 0;

      // Calculate exponential weighted moving averages
      ctl = this.calculateEWMA(trainingLoad, ctl, 42); // 42-day for fitness
      atl = this.calculateEWMA(trainingLoad, atl, 7);  // 7-day for fatigue

      // Training Stress Balance = Fitness - Fatigue
      const tsb = ctl - atl;

      metrics.push({
        date,
        trainingLoad,
        ctl: Math.round(ctl * 10) / 10, // Round to 1 decimal
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round(tsb * 10) / 10,
      });
    });

    return metrics;
  }

  /**
   * Get interpretation of current form (TSB) score
   */
  getFormInterpretation(tsb: number): {
    status: 'Fresh' | 'Neutral' | 'Fatigued' | 'Very Fatigued';
    description: string;
    color: string;
  } {
    if (tsb > 10) {
      return {
        status: 'Fresh',
        description: 'Well-rested and ready to race or do hard workouts',
        color: '#22c55e', // green
      };
    } else if (tsb > -10) {
      return {
        status: 'Neutral',
        description: 'Balanced state - good for moderate training',
        color: '#3b82f6', // blue
      };
    } else if (tsb > -30) {
      return {
        status: 'Fatigued',
        description: 'Building fitness through training stress - normal for training blocks',
        color: '#f59e0b', // orange
      };
    } else {
      return {
        status: 'Very Fatigued',
        description: 'High fatigue - consider reducing training load or taking rest days',
        color: '#ef4444', // red
      };
    }
  }
}

export const fitnessService = new FitnessService();
