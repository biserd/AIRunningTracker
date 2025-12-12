import { storage } from "../storage";
import type { Activity, AthleteProfile, InsertAthleteProfile } from "@shared/schema";

interface ComputedProfile {
  baselineWeeklyMileageKm: number;
  weeklyMileageLast12Weeks: number[];
  longestRecentRunKm: number;
  avgRunsPerWeek: number;
  typicalEasyPaceMin: number | null;
  typicalEasyPaceMax: number | null;
  typicalTempoPace: number | null;
  typicalIntervalPace: number | null;
  hrZones: {
    zone1?: { min: number; max: number };
    zone2?: { min: number; max: number };
    zone3?: { min: number; max: number };
    zone4?: { min: number; max: number };
    zone5?: { min: number; max: number };
  } | null;
  maxHr: number | null;
  restingHr: number | null;
  avgElevationGainPerKm: number | null;
  estimatedVdot: number | null;
  estimatedRaceTimes: {
    fiveK?: string;
    tenK?: string;
    halfMarathon?: string;
    marathon?: string;
  } | null;
}

export class AthleteProfileService {
  /**
   * Compute or refresh an athlete's profile from their Strava activities
   */
  async computeProfile(userId: number): Promise<AthleteProfile> {
    console.log(`[AthleteProfile] Computing profile for user ${userId}`);
    
    // Get last 12 weeks of activities
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    
    const activities = await storage.getActivitiesByUserId(userId, undefined, twelveWeeksAgo);
    
    // Filter to only runs
    const runs = activities.filter(a => a.type === "Run");
    
    if (runs.length === 0) {
      console.log(`[AthleteProfile] No runs found for user ${userId}, creating minimal profile`);
      return await this.createMinimalProfile(userId);
    }
    
    const profile = this.analyzeActivities(runs);
    
    // Save to database
    const saved = await storage.upsertAthleteProfile({
      userId,
      sport: "run",
      ...profile,
      weeklyMileageLast12Weeks: profile.weeklyMileageLast12Weeks,
      hrZones: profile.hrZones,
      estimatedRaceTimes: profile.estimatedRaceTimes,
    });
    
    console.log(`[AthleteProfile] Profile computed for user ${userId}:`, {
      baselineWeeklyMileageKm: profile.baselineWeeklyMileageKm.toFixed(1),
      avgRunsPerWeek: profile.avgRunsPerWeek.toFixed(1),
      longestRecentRunKm: profile.longestRecentRunKm.toFixed(1),
    });
    
    return saved;
  }
  
  /**
   * Analyze activities to compute profile metrics
   */
  private analyzeActivities(runs: Activity[]): ComputedProfile {
    // Group runs by week
    const weeklyData = this.groupByWeek(runs);
    const weeklyMileages = weeklyData.map(w => w.totalKm);
    
    // Baseline: average of last 4 weeks (or available weeks)
    const recentWeeks = weeklyMileages.slice(-4);
    const baselineWeeklyMileageKm = recentWeeks.length > 0
      ? recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length
      : 0;
    
    // Total runs per week average
    const weeklyRunCounts = weeklyData.map(w => w.runCount);
    const avgRunsPerWeek = weeklyRunCounts.length > 0
      ? weeklyRunCounts.reduce((a, b) => a + b, 0) / weeklyRunCounts.length
      : 0;
    
    // Longest recent run
    const longestRecentRunKm = runs.reduce((max, r) => 
      Math.max(max, (r.distance || 0) / 1000), 0);
    
    // Analyze paces
    const paces = this.analyzePaces(runs);
    
    // Analyze heart rate zones
    const hrAnalysis = this.analyzeHeartRate(runs);
    
    // Analyze elevation
    const avgElevationGainPerKm = this.analyzeElevation(runs);
    
    // Estimate VDOT from recent performances
    const vdotAnalysis = this.estimateVdot(runs);
    
    return {
      baselineWeeklyMileageKm,
      weeklyMileageLast12Weeks: weeklyMileages,
      longestRecentRunKm,
      avgRunsPerWeek,
      ...paces,
      ...hrAnalysis,
      avgElevationGainPerKm,
      ...vdotAnalysis,
    };
  }
  
  /**
   * Group activities by week (Sunday-Saturday)
   */
  private groupByWeek(runs: Activity[]): Array<{ weekStart: Date; totalKm: number; runCount: number }> {
    const weeks: Map<string, { weekStart: Date; totalKm: number; runCount: number }> = new Map();
    
    runs.forEach(run => {
      const date = new Date(run.startDate);
      // Get Sunday of that week
      const dayOfWeek = date.getDay();
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      const key = weekStart.toISOString().split('T')[0];
      
      if (!weeks.has(key)) {
        weeks.set(key, { weekStart, totalKm: 0, runCount: 0 });
      }
      
      const week = weeks.get(key)!;
      week.totalKm += (run.distance || 0) / 1000;
      week.runCount += 1;
    });
    
    // Sort by week start date and return as array
    return Array.from(weeks.values()).sort((a, b) => 
      a.weekStart.getTime() - b.weekStart.getTime()
    );
  }
  
  /**
   * Analyze paces from activities
   * Categorize runs by effort level based on pace and HR
   */
  private analyzePaces(runs: Activity[]): {
    typicalEasyPaceMin: number | null;
    typicalEasyPaceMax: number | null;
    typicalTempoPace: number | null;
    typicalIntervalPace: number | null;
  } {
    // Calculate pace for each run (min/km)
    const runsWithPace = runs
      .filter(r => r.distance && r.movingTime && r.distance > 1000)
      .map(r => ({
        ...r,
        paceMinPerKm: (r.movingTime / 60) / (r.distance! / 1000),
        distanceKm: r.distance! / 1000,
      }))
      .filter(r => r.paceMinPerKm > 3 && r.paceMinPerKm < 15); // Filter outliers
    
    if (runsWithPace.length === 0) {
      return {
        typicalEasyPaceMin: null,
        typicalEasyPaceMax: null,
        typicalTempoPace: null,
        typicalIntervalPace: null,
      };
    }
    
    // Sort by pace
    const sortedByPace = [...runsWithPace].sort((a, b) => a.paceMinPerKm - b.paceMinPerKm);
    
    // Easy runs: longer runs (>5km) at slower pace (bottom 60%)
    const easyRuns = sortedByPace
      .filter(r => r.distanceKm > 5)
      .slice(Math.floor(sortedByPace.length * 0.4));
    
    // Tempo: medium-fast runs
    const tempoRuns = sortedByPace
      .filter(r => r.distanceKm >= 3 && r.distanceKm <= 12)
      .slice(0, Math.floor(sortedByPace.length * 0.3));
    
    // Interval: fast, short runs
    const intervalRuns = sortedByPace
      .filter(r => r.distanceKm < 8)
      .slice(0, Math.floor(sortedByPace.length * 0.2));
    
    const avgPace = (runs: typeof runsWithPace) => 
      runs.length > 0 ? runs.reduce((sum, r) => sum + r.paceMinPerKm, 0) / runs.length : null;
    
    const easyPaceAvg = avgPace(easyRuns);
    
    return {
      typicalEasyPaceMin: easyPaceAvg ? easyPaceAvg - 0.3 : null,
      typicalEasyPaceMax: easyPaceAvg ? easyPaceAvg + 0.3 : null,
      typicalTempoPace: avgPace(tempoRuns),
      typicalIntervalPace: avgPace(intervalRuns),
    };
  }
  
  /**
   * Analyze heart rate data
   */
  private analyzeHeartRate(runs: Activity[]): {
    hrZones: ComputedProfile['hrZones'];
    maxHr: number | null;
    restingHr: number | null;
  } {
    const runsWithHr = runs.filter(r => r.averageHeartrate && r.averageHeartrate > 0);
    
    if (runsWithHr.length === 0) {
      return { hrZones: null, maxHr: null, restingHr: null };
    }
    
    // Estimate max HR from max recorded (round to integer for DB)
    const maxHr = Math.round(runsWithHr.reduce((max, r) => 
      Math.max(max, r.maxHeartrate || 0), 0));
    
    // Estimate resting HR (not available from runs, estimate from lowest average)
    const lowestAvgHr = runsWithHr.reduce((min, r) => 
      Math.min(min, r.averageHeartrate || 999), 999);
    const restingHr = Math.round(Math.max(40, lowestAvgHr - 60)); // Rough estimate, rounded to integer
    
    if (maxHr > 0) {
      // Calculate zones based on max HR (using standard percentages)
      const hrZones = {
        zone1: { min: Math.round(maxHr * 0.50), max: Math.round(maxHr * 0.60) },
        zone2: { min: Math.round(maxHr * 0.60), max: Math.round(maxHr * 0.70) },
        zone3: { min: Math.round(maxHr * 0.70), max: Math.round(maxHr * 0.80) },
        zone4: { min: Math.round(maxHr * 0.80), max: Math.round(maxHr * 0.90) },
        zone5: { min: Math.round(maxHr * 0.90), max: maxHr },
      };
      
      return { hrZones, maxHr, restingHr };
    }
    
    return { hrZones: null, maxHr: null, restingHr };
  }
  
  /**
   * Analyze elevation gain
   */
  private analyzeElevation(runs: Activity[]): number | null {
    const runsWithElevation = runs.filter(r => 
      r.totalElevationGain && r.totalElevationGain > 0 && r.distance && r.distance > 1000
    );
    
    if (runsWithElevation.length === 0) return null;
    
    const totalElevation = runsWithElevation.reduce((sum, r) => sum + (r.totalElevationGain || 0), 0);
    const totalDistance = runsWithElevation.reduce((sum, r) => sum + (r.distance || 0) / 1000, 0);
    
    return totalDistance > 0 ? totalElevation / totalDistance : null;
  }
  
  /**
   * Estimate VDOT from recent performances
   * Uses Jack Daniels' formula
   */
  private estimateVdot(runs: Activity[]): {
    estimatedVdot: number | null;
    estimatedRaceTimes: ComputedProfile['estimatedRaceTimes'];
  } {
    // Look for race-like efforts (based on workoutType or intensity)
    const potentialRaces = runs
      .filter(r => 
        r.workoutType === 1 || // Strava race type
        (r.distance && r.distance >= 3000 && r.distance <= 45000) // 3K - 45K
      )
      .filter(r => r.distance && r.movingTime);
    
    if (potentialRaces.length === 0) {
      // Fall back to best recent efforts at common distances
      const recentFast = runs
        .filter(r => r.distance && r.movingTime)
        .sort((a, b) => {
          // Sort by pace (faster first)
          const paceA = a.movingTime / (a.distance! / 1000);
          const paceB = b.movingTime / (b.distance! / 1000);
          return paceA - paceB;
        })
        .slice(0, 5);
      
      if (recentFast.length === 0) {
        return { estimatedVdot: null, estimatedRaceTimes: null };
      }
      
      potentialRaces.push(...recentFast);
    }
    
    // Calculate VDOT from best effort
    let bestVdot = 0;
    
    for (const run of potentialRaces) {
      const distanceKm = run.distance! / 1000;
      const timeMinutes = run.movingTime / 60;
      
      // Skip very short or very long runs
      if (distanceKm < 1 || distanceKm > 50 || timeMinutes < 3) continue;
      
      const vdot = this.calculateVdot(distanceKm, timeMinutes);
      if (vdot > bestVdot) {
        bestVdot = vdot;
      }
    }
    
    if (bestVdot === 0) {
      return { estimatedVdot: null, estimatedRaceTimes: null };
    }
    
    // Estimate race times from VDOT
    const estimatedRaceTimes = {
      fiveK: this.vdotToTime(bestVdot, 5),
      tenK: this.vdotToTime(bestVdot, 10),
      halfMarathon: this.vdotToTime(bestVdot, 21.0975),
      marathon: this.vdotToTime(bestVdot, 42.195),
    };
    
    return { estimatedVdot: Math.round(bestVdot * 10) / 10, estimatedRaceTimes };
  }
  
  /**
   * Calculate VDOT from a performance
   * Simplified Jack Daniels formula
   */
  private calculateVdot(distanceKm: number, timeMinutes: number): number {
    // VO2 = -4.6 + 0.182258 * (distance/time) + 0.000104 * (distance/time)^2
    const velocity = distanceKm * 1000 / timeMinutes; // m/min
    
    // Simplified VDOT estimation
    const velocityPercent = velocity / 200; // Normalize
    const vdot = 30 + (velocityPercent - 1) * 30;
    
    // Clamp to reasonable range
    return Math.max(20, Math.min(85, vdot));
  }
  
  /**
   * Convert VDOT to estimated race time
   */
  private vdotToTime(vdot: number, distanceKm: number): string {
    // Simplified formula - higher VDOT = faster time
    const baseMinutesPerKm = 8 - (vdot - 30) * 0.1;
    const totalMinutes = distanceKm * Math.max(3, Math.min(10, baseMinutesPerKm));
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.round((totalMinutes % 1) * 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Create a minimal profile for users with no run data
   */
  private async createMinimalProfile(userId: number): Promise<AthleteProfile> {
    return await storage.upsertAthleteProfile({
      userId,
      sport: "run",
      baselineWeeklyMileageKm: 0,
      weeklyMileageLast12Weeks: [],
      longestRecentRunKm: 0,
      avgRunsPerWeek: 0,
      typicalEasyPaceMin: null,
      typicalEasyPaceMax: null,
      typicalTempoPace: null,
      typicalIntervalPace: null,
      hrZones: null,
      maxHr: null,
      restingHr: null,
      avgElevationGainPerKm: null,
      estimatedVdot: null,
      estimatedRaceTimes: null,
    });
  }
  
  /**
   * Get profile, computing if stale or missing
   */
  async getOrComputeProfile(userId: number, maxAgeHours: number = 24): Promise<AthleteProfile> {
    const existing = await storage.getAthleteProfile(userId, "run");
    
    if (existing && existing.lastComputedAt) {
      const ageMs = Date.now() - new Date(existing.lastComputedAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      
      if (ageHours < maxAgeHours) {
        return existing;
      }
    }
    
    return await this.computeProfile(userId);
  }
}

export const athleteProfileService = new AthleteProfileService();
