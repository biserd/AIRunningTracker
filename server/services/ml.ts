import { storage } from "../storage";
import { Activity } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const activities = await storage.getActivitiesByUserId(userId, 50);
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

    console.log(`Race prediction debug for user ${userId}:`);
    console.log(`Recent activities: ${activities.length}`);
    console.log(`Recent pace (min/km): ${recentPace.toFixed(2)}`);
    console.log(`Unit preference: ${isMetric ? 'kilometers' : 'miles'}`);

    // Apply unit conversions if needed
    const paceForPrediction = isMetric ? recentPace : recentPace * 0.621371;
    console.log(`Pace for prediction (min/km): ${paceForPrediction.toFixed(2)}`);

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

    return predictions;
  }

  /**
   * Generate personalized training plan using AI
   */
  async generateTrainingPlan(userId: number, weeks: number = 4): Promise<TrainingPlan[]> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const activities = await storage.getActivitiesByUserId(userId, 30);
    const metrics = this.analyzeTrainingData(activities);
    
    const currentWeeklyMileage = metrics.weeklyMileage.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const avgPace = metrics.avgPaces.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const isMetric = user.unitPreference !== "miles";

    const prompt = `
Create a ${weeks}-week progressive training plan for a runner with these characteristics:

Current Fitness Level:
- Average weekly mileage: ${currentWeeklyMileage.toFixed(1)}${isMetric ? 'km' : 'mi'}
- Average training pace: ${avgPace.toFixed(2)} min/${isMetric ? 'km' : 'mi'}
- Training history: ${activities.length} recent activities
- Unit preference: ${isMetric ? 'kilometers' : 'miles'}

Guidelines:
- Increase weekly mileage by 10% each week maximum
- Include easy runs (80%), tempo runs (15%), and speed work (5%)
- Schedule rest days appropriately
- Provide specific pace targets for each workout type

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

Focus on gradual progression and injury prevention.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system", 
            content: "You are an expert running coach who creates personalized training plans. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"weeks": []}');
      return result.weeks || result;

    } catch (error) {
      console.error('Training plan generation error:', error);
      // Fallback plan
      return this.generateFallbackPlan(currentWeeklyMileage, avgPace, weeks, isMetric);
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