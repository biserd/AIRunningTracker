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
   * Predict race times using training data analysis
   */
  async predictRacePerformance(userId: number): Promise<RacePrediction[]> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const allActivities = await storage.getActivitiesByUserId(userId, 50);
    const activities = allActivities.filter(a => RUNNING_TYPES.includes(a.type));
    if (activities.length < 5) {
      return [{
        distance: "5K",
        predictedTime: "Need more data",
        confidence: 0,
        recommendation: "Complete at least 5 runs to generate predictions"
      }];
    }

    const metrics = this.analyzeTrainingData(activities);
    const recentPace = metrics.avgPaces.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const isMetric = user.unitPreference !== "miles";

    // The pace is already calculated as min/km in analyzeTrainingData, no conversion needed
    const paceForPrediction = recentPace; // Already in min/km

    const predictions: RacePrediction[] = [];

    // Convert training pace to realistic race paces using proven formulas
    // Training pace is in min/km, convert to race predictions
    
    // 5K Prediction - typically 15-20 seconds per km faster than tempo pace
    const fiveKPacePerKm = Math.max(3.5, paceForPrediction - 0.3); // Conservative speed increase
    const fiveKTimeMinutes = fiveKPacePerKm * 5;
    predictions.push({
      distance: "5K",
      predictedTime: this.formatTime(fiveKTimeMinutes),
      confidence: Math.min(85, 60 + activities.length * 2),
      recommendation: fiveKPacePerKm < 4.0 ? "Focus on speed work and intervals" : "Build more base fitness"
    });

    // 10K Prediction - typically 10-15 seconds per km faster than tempo
    const tenKPacePerKm = Math.max(3.8, paceForPrediction - 0.2);
    const tenKTimeMinutes = tenKPacePerKm * 10;
    predictions.push({
      distance: "10K",
      predictedTime: this.formatTime(tenKTimeMinutes),
      confidence: Math.min(90, 55 + activities.length * 2),
      recommendation: "Add tempo runs and threshold work"
    });

    // Half Marathon Prediction - typically 5-10 seconds per km slower than tempo
    const halfPacePerKm = paceForPrediction + 0.1;
    const halfTimeMinutes = halfPacePerKm * 21.1;
    predictions.push({
      distance: "Half Marathon", 
      predictedTime: this.formatTime(halfTimeMinutes),
      confidence: Math.min(80, 50 + activities.length * 2),
      recommendation: "Focus on long runs and aerobic base building"
    });

    // Full Marathon Prediction - typically 15-25 seconds per km slower than tempo
    const marathonPacePerKm = paceForPrediction + 0.35;
    const marathonTimeMinutes = marathonPacePerKm * 42.195;
    predictions.push({
      distance: "Marathon", 
      predictedTime: this.formatTime(marathonTimeMinutes),
      confidence: Math.min(75, 45 + activities.length * 2),
      recommendation: "Build endurance with consistent long runs of 25-32km"
    });

    return predictions;
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
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const {
      weeks = 4,
      goal = 'general',
      daysPerWeek = 4,
      targetDistance,
      raceDate,
      fitnessLevel = 'intermediate'
    } = params;

    const allActivities = await storage.getActivitiesByUserId(userId, 50);
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

    // Get race predictions for realistic pace targets
    const racePredictions = await this.predictRacePerformance(userId);
    
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
    
    // Instantiate performance and runner score services
    const performanceService = new PerformanceAnalyticsService();
    const runnerScoreService = new RunnerScoreService();
    
    // Get VO2 max and runner score data
    let vo2Data: any = null;
    let runnerScore: any = null;
    try {
      vo2Data = await performanceService.calculateVO2Max(userId);
      runnerScore = await runnerScoreService.calculateRunnerScore(userId);
    } catch (error) {
      console.log('Could not fetch additional metrics:', error);
    }

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
- Include easy runs (80%), tempo runs (15%), and speed work (5%)
- Schedule rest days appropriately (${7 - daysPerWeek} rest days per week)
- Adjust intensity based on ${fitnessLevel} fitness level
- ALL pace targets must be achievable based on their current fitness level shown above
- Focus on gradual progression and injury prevention
- Consider their current fitness indicators (VO2 max, runner score) when setting difficulty${raceDate ? `\n- Taper appropriately in final weeks before race date` : ''}

Return a JSON array with this structure:
[{
  "weekNumber": 1,
  "totalMileage": 25,
  "workouts": [
    {
      "type": "Easy Run",
      "distance": 5,
      "pace": "5:30",
      "description": "Conversational pace run"
    }
  ]
}]

Remember: Create a realistic, achievable plan based on their ACTUAL current paces and specific ${readableGoal} training goal, not idealized paces.`;

    try {
      // Use Responses API with streaming and low reasoning effort for training plan generation
      const stream = await openai.responses.create({
        model: "gpt-5.1",
        input: [
          {
            role: "system", 
            content: `You are an expert running coach who creates goal-specific, personalized training plans. You tailor plans based on the runner's specific training goal (${readableGoal}), current fitness level (${fitnessLevel}), and desired training frequency (${daysPerWeek} days/week). You provide realistic, achievable pace recommendations that match their demonstrated capabilities, not idealized or aspirational paces. CRITICAL: You MUST use ${unit} for ALL distances and min/${unit} for ALL paces in the training plan. Never mix units or use any other measurement system.`
          },
          {
            role: "user",
            content: prompt
          }
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
        max_output_tokens: 1500,
        reasoning: { effort: "low" },
        stream: true
      });

      // Collect streamed response from Responses API
      let rawContent = '';
      for await (const event of stream) {
        // Responses API streaming uses response.output_text.delta for text chunks
        if (event.type === 'response.output_text.delta') {
          rawContent += event.delta;
        }
      }

      const result = JSON.parse(rawContent || '{"weeks": []}');
      // Return the weeks array directly
      return result.weeks || result;

    } catch (error) {
      console.error('Training plan generation error:', error);
      // Fallback plan - use converted values
      return this.generateFallbackPlan(weeklyMileageConverted, avgPace, weeks, isMetric);
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