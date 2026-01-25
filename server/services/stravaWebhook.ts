import { storage } from "../storage";
import { emailService } from "./email";
import { stravaService } from "./strava";
import OpenAI from "openai";

interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, any>;
}

const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || "runanalytics_webhook_verify_2024";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

class StravaWebhookService {
  async verifySubscription(hubMode: string, hubChallenge: string, hubVerifyToken: string): Promise<{ valid: boolean; challenge?: string }> {
    if (hubMode === "subscribe" && hubVerifyToken === VERIFY_TOKEN) {
      console.log("[Strava Webhook] Subscription verified");
      return { valid: true, challenge: hubChallenge };
    }
    console.log("[Strava Webhook] Verification failed - token mismatch");
    return { valid: false };
  }

  async handleEvent(event: StravaWebhookEvent): Promise<void> {
    console.log(`[Strava Webhook] Received event: ${event.aspect_type} ${event.object_type} ${event.object_id} for athlete ${event.owner_id}`);

    if (event.object_type === "activity" && event.aspect_type === "create") {
      await this.handleNewActivity(event);
    }
  }

  private async handleNewActivity(event: StravaWebhookEvent): Promise<void> {
    try {
      const stravaAthleteId = String(event.owner_id);
      const user = await storage.getUserByStravaId(stravaAthleteId);
      
      if (!user) {
        console.log(`[Strava Webhook] No user found for Strava athlete ${stravaAthleteId}`);
        return;
      }

      if (!user.stravaConnected) {
        console.log(`[Strava Webhook] User ${user.id} is not connected to Strava`);
        return;
      }

      if (!user.notifyPostRun) {
        console.log(`[Strava Webhook] User ${user.id} has post-run notifications disabled`);
        return;
      }

      if (!user.stravaAccessToken) {
        console.log(`[Strava Webhook] User ${user.id} missing Strava access token`);
        return;
      }

      const activity = await stravaService.getActivityById(user.stravaAccessToken, event.object_id);
      if (!activity) {
        console.log(`[Strava Webhook] Failed to fetch activity ${event.object_id}`);
        return;
      }

      if (activity.type !== "Run") {
        console.log(`[Strava Webhook] Activity ${event.object_id} is not a run (${activity.type})`);
        return;
      }

      console.log(`[Strava Webhook] Processing run activity ${event.object_id} for user ${user.id}`);
      await this.sendPostRunEmail(user, activity);
    } catch (error) {
      console.error("[Strava Webhook] Error processing new activity:", error);
    }
  }

  private async sendPostRunEmail(user: any, activity: any): Promise<void> {
    try {
      const distanceKm = activity.distance / 1000;
      const distanceMiles = distanceKm * 0.621371;
      const isKm = user.unitPreference === "km";
      const distanceDisplay = isKm ? `${distanceKm.toFixed(2)} km` : `${distanceMiles.toFixed(2)} mi`;
      
      const durationMin = Math.floor(activity.moving_time / 60);
      const durationSec = activity.moving_time % 60;
      const durationDisplay = `${durationMin}:${String(durationSec).padStart(2, "0")}`;
      
      const pacePerKm = activity.moving_time / 60 / distanceKm;
      const pacePerMile = pacePerKm / 0.621371;
      const pace = isKm ? pacePerKm : pacePerMile;
      const paceMin = Math.floor(pace);
      const paceSec = Math.round((pace - paceMin) * 60);
      const paceDisplay = `${paceMin}:${String(paceSec).padStart(2, "0")} /${isKm ? "km" : "mi"}`;

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "aitracker.run";
      const dashboardUrl = `https://${domain}/dashboard`;
      
      const firstName = user.firstName || user.email.split("@")[0];
      
      const effortScore = this.calculateEffortScore(activity);
      const runType = this.detectRunType(activity, distanceKm);
      const aiCoachInsight = await this.generateAICoachInsight(user, activity, distanceKm, runType, effortScore);
      const insights = this.generateQuickInsights(activity, distanceKm, runType);

      await emailService.sendPostRunAnalysis({
        to: user.email,
        firstName,
        activityName: activity.name,
        distance: distanceDisplay,
        duration: durationDisplay,
        pace: paceDisplay,
        heartRate: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : null,
        elevation: activity.total_elevation_gain ? `${Math.round(activity.total_elevation_gain)}m` : null,
        effortScore,
        runType,
        aiCoachInsight,
        insights,
        dashboardUrl
      });
      
      console.log(`[Strava Webhook] Sent post-run email to ${user.email}`);
    } catch (error) {
      console.error("[Strava Webhook] Error sending post-run email:", error);
    }
  }

  private calculateEffortScore(activity: any): number {
    let score = 50;
    
    if (activity.average_heartrate) {
      if (activity.average_heartrate > 170) score += 25;
      else if (activity.average_heartrate > 155) score += 15;
      else if (activity.average_heartrate > 140) score += 8;
      else score += 3;
    }
    
    const distanceKm = activity.distance / 1000;
    if (distanceKm >= 20) score += 20;
    else if (distanceKm >= 15) score += 15;
    else if (distanceKm >= 10) score += 10;
    else if (distanceKm >= 5) score += 5;
    
    if (activity.total_elevation_gain > 200) score += 10;
    else if (activity.total_elevation_gain > 100) score += 5;
    
    const pacePerKm = activity.moving_time / 60 / distanceKm;
    if (pacePerKm < 4.5) score += 15;
    else if (pacePerKm < 5) score += 10;
    else if (pacePerKm < 5.5) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private detectRunType(activity: any, distanceKm: number): string {
    const pacePerKm = activity.moving_time / 60 / distanceKm;
    
    if (distanceKm >= 30) return "Ultra Distance";
    if (distanceKm >= 20) return "Long Run";
    if (distanceKm >= 15) return "Progressive Long Run";
    
    if (activity.workout_type === 3) return "Workout";
    if (activity.workout_type === 1) return "Race";
    
    if (activity.average_heartrate) {
      if (activity.average_heartrate > 165) return "Tempo Run";
      if (activity.average_heartrate < 130) return "Recovery Run";
    }
    
    if (pacePerKm < 4.5) return "Speed Session";
    if (pacePerKm > 6.5) return "Easy Run";
    
    if (distanceKm >= 8) return "Steady Run";
    if (distanceKm < 5) return "Quick Run";
    
    return "Training Run";
  }

  private async generateAICoachInsight(user: any, activity: any, distanceKm: number, runType: string, effortScore: number): Promise<string> {
    try {
      const isKm = user.unitPreference === "km";
      const pacePerKm = activity.moving_time / 60 / distanceKm;
      const pacePerMile = pacePerKm / 0.621371;
      const pace = isKm ? pacePerKm : pacePerMile;
      const paceMin = Math.floor(pace);
      const paceSec = Math.round((pace - paceMin) * 60);
      const paceDisplay = `${paceMin}:${String(paceSec).padStart(2, "0")}/${isKm ? "km" : "mi"}`;

      const prompt = `You are an expert AI running coach. Generate a brief, personalized post-run insight (2-3 sentences max) for this run:

Run Type: ${runType}
Distance: ${isKm ? distanceKm.toFixed(2) + " km" : (distanceKm * 0.621371).toFixed(2) + " mi"}
Pace: ${paceDisplay}
Duration: ${Math.floor(activity.moving_time / 60)} minutes
Heart Rate: ${activity.average_heartrate ? Math.round(activity.average_heartrate) + " bpm" : "not recorded"}
Elevation Gain: ${activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + "m" : "minimal"}
Effort Score: ${effortScore}/100
PRs on this run: ${activity.pr_count || 0}

Provide an encouraging, coach-like insight that:
- Acknowledges what went well
- Gives one specific observation about their effort/performance
- Optionally suggests what this means for their training

Keep it warm, personal, and motivating. Don't use generic phrases. Be specific to THIS run's data.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert AI running coach providing brief post-run insights. Be encouraging, specific, and concise." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const insight = response.choices[0]?.message?.content?.trim();
      if (insight && insight.length > 20) {
        return insight;
      }
      
      return this.getFallbackCoachInsight(runType, effortScore, distanceKm, activity);
    } catch (error) {
      console.error("[Strava Webhook] AI insight generation failed:", error);
      return this.getFallbackCoachInsight(runType, effortScore, distanceKm, activity);
    }
  }

  private getFallbackCoachInsight(runType: string, effortScore: number, distanceKm: number, activity: any): string {
    if (runType === "Long Run" || runType === "Ultra Distance") {
      return `Excellent endurance work! Long runs like this build the aerobic foundation that makes all your other runs feel easier. Your body is adapting to go the distance.`;
    }
    if (runType === "Tempo Run" || effortScore > 75) {
      return `Great effort pushing into that tempo zone! This kind of work improves your lactate threshold, which means you'll be able to hold faster paces for longer.`;
    }
    if (runType === "Recovery Run" || runType === "Easy Run") {
      return `Smart easy effort today. Recovery runs are where the magic happens - your body is rebuilding stronger from your harder sessions. Keep stacking these consistent efforts!`;
    }
    if (activity.pr_count && activity.pr_count > 0) {
      return `You set ${activity.pr_count} PR${activity.pr_count > 1 ? "s" : ""} today - that's your hard work paying off! These benchmarks show real fitness gains happening.`;
    }
    if (distanceKm >= 10) {
      return `Solid double-digit effort! Runs like this are the backbone of distance running fitness. You're building the engine that powers faster race times.`;
    }
    return `Every run counts toward your goals. This one added to your fitness bank - keep building that momentum!`;
  }

  private generateQuickInsights(activity: any, distanceKm: number, runType: string): { title: string; message: string }[] {
    const insights: { title: string; message: string }[] = [];
    
    if (distanceKm >= 20) {
      insights.push({
        title: "Endurance Builder",
        message: "Long runs like this develop mitochondrial density and capillary networks in your muscles."
      });
    } else if (distanceKm >= 10) {
      insights.push({
        title: "Solid Volume",
        message: "Double-digit runs build the aerobic base that supports faster training."
      });
    }

    if (activity.average_heartrate) {
      if (activity.average_heartrate < 140) {
        insights.push({
          title: "Zone 2 Training",
          message: "Low heart rate running builds fat-burning efficiency and recovery capacity."
        });
      } else if (activity.average_heartrate > 160) {
        insights.push({
          title: "Threshold Work",
          message: "Higher intensity builds lactate clearance and race-day speed."
        });
      }
    }

    if (activity.total_elevation_gain > 100) {
      insights.push({
        title: "Strength Gains",
        message: `${Math.round(activity.total_elevation_gain)}m of climbing builds leg strength and mental toughness.`
      });
    }

    if (activity.pr_count && activity.pr_count > 0) {
      insights.push({
        title: "New PRs!",
        message: `${activity.pr_count} personal record${activity.pr_count > 1 ? "s" : ""} set - fitness is trending up!`
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: "Consistency Counts",
        message: "Regular running builds cumulative fitness gains over time."
      });
    }

    return insights.slice(0, 3);
  }
}

export const stravaWebhookService = new StravaWebhookService();
