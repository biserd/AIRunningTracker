import OpenAI from "openai";
import { storage } from "../storage";
import type { Activity } from "@shared/schema";

// Using GPT-5 (released August 2025) for enhanced AI insights generation
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

interface RunningStats {
  totalDistance: number;
  totalTime: number;
  averagePace: number;
  totalElevation: number;
  activityCount: number;
  averageHeartRate?: number;
}

interface AIAnalysisResult {
  performance: string;
  pattern: string;
  recovery: string;
  motivation: string;
  technique: string;
  recommendations: {
    speed: string;
    hills: string;
    longRun: string;
  };
}

export class AIService {
  private calculateStats(activities: Activity[]): RunningStats {
    if (activities.length === 0) {
      return {
        totalDistance: 0,
        totalTime: 0,
        averagePace: 0,
        totalElevation: 0,
        activityCount: 0,
      };
    }

    const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
    const totalTime = activities.reduce((sum, a) => sum + a.movingTime, 0);
    const totalElevation = activities.reduce((sum, a) => sum + a.totalElevationGain, 0);
    
    const activitiesWithHR = activities.filter(a => a.averageHeartrate);
    const averageHeartRate = activitiesWithHR.length > 0 
      ? activitiesWithHR.reduce((sum, a) => sum + (a.averageHeartrate || 0), 0) / activitiesWithHR.length
      : undefined;

    // Calculate average pace in minutes per km
    const averagePace = totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : 0;

    return {
      totalDistance,
      totalTime,
      averagePace,
      totalElevation,
      activityCount: activities.length,
      averageHeartRate,
    };
  }

  private formatActivitiesForAI(activities: Activity[], isMetric: boolean): string {
    return activities.slice(0, 10).map(activity => {
      const distanceInKm = activity.distance / 1000;
      const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
      
      if (isMetric) {
        return `${activity.name}: ${distanceInKm.toFixed(1)}km, ${pacePerKm.toFixed(2)} min/km, ${activity.totalElevationGain}m elevation, ${activity.startDate.toDateString()}`;
      } else {
        const distanceInMiles = distanceInKm * 0.621371;
        const pacePerMile = pacePerKm / 0.621371;
        const elevationInFeet = activity.totalElevationGain * 3.28084;
        return `${activity.name}: ${distanceInMiles.toFixed(1)}mi, ${pacePerMile.toFixed(2)} min/mi, ${elevationInFeet.toFixed(0)}ft elevation, ${activity.startDate.toDateString()}`;
      }
    }).join('\n');
  }

  async generateInsights(userId: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const activities = await storage.getActivitiesByUserId(userId, 30);
    console.log(`Generating insights for user ${userId} with ${activities.length} activities`);
    
    if (activities.length === 0) {
      console.log(`No activities found for user ${userId}, skipping insights generation`);
      return;
    }

    const isMetric = user.unitPreference !== "miles";
    const stats = this.calculateStats(activities);
    const activitiesText = this.formatActivitiesForAI(activities, isMetric);

    // Format statistics based on unit preference
    const totalDistance = isMetric ? 
      `${(stats.totalDistance / 1000).toFixed(1)}km` : 
      `${((stats.totalDistance / 1000) * 0.621371).toFixed(1)}mi`;
    
    const avgPace = isMetric ? 
      `${stats.averagePace.toFixed(2)} min/km` : 
      `${(stats.averagePace / 0.621371).toFixed(2)} min/mi`;
    
    const elevation = isMetric ? 
      `${stats.totalElevation.toFixed(0)}m` : 
      `${(stats.totalElevation * 3.28084).toFixed(0)}ft`;

    const prompt = `
Analyze this runner's recent activity data and provide insights:

Running Statistics:
- Total distance: ${totalDistance}
- Total activities: ${stats.activityCount}
- Average pace: ${avgPace}
- Total elevation: ${elevation}
- Average heart rate: ${stats.averageHeartRate?.toFixed(0) || 'N/A'} bpm
- Unit preference: ${isMetric ? 'kilometers' : 'miles'}

Recent Activities:
${activitiesText}

Provide analysis in the following JSON format:
{
  "performance": "Performance analysis insight (max 150 chars)",
  "pattern": "Training pattern insight (max 150 chars)", 
  "recovery": "Recovery insight (max 150 chars)",
  "motivation": "Motivational insight highlighting achievements and encouraging progress (max 150 chars)",
  "technique": "Running form, cadence, or technique insight with actionable tips (max 150 chars)",
  "recommendations": {
    "speed": "Speed work recommendation using ${isMetric ? 'km/meters' : 'miles/feet'} units (max 100 chars)",
    "hills": "Hill training recommendation using ${isMetric ? 'km/meters' : 'miles/feet'} units (max 100 chars)",
    "longRun": "Long run recommendation using ${isMetric ? 'km/meters' : 'miles/feet'} units (max 100 chars)"
  }
}

IMPORTANT: Use ${isMetric ? 'kilometers and meters' : 'miles and feet'} in all distance references in recommendations. Focus on actionable insights based on the data patterns.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert running coach and sports scientist. Analyze running data and provide concise, actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 800,
      });

      const analysis: AIAnalysisResult = JSON.parse(response.choices[0].message.content || '{}');

      // Store new insights first, then cleanup old ones to preserve history
      // This ensures we always have the latest insight before cleanup

      // Store new insights
      await storage.createAIInsight({
        userId,
        type: 'performance',
        title: 'Performance Analysis',
        content: analysis.performance,
        confidence: 0.85,
      });

      await storage.createAIInsight({
        userId,
        type: 'pattern',
        title: 'Training Pattern',
        content: analysis.pattern,
        confidence: 0.8,
      });

      await storage.createAIInsight({
        userId,
        type: 'recovery',
        title: 'Recovery Insights',
        content: analysis.recovery,
        confidence: 0.75,
      });

      // Store motivation insight with fallback
      if (analysis.motivation && analysis.motivation.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'motivation',
          title: 'Motivation Boost',
          content: analysis.motivation.slice(0, 150), // Enforce 150 char limit
          confidence: 0.8,
        });
      }

      // Store technique insight with fallback
      if (analysis.technique && analysis.technique.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'technique',
          title: 'Technique Tips',
          content: analysis.technique.slice(0, 150), // Enforce 150 char limit
          confidence: 0.85,
        });
      }

      // Store recommendations
      await storage.createAIInsight({
        userId,
        type: 'recommendation',
        title: 'Speed Work',
        content: analysis.recommendations.speed,
        confidence: 0.9,
      });

      await storage.createAIInsight({
        userId,
        type: 'recommendation',
        title: 'Hill Training',
        content: analysis.recommendations.hills,
        confidence: 0.9,
      });

      await storage.createAIInsight({
        userId,
        type: 'recommendation',
        title: 'Long Run',
        content: analysis.recommendations.longRun,
        confidence: 0.9,
      });

      // Now cleanup old insights while preserving recent history (keep last 10 of each type)
      await storage.cleanupOldAIInsights(userId, 'performance', 10);
      await storage.cleanupOldAIInsights(userId, 'pattern', 10);
      await storage.cleanupOldAIInsights(userId, 'recovery', 10);
      await storage.cleanupOldAIInsights(userId, 'motivation', 10);
      await storage.cleanupOldAIInsights(userId, 'technique', 10);
      await storage.cleanupOldAIInsights(userId, 'recommendation', 30); // Keep more recommendations for variety

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      throw new Error('Failed to generate AI insights');
    }
  }
}

export const aiService = new AIService();
