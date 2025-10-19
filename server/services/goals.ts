import { storage } from "../storage";
import type { Goal, Activity } from "@shared/schema";

class GoalsService {
  /**
   * Check all active goals for a user and auto-complete them if criteria are met
   * Called after activity sync to update goal status
   */
  async checkAndCompleteGoals(userId: number): Promise<{ completedGoals: number }> {
    try {
      const activeGoals = await storage.getGoalsByUserId(userId);
      const activitiesFilter = activeGoals.filter((g: Goal) => g.status === 'active');
      
      if (activitiesFilter.length === 0) {
        return { completedGoals: 0 };
      }

      // Get recent activities (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activities = await storage.getActivitiesByUserId(userId);
      const recentActivities = activities.filter((a: Activity) => 
        new Date(a.startDate) > thirtyDaysAgo
      );

      let completedCount = 0;

      for (const goal of activitiesFilter) {
        const shouldComplete = this.shouldCompleteGoal(goal, recentActivities);
        
        if (shouldComplete) {
          await storage.completeGoal(goal.id);
          completedCount++;
          console.log(`Auto-completed goal: ${goal.title} for user ${userId}`);
        }
      }

      return { completedGoals: completedCount };
    } catch (error) {
      console.error('Error checking goals:', error);
      return { completedGoals: 0 };
    }
  }

  /**
   * Determine if a goal should be marked as complete based on recent activities
   */
  private shouldCompleteGoal(goal: any, recentActivities: any[]): boolean {
    const goalText = `${goal.title} ${goal.description}`.toLowerCase();

    // Speed/Interval goals - look for fast paces, high intensity, or short distances
    if (goal.type === 'speed' || goalText.includes('speed') || goalText.includes('interval')) {
      // Check if user has done at least 2 speed workouts in last 30 days
      const speedWorkouts = recentActivities.filter(activity => {
        // Speed work indicators:
        // 1. Short distance (< 8km) with fast average pace
        // 2. High max speed relative to average speed (intervals)
        // 3. Activity name contains speed/interval/tempo keywords
        const distanceKm = activity.distance / 1000;
        const avgPaceMinPerKm = (activity.movingTime / 60) / distanceKm;
        const maxSpeed = activity.maxSpeed || 0;
        const avgSpeed = activity.averageSpeed || 0;
        const speedVariation = maxSpeed > 0 && avgSpeed > 0 ? (maxSpeed - avgSpeed) / avgSpeed : 0;
        
        const isShortAndFast = distanceKm < 8 && avgPaceMinPerKm < 5.5; // Sub 5:30 min/km pace
        const hasIntervals = speedVariation > 0.3; // 30% speed variation suggests intervals
        const hasSpeedKeywords = /speed|interval|tempo|fast|fartlek/i.test(activity.name);
        
        return isShortAndFast || hasIntervals || hasSpeedKeywords;
      });

      return speedWorkouts.length >= 2;
    }

    // Hill/Strength goals - look for elevation gain
    if (goal.type === 'hills' || goalText.includes('hill') || goalText.includes('elevation')) {
      // Check if user has done at least 2 hill workouts in last 30 days
      const hillWorkouts = recentActivities.filter(activity => {
        // Hill work indicators:
        // 1. High elevation gain relative to distance
        // 2. Activity name contains hill/climb keywords
        const distanceKm = activity.distance / 1000;
        const elevationGainPerKm = activity.totalElevationGain / distanceKm;
        
        const hasSignificantElevation = elevationGainPerKm > 15; // 15m gain per km
        const hasHillKeywords = /hill|climb|mountain|elevation/i.test(activity.name);
        
        return hasSignificantElevation || hasHillKeywords;
      });

      return hillWorkouts.length >= 2;
    }

    // Endurance/Long run goals - look for long distances
    if (goal.type === 'endurance' || goalText.includes('long') || goalText.includes('endurance')) {
      // Check if user has done at least 2 long runs in last 30 days
      const longRuns = recentActivities.filter(activity => {
        // Long run indicators:
        // 1. Distance > 12km
        // 2. Activity name contains long/endurance keywords
        const distanceKm = activity.distance / 1000;
        
        const isLongDistance = distanceKm > 12;
        const hasLongRunKeywords = /long|endurance|distance|marathon/i.test(activity.name);
        
        return isLongDistance || hasLongRunKeywords;
      });

      return longRuns.length >= 2;
    }

    // General training consistency goals
    if (goalText.includes('consistent') || goalText.includes('regular') || goalText.includes('weekly')) {
      // Check if user has run at least 3 times per week for the last 2 weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const recentRuns = recentActivities.filter(a => 
        new Date(a.startDate) > twoWeeksAgo
      );

      // Need at least 6 runs in 2 weeks (3 per week average)
      return recentRuns.length >= 6;
    }

    // Default: Don't auto-complete unknown goal types
    return false;
  }
}

export default new GoalsService();
