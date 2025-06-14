import OpenAI from "openai";
import { storage } from "../storage";
import type { Activity } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

  private formatActivitiesForAI(activities: Activity[]): string {
    return activities.slice(0, 10).map(activity => {
      const pace = activity.distance > 0 ? (activity.movingTime / 60) / (activity.distance / 1000) : 0;
      return `${activity.name}: ${(activity.distance / 1000).toFixed(1)}km, ${pace.toFixed(2)} min/km, ${activity.totalElevationGain}m elevation, ${activity.startDate.toDateString()}`;
    }).join('\n');
  }

  async generateInsights(userId: number): Promise<void> {
    const activities = await storage.getActivitiesByUserId(userId, 30);
    if (activities.length === 0) {
      return;
    }

    const stats = this.calculateStats(activities);
    const activitiesText = this.formatActivitiesForAI(activities);

    const prompt = `
Analyze this runner's recent activity data and provide insights:

Running Statistics:
- Total distance: ${(stats.totalDistance / 1000).toFixed(1)}km
- Total activities: ${stats.activityCount}
- Average pace: ${stats.averagePace.toFixed(2)} min/km
- Total elevation: ${stats.totalElevation.toFixed(0)}m
- Average heart rate: ${stats.averageHeartRate?.toFixed(0) || 'N/A'} bpm

Recent Activities:
${activitiesText}

Provide analysis in the following JSON format:
{
  "performance": "Performance analysis insight (max 150 chars)",
  "pattern": "Training pattern insight (max 150 chars)", 
  "recovery": "Recovery insight (max 150 chars)",
  "recommendations": {
    "speed": "Speed work recommendation (max 100 chars)",
    "hills": "Hill training recommendation (max 100 chars)",
    "longRun": "Long run recommendation (max 100 chars)"
  }
}

Focus on actionable insights based on the data patterns.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 800,
      });

      const analysis: AIAnalysisResult = JSON.parse(response.choices[0].message.content || '{}');

      // Clear old insights
      await storage.deleteOldAIInsights(userId, 'performance');
      await storage.deleteOldAIInsights(userId, 'pattern');
      await storage.deleteOldAIInsights(userId, 'recovery');
      await storage.deleteOldAIInsights(userId, 'recommendation');

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

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      throw new Error('Failed to generate AI insights');
    }
  }
}

export const aiService = new AIService();
