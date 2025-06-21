import { storage } from "../storage";
import { Activity } from "@shared/schema";

interface RunnerScoreComponents {
  consistency: number; // 0-25 points
  performance: number; // 0-25 points  
  volume: number; // 0-25 points
  improvement: number; // 0-25 points
}

interface RunnerScoreData {
  totalScore: number;
  grade: string;
  percentile: number;
  components: RunnerScoreComponents;
  trends: {
    weeklyChange: number;
    monthlyChange: number;
  };
  badges: string[];
  shareableMessage: string;
}

export class RunnerScoreService {
  
  /**
   * Calculate comprehensive runner score based on multiple factors
   */
  async calculateRunnerScore(userId: number): Promise<RunnerScoreData> {
    const activities = await storage.getActivitiesByUserId(userId, 100);
    
    if (activities.length === 0) {
      return this.getDefaultScore();
    }

    const components = this.calculateScoreComponents(activities);
    const totalScore = Math.round(components.consistency + components.performance + components.volume + components.improvement);
    
    const grade = this.getGrade(totalScore);
    const percentile = this.calculatePercentile(totalScore);
    const trends = this.calculateTrends(activities);
    const badges = this.calculateBadges(activities, components);
    const shareableMessage = this.generateShareableMessage(totalScore, grade, badges);

    return {
      totalScore,
      grade,
      percentile,
      components,
      trends,
      badges,
      shareableMessage
    };
  }

  private calculateScoreComponents(activities: Activity[]): RunnerScoreComponents {
    const consistency = this.calculateConsistencyScore(activities);
    const performance = this.calculatePerformanceScore(activities);
    const volume = this.calculateVolumeScore(activities);
    const improvement = this.calculateImprovementScore(activities);

    return { consistency, performance, volume, improvement };
  }

  /**
   * Consistency Score (0-25): Regularity of training
   */
  private calculateConsistencyScore(activities: Activity[]): number {
    if (activities.length < 2) return 5;

    const last30Days = activities.filter(a => 
      new Date(a.startDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const runsPerWeek = last30Days.length / 4.3;
    
    // Score based on runs per week
    if (runsPerWeek >= 4) return 25;
    if (runsPerWeek >= 3) return 20;
    if (runsPerWeek >= 2) return 15;
    if (runsPerWeek >= 1) return 10;
    return 5;
  }

  /**
   * Performance Score (0-25): Based on pace and efficiency
   */
  private calculatePerformanceScore(activities: Activity[]): number {
    if (activities.length === 0) return 5;

    // Calculate average pace from speed (averageSpeed is in m/s)
    const avgPace = activities.reduce((sum, a) => {
      if (!a.averageSpeed || a.averageSpeed === 0) return sum;
      // Convert m/s to minutes per mile: (1609.34 / speed) / 60
      const paceMinPerMile = (1609.34 / a.averageSpeed) / 60;
      return sum + paceMinPerMile;
    }, 0) / activities.filter(a => a.averageSpeed && a.averageSpeed > 0).length;
    
    // Convert pace to score (lower pace = higher score)
    if (avgPace <= 6) return 25; // Elite pace
    if (avgPace <= 7) return 22; // Very good
    if (avgPace <= 8) return 19; // Good
    if (avgPace <= 9) return 16; // Average
    if (avgPace <= 10) return 13; // Below average
    if (avgPace <= 12) return 10; // Beginner
    return 7;
  }

  /**
   * Volume Score (0-25): Weekly mileage and distance progression
   */
  private calculateVolumeScore(activities: Activity[]): number {
    if (activities.length === 0) return 5;

    const last30Days = activities.filter(a => 
      new Date(a.startDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const totalDistance = last30Days.reduce((sum, a) => sum + (a.distance || 0), 0);
    const weeklyDistance = totalDistance / 4.3;

    // Score based on weekly mileage (assuming meters, convert to miles/km)
    const weeklyMiles = weeklyDistance / 1609.34;
    
    if (weeklyMiles >= 40) return 25; // High volume
    if (weeklyMiles >= 25) return 22; // Good volume
    if (weeklyMiles >= 15) return 19; // Moderate
    if (weeklyMiles >= 10) return 16; // Low-moderate
    if (weeklyMiles >= 5) return 13;  // Low
    return 10;
  }

  /**
   * Improvement Score (0-25): Progress over time
   */
  private calculateImprovementScore(activities: Activity[]): number {
    if (activities.length < 10) return 15; // Default for new runners

    const sorted = activities.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    // Calculate average pace for each half (convert from m/s to min/mile)
    const firstHalfAvgPace = firstHalf.reduce((sum, a) => {
      if (!a.averageSpeed || a.averageSpeed === 0) return sum;
      return sum + ((1609.34 / a.averageSpeed) / 60);
    }, 0) / firstHalf.filter(a => a.averageSpeed && a.averageSpeed > 0).length;

    const secondHalfAvgPace = secondHalf.reduce((sum, a) => {
      if (!a.averageSpeed || a.averageSpeed === 0) return sum;
      return sum + ((1609.34 / a.averageSpeed) / 60);
    }, 0) / secondHalf.filter(a => a.averageSpeed && a.averageSpeed > 0).length;

    const improvement = firstHalfAvgPace - secondHalfAvgPace; // Positive = faster

    if (improvement >= 1) return 25; // Significant improvement
    if (improvement >= 0.5) return 22; // Good improvement
    if (improvement >= 0.2) return 19; // Some improvement
    if (improvement >= 0) return 16; // Maintaining
    if (improvement >= -0.3) return 13; // Slight decline
    return 10; // Declining
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 40) return 'D';
    return 'F';
  }

  private calculatePercentile(score: number): number {
    // Simulate percentile based on score distribution
    if (score >= 95) return 99;
    if (score >= 90) return 95;
    if (score >= 85) return 90;
    if (score >= 80) return 85;
    if (score >= 75) return 75;
    if (score >= 70) return 65;
    if (score >= 65) return 55;
    if (score >= 60) return 45;
    if (score >= 55) return 35;
    if (score >= 50) return 25;
    return 15;
  }

  private calculateTrends(activities: Activity[]): { weeklyChange: number; monthlyChange: number } {
    if (activities.length < 8) {
      return { weeklyChange: 0, monthlyChange: 0 };
    }

    const sorted = activities.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    const lastWeek = sorted.filter(a => 
      new Date(a.startDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const prevWeek = sorted.filter(a => {
      const date = new Date(a.startDate);
      return date > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && 
             date <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    });

    const weeklyChange = lastWeek.length - prevWeek.length;
    
    // Simple monthly trend based on activity frequency
    const lastMonth = sorted.filter(a => 
      new Date(a.startDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const prevMonth = sorted.filter(a => {
      const date = new Date(a.startDate);
      return date > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) && 
             date <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    });

    const monthlyChange = lastMonth.length - prevMonth.length;

    return { weeklyChange, monthlyChange };
  }

  private calculateBadges(activities: Activity[], components: RunnerScoreComponents): string[] {
    const badges: string[] = [];

    // Consistency badges
    if (components.consistency >= 20) badges.push('Consistent Runner');
    if (components.consistency >= 25) badges.push('Training Machine');

    // Performance badges
    if (components.performance >= 20) badges.push('Speed Demon');
    if (components.performance >= 25) badges.push('Elite Performer');

    // Volume badges
    if (components.volume >= 20) badges.push('High Mileage');
    if (components.volume >= 25) badges.push('Ultra Runner');

    // Improvement badges
    if (components.improvement >= 20) badges.push('Fast Improver');
    if (components.improvement >= 25) badges.push('Progress Master');

    // Special badges
    const totalRuns = activities.length;
    if (totalRuns >= 100) badges.push('Century Club');
    if (totalRuns >= 50) badges.push('Dedicated Runner');

    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalMiles = totalDistance / 1609.34;
    if (totalMiles >= 1000) badges.push('1000 Mile Club');
    if (totalMiles >= 500) badges.push('500 Mile Club');

    return badges;
  }

  private generateShareableMessage(score: number, grade: string, badges: string[]): string {
    const topBadges = badges.slice(0, 2).join(' & ');
    const badgeText = topBadges ? ` ${topBadges}` : '';
    
    return `🏃‍♂️ My Runner Score: ${score}/100 (${grade})${badgeText} | Track your running progress with RunAnalytics!`;
  }

  private getDefaultScore(): RunnerScoreData {
    return {
      totalScore: 25,
      grade: 'D',
      percentile: 10,
      components: {
        consistency: 5,
        performance: 5,
        volume: 5,
        improvement: 10
      },
      trends: {
        weeklyChange: 0,
        monthlyChange: 0
      },
      badges: ['New Runner'],
      shareableMessage: '🏃‍♂️ My Runner Score: 25/100 (D) New Runner | Just started my running journey with RunAnalytics!'
    };
  }
}

export const runnerScoreService = new RunnerScoreService();