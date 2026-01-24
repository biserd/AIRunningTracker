import { storage } from "../storage";
import { Activity } from "@shared/schema";
import OpenAI from "openai";
import { PerformanceAnalyticsService } from "./performance";
import { RunnerScoreService } from "./runnerScore";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Running activity types based on Strava's sport_type field
const RUNNING_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

interface TrainingMetrics {
  weeklyMileage: number[];
  avgPaces: number[];
  trainingLoad: number[];
  elevationGain: number[];
  heartRateZones: number[];
}

interface RacePrediction {
  distance: string;
  predictedTime: string;
  confidence: number;
  recommendation: string;
}

interface TrainingPlan {
  weekNumber: number;
  totalMileage: number;
  workouts: {
    type: string;
    distance: number;
    pace: string;
    description: string;
  }[];
}

export class MLService {
  
  /**
   * Analyze training data to extract key metrics for ML predictions
   */
  private analyzeTrainingData(activities: Activity[]): TrainingMetrics {
    const sortedActivities = activities.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const weeklyData: { [week: string]: Activity[] } = {};
    
    sortedActivities.forEach(activity => {
      const weekKey = this.getWeekKey(new Date(activity.startDate));
      if (!weeklyData[weekKey]) weeklyData[weekKey] = [];
      weeklyData[weekKey].push(activity);
    });

    const weeklyMileage = Object.values(weeklyData).map(weekActivities => 
      weekActivities.reduce((sum, a) => sum + (a.distance / 1000), 0)
    );

    const avgPaces = Object.values(weeklyData).map(weekActivities => {
      const totalTime = weekActivities.reduce((sum, a) => sum + a.movingTime, 0);
      const totalDistance = weekActivities.reduce((sum, a) => sum + a.distance, 0);
      return totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : 0;
    });

    const trainingLoad = weeklyMileage.map((mileage, index) => {
      const intensityFactor = avgPaces[index] ? Math.max(0.5, 6 - avgPaces[index]) : 1;
      return mileage * intensityFactor;
    });

    const elevationGain = Object.values(weeklyData).map(weekActivities =>
      weekActivities.reduce((sum, a) => sum + a.totalElevationGain, 0)
    );

    const heartRateZones = activities
      .filter(a => a.averageHeartrate)
      .map(a => this.getHeartRateZone(a.averageHeartrate!));

    return {
      weeklyMileage,
      avgPaces: avgPaces.filter(p => p > 0),
      trainingLoad,
      elevationGain,
      heartRateZones
    };
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  }

  private getHeartRateZone(hr: number): number {
    // Simplified heart rate zones (assuming max HR ~190)
    if (hr < 114) return 1; // Recovery
    if (hr < 133) return 2; // Aerobic base
    if (hr < 152) return 3; // Aerobic
    if (hr < 171) return 4; // Threshold
    return 5; // VO2 Max
  }

  /**
   * High-confidence race name patterns (very specific event names)
   * These require the activity to match a standard race distance for detection
   */
  private static HIGH_CONFIDENCE_RACE_PATTERNS = [
    /\bmarathon\b/i,
    /\bhalf\s*marathon\b/i,
    /\b(5k|10k|15k|20k|25k|30k)\b/i,
    /\b(5K|10K|15K|20K|25K|30K)\b/,
    /\bparkrun\b/i,
    /\b(turkey\s*trot|resolution\s*run)\b/i,
  ];

  /**
   * Medium-confidence race patterns - require standard distance + fast pace
   */
  private static MEDIUM_CONFIDENCE_RACE_PATTERNS = [
    /\b(classic|challenge|championship|invitational)\b/i,
  ];

  /**
   * Standard race distances in meters with tolerance ranges
   */
  private static RACE_DISTANCES = [
    { name: '5K', meters: 5000, min: 4800, max: 5500 },
    { name: '10K', meters: 10000, min: 9500, max: 10500 },
    { name: '15K', meters: 15000, min: 14500, max: 15500 },
    { name: 'Half', meters: 21097, min: 20500, max: 22000 },
    { name: 'Marathon', meters: 42195, min: 41000, max: 43500 },
  ];

  /**
   * Auto-detect race efforts from activities that may not have workout_type=1
   * Uses: activity name + distance matching, pace analysis, and heart rate
   * Stricter guardrails to reduce false positives
   */
  private autoDetectRaces(activities: Activity[]): Activity[] {
    if (activities.length === 0) return [];

    // Calculate user's average training pace for comparison
    const paces = activities
      .filter(a => a.distance >= 3000) // At least 3km for meaningful pace
      .map(a => (a.movingTime / 60) / (a.distance / 1000));
    
    if (paces.length === 0) return [];
    
    const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
    const sortedPaces = [...paces].sort((a, b) => a - b);
    const fastPaceThreshold = sortedPaces[Math.floor(sortedPaces.length * 0.15)]; // Top 15% threshold
    const veryFastThreshold = sortedPaces[Math.floor(sortedPaces.length * 0.10)]; // Top 10% threshold
    
    console.log(`[Race Auto-Detect] Avg pace: ${avgPace.toFixed(2)} min/km, Fast threshold (15%): ${fastPaceThreshold.toFixed(2)}, Very fast (10%): ${veryFastThreshold.toFixed(2)}`);

    const detectedRaces: Activity[] = [];
    
    for (const activity of activities) {
      // Skip runs that are too short for race predictions
      if (activity.distance < 4500) continue;
      
      const pace = (activity.movingTime / 60) / (activity.distance / 1000);
      let isRace = false;
      let detectionReason = '';

      // Check if activity matches a standard race distance
      const matchedDistance = MLService.RACE_DISTANCES.find(
        d => activity.distance >= d.min && activity.distance <= d.max
      );

      // Method 1: High-confidence name patterns (marathon, half marathon, 5K, 10K, parkrun)
      // Must also be at a matching standard distance and faster than average
      const highConfidenceMatch = MLService.HIGH_CONFIDENCE_RACE_PATTERNS.some(pattern => 
        pattern.test(activity.name || '')
      );
      
      if (highConfidenceMatch && matchedDistance && pace < avgPace) {
        isRace = true;
        detectionReason = `name match (${matchedDistance.name}) + fast pace`;
      }

      // Method 2: Medium-confidence patterns (classic, challenge, championship)
      // Require standard distance + top 15% pace
      if (!isRace) {
        const mediumConfidenceMatch = MLService.MEDIUM_CONFIDENCE_RACE_PATTERNS.some(pattern => 
          pattern.test(activity.name || '')
        );
        
        if (mediumConfidenceMatch && matchedDistance && pace <= fastPaceThreshold) {
          isRace = true;
          detectionReason = `event name + ${matchedDistance.name} distance + fast pace`;
        }
      }

      // Method 3: Standard race distance at top 10% pace (very fast effort)
      // No name matching required - pace itself is strong evidence
      if (!isRace && matchedDistance && pace <= veryFastThreshold) {
        isRace = true;
        detectionReason = `top 10% pace at ${matchedDistance.name} distance`;
      }

      // Method 4: High HR effort at standard race distance with fast pace
      // Require 90%+ avg HR relative to max + top 15% pace + standard distance
      if (!isRace && matchedDistance && activity.averageHeartrate && activity.maxHeartrate) {
        const hrEffort = activity.averageHeartrate / activity.maxHeartrate;
        if (hrEffort > 0.90 && pace <= fastPaceThreshold) {
          isRace = true;
          detectionReason = `high HR (${(hrEffort * 100).toFixed(0)}%) + ${matchedDistance.name} + fast pace`;
        }
      }

      if (isRace) {
        console.log(`[Race Auto-Detect] Detected: "${activity.name}" - ${(activity.distance/1000).toFixed(2)}km @ ${pace.toFixed(2)} min/km (${detectionReason})`);
        detectedRaces.push(activity);
      }
    }

    return detectedRaces;
  }

  /**
   * Predict race times using actual race data (workout_type=1) with Riegel formula
   * Also auto-detects race efforts from unmarked activities
   * Falls back to training pace analysis if no races found
   */
  async predictRacePerformance(userId: number): Promise<RacePrediction[]> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const allActivities = await storage.getActivitiesByUserId(userId, 100);
    const activities = allActivities.filter(a => RUNNING_TYPES.includes(a.type));
    if (activities.length < 5) {
      return [{
        distance: "5K",
        predictedTime: "Need more data",
        confidence: 0,
        recommendation: "Complete at least 5 runs to generate predictions"
      }];
    }

    // Look for actual races (Strava workout_type = 1) within last 180 days (6 months)
    // Extended window to capture more race data for users who race infrequently
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const markedRaces = activities.filter(a => 
      a.workoutType === 1 && 
      new Date(a.startDate) >= sixMonthsAgo &&
      a.distance >= 1000 // At least 1km
    );

    // Auto-detect additional race efforts from recent activities (also 6 months)
    const recentActivities = activities.filter(a => 
      new Date(a.startDate) >= sixMonthsAgo &&
      a.distance >= 1000
    );
    const autoDetectedRaces = this.autoDetectRaces(recentActivities);

    // Combine marked and auto-detected races, avoiding duplicates
    const markedRaceIds = new Set(markedRaces.map(r => r.id));
    const additionalRaces = autoDetectedRaces.filter(r => !markedRaceIds.has(r.id));
    const allRaces = [...markedRaces, ...additionalRaces];

    console.log(`[Race Predictor] User ${userId}: ${markedRaces.length} marked races, ${additionalRaces.length} auto-detected races`);

    // If we have race data, use the Riegel formula for predictions
    if (allRaces.length > 0) {
      console.log(`[Race Predictor] Using ${allRaces.length} total races for predictions`);
      return this.predictFromRaces(allRaces, activities.length);
    }

    // Fallback: No races found, use training pace analysis
    console.log(`[Race Predictor] No races found for user ${userId}, using training pace fallback`);
    return this.predictFromTrainingPace(activities);
  }

  /**
   * Calculate VDOT (VO2max estimate) from a race performance using Daniels' formula
   * Higher VDOT = better fitness. This normalizes performances across different distances.
   */
  private calculateVDOT(distanceMeters: number, timeSeconds: number): number {
    const distanceKm = distanceMeters / 1000;
    const timeMinutes = timeSeconds / 60;
    
    // Simplified VDOT approximation based on Daniels' Running Formula
    // VDOT correlates to VO2max and allows comparing performances across distances
    const velocity = distanceKm / timeMinutes; // km per minute
    const percentVO2 = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) + 
                       0.2989558 * Math.exp(-0.1932605 * timeMinutes);
    const vo2 = -4.6 + 0.182258 * velocity * 1000 + 0.000104 * Math.pow(velocity * 1000, 2);
    
    return vo2 / percentVO2;
  }

  /**
   * Predict race times using the Riegel formula from actual race performances
   * Formula: T2 = T1 × (D2/D1)^1.06
   * Prefers longer races as reference points since they're more accurate for predictions
   */
  private predictFromRaces(races: Activity[], totalActivities: number): RacePrediction[] {
    // Filter out very short races (< 5km) - they're not reliable for Riegel predictions
    // Short races have much faster paces that don't extrapolate well to longer distances
    const validRaces = races.filter(r => r.distance >= 5000);
    if (validRaces.length === 0) {
      console.log('[Race Predictor] No races >= 5km, falling back to training pace analysis');
      return this.predictFromTrainingPace(races);
    }

    // Group races by approximate distance category and find best performance in each
    const racesByCategory = {
      '5K': validRaces.filter(r => r.distance >= 4500 && r.distance <= 6000),
      '10K': validRaces.filter(r => r.distance >= 9000 && r.distance <= 11000),
      'Half': validRaces.filter(r => r.distance >= 20000 && r.distance <= 22000),
      'Marathon': validRaces.filter(r => r.distance >= 40000 && r.distance <= 44000),
    };

    // Find the best reference race using VDOT (normalizes across distances)
    // Strongly prefer longer races as they're more reliable for predicting race times
    let bestRace: Activity | null = null;
    let bestScore = 0;

    for (const race of validRaces) {
      const vdot = this.calculateVDOT(race.distance, race.movingTime);
      const distanceKm = race.distance / 1000;
      
      // Distance multiplier: prefer longer races more strongly
      // 5K = 1.0x, 10K = 1.15x, Half = 1.3x, Marathon = 1.5x
      let distanceMultiplier = 1.0;
      if (distanceKm >= 40) distanceMultiplier = 1.5; // Marathon
      else if (distanceKm >= 20) distanceMultiplier = 1.3; // Half Marathon
      else if (distanceKm >= 10) distanceMultiplier = 1.15; // 10K
      
      // Recency bonus: prefer more recent races (within last 30 days get small bonus)
      const daysSinceRace = (Date.now() - new Date(race.startDate).getTime()) / (24 * 60 * 60 * 1000);
      const recencyBonus = daysSinceRace < 30 ? 0.5 : (daysSinceRace < 60 ? 0.25 : 0);
      
      const adjustedScore = (vdot + recencyBonus) * distanceMultiplier;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestRace = race;
      }
    }

    if (!bestRace) {
      return this.predictFromTrainingPace(races);
    }

    const refDistanceKm = bestRace.distance / 1000;
    const refTimeMinutes = bestRace.movingTime / 60;
    const refVDOT = this.calculateVDOT(bestRace.distance, bestRace.movingTime);
    
    console.log(`[Race Predictor] Using best race: ${bestRace.name} - ${refDistanceKm.toFixed(2)}km in ${this.formatTime(refTimeMinutes)} (VDOT: ${refVDOT.toFixed(1)})`);

    const predictions: RacePrediction[] = [];
    const targetDistances = [
      { name: "5K", km: 5 },
      { name: "10K", km: 10 },
      { name: "Half Marathon", km: 21.0975 },
      { name: "Marathon", km: 42.195 },
    ];

    for (const target of targetDistances) {
      // Check if we have an actual race at this distance
      const categoryKey = target.name === "Half Marathon" ? "Half" : target.name;
      const actualRaces = racesByCategory[categoryKey as keyof typeof racesByCategory] || [];
      
      let predictedTime: number;
      let confidence: number;
      let recommendation: string;

      if (actualRaces.length > 0) {
        // Use actual best race time for this distance
        const bestAtDistance = actualRaces.reduce((best, r) => 
          r.movingTime < best.movingTime ? r : best
        );
        predictedTime = bestAtDistance.movingTime / 60;
        confidence = Math.min(95, 80 + actualRaces.length * 5);
        recommendation = `Based on your actual ${target.name} race on ${new Date(bestAtDistance.startDate).toLocaleDateString()}`;
      } else {
        // Use Riegel formula: T2 = T1 × (D2/D1)^1.06
        const distanceRatio = target.km / refDistanceKm;
        predictedTime = refTimeMinutes * Math.pow(distanceRatio, 1.06);
        confidence = Math.min(85, 60 + totalActivities);
        
        // Adjust confidence based on how far we're extrapolating
        if (distanceRatio > 4) confidence -= 15; // Large extrapolation penalty
        else if (distanceRatio > 2) confidence -= 5;
        
        recommendation = this.getRaceRecommendation(target.name, predictedTime / target.km);
      }

      predictions.push({
        distance: target.name,
        predictedTime: this.formatTime(predictedTime),
        confidence: Math.max(50, confidence),
        recommendation
      });
    }

    return predictions;
  }

  /**
   * Fallback: Predict race times from training pace when no races available
   */
  private predictFromTrainingPace(activities: Activity[]): RacePrediction[] {
    const metrics = this.analyzeTrainingData(activities);
    const recentPaces = metrics.avgPaces.slice(-4);
    if (recentPaces.length === 0) {
      return [{
        distance: "5K",
        predictedTime: "Need more data",
        confidence: 0,
        recommendation: "Complete more runs with consistent pacing"
      }];
    }
    
    const recentPace = recentPaces.reduce((a, b) => a + b, 0) / recentPaces.length;
    const predictions: RacePrediction[] = [];

    // 5K Prediction - race pace typically 0.3-0.5 min/km faster than training
    const fiveKPacePerKm = Math.max(3.5, recentPace - 0.4);
    predictions.push({
      distance: "5K",
      predictedTime: this.formatTime(fiveKPacePerKm * 5),
      confidence: Math.min(70, 50 + activities.length),
      recommendation: "Mark your next race in Strava for more accurate predictions"
    });

    // 10K Prediction
    const tenKPacePerKm = Math.max(3.8, recentPace - 0.3);
    predictions.push({
      distance: "10K",
      predictedTime: this.formatTime(tenKPacePerKm * 10),
      confidence: Math.min(65, 45 + activities.length),
      recommendation: "Add tempo runs and threshold work"
    });

    // Half Marathon Prediction
    const halfPacePerKm = recentPace - 0.1;
    predictions.push({
      distance: "Half Marathon",
      predictedTime: this.formatTime(halfPacePerKm * 21.0975),
      confidence: Math.min(60, 40 + activities.length),
      recommendation: "Focus on long runs and aerobic base building"
    });

    // Marathon Prediction
    const marathonPacePerKm = recentPace + 0.1;
    predictions.push({
      distance: "Marathon",
      predictedTime: this.formatTime(marathonPacePerKm * 42.195),
      confidence: Math.min(55, 35 + activities.length),
      recommendation: "Build endurance with consistent long runs of 25-32km"
    });

    return predictions;
  }

  /**
   * Get contextual recommendation based on race distance and predicted pace
   */
  private getRaceRecommendation(distance: string, pacePerKm: number): string {
    switch (distance) {
      case "5K":
        return pacePerKm < 4.0 
          ? "Focus on speed work and VO2 max intervals" 
          : "Build aerobic base with easy runs";
      case "10K":
        return "Add tempo runs at threshold pace";
      case "Half Marathon":
        return "Focus on long runs and marathon-pace workouts";
      case "Marathon":
        return "Build endurance with progressive long runs of 25-35km";
      default:
        return "Continue consistent training";
    }
  }

  /**
   * Generate personalized training plan using AI
   */
  async generateTrainingPlan(userId: number, params: {
    weeks?: number;
    goal?: string;
    daysPerWeek?: number;
    targetDistance?: number;
    raceDate?: string;
    fitnessLevel?: string;
  }): Promise<TrainingPlan[]> {
    const {
      weeks = 4,
      goal = 'general',
      daysPerWeek = 4,
      targetDistance,
      raceDate,
      fitnessLevel = 'intermediate'
    } = params;

    // Parallelize all independent data fetches for speed
    const performanceService = new PerformanceAnalyticsService();
    const runnerScoreService = new RunnerScoreService();
    
    const [user, allActivities, racePredictions, vo2Data, runnerScore] = await Promise.all([
      storage.getUser(userId),
      storage.getActivitiesByUserId(userId, 50),
      this.predictRacePerformance(userId).catch(() => []),
      performanceService.calculateVO2Max(userId).catch(() => null),
      runnerScoreService.calculateRunnerScore(userId).catch(() => null)
    ]);
    
    if (!user) throw new Error('User not found');

    const activities = allActivities.filter(a => RUNNING_TYPES.includes(a.type));
    const metrics = this.analyzeTrainingData(activities);
    
    const isMetric = user.unitPreference !== "miles";
    const unit = isMetric ? 'km' : 'mi';
    
    // Map goal to readable format
    const goalMap: Record<string, string> = {
      '5k': '5K race',
      '10k': '10K race',
      'half-marathon': 'Half Marathon',
      'marathon': 'Marathon',
      'general': 'General Fitness'
    };
    const readableGoal = goalMap[goal] || 'General Fitness';
    
    // Convert weekly mileage to user's preferred unit
    const currentWeeklyMileage = metrics.weeklyMileage.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const weeklyMileageConverted = isMetric ? currentWeeklyMileage : currentWeeklyMileage * 0.621371;
    
    // Calculate average pace in user's preferred unit with safe defaults
    const avgPaceKm = metrics.avgPaces.slice(-4).reduce((a, b) => a + b, 0) / Math.max(1, metrics.avgPaces.slice(-4).length);
    const avgPaceValid = avgPaceKm > 0 && avgPaceKm < 15; // Validate metric pace is reasonable
    const avgPace = avgPaceValid 
      ? (isMetric ? avgPaceKm : avgPaceKm / 0.621371)
      : (isMetric ? 6.0 : 9.65); // Default to 6:00/km or 9:39/mi if invalid
    
    // Calculate pace distribution from recent runs in user's preferred unit
    const recentPaces = activities.slice(0, 20).map(a => {
      const time = a.movingTime / 60; // minutes
      const distanceKm = a.distance / 1000;
      const pacePerKm = time / distanceKm;
      // Convert to user's preferred unit
      return isMetric ? pacePerKm : pacePerKm / 0.621371;
    }).filter(p => p > 0 && p < (isMetric ? 15 : 25)); // Filter out unrealistic paces
    
    const fastestPace = recentPaces.length > 0 ? Math.min(...recentPaces) : avgPace * 0.9;
    const slowestPace = recentPaces.length > 0 ? Math.max(...recentPaces) : avgPace * 1.1;
    
    // Calculate pace ranges using percentages (works for both units)
    const easyPaceMin = avgPace * 1.05; // 5% slower
    const easyPaceMax = avgPace * 1.08; // 8% slower
    const tempoPaceMin = avgPace * 0.98; // 2% faster
    const tempoPaceMax = avgPace; // At average
    const speedPaceMin = fastestPace * 0.95; // 5% faster than fastest
    const speedPaceMax = fastestPace; // At fastest

    const prompt = `
Create a ${weeks}-week progressive training plan for a runner with these specific goals and characteristics:

IMPORTANT: ALL distances in this plan MUST be in ${unit}, and ALL paces MUST be in min/${unit}. Do NOT use any other unit.

TRAINING GOAL: ${readableGoal}${raceDate ? ` (Race date: ${raceDate})` : ''}
TRAINING FREQUENCY: ${daysPerWeek} days per week
FITNESS LEVEL: ${fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1)}${targetDistance ? `\nTARGET WEEKLY DISTANCE: ${targetDistance} ${unit}` : ''}

Current Fitness Level:
- Average weekly mileage: ${weeklyMileageConverted.toFixed(1)} ${unit}
- Average training pace: ${avgPace.toFixed(2)} min/${unit}
- Pace range: ${fastestPace.toFixed(2)} - ${slowestPace.toFixed(2)} min/${unit} (fastest to slowest recent runs)
- Training history: ${activities.length} recent activities
- Unit preference: ${unit}

${vo2Data ? `Performance Metrics:
- Race VO2 Max: ${vo2Data.raceVO2Max?.toFixed(1)} (${vo2Data.raceComparison})
- Training VO2 Max: ${vo2Data.trainingVO2Max?.toFixed(1)} (${vo2Data.trainingComparison})
- Fitness trend: ${vo2Data.trend}
` : ''}

${runnerScore ? `Runner Score: ${runnerScore.totalScore}/100 (Grade ${runnerScore.grade})
- Percentile: ${runnerScore.percentile}th among runners
` : ''}

Race Predictions (Based on Current Fitness):
${racePredictions.map(p => `- ${p.distance}: ${p.predictedTime} (${p.confidence}% confidence)`).join('\n')}

CRITICAL INSTRUCTIONS FOR PACE RECOMMENDATIONS:
1. The runner's ACTUAL training pace is ${avgPace.toFixed(2)} min/${unit}
2. Their pace range is ${fastestPace.toFixed(2)} - ${slowestPace.toFixed(2)} min/${unit}
3. DO NOT suggest paces faster than their fastest recent pace (${fastestPace.toFixed(2)} min/${unit})
4. Easy runs should be SLOWER than their average pace (${easyPaceMin.toFixed(2)} - ${easyPaceMax.toFixed(2)} min/${unit})
5. Tempo runs should be close to average pace (${tempoPaceMin.toFixed(2)} - ${tempoPaceMax.toFixed(2)} min/${unit})
6. Speed work can be slightly faster but MUST be realistic (${speedPaceMin.toFixed(2)} - ${speedPaceMax.toFixed(2)} min/${unit})
7. Use the race predictions above to understand their realistic race paces

Guidelines:
- Plan MUST have exactly ${daysPerWeek} running days per week${targetDistance ? ` and build toward ${targetDistance} ${unit} weekly volume` : ''}
- Structure the plan specifically for ${readableGoal} training
- Increase weekly mileage by 10% each week maximum
- MANDATORY WORKOUT DISTRIBUTION each week:
  * 1 LONG RUN (longest run of the week, typically 25-30% of weekly mileage)
  * 1 TEMPO or SPEED workout
  * Remaining days: Easy runs
- Schedule rest days appropriately (${7 - daysPerWeek} rest days per week)
- Adjust intensity based on ${fitnessLevel} fitness level
- ALL pace targets must be achievable based on their current fitness level shown above
- Focus on gradual progression and injury prevention
- Consider their current fitness indicators (VO2 max, runner score) when setting difficulty${raceDate ? `\n- Taper appropriately in final weeks before race date` : ''}

CRITICAL UNIT REQUIREMENT:
- ALL distances MUST be in ${unit} (${isMetric ? 'kilometers' : 'miles'})
- ALL paces MUST be in min/${unit}
- The totalMileage field is in ${unit}
- Each workout distance is in ${unit}
- DO NOT USE ${isMetric ? 'miles' : 'kilometers'} anywhere in this plan

Return a JSON array with this structure (example using ${unit}):
[{
  "weekNumber": 1,
  "totalMileage": ${isMetric ? '40' : '25'},
  "workouts": [
    {
      "type": "Long Run",
      "distance": ${isMetric ? '16' : '10'},
      "pace": "${isMetric ? '5:30' : '8:50'}",
      "description": "Weekly long run at easy pace"
    },
    {
      "type": "Easy Run",
      "distance": ${isMetric ? '8' : '5'},
      "pace": "${isMetric ? '5:20' : '8:35'}",
      "description": "Recovery run"
    }
  ]
}]

Remember: 
1. Use ONLY ${unit} for all distances - this is critical
2. Include exactly ONE long run per week
3. Base paces on the runner's ACTUAL current paces shown above`;

    // Helper function to attempt plan generation
    const attemptGeneration = async (attempt: number): Promise<TrainingPlan[]> => {
      const systemPrompt = `You are an expert running coach. CRITICAL RULES:
1. Use ${unit} (${isMetric ? 'kilometers' : 'miles'}) for ALL distances - NEVER use ${isMetric ? 'miles' : 'km'}
2. Use min/${unit} for ALL paces
3. Include exactly ONE long run per week (the longest workout)
4. Be concise and realistic with pace targets.`;
      
      console.log(`[Training Plan] Attempt ${attempt} - calling gpt-4.1-mini...`);
      
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "TrainingPlan",
            strict: true,
            schema: {
              type: "object",
              properties: {
                weeks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      weekNumber: { type: "number" },
                      totalMileage: { type: "number" },
                      workouts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            distance: { type: "number" },
                            pace: { type: "string" },
                            description: { type: "string" }
                          },
                          required: ["type", "distance", "pace", "description"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["weekNumber", "totalMileage", "workouts"],
                    additionalProperties: false
                  }
                }
              },
              required: ["weeks"],
              additionalProperties: false
            }
          }
        },
        max_output_tokens: 4000
      });

      // Extract text from response using output_text (the direct accessor for JSON schema responses)
      let rawContent = '';
      
      // Primary method: use output_text array which contains the JSON schema response
      if (response.output_text && Array.isArray(response.output_text)) {
        rawContent = response.output_text.join('');
      }
      
      // Fallback: walk the output array structure
      if (!rawContent && response.output && Array.isArray(response.output)) {
        for (const item of response.output) {
          if (item.type === 'message' && item.content) {
            for (const contentItem of item.content) {
              if (contentItem.type === 'output_text') {
                rawContent += contentItem.text || '';
              }
            }
          }
        }
      }

      console.log(`[Training Plan] Attempt ${attempt} - raw content length: ${rawContent.length}`);
      console.log(`[Training Plan] Attempt ${attempt} - raw content preview: ${rawContent.substring(0, 200)}...`);
      
      if (!rawContent || rawContent.trim() === '') {
        console.error(`[Training Plan] Empty response. Full response object:`, JSON.stringify(response, null, 2).substring(0, 500));
        throw new Error('Empty response from AI');
      }

      const result = JSON.parse(rawContent);
      const weeksData = result.weeks || result;
      
      if (!Array.isArray(weeksData) || weeksData.length === 0) {
        console.error(`[Training Plan] Invalid weeks data:`, weeksData);
        throw new Error('Invalid or empty training plan returned');
      }
      
      console.log(`[Training Plan] Attempt ${attempt} - successfully generated ${weeksData.length} weeks`);
      return weeksData;
    };

    // Simplified prompt for retry attempt
    const simplePrompt = `Create a ${weeks}-week ${readableGoal} training plan for a runner.

Runner data:
- Weekly mileage: ${weeklyMileageConverted.toFixed(1)} ${unit}
- Average pace: ${avgPace.toFixed(2)} min/${unit}
- Training days: ${daysPerWeek}/week
- Fitness level: ${fitnessLevel}

CRITICAL REQUIREMENTS:
- Use ONLY ${unit} (${isMetric ? 'kilometers' : 'miles'}) for ALL distances - NEVER use ${isMetric ? 'miles' : 'km'}
- Include exactly 1 Long Run per week (the longest workout, 25-30% of weekly mileage)
- Create ${daysPerWeek} workouts per week with progressive mileage`;

    try {
      // First attempt with full prompt
      return await attemptGeneration(1);
    } catch (firstError: any) {
      console.error(`[Training Plan] First attempt failed:`, firstError.message);
      
      // Retry with simplified prompt
      try {
        console.log(`[Training Plan] Retrying with simplified prompt...`);
        
        const simpleResponse = await openai.responses.create({
          model: "gpt-4.1-mini",
          input: [
            { role: "system", content: `You are a running coach. CRITICAL: Use ${unit} (${isMetric ? 'kilometers' : 'miles'}) for ALL distances. Include 1 Long Run per week.` },
            { role: "user", content: simplePrompt }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "TrainingPlan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  weeks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        weekNumber: { type: "number" },
                        totalMileage: { type: "number" },
                        workouts: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: { type: "string" },
                              distance: { type: "number" },
                              pace: { type: "string" },
                              description: { type: "string" }
                            },
                            required: ["type", "distance", "pace", "description"],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ["weekNumber", "totalMileage", "workouts"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["weeks"],
                additionalProperties: false
              }
            }
          },
          max_output_tokens: 3000
        });
        
        let rawContent = '';
        if (simpleResponse.output_text && Array.isArray(simpleResponse.output_text)) {
          rawContent = simpleResponse.output_text.join('');
        }
        
        if (!rawContent || rawContent.trim() === '') {
          throw new Error('Empty response from simplified prompt');
        }
        
        const result = JSON.parse(rawContent);
        const weeksData = result.weeks || result;
        
        if (!Array.isArray(weeksData) || weeksData.length === 0) {
          throw new Error('Invalid training plan from simplified prompt');
        }
        
        console.log(`[Training Plan] Simplified prompt succeeded with ${weeksData.length} weeks`);
        return weeksData;
        
      } catch (secondError: any) {
        console.error(`[Training Plan] Second attempt failed:`, secondError.message);
        
        // Return fallback plan with error indication
        console.log(`[Training Plan] Using fallback plan`);
        const fallback = this.generateFallbackPlan(weeklyMileageConverted, avgPace, weeks, isMetric);
        if (fallback.length === 0) {
          throw new Error('Failed to generate training plan after multiple attempts. Please try again.');
        }
        return fallback;
      }
    }
  }

  /**
   * Analyze injury risk based on training patterns
   */
  async analyzeInjuryRisk(userId: number): Promise<{
    riskLevel: 'Low' | 'Medium' | 'High';
    riskFactors: string[];
    recommendations: string[];
  }> {
    const activities = await storage.getActivitiesByUserId(userId, 20);
    const metrics = this.analyzeTrainingData(activities);
    
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Check for rapid mileage increases
    const recentWeeks = metrics.weeklyMileage.slice(-3);
    if (recentWeeks.length >= 2) {
      const increase = (recentWeeks[recentWeeks.length - 1] - recentWeeks[0]) / recentWeeks[0];
      if (increase > 0.3) {
        riskFactors.push("Rapid weekly mileage increase");
        riskScore += 3;
      }
    }

    // Check training consistency
    const mileageVariation = this.calculateVariation(metrics.weeklyMileage);
    if (mileageVariation > 0.4) {
      riskFactors.push("Inconsistent training volume");
      riskScore += 2;
    }

    // Check pace variation (too much speed work)
    if (metrics.heartRateZones.filter(z => z >= 4).length > metrics.heartRateZones.length * 0.2) {
      riskFactors.push("Excessive high-intensity training");
      riskScore += 2;
    }

    const riskLevel = riskScore >= 5 ? 'High' : riskScore >= 3 ? 'Medium' : 'Low';
    
    const recommendations = this.getInjuryPreventionRecommendations(riskLevel, riskFactors);

    return { riskLevel, riskFactors, recommendations };
  }

  private calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private getInjuryPreventionRecommendations(riskLevel: string, factors: string[]): string[] {
    const recommendations: string[] = [];

    if (factors.includes("Rapid weekly mileage increase")) {
      recommendations.push("Reduce weekly mileage by 15-20% next week");
      recommendations.push("Follow the 10% rule for weekly increases");
    }

    if (factors.includes("Inconsistent training volume")) {
      recommendations.push("Maintain consistent weekly mileage");
      recommendations.push("Plan your weekly schedule in advance");
    }

    if (factors.includes("Excessive high-intensity training")) {
      recommendations.push("Follow the 80/20 rule: 80% easy, 20% hard");
      recommendations.push("Include more recovery runs");
    }

    if (riskLevel === 'High') {
      recommendations.push("Consider taking 2-3 rest days this week");
      recommendations.push("Focus on cross-training activities");
    }

    return recommendations;
  }

  private generateFallbackPlan(currentMileage: number, avgPace: number, weeks: number, isMetric: boolean): TrainingPlan[] {
    const plans: TrainingPlan[] = [];
    
    for (let week = 1; week <= weeks; week++) {
      const weeklyMileage = currentMileage * (1 + (week - 1) * 0.1);
      const easyPace = `${Math.floor(avgPace + 0.5)}:${String(Math.round(((avgPace + 0.5) % 1) * 60)).padStart(2, '0')}`;
      const tempoPace = `${Math.floor(avgPace - 0.3)}:${String(Math.round(((avgPace - 0.3) % 1) * 60)).padStart(2, '0')}`;
      
      plans.push({
        weekNumber: week,
        totalMileage: Math.round(weeklyMileage),
        workouts: [
          {
            type: "Easy Run",
            distance: Math.round(weeklyMileage * 0.3),
            pace: easyPace,
            description: "Conversational pace, focus on building aerobic base"
          },
          {
            type: "Tempo Run", 
            distance: Math.round(weeklyMileage * 0.2),
            pace: tempoPace,
            description: "Comfortably hard effort, sustainable pace"
          },
          {
            type: "Long Run",
            distance: Math.round(weeklyMileage * 0.35),
            pace: easyPace,
            description: "Build endurance, stay conversational"
          }
        ]
      });
    }

    return plans;
  }

  private formatTime(minutes: number): string {
    const totalMinutes = Math.floor(minutes);
    const seconds = Math.round((minutes - totalMinutes) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${mins}:${String(seconds).padStart(2, '0')}`;
  }
}

export const mlService = new MLService();