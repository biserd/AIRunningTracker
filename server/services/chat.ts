import OpenAI from "openai";
import { storage } from "../storage";
import type { Activity, AIMessage } from "@shared/schema";
import { PerformanceAnalyticsService } from "./performance";
import { RunnerScoreService } from "./runnerScore";
import { MLService } from "./ml";
import { planGeneratorService } from "./planGenerator";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

export class ChatService {
  private async assembleUserContext(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isMetric = user.unitPreference !== "miles";
    const unit = isMetric ? "km" : "mi";
    
    // Get recent activities (last 30 days)
    const activities = await storage.getActivitiesByUserId(userId, 30);
    
    if (activities.length === 0) {
      return `You are helping ${user.firstName || "a runner"} who has not synced any activities yet. Encourage them to connect their Strava account to get personalized insights.`;
    }

    // Calculate basic stats
    const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
    const totalTime = activities.reduce((sum, a) => sum + a.movingTime, 0);
    const avgPace = totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : 0;
    
    const totalDistanceConverted = isMetric 
      ? (totalDistance / 1000).toFixed(1) 
      : ((totalDistance / 1000) * 0.621371).toFixed(1);
    
    const avgPaceConverted = isMetric 
      ? avgPace.toFixed(2) 
      : (avgPace / 0.621371).toFixed(2);

    // Get performance metrics
    let vo2Data = null;
    let runnerScore = null;
    try {
      const performanceService = new PerformanceAnalyticsService();
      const runnerScoreService = new RunnerScoreService();
      vo2Data = await performanceService.calculateVO2Max(userId);
      runnerScore = await runnerScoreService.calculateRunnerScore(userId);
    } catch (error) {
      console.log('Could not fetch performance metrics:', error);
    }

    // Get race predictions
    let racePredictions: any[] = [];
    try {
      const mlService = new MLService();
      racePredictions = await mlService.predictRacePerformance(userId);
    } catch (error) {
      console.log('Could not fetch race predictions:', error);
    }

    // Format recent activities
    const recentActivities = activities.slice(0, 5).map(activity => {
      const distanceInKm = activity.distance / 1000;
      const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
      
      if (isMetric) {
        return `${activity.name}: ${distanceInKm.toFixed(1)}km, ${pacePerKm.toFixed(2)} min/km, ${activity.totalElevationGain}m elevation, ${activity.startDate.toDateString()}`;
      } else {
        const distanceInMiles = distanceInKm * 0.621371;
        const pacePerMile = pacePerKm / 0.621371;
        const elevationFt = activity.totalElevationGain * 3.28084;
        return `${activity.name}: ${distanceInMiles.toFixed(1)}mi, ${pacePerMile.toFixed(2)} min/mi, ${elevationFt.toFixed(0)}ft elevation, ${activity.startDate.toDateString()}`;
      }
    }).join('\n');

    // Assemble context
    let context = `You are an AI running coach helping ${user.firstName || "a runner"}.

Runner Profile:
- Name: ${user.firstName} ${user.lastName}
- Unit preference: ${isMetric ? 'kilometers' : 'miles'}
- Activities in last 30 days: ${activities.length}
- Total distance: ${totalDistanceConverted} ${unit}
- Average pace: ${avgPaceConverted} min/${unit}

Recent Activities (last 5):
${recentActivities}
`;

    if (vo2Data) {
      context += `\nPerformance Metrics:
- Race VO2 Max: ${vo2Data.raceVO2Max?.toFixed(1)} (${vo2Data.raceComparison})
- Training VO2 Max: ${vo2Data.trainingVO2Max?.toFixed(1)} (${vo2Data.trainingComparison})
- Fitness trend: ${vo2Data.trend}
`;
    }

    if (runnerScore) {
      context += `\nRunner Score: ${runnerScore.totalScore}/100 (Grade ${runnerScore.grade})
- Percentile: ${runnerScore.percentile}th among runners
- Volume score: ${runnerScore.components.volume}/25
- Performance score: ${runnerScore.components.performance}/25
- Consistency score: ${runnerScore.components.consistency}/25
- Improvement score: ${runnerScore.components.improvement}/25
`;
    }

    if (racePredictions.length > 0) {
      context += `\nRace Predictions (based on current fitness):
${racePredictions.map(p => `- ${p.distance}: ${p.predictedTime} (${p.confidence}% confidence)`).join('\n')}
`;
    }

    // Get active training plan context
    try {
      const plans = await storage.getTrainingPlansByUserId(userId);
      const activePlan = plans?.find((p: any) => p.status === 'active');
      
      if (activePlan) {
        const weeks = await storage.getPlanWeeks(activePlan.id);
        const currentWeekNumber = activePlan.currentWeek || 1;
        const currentWeekData = weeks?.find((w: any) => w.weekNumber === currentWeekNumber);
        
        // Get adherence stats with safe fallback
        let adherenceInfo = '';
        try {
          const adherenceStats = await planGeneratorService.getAdherenceStats(activePlan.id);
          if (adherenceStats && typeof adherenceStats.adherenceRate === 'number') {
            adherenceInfo = `- Adherence: ${(adherenceStats.adherenceRate * 100).toFixed(0)}% (${adherenceStats.completedWorkouts}/${adherenceStats.totalWorkouts} workouts)`;
          }
        } catch (e) {
          console.log('Could not fetch adherence stats:', e);
        }
        
        context += `\nActive Training Plan:
- Goal: ${activePlan.goalType.replace('_', ' ')}${activePlan.targetTime ? ` (target: ${activePlan.targetTime})` : ''}
${activePlan.raceDate ? `- Race date: ${new Date(activePlan.raceDate).toLocaleDateString()}` : ''}
- Progress: Week ${currentWeekNumber} of ${activePlan.totalWeeks}
${adherenceInfo}
`;
        
        if (currentWeekData) {
          const days = await storage.getPlanDays(currentWeekData.id);
          const upcomingWorkouts = days
            ?.filter((d: any) => d.workoutType !== 'rest' && d.status !== 'completed' && !d.linkedActivityId)
            .slice(0, 3) || [];
          
          if (upcomingWorkouts.length > 0) {
            context += `\nUpcoming Workouts This Week:
${upcomingWorkouts.map((d: any) => 
  `- ${d.dayOfWeek}: ${d.workoutType}${d.title ? ` - ${d.title}` : ''}${d.plannedDistanceKm ? ` (${d.plannedDistanceKm.toFixed(1)}km)` : ''}`
).join('\n')}
`;
          }
          
          context += `\nWhen discussing training, reference their current plan and adjust advice accordingly.`;
        }
      }
    } catch (error) {
      console.log('Could not fetch training plan context:', error);
    }

    return context;
  }

  async chat(
    userId: number,
    conversationId: number,
    userMessage: string,
    onStream: (chunk: string) => void,
    activityContext?: { activityId: number }
  ): Promise<string> {
    // Get conversation history
    const messages = await storage.getMessagesByConversationId(conversationId);
    
    // Assemble user context
    let userContext = await this.assembleUserContext(userId);
    
    // Add specific activity context if provided
    if (activityContext?.activityId) {
      const activity = await storage.getActivityById(activityContext.activityId);
      if (activity && activity.userId === userId) {
        const user = await storage.getUser(userId);
        const isMetric = user?.unitPreference !== "miles";
        const distanceInKm = activity.distance / 1000;
        const distanceDisplay = isMetric 
          ? `${distanceInKm.toFixed(2)} km`
          : `${(distanceInKm * 0.621371).toFixed(2)} mi`;
        const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
        const paceDisplay = isMetric
          ? `${pacePerKm.toFixed(2)} min/km`
          : `${(pacePerKm / 0.621371).toFixed(2)} min/mi`;
        const durationMinutes = Math.floor(activity.movingTime / 60);
        const durationSeconds = activity.movingTime % 60;
        const elevationDisplay = isMetric
          ? `${activity.totalElevationGain}m`
          : `${Math.round(activity.totalElevationGain * 3.28084)}ft`;
        
        userContext += `

**IMPORTANT: The user is currently viewing this specific activity. Any questions about "this run" or "this activity" refer to:**

Current Activity Being Viewed:
- Name: ${activity.name}
- Date: ${activity.startDate.toDateString()}
- Distance: ${distanceDisplay}
- Duration: ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}
- Average Pace: ${paceDisplay}
- Elevation Gain: ${elevationDisplay}
${activity.averageHeartrate ? `- Average Heart Rate: ${activity.averageHeartrate} bpm` : ''}
${activity.maxHeartrate ? `- Max Heart Rate: ${activity.maxHeartrate} bpm` : ''}
${activity.averageCadence ? `- Average Cadence: ${activity.averageCadence * 2} spm` : ''}
${activity.averageWatts ? `- Average Power: ${Math.round(activity.averageWatts)} W` : ''}
${activity.sufferScore ? `- Effort Score: ${activity.sufferScore}` : ''}

When the user asks about "this run", "this activity", "my run", or similar, answer specifically about the activity above.`;
      }
    }
    
    // Build conversation history for GPT
    const conversationHistory = messages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    // Add current user message
    conversationHistory.push({
      role: "user" as const,
      content: userMessage
    });

    try {
      // Use Responses API with streaming and low reasoning effort for chat
      const stream = await openai.responses.create({
        model: "gpt-5.1",
        input: [
          {
            role: "system",
            content: `You are an expert AI running coach. You provide personalized, data-driven insights and recommendations based on the runner's actual performance data. Be conversational, supportive, and focus on actionable advice.

${userContext}

Guidelines:
- Use the runner's preferred units (${conversationHistory.length > 0 ? 'mentioned above' : 'km or miles'})
- Reference specific activities and metrics when relevant
- Be encouraging but realistic
- Provide actionable recommendations
- Keep responses concise (under 200 words unless asked for detail)
- If asked about specific workouts or dates, use the activity data provided
- Always consider their current fitness level when making suggestions`
          },
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        text: {
          format: {
            type: "text" as const
          }
        },
        max_output_tokens: 800,
        reasoning: { effort: "low" },
        stream: true
      });

      // Collect streamed response
      let fullResponse = '';
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          fullResponse += event.delta;
          onStream(event.delta);
        }
      }

      console.log('[Chat Service] Successfully generated chat response from GPT-5.1');
      
      return fullResponse;
    } catch (error: any) {
      console.error('Chat error:', error);
      throw new Error(`Failed to generate chat response: ${error.message}`);
    }
  }
}
