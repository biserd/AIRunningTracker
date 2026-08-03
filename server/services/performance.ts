import { storage } from "../storage";
import type { Activity } from "@shared/schema";
import { normalizeCadenceToSpm } from "@shared/cadenceNormalization";

// Running activity types based on Strava's sport_type field
const RUNNING_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

interface PerformanceMetrics {
  vo2Max: number;
  runningEfficiency: number;
  aerobicThreshold: number;
  anaerobicThreshold: number;
  trainingStressScore: number;
  fitnessLevel: 'Beginner' | 'Recreational' | 'Competitive' | 'Elite';
}

interface HeartRateZones {
  zone1: { min: number; max: number; name: string; description: string };
  zone2: { min: number; max: number; name: string; description: string };
  zone3: { min: number; max: number; name: string; description: string };
  zone4: { min: number; max: number; name: string; description: string };
  zone5: { min: number; max: number; name: string; description: string };
}

interface RunningEfficiencyData {
  averageCadence: number;
  strideLength: number;
  verticalOscillation: null;
  groundContactTime: null;
  efficiency: number;
  recommendations: string[];
  runsAnalyzed: number;
  dataConfidence: 'limited' | 'moderate' | 'high';
}

interface VO2MaxData {
  current: number;
  raceVO2Max: number;
  trainingVO2Max: number;
  trend: 'improving' | 'stable' | 'declining';
  comparison: string;
  raceComparison: string;
  trainingComparison: string;
}

export class PerformanceAnalyticsService {
  
  /**
   * Calculate VO2 Max using Jack Daniels' formula and activity data
   */
  async calculateVO2Max(userId: number): Promise<VO2MaxData | null> {
    // Check if user has Strava connected
    const user = await storage.getUser(userId);
    if (!user || !user.stravaConnected) {
      console.log(`User ${userId} does not have Strava connected`);
      return null;
    }

    const activities = await storage.getActivitiesByUserId(userId, 50);
    const runningActivities = activities.filter(a => 
      RUNNING_TYPES.includes(a.type) && a.distance > 1000
    );
    
    console.log(`VO2 calculation for user ${userId}: ${activities.length} total activities, ${runningActivities.length} running activities > 1km`);
    
    if (runningActivities.length < 3) {
      console.log(`Insufficient data for VO2 calculation: only ${runningActivities.length} activities`);
      return null;
    }

    // Separate race efforts from training runs
    const raceActivities = runningActivities.filter(a => this.isRaceEffort(a));
    const trainingActivities = runningActivities.filter(a => !this.isRaceEffort(a));
    
    console.log(`Race activities: ${raceActivities.length}, Training activities: ${trainingActivities.length}`);

    // Calculate Race VO2 Max (from best race performances)
    let raceVO2Max = 0;
    if (raceActivities.length >= 1) {
      const raceEfforts = this.findBestEfforts(raceActivities);
      console.log(`\n=== RACE VO2 MAX CALCULATION ===`);
      for (const effort of raceEfforts) {
        const vo2 = this.calculateVO2ForEffort(effort);
        raceVO2Max = Math.max(raceVO2Max, vo2);
      }
      console.log(`Race VO2 Max: ${raceVO2Max.toFixed(2)}\n`);
    }

    // Calculate Training VO2 Max (from best training runs)
    // Only need 1+ training run to calculate training VO2
    let trainingVO2Max = 0;
    if (trainingActivities.length >= 1) {
      const trainingEfforts = this.findBestEfforts(trainingActivities);
      console.log(`\n=== TRAINING VO2 MAX CALCULATION ===`);
      for (const effort of trainingEfforts) {
        const vo2 = this.calculateVO2ForEffort(effort);
        trainingVO2Max = Math.max(trainingVO2Max, vo2);
      }
      console.log(`Training VO2 Max: ${trainingVO2Max.toFixed(2)}\n`);
    }

    // Determine primary VO2 and handle missing data scenarios
    let primaryVO2: number;
    
    if (raceVO2Max > 0 && trainingVO2Max > 0) {
      // Both available - use race VO2 as primary (represents peak fitness)
      primaryVO2 = raceVO2Max;
    } else if (raceVO2Max > 0) {
      // Only race data - use it for both and primary
      primaryVO2 = raceVO2Max;
      trainingVO2Max = raceVO2Max;
    } else if (trainingVO2Max > 0) {
      // Only training data - use it for both and primary
      primaryVO2 = trainingVO2Max;
      raceVO2Max = trainingVO2Max;
    } else {
      // Shouldn't happen due to earlier check, but safety fallback
      return null;
    }

    console.log(`Final - Race VO2: ${raceVO2Max.toFixed(2)}, Training VO2: ${trainingVO2Max.toFixed(2)}, Primary: ${primaryVO2.toFixed(2)}`);

    // Calculate trend based on recent vs older activities
    const trend = this.calculateVO2Trend(runningActivities);
    
    return {
      current: Math.round(primaryVO2 * 10) / 10,
      raceVO2Max: Math.round(raceVO2Max * 10) / 10,
      trainingVO2Max: Math.round(trainingVO2Max * 10) / 10,
      trend,
      comparison: this.getVO2Comparison(primaryVO2),
      raceComparison: this.getVO2Comparison(raceVO2Max),
      trainingComparison: this.getVO2Comparison(trainingVO2Max)
    };
  }

  /**
   * Helper to calculate VO2 for a single effort
   */
  private calculateVO2ForEffort(effort: { distance: number; time: number }): number {
    const timeInMinutes = effort.time / 60;
    const distanceInMiles = effort.distance / 1609.34;
    const distanceInKm = effort.distance / 1000;
    const pacePerMile = timeInMinutes / distanceInMiles;
    const pacePerKm = timeInMinutes / distanceInKm;
    
    console.log(`  Effort: ${distanceInKm.toFixed(2)}km in ${timeInMinutes.toFixed(2)}min (${pacePerKm.toFixed(2)} min/km = ${pacePerMile.toFixed(2)} min/mile)`);
    
    const estimatedVO2 = this.calculateVO2FromPace(pacePerMile, distanceInMiles);
    console.log(`  → VO2 = ${estimatedVO2.toFixed(2)}`);
    return estimatedVO2;
  }

  /**
   * Determine if an activity is likely a race effort based on name and characteristics
   * Strategy: Look for race indicators, but exclude if clearly labeled as a training run
   */
  private isRaceEffort(activity: Activity): boolean {
    const name = activity.name?.toLowerCase() || '';
    
    // Check for race indicators first
    const hasRaceIndicator = (
      // Explicit "race" keyword
      /\brace\b/i.test(name) ||
      
      // Marathon/Half Marathon (with or without hyphen)
      /\b(half[-\s]?)?marathon\b/i.test(name) ||
      
      // Distance race patterns with K suffix (5K, 10K, 15K, 20K, 50K, etc.)
      // These are almost always races, not "5k run" which would be training
      /\b(5k|10k|15k|20k|50k|100k)\b/i.test(name) ||
      
      // Numeric race distances - only when clearly race context
      // Match formats like: "13.1 mi", "26.2 miles", NOT "10 mile run"
      /\b(3\.1|6\.2|10\.5|13\.1|21\.1|26\.2|42\.2|50|70\.3|100)\s*(mi|miles|km|k)\b/i.test(name) ||
      
      // "X miler" format (e.g., "10 miler", "5 miler") - almost always races
      /\b(5|10|13|20)\s*miler\b/i.test(name) ||
      
      // Specific race events
      /\bparkrun\b/i.test(name) ||
      /\bturkey\s+trot\b/i.test(name) ||
      /\bturkey\s+day\b/i.test(name) ||
      /\bcompetition\b/i.test(name) ||
      /\bchampionship\b/i.test(name) ||
      /\bqualifier\b/i.test(name) ||
      
      // Medal/trophy emojis only (not regular runner emoji)
      /🎖️|🏅|🥇|🥈|🥉/.test(name) ||
      
      // PR/PB indicators
      /\bpr\b/i.test(name) ||
      /\bpb\b/i.test(name) ||
      /\bpersonal\s+best\b/i.test(name) ||
      /\bpersonal\s+record\b/i.test(name) ||
      
      // Common race name patterns (city + distance, trail races, etc.)
      /\b(brooklyn|queens|manhattan|bronx|nyc|new york|boston|chicago|philly|sf|trail)\s+(5k|10k|half|marathon)\b/i.test(name)
    );
    
    // If no race indicator, it's not a race
    if (!hasRaceIndicator) {
      return false;
    }
    
    // Has race indicator - now check if it's explicitly described as a training run
    const isExplicitlyTraining = (
      // Workout keywords (standalone or with qualifiers)
      /\b(repeats|intervals|splits|fartlek|strides)\b/i.test(name) ||
      /\b(workout|tempo|easy|recovery|warmup|warm-up|cooldown|cool-down|shakeout|progression)\b/i.test(name) ||
      /\blong run\b/i.test(name) ||
      /\bbase run\b/i.test(name) ||
      /\btraining\b/i.test(name) ||
      /\bpractice\b/i.test(name) ||
      /\bmile\s+repeats\b/i.test(name) || // "half mile repeats", "mile repeats"
      /\bhill\s+repeats\b/i.test(name) ||
      /\bspeed\s+work\b/i.test(name)
    );
    
    // If explicitly training, it's not a race despite having race indicators
    if (isExplicitlyTraining) {
      return false;
    }
    
    // Has race indicator and not explicitly training = race
    return true;
  }

  /**
   * Calculate heart rate zones based on max HR and threshold data
   * Can use actual activity data or manual overrides
   */
  async calculateHeartRateZones(userId: number, maxHR?: number, restingHR?: number): Promise<HeartRateZones | null> {
    let estimatedMaxHR = maxHR;
    let estimatedRestingHR = restingHR;
    
    // If not provided manually, try to calculate from user's actual activity data
    if (!estimatedMaxHR || !estimatedRestingHR) {
      const activities = await storage.getActivitiesByUserId(userId, 100);
      const activitiesWithHR = activities.filter(a => a.maxHeartrate && a.averageHeartrate);
      
      if (activitiesWithHR.length === 0) {
        console.log(`[HR Zones] No heart rate data found for user ${userId}`);
        return null;
      }
      
      // Use the highest max HR from activities
      if (!estimatedMaxHR) {
        estimatedMaxHR = Math.max(...activitiesWithHR.map(a => a.maxHeartrate || 0));
        console.log(`[HR Zones] Calculated max HR from activities: ${estimatedMaxHR}`);
      }
      
      // Estimate resting HR from lowest average HR in easy runs
      if (!estimatedRestingHR) {
        // Get lowest 10% of average HRs as proxy for easy runs
        const sortedAvgHR = activitiesWithHR
          .map(a => a.averageHeartrate || 0)
          .filter(hr => hr > 0)
          .sort((a, b) => a - b);
        
        const lowestHRs = sortedAvgHR.slice(0, Math.ceil(sortedAvgHR.length * 0.1));
        const avgLowestHR = lowestHRs.reduce((sum, hr) => sum + hr, 0) / lowestHRs.length;
        
        // Estimate resting HR is typically 20-30 BPM below easy run average
        estimatedRestingHR = Math.round(avgLowestHR - 25);
        
        // Sanity check: resting HR should be between 40-90
        estimatedRestingHR = Math.max(40, Math.min(90, estimatedRestingHR));
        console.log(`[HR Zones] Estimated resting HR from easy runs: ${estimatedRestingHR}`);
      }
    }
    
    // Final check - need both values
    if (!estimatedMaxHR || !estimatedRestingHR) {
      return null;
    }
    
    // Using Karvonen method for more accurate zones
    const heartRateReserve = estimatedMaxHR - estimatedRestingHR;
    
    return {
      zone1: {
        min: Math.round(estimatedRestingHR + (heartRateReserve * 0.50)),
        max: Math.round(estimatedRestingHR + (heartRateReserve * 0.60)),
        name: 'Active Recovery',
        description: 'Easy conversational pace, promotes recovery'
      },
      zone2: {
        min: Math.round(estimatedRestingHR + (heartRateReserve * 0.60)),
        max: Math.round(estimatedRestingHR + (heartRateReserve * 0.70)),
        name: 'Aerobic Base',
        description: 'Comfortable pace, builds aerobic fitness'
      },
      zone3: {
        min: Math.round(estimatedRestingHR + (heartRateReserve * 0.70)),
        max: Math.round(estimatedRestingHR + (heartRateReserve * 0.80)),
        name: 'Aerobic Threshold',
        description: 'Moderately hard, sustainable pace'
      },
      zone4: {
        min: Math.round(estimatedRestingHR + (heartRateReserve * 0.80)),
        max: Math.round(estimatedRestingHR + (heartRateReserve * 0.90)),
        name: 'Lactate Threshold',
        description: 'Hard pace, lactate accumulation begins'
      },
      zone5: {
        min: Math.round(estimatedRestingHR + (heartRateReserve * 0.90)),
        max: estimatedMaxHR,
        name: 'VO2 Max',
        description: 'Maximum effort, improves power and speed'
      }
    };
  }

  /**
   * Analyze running efficiency metrics
   */
  async analyzeRunningEfficiency(userId: number): Promise<RunningEfficiencyData | null> {
    // Check if user has Strava connected
    const user = await storage.getUser(userId);
    if (!user || !user.stravaConnected) {
      console.log(`User ${userId} does not have Strava connected`);
      return null;
    }

    const activities = await storage.getActivitiesByUserId(userId, 50);
    const runningActivities = activities.filter(a =>
      RUNNING_TYPES.includes(a.type) &&
      a.distance > 1000 &&
      a.movingTime > 0 &&
      a.averageCadence !== null &&
      a.averageCadence !== undefined &&
      a.averageCadence > 0
    );
    
    if (runningActivities.length < 3) {
      console.log(`Insufficient cadence data for form signals: only ${runningActivities.length} activities`);
      return null;
    }

    // Calculate efficiency metrics from activity data
    const avgPace = this.calculateAveragePace(runningActivities);
    const paceConsistency = this.calculatePaceConsistency(runningActivities);
    const totalMovingTime = runningActivities.reduce((sum, activity) => sum + activity.movingTime, 0);
    const weightedCadence = runningActivities.reduce((sum, activity) => {
      return sum + normalizeCadenceToSpm(activity.averageCadence || 0) * activity.movingTime;
    }, 0) / totalMovingTime;
    
    // Calculate stride length: Speed = Cadence × Stride Length
    // avgPace is in seconds per meter, so 1/avgPace gives meters per second
    const avgSpeedMps = 1 / avgPace; // meters per second
    const strideLength = (avgSpeedMps * 60) / weightedCadence; // meters per step
    const dataConfidence = runningActivities.length >= 10
      ? 'high'
      : runningActivities.length >= 5
        ? 'moderate'
        : 'limited';
    
    return {
      averageCadence: Math.round(weightedCadence),
      strideLength: Math.round(strideLength * 100) / 100,
      verticalOscillation: null,
      groundContactTime: null,
      efficiency: Math.round(paceConsistency),
      recommendations: [
        'Compare cadence with your own runs at a similar pace and on similar terrain.',
        'Watch whether cadence or pace changes late in a run; that personal trend is more useful than a universal target.'
      ],
      runsAnalyzed: runningActivities.length,
      dataConfidence
    };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  async getPerformanceMetrics(userId: number): Promise<PerformanceMetrics | null> {
    const activities = await storage.getActivitiesByUserId(userId, 50);
    const runningActivities = activities.filter(a => a.distance > 1000);
    
    const vo2MaxData = await this.calculateVO2Max(userId);
    const efficiency = await this.analyzeRunningEfficiency(userId);
    
    // Return null if we don't have sufficient data
    if (!vo2MaxData || !efficiency) {
      return null;
    }
    
    // Calculate training stress and thresholds
    const trainingStressScore = this.calculateTrainingStress(runningActivities);
    const thresholds = this.calculateThresholds(vo2MaxData.current);
    
    return {
      vo2Max: vo2MaxData.current,
      runningEfficiency: efficiency.efficiency,
      aerobicThreshold: thresholds.aerobic,
      anaerobicThreshold: thresholds.anaerobic,
      trainingStressScore,
      fitnessLevel: this.determineFitnessLevel(vo2MaxData.current, trainingStressScore)
    };
  }

  // Helper methods
  private findBestEfforts(activities: Activity[]) {
    const efforts: { distance: number; time: number }[] = [];
    
    // Group by similar distances and find fastest times
    const distanceGroups = new Map<string, Activity[]>();
    
    activities.forEach(activity => {
      const distanceKey = this.getDistanceKey(activity.distance);
      if (!distanceGroups.has(distanceKey)) {
        distanceGroups.set(distanceKey, []);
      }
      distanceGroups.get(distanceKey)!.push(activity);
    });

    console.log(`\n=== Distance Groups ===`);
    distanceGroups.forEach((groupActivities, distanceKey) => {
      console.log(`${distanceKey}: ${groupActivities.length} activities`);
      const fastest = groupActivities.reduce((best, current) => {
        const currentPace = current.movingTime / current.distance;
        const bestPace = best.movingTime / best.distance;
        return currentPace < bestPace ? current : best;
      });
      
      console.log(`  Best: ${fastest.distance}m in ${fastest.movingTime}s`);
      
      efforts.push({
        distance: fastest.distance,
        time: fastest.movingTime
      });
    });
    console.log(`=======================\n`);

    return efforts;
  }

  private getDistanceKey(distance: number): string {
    if (distance >= 4800 && distance <= 5200) return '5K';
    if (distance >= 9800 && distance <= 10200) return '10K';
    if (distance >= 20800 && distance <= 21200) return 'Half Marathon';
    if (distance >= 42000 && distance <= 42400) return 'Marathon';
    if (distance >= 3000 && distance <= 4000) return '3-4K';
    if (distance >= 6000 && distance <= 8000) return '6-8K';
    return 'Other';
  }

  private calculateVO2FromPace(pacePerMile: number, distanceInMiles: number): number {
    // Realistic VO2 max calculation based on Jack Daniels' running formula
    // For recreational to elite runners
    
    let vo2Result: number;
    let tier: string;
    
    if (pacePerMile > 12) {
      // Very slow pace (>12 min/mile) - beginner/recovery runs
      // Use minimum VO2 max to avoid negative values
      tier = "Beginner (>12 min/mile)";
      vo2Result = Math.max(25, 35 - (pacePerMile - 12) * 1.5);
    } else if (pacePerMile >= 10) {
      // 10-12 min/mile pace - recreational runner
      tier = "Recreational (10-12 min/mile)";
      vo2Result = 35 + (12 - pacePerMile) * 2;
    } else if (pacePerMile >= 8.5) {
      // 8.5-10 min/mile pace - trained recreational runner  
      tier = "Trained Recreational (8.5-10 min/mile)";
      vo2Result = 42 + (10 - pacePerMile) * 3;
    } else if (pacePerMile >= 7.5) {
      // 7.5-8.5 min/mile pace - competitive runner
      tier = "Competitive (7.5-8.5 min/mile)";
      vo2Result = 50 + (8.5 - pacePerMile) * 4;
    } else if (pacePerMile >= 6.5) {
      // 6.5-7.5 min/mile pace - advanced competitive
      tier = "Advanced Competitive (6.5-7.5 min/mile)";
      vo2Result = 58 + (7.5 - pacePerMile) * 5;
    } else {
      // Sub-6.5 min/mile - elite level
      tier = "Elite (sub-6.5 min/mile)";
      vo2Result = Math.min(70, 65 + (6.5 - pacePerMile) * 3);
    }
    
    console.log(`Formula tier: ${tier} → VO2 = ${vo2Result.toFixed(2)}`);
    return vo2Result;
  }

  private calculateVO2Trend(activities: Activity[]): 'improving' | 'stable' | 'declining' {
    if (activities.length < 10) return 'stable';
    
    const recent = activities.slice(0, Math.floor(activities.length / 2));
    const older = activities.slice(Math.floor(activities.length / 2));
    
    const recentAvgPace = recent.reduce((sum, a) => sum + (a.movingTime / a.distance), 0) / recent.length;
    const olderAvgPace = older.reduce((sum, a) => sum + (a.movingTime / a.distance), 0) / older.length;
    
    const improvement = (olderAvgPace - recentAvgPace) / olderAvgPace;
    
    if (improvement > 0.02) return 'improving';
    if (improvement < -0.02) return 'declining';
    return 'stable';
  }

  private getVO2Comparison(vo2Max: number): string {
    if (vo2Max >= 60) return 'Very high pace-based estimate';
    if (vo2Max >= 50) return 'High pace-based estimate';
    if (vo2Max >= 45) return 'Moderate-high pace-based estimate';
    if (vo2Max >= 40) return 'Moderate pace-based estimate';
    return 'Developing pace-based estimate';
  }

  private calculateAveragePace(activities: Activity[]): number {
    const totalTime = activities.reduce((sum, a) => sum + a.movingTime, 0);
    const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
    return totalTime / totalDistance; // seconds per meter
  }

  private calculatePaceConsistency(activities: Activity[]): number {
    const paces = activities.map(a => a.movingTime / a.distance);
    const avgPace = paces.reduce((sum, p) => sum + p, 0) / paces.length;
    const variance = paces.reduce((sum, p) => sum + Math.pow(p - avgPace, 2), 0) / paces.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Return consistency score (lower std dev = higher consistency)
    return Math.max(0, 100 - (standardDeviation / avgPace * 100));
  }

  private calculateTrainingStress(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    // Calculate weekly training load
    const weeklyDistance = activities
      .filter(a => {
        const activityDate = new Date(a.startDate);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return activityDate >= weekAgo;
      })
      .reduce((sum, a) => sum + a.distance, 0);
    
    // Convert to training stress score (simplified)
    return Math.round(weeklyDistance / 1000 * 10); // 10 points per km
  }

  private calculateThresholds(vo2Max: number): { aerobic: number; anaerobic: number } {
    return {
      aerobic: Math.round(vo2Max * 0.75), // Approximately 75% of VO2max
      anaerobic: Math.round(vo2Max * 0.85)  // Approximately 85% of VO2max
    };
  }

  private determineFitnessLevel(vo2Max: number, trainingStress: number): 'Beginner' | 'Recreational' | 'Competitive' | 'Elite' {
    if (vo2Max >= 60 && trainingStress >= 400) return 'Elite';
    if (vo2Max >= 50 && trainingStress >= 250) return 'Competitive';
    if (vo2Max >= 40 && trainingStress >= 100) return 'Recreational';
    return 'Beginner';
  }
}

export const performanceService = new PerformanceAnalyticsService();
