/**
 * Race Prediction Utilities
 * 
 * Core formulas:
 * - Riegel: T₂ = T₁ * (D₂ / D₁)^k where k≈1.06 (personalized by training)
 * - Training Consistency Index (TCI): 1 − norm(stddev(weekly load))
 * - Confidence band: ± base_error × (1 + (1−TCI)*α)
 */

export interface RaceEffort {
  distance: number; // meters
  time: number; // seconds
  date?: string;
  activityName?: string;
}

export interface RacePredictionInput {
  baseEffort: RaceEffort;
  targetDistance: number; // meters
  weeklyMileage?: number; // km per week
  trainingConsistency?: number; // 0-1 scale (0 = inconsistent, 1 = very consistent)
  courseAdjustment?: number; // seconds to add/subtract for course difficulty
  weatherAdjustment?: number; // seconds to add/subtract for weather
}

export interface RacePredictionResult {
  predictedTime: number; // seconds
  predictedPace: number; // seconds per km
  confidenceLower: number; // seconds (80% confidence)
  confidenceUpper: number; // seconds (80% confidence)
  riegelExponent: number; // personalized k value
  trainingConsistencyIndex: number; // 0-1
  paceTable: PaceLadder[];
  adjustments: {
    course: number;
    weather: number;
    total: number;
  };
}

export interface PaceLadder {
  label: string; // "Goal -10s", "Goal -5s", "Goal", etc.
  pace: number; // seconds per km
  finishTime: number; // seconds
  splitTimes: { distance: number; time: number }[]; // key splits
}

/**
 * Calculate personalized Riegel exponent based on training volume and durability
 * Range: 1.04 (high volume/durability) to 1.08 (low volume/durability)
 */
export function calculateRiegelExponent(
  weeklyMileage: number = 50,
  trainingConsistency: number = 0.7
): number {
  // Base exponent
  const baseK = 1.06;
  
  // Adjust based on weekly mileage (more mileage = better durability = lower k)
  const mileageAdjustment = weeklyMileage >= 80 ? -0.01 : 
                            weeklyMileage >= 60 ? -0.005 : 
                            weeklyMileage <= 30 ? 0.015 : 0;
  
  // Adjust based on consistency (more consistent = lower k)
  const consistencyAdjustment = (1 - trainingConsistency) * 0.01;
  
  const k = baseK + mileageAdjustment + consistencyAdjustment;
  
  // Clamp between 1.04 and 1.08
  return Math.max(1.04, Math.min(1.08, k));
}

/**
 * Calculate Training Consistency Index from weekly mileage data
 * TCI = 1 − normalized_stddev(weekly_mileage)
 */
export function calculateTCI(weeklyMileages: number[]): number {
  if (weeklyMileages.length < 4) return 0.5; // Default for insufficient data
  
  const mean = weeklyMileages.reduce((sum, val) => sum + val, 0) / weeklyMileages.length;
  const variance = weeklyMileages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weeklyMileages.length;
  const stddev = Math.sqrt(variance);
  
  // Coefficient of variation (CV)
  const cv = mean > 0 ? stddev / mean : 1;
  
  // TCI: lower CV = higher consistency
  // CV of 0 = TCI of 1, CV of 0.5+ = TCI of 0
  const tci = Math.max(0, Math.min(1, 1 - (cv * 2)));
  
  return tci;
}

/**
 * Get base error percentage for different race distances
 */
function getBaseError(distanceMeters: number): number {
  if (distanceMeters <= 10000) return 0.025; // 2.5% for 10k
  if (distanceMeters <= 21097) return 0.035; // 3.5% for half marathon
  return 0.05; // 5% for marathon
}

/**
 * Calculate confidence band using TCI
 */
function calculateConfidenceBand(
  predictedTime: number,
  distanceMeters: number,
  tci: number,
  alpha: number = 0.5
): { lower: number; upper: number } {
  const baseError = getBaseError(distanceMeters);
  const adjustedError = baseError * (1 + (1 - tci) * alpha);
  const errorSeconds = predictedTime * adjustedError;
  
  return {
    lower: predictedTime - errorSeconds,
    upper: predictedTime + errorSeconds
  };
}

/**
 * Main race prediction function using Riegel formula
 */
export function predictRaceTime(input: RacePredictionInput): RacePredictionResult {
  const { baseEffort, targetDistance, weeklyMileage = 50, trainingConsistency = 0.7 } = input;
  
  // Calculate personalized Riegel exponent
  const k = calculateRiegelExponent(weeklyMileage, trainingConsistency);
  
  // Apply Riegel formula: T₂ = T₁ * (D₂ / D₁)^k
  const distanceRatio = targetDistance / baseEffort.distance;
  const basePrediction = baseEffort.time * Math.pow(distanceRatio, k);
  
  // Apply course and weather adjustments
  const courseAdj = input.courseAdjustment || 0;
  const weatherAdj = input.weatherAdjustment || 0;
  const totalAdjustment = courseAdj + weatherAdj;
  
  const predictedTime = basePrediction + totalAdjustment;
  const predictedPace = predictedTime / (targetDistance / 1000); // sec per km
  
  // Calculate confidence band
  const confidence = calculateConfidenceBand(predictedTime, targetDistance, trainingConsistency);
  
  // Generate pace ladder (±10s, ±5s, goal)
  const paceTable = generatePaceLadder(predictedPace, targetDistance);
  
  return {
    predictedTime,
    predictedPace,
    confidenceLower: confidence.lower,
    confidenceUpper: confidence.upper,
    riegelExponent: k,
    trainingConsistencyIndex: trainingConsistency,
    paceTable,
    adjustments: {
      course: courseAdj,
      weather: weatherAdj,
      total: totalAdjustment
    }
  };
}

/**
 * Generate pace ladder with ±10s, ±5s, and goal pace
 */
function generatePaceLadder(goalPace: number, distanceMeters: number): PaceLadder[] {
  const adjustments = [
    { label: "Goal -10s", delta: -10 },
    { label: "Goal -5s", delta: -5 },
    { label: "Goal Pace", delta: 0 },
    { label: "Goal +5s", delta: 5 },
    { label: "Goal +10s", delta: 10 }
  ];
  
  return adjustments.map(adj => {
    const pace = goalPace + adj.delta; // sec per km
    const finishTime = pace * (distanceMeters / 1000);
    const splitTimes = generateSplits(pace, distanceMeters);
    
    return {
      label: adj.label,
      pace,
      finishTime,
      splitTimes
    };
  });
}

/**
 * Generate split times for common race distances
 */
function generateSplits(pacePerKm: number, distanceMeters: number): { distance: number; time: number }[] {
  const splits: { distance: number; time: number }[] = [];
  
  // Common split points based on race distance
  let splitPoints: number[] = [];
  
  if (distanceMeters >= 42000) {
    // Marathon: 5k, 10k, 15k, 20k, half, 25k, 30k, 35k, 40k, finish
    splitPoints = [5000, 10000, 15000, 20000, 21097.5, 25000, 30000, 35000, 40000, distanceMeters];
  } else if (distanceMeters >= 21000) {
    // Half marathon: 5k, 10k, 15k, 20k, finish
    splitPoints = [5000, 10000, 15000, 20000, distanceMeters];
  } else if (distanceMeters >= 10000) {
    // 10k: 1k, 2k, 3k, 4k, 5k, 6k, 7k, 8k, 9k, finish
    splitPoints = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, distanceMeters];
  } else {
    // 5k: 1k, 2k, 3k, 4k, finish
    splitPoints = [1000, 2000, 3000, 4000, distanceMeters];
  }
  
  splitPoints.forEach(dist => {
    splits.push({
      distance: dist,
      time: (dist / 1000) * pacePerKm
    });
  });
  
  return splits;
}

/**
 * Format time in seconds to HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace in sec/km to MM:SS
 */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert pace from per km to per mile
 */
export function paceKmToMile(pacePerKm: number): number {
  return pacePerKm * 1.60934;
}

/**
 * Weather adjustment calculator
 * Returns seconds to add based on temperature and conditions
 */
export function calculateWeatherAdjustment(
  tempCelsius: number,
  humidity: number = 50, // percentage
  wind: number = 0, // km/h
  distanceMeters: number = 42195
): number {
  let adjustment = 0;
  
  // Temperature impact (optimal: 10-15°C)
  if (tempCelsius > 15) {
    const tempDelta = tempCelsius - 15;
    adjustment += tempDelta * 3; // ~3 seconds per degree above 15°C per km
  } else if (tempCelsius < 5) {
    const tempDelta = 5 - tempCelsius;
    adjustment += tempDelta * 2; // ~2 seconds per degree below 5°C per km
  }
  
  // Humidity impact (significant above 70%)
  if (humidity > 70) {
    adjustment += (humidity - 70) * 0.5; // ~0.5 seconds per % above 70%
  }
  
  // Wind impact (headwind only, ignore tailwind for conservatism)
  if (wind > 15) {
    adjustment += (wind - 15) * 0.3; // ~0.3 seconds per km/h above 15
  }
  
  // Scale by distance
  const totalAdjustment = adjustment * (distanceMeters / 1000);
  
  return Math.round(totalAdjustment);
}

/**
 * Course elevation adjustment calculator
 * Returns seconds to add based on elevation gain
 */
export function calculateCourseAdjustment(
  elevationGainMeters: number,
  distanceMeters: number
): number {
  // Rule of thumb: ~10 seconds per 100m of elevation gain per km of distance
  const adjustmentPerKm = (elevationGainMeters / 100) * 10;
  return Math.round(adjustmentPerKm * (distanceMeters / 1000));
}
