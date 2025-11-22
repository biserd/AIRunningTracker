import OpenAI from "openai";
import { storage } from "../storage";
import type { Activity } from "@shared/schema";

// Using GPT-5 (released August 2025) for enhanced AI insights generation
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

// Running activity types based on Strava's sport_type field
const RUNNING_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

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
    
    const allActivities = await storage.getActivitiesByUserId(userId, 30);
    console.log(`Generating insights for user ${userId} with ${allActivities.length} total activities`);
    
    if (allActivities.length === 0) {
      console.log(`No activities found for user ${userId}, skipping insights generation`);
      return;
    }

    // Filter to running activities for pace/form analysis
    const runningActivities = allActivities.filter(a => RUNNING_TYPES.includes(a.type));
    console.log(`${runningActivities.length} running activities, ${allActivities.length - runningActivities.length} cross-training activities`);
    
    if (runningActivities.length === 0) {
      console.log(`No running activities found for user ${userId}, skipping insights generation`);
      return;
    }

    const isMetric = user.unitPreference !== "miles";
    
    // Calculate running stats for pace/form insights
    const runningStats = this.calculateStats(runningActivities);
    const runningActivitiesText = this.formatActivitiesForAI(runningActivities, isMetric);
    
    // Calculate total training volume (all activities) for recovery context
    const totalActivities = allActivities.length;
    const crossTrainingCount = totalActivities - runningActivities.length;

    // Format statistics based on unit preference (running only)
    const totalDistance = isMetric ? 
      `${(runningStats.totalDistance / 1000).toFixed(1)}km` : 
      `${((runningStats.totalDistance / 1000) * 0.621371).toFixed(1)}mi`;
    
    const avgPace = isMetric ? 
      `${runningStats.averagePace.toFixed(2)} min/km` : 
      `${(runningStats.averagePace / 0.621371).toFixed(2)} min/mi`;
    
    const elevation = isMetric ? 
      `${runningStats.totalElevation.toFixed(0)}m` : 
      `${(runningStats.totalElevation * 3.28084).toFixed(0)}ft`;

    const prompt = `
Analyze this runner's recent activity data and provide insights:

Running Statistics (running activities only):
- Total running distance: ${totalDistance}
- Running activities: ${runningStats.activityCount}
- Average running pace: ${avgPace}
- Total elevation: ${elevation}
- Average heart rate: ${runningStats.averageHeartRate?.toFixed(0) || 'N/A'} bpm

Training Context:
- Total activities (all types): ${totalActivities}
- Cross-training activities: ${crossTrainingCount}${crossTrainingCount > 0 ? ' (good for recovery and injury prevention!)' : ''}
- Unit preference: ${isMetric ? 'kilometers' : 'miles'}

Recent Running Activities:
${runningActivitiesText}

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
      // Use Responses API with streaming and explicit reasoning: none for maximum speed (fast path)
      const stream = await openai.responses.create({
        model: "gpt-5.1",
        input: [
          {
            role: "system",
            content: "You are an expert running coach and sports scientist. Analyze running data and provide concise, actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "RunningInsights",
            strict: true,
            schema: {
              type: "object",
              properties: {
                performance: { type: "string", description: "Performance analysis insight (max 150 chars)" },
                pattern: { type: "string", description: "Training pattern insight (max 150 chars)" },
                recovery: { type: "string", description: "Recovery insight (max 150 chars)" },
                motivation: { type: "string", description: "Motivational insight (max 150 chars)" },
                technique: { type: "string", description: "Running form/technique insight (max 150 chars)" },
                recommendations: {
                  type: "object",
                  properties: {
                    speed: { type: "string", description: "Speed work recommendation (max 100 chars)" },
                    hills: { type: "string", description: "Hill training recommendation (max 100 chars)" },
                    longRun: { type: "string", description: "Long run recommendation (max 100 chars)" }
                  },
                  required: ["speed", "hills", "longRun"],
                  additionalProperties: false
                }
              },
              required: ["performance", "pattern", "recovery", "motivation", "technique", "recommendations"],
              additionalProperties: false
            }
          }
        },
        max_output_tokens: 1000,
        reasoning: { effort: "none" as any }, // TypeScript types not updated yet, but "none" is valid per API docs
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
      
      console.log('[AI Service] Successfully generated insights from OpenAI Responses API (low reasoning effort)');
      console.log('[AI Service] Raw response content:', rawContent);
      
      if (!rawContent || rawContent.trim() === '{}') {
        console.error('[AI Service] OpenAI returned empty content!');
        throw new Error('OpenAI returned empty response');
      }

      const analysis: AIAnalysisResult = JSON.parse(rawContent);

      // Validate that we have required fields from AI response
      if (!analysis || typeof analysis !== 'object') {
        console.error('Invalid AI response format:', rawContent);
        throw new Error('Invalid AI response format');
      }

      // Log what fields are present/missing for debugging
      const missingFields = [];
      if (!analysis.performance) missingFields.push('performance');
      if (!analysis.pattern) missingFields.push('pattern');
      if (!analysis.recovery) missingFields.push('recovery');
      if (!analysis.recommendations) missingFields.push('recommendations');
      
      if (missingFields.length > 0) {
        console.warn(`AI response missing fields: ${missingFields.join(', ')}`);
        console.warn('Full AI response:', JSON.stringify(analysis, null, 2));
      }

      // Store new insights first, then cleanup old ones to preserve history
      // This ensures we always have the latest insight before cleanup

      // Store new insights - validate content is not null/undefined/empty
      if (analysis.performance && analysis.performance.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'performance',
          title: 'Performance Analysis',
          content: analysis.performance,
          confidence: 0.85,
        });
      }

      if (analysis.pattern && analysis.pattern.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'pattern',
          title: 'Training Pattern',
          content: analysis.pattern,
          confidence: 0.8,
        });
      }

      if (analysis.recovery && analysis.recovery.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'recovery',
          title: 'Recovery Insights',
          content: analysis.recovery,
          confidence: 0.75,
        });
      }

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

      // Store recommendations - validate each one
      if (analysis.recommendations?.speed && analysis.recommendations.speed.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'recommendation',
          title: 'Speed Work',
          content: analysis.recommendations.speed,
          confidence: 0.9,
        });
      }

      if (analysis.recommendations?.hills && analysis.recommendations.hills.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'recommendation',
          title: 'Hill Training',
          content: analysis.recommendations.hills,
          confidence: 0.9,
        });
      }

      if (analysis.recommendations?.longRun && analysis.recommendations.longRun.trim()) {
        await storage.createAIInsight({
          userId,
          type: 'recommendation',
          title: 'Long Run',
          content: analysis.recommendations.longRun,
          confidence: 0.9,
        });
      }

      // Now cleanup old insights while preserving recent history (keep last 10 of each type)
      await storage.cleanupOldAIInsights(userId, 'performance', 10);
      await storage.cleanupOldAIInsights(userId, 'pattern', 10);
      await storage.cleanupOldAIInsights(userId, 'recovery', 10);
      await storage.cleanupOldAIInsights(userId, 'motivation', 10);
      await storage.cleanupOldAIInsights(userId, 'technique', 10);
      await storage.cleanupOldAIInsights(userId, 'recommendation', 30); // Keep more recommendations for variety

    } catch (error: any) {
      console.error('[AI Service] Failed to generate AI insights for user', userId);
      console.error('[AI Service] Error details:', error.message || error);
      if (error.response) {
        console.error('[AI Service] OpenAI API error response:', error.response.data);
      }
      throw new Error(`Failed to generate AI insights: ${error.message || 'Unknown error'}`);
    }
  }
}

export const aiService = new AIService();
