/**
 * Cadence Drift & Form Stability Analysis
 * 
 * Detects form fade through cadence drift analysis
 * Outputs Form Stability Score (0-100)
 */

export interface CadenceDataPoint {
  time: number; // seconds from start
  cadence: number; // steps per minute
  speed?: number; // m/s
  heartRate?: number; // bpm
}

export interface CadenceAnalysisInput {
  dataPoints: CadenceDataPoint[];
  activityDuration: number; // seconds
  activityName?: string;
  distance?: number; // meters
}

export interface CadenceAnalysisResult {
  formStabilityScore: number; // 0-100
  cadenceDrift: number; // spm per hour
  cadenceCV: number; // coefficient of variation (%)
  strideVariability: number; // coefficient of variation (%)
  meanCadence: number; // spm
  cadenceStdDev: number; // spm
  meanStrideLength?: number; // meters
  interpretation: string;
  severityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
  timeSeriesData: { time: number; cadence: number; trendLine: number }[];
  weeklyStats?: {
    week: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  }[];
}

/**
 * Calculate robust linear regression (drift) for cadence over time
 * Returns slope in spm/hour
 */
function calculateCadenceDrift(dataPoints: CadenceDataPoint[], durationSeconds: number): number {
  if (dataPoints.length < 10) return 0;
  
  // Convert to hours for easier interpretation
  const durationHours = durationSeconds / 3600;
  
  // Simple linear regression: y = mx + b
  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  dataPoints.forEach(point => {
    const x = point.time / 3600; // convert to hours
    const y = point.cadence;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  
  // Slope (m) = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX^2)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return slope; // spm per hour
}

/**
 * Calculate coefficient of variation for cadence
 */
function calculateCadenceCV(dataPoints: CadenceDataPoint[]): { mean: number; stdDev: number; cv: number } {
  if (dataPoints.length === 0) return { mean: 0, stdDev: 0, cv: 0 };
  
  const cadences = dataPoints.map(p => p.cadence);
  const mean = cadences.reduce((sum, val) => sum + val, 0) / cadences.length;
  
  const variance = cadences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cadences.length;
  const stdDev = Math.sqrt(variance);
  
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
  
  return { mean, stdDev, cv };
}

/**
 * Calculate stride length variability
 * Stride length = speed / (cadence/60)
 */
function calculateStrideVariability(dataPoints: CadenceDataPoint[]): { mean: number; cv: number } {
  const stridesWithSpeed = dataPoints.filter(p => p.speed && p.speed > 0);
  
  if (stridesWithSpeed.length < 10) return { mean: 0, cv: 0 };
  
  const strideLengths = stridesWithSpeed.map(p => {
    const stepsPerSecond = p.cadence! / 60;
    return p.speed! / stepsPerSecond;
  });
  
  const mean = strideLengths.reduce((sum, val) => sum + val, 0) / strideLengths.length;
  const variance = strideLengths.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / strideLengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
  
  return { mean, cv };
}

/**
 * Generate trend line data for visualization
 */
function generateTrendLine(
  dataPoints: CadenceDataPoint[],
  drift: number,
  meanCadence: number
): { time: number; cadence: number; trendLine: number }[] {
  if (dataPoints.length === 0) return [];
  
  // Calculate y-intercept: b = meanY - m * meanX
  const meanTime = dataPoints.reduce((sum, p) => sum + p.time, 0) / dataPoints.length;
  const intercept = meanCadence - drift * (meanTime / 3600);
  
  return dataPoints.map(p => ({
    time: p.time,
    cadence: p.cadence,
    trendLine: intercept + drift * (p.time / 3600)
  }));
}

/**
 * Calculate Form Stability Score (0-100)
 * Score = 100 - (w1·norm(|drift|) + w2·norm(CV) + w3·norm(stride_var))
 */
export function calculateFormStabilityScore(
  drift: number,
  cadenceCV: number,
  strideCV: number
): number {
  // Weights
  const w1 = 0.5; // drift weight
  const w2 = 0.3; // cadence CV weight
  const w3 = 0.2; // stride CV weight
  
  // Normalize metrics (0-100 scale)
  // Drift: 0 spm/hr = 0, 10+ spm/hr = 100
  const normDrift = Math.min(100, Math.abs(drift) * 10);
  
  // Cadence CV: 0% = 0, 10%+ = 100
  const normCadenceCV = Math.min(100, cadenceCV * 10);
  
  // Stride CV: 0% = 0, 15%+ = 100
  const normStrideCV = Math.min(100, (strideCV / 15) * 100);
  
  // Calculate score
  const penalty = w1 * normDrift + w2 * normCadenceCV + w3 * normStrideCV;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  
  return Math.round(score);
}

/**
 * Get interpretation and severity level
 */
function getInterpretation(
  score: number,
  drift: number,
  cv: number
): { interpretation: string; severity: 'excellent' | 'good' | 'fair' | 'poor'; recommendations: string[] } {
  const recommendations: string[] = [];
  let interpretation = '';
  let severity: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  
  // Interpret drift
  const absDrift = Math.abs(drift);
  if (absDrift <= 2) {
    interpretation = 'Excellent form stability! Your cadence remained consistent throughout the run. ';
    severity = 'excellent';
  } else if (absDrift <= 5) {
    interpretation = 'Good form stability with mild cadence drift. Your running form held up well. ';
    severity = 'good';
    if (drift > 0) {
      recommendations.push('Slight cadence increase detected - you may be compensating for fatigue by shortening stride');
    } else {
      recommendations.push('Slight cadence decrease detected - focus on maintaining turnover in later miles');
    }
  } else {
    interpretation = 'Significant form fade detected. Your cadence changed notably as the run progressed. ';
    severity = 'poor';
    if (drift > 0) {
      recommendations.push('Large cadence increase suggests form breakdown - work on core strength and running economy');
    } else {
      recommendations.push('Large cadence drop indicates fatigue - consider reducing pace or adding cadence drills');
    }
  }
  
  // Interpret CV
  if (cv > 5) {
    interpretation += 'High cadence variability suggests inconsistent pacing or terrain changes. ';
    recommendations.push('Work on maintaining steady cadence through varied terrain and fatigue');
  } else if (cv > 3) {
    interpretation += 'Moderate cadence variability is normal for outdoor running. ';
  } else {
    interpretation += 'Very consistent cadence - excellent rhythm control. ';
  }
  
  // Overall score interpretation
  if (score >= 85) {
    interpretation += 'Your form stability is excellent.';
  } else if (score >= 70) {
    interpretation += 'Your form stability is good with room for minor improvements.';
  } else if (score >= 50) {
    interpretation += 'Your form stability needs attention.';
    recommendations.push('Consider strength training and form drills to maintain cadence under fatigue');
  } else {
    interpretation += 'Significant form instability detected.';
    recommendations.push('Focus on building aerobic base and running economy before adding intensity');
    recommendations.push('Consider shorter runs to build form endurance');
  }
  
  return { interpretation, severity, recommendations };
}

/**
 * Main cadence analysis function
 */
export function analyzeCadence(input: CadenceAnalysisInput): CadenceAnalysisResult {
  const { dataPoints, activityDuration, activityName, distance } = input;
  
  // Calculate drift
  const drift = calculateCadenceDrift(dataPoints, activityDuration);
  
  // Calculate cadence statistics
  const { mean: meanCadence, stdDev: cadenceStdDev, cv: cadenceCV } = calculateCadenceCV(dataPoints);
  
  // Calculate stride variability
  const { mean: meanStrideLength, cv: strideCV } = calculateStrideVariability(dataPoints);
  
  // Calculate form stability score
  const formStabilityScore = calculateFormStabilityScore(drift, cadenceCV, strideCV);
  
  // Get interpretation
  const { interpretation, severity, recommendations } = getInterpretation(
    formStabilityScore,
    drift,
    cadenceCV
  );
  
  // Generate trend line data
  const timeSeriesData = generateTrendLine(dataPoints, drift, meanCadence);
  
  return {
    formStabilityScore,
    cadenceDrift: drift,
    cadenceCV,
    strideVariability: strideCV,
    meanCadence,
    cadenceStdDev,
    meanStrideLength: meanStrideLength > 0 ? meanStrideLength : undefined,
    interpretation,
    severityLevel: severity,
    recommendations,
    timeSeriesData
  };
}

/**
 * Sample cadence data at regular intervals from activity streams
 * Reduces large datasets to manageable size for analysis
 */
export function sampleCadenceData(
  times: number[], // seconds
  cadences: number[], // spm
  speeds?: number[], // m/s
  heartRates?: number[], // bpm
  targetSamples: number = 200
): CadenceDataPoint[] {
  if (times.length === 0 || cadences.length === 0) return [];
  
  const dataLength = Math.min(times.length, cadences.length);
  const interval = Math.max(1, Math.floor(dataLength / targetSamples));
  
  const samples: CadenceDataPoint[] = [];
  
  for (let i = 0; i < dataLength; i += interval) {
    samples.push({
      time: times[i],
      cadence: cadences[i],
      speed: speeds?.[i],
      heartRate: heartRates?.[i]
    });
  }
  
  return samples;
}

/**
 * Format drift value for display
 */
export function formatDrift(drift: number): string {
  const sign = drift >= 0 ? '+' : '';
  return `${sign}${drift.toFixed(1)} spm/hr`;
}

/**
 * Get color for form stability score
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return '#10b981'; // green
  if (score >= 70) return '#3b82f6'; // blue
  if (score >= 50) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}
