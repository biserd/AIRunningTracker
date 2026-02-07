import { storage } from "../storage";
import { emailService } from "./email";
import { stravaService } from "./strava";
import OpenAI from "openai";
import crypto from "crypto";

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
const UNSUBSCRIBE_SECRET = process.env.JWT_SECRET || "runanalytics_unsub_secret_2024";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

class StravaWebhookService {
  generateUnsubscribeToken(userId: number): string {
    const payload = `unsub:${userId}`;
    const signature = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET).update(payload).digest("hex").slice(0, 16);
    return Buffer.from(`${userId}:${signature}`).toString("base64url");
  }

  verifyUnsubscribeToken(token: string): number | null {
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      const [userIdStr, signature] = decoded.split(":");
      const userId = parseInt(userIdStr);
      if (isNaN(userId)) return null;
      const expected = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET).update(`unsub:${userId}`).digest("hex").slice(0, 16);
      if (signature !== expected) return null;
      return userId;
    } catch {
      return null;
    }
  }

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

      const domain = "aitracker.run";
      const firstName = user.firstName || user.email.split("@")[0];
      const runType = this.detectRunType(activity, distanceKm);
      const distanceLabel = this.getDistanceLabel(distanceKm);
      const effortScore = this.calculateEffortScore(activity);
      const efficiencyRating = this.getEfficiencyRating(activity, pacePerKm);
      const greyZoneAnalysis = this.analyzeGreyZone(activity, pacePerKm);

      const unsubscribeToken = this.generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `https://${domain}/api/notifications/unsubscribe?token=${unsubscribeToken}`;
      const dashboardUrl = `https://${domain}/dashboard`;
      const activityUrl = `https://${domain}/activities/${activity.id}`;

      const aiResult = await this.generatePersonalizedEmail(
        user, activity, distanceKm, distanceLabel, runType, effortScore,
        efficiencyRating, greyZoneAnalysis, paceDisplay, distanceDisplay
      );

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
        aiCoachInsight: aiResult.coachVerdictBody,
        insights: [],
        dashboardUrl,
        subject: aiResult.subject,
        efficiencyRating,
        greyZoneAnalysis,
        unsubscribeUrl,
        activityUrl,
      });
      
      console.log(`[Strava Webhook] Sent post-run email to ${user.email}`);
    } catch (error) {
      console.error("[Strava Webhook] Error sending post-run email:", error);
    }
  }

  private getDistanceLabel(distanceKm: number): string {
    if (distanceKm >= 40 && distanceKm <= 44) return "Marathon";
    if (distanceKm >= 20 && distanceKm <= 22) return "Half Marathon";
    if (distanceKm >= 14 && distanceKm <= 16) return "15k";
    if (distanceKm >= 9.5 && distanceKm <= 10.5) return "10k";
    if (distanceKm >= 4.8 && distanceKm <= 5.2) return "5k";
    if (distanceKm >= 2.8 && distanceKm <= 3.2) return "3k";
    if (distanceKm >= 1.5 && distanceKm <= 1.7) return "Mile";
    return `${distanceKm.toFixed(1)}k`;
  }

  private getEfficiencyRating(activity: any, pacePerKm: number): { label: string; icon: string } {
    if (!activity.average_heartrate) return { label: "Unknown", icon: "?" };
    const hrPerPace = activity.average_heartrate / pacePerKm;
    if (hrPerPace < 24) return { label: "High", icon: "checkmark" };
    if (hrPerPace < 28) return { label: "Moderate", icon: "warning" };
    return { label: "Low", icon: "warning" };
  }

  private analyzeGreyZone(activity: any, pacePerKm: number): { inGreyZone: boolean; minutes: number; message: string } | null {
    if (!activity.average_heartrate) return null;
    const avgHr = activity.average_heartrate;
    const maxHr = activity.max_heartrate || (220 - 30);
    const easyThreshold = maxHr * 0.70;
    const tempoThreshold = maxHr * 0.85;

    if (avgHr > easyThreshold && avgHr < tempoThreshold) {
      const greyZoneMinutes = Math.round(activity.moving_time / 60 * 0.6);
      let message = "";
      if (pacePerKm > 5.5) {
        message = `You likely felt good at the start, but your heart rate drifted too high in the second half. This "Grey Zone" effort is too hard for recovery but too easy for real speed gains.`;
      } else {
        message = `Your average heart rate sat between easy and tempo zones for most of this run. That means your body was working hard but not targeting a specific adaptation.`;
      }
      return { inGreyZone: true, minutes: greyZoneMinutes, message };
    }

    return { inGreyZone: false, minutes: 0, message: "" };
  }

  private async generatePersonalizedEmail(
    user: any, activity: any, distanceKm: number, distanceLabel: string,
    runType: string, effortScore: number, efficiencyRating: { label: string; icon: string },
    greyZoneAnalysis: { inGreyZone: boolean; minutes: number; message: string } | null,
    paceDisplay: string, distanceDisplay: string
  ): Promise<{ subject: string; coachVerdictBody: string }> {
    try {
      const isKm = user.unitPreference === "km";
      const firstName = user.firstName || user.email.split("@")[0];

      const prompt = `You are the AI Running Coach for AITracker.run. Generate a highly personalized post-run email for this runner.

Runner: ${firstName}
Run Type: ${runType}
Distance: ${distanceDisplay} (${distanceLabel})
Pace: ${paceDisplay}
Duration: ${Math.floor(activity.moving_time / 60)} minutes
Heart Rate: ${activity.average_heartrate ? Math.round(activity.average_heartrate) + " bpm (avg), " + (activity.max_heartrate ? activity.max_heartrate + " bpm (max)" : "no max") : "not recorded"}
Elevation: ${activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + "m" : "flat"}
Effort Score: ${effortScore}/100
Efficiency: ${efficiencyRating.label}
Grey Zone: ${greyZoneAnalysis ? (greyZoneAnalysis.inGreyZone ? `Yes, ~${greyZoneAnalysis.minutes} min in grey zone` : "No, good intensity distribution") : "Unknown (no HR data)"}
PRs: ${activity.pr_count || 0}

Generate a JSON response with exactly these fields:
1. "subject": An email subject line (under 60 chars). Reference the distance (e.g. "5k", "10k", "Half Marathon"). Include a hook that references something specific about THIS run. End with a teaser to create curiosity. Examples:
   - "Your 5k Analysis: You crushed the first mile, but..."
   - "Your 10k Breakdown: Strong pace, questionable efficiency"
   - "Half Marathon Report: Your HR tells a different story"
   - "Your 8k Audit: Solid effort, but you left speed on the table"

2. "coachVerdictBody": A 2-3 sentence personalized coach verdict. Be specific to this run's data. Mention one thing they did well, and one thing to watch. If they were in the grey zone, mention it directly. If efficiency is low, call it out. Be warm but honest. Do NOT use generic encouragement. Do NOT use em dashes (never use the character: --). Use short, punchy sentences.

Respond with ONLY valid JSON, no markdown.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert running coach. Respond with valid JSON only. Never use em dashes in your writing." },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.subject && parsed.coachVerdictBody) {
          return {
            subject: parsed.subject.slice(0, 80),
            coachVerdictBody: parsed.coachVerdictBody,
          };
        }
      }
    } catch (error) {
      console.error("[Strava Webhook] AI email generation failed:", error);
    }

    return this.getFallbackEmail(user, activity, distanceKm, distanceLabel, effortScore, efficiencyRating, greyZoneAnalysis);
  }

  private getFallbackEmail(
    user: any, activity: any, distanceKm: number, distanceLabel: string,
    effortScore: number, efficiencyRating: { label: string; icon: string },
    greyZoneAnalysis: { inGreyZone: boolean; minutes: number; message: string } | null,
  ): { subject: string; coachVerdictBody: string } {
    let hook = "here's what we found";
    let verdict = "Every run is a data point. Let's make the next one count.";

    if (greyZoneAnalysis?.inGreyZone) {
      hook = "your heart rate tells a story";
      verdict = `You spent about ${greyZoneAnalysis.minutes} minutes in the Grey Zone. That means your body was working hard, but not targeting a specific training adaptation. Try slowing your easy runs down or pushing your hard runs harder.`;
    } else if (efficiencyRating.label === "Low") {
      hook = "strong effort, but your efficiency needs work";
      verdict = `Your effort was there, but your running efficiency came in low. This often means your pace and heart rate are mismatched. Focus on keeping your easy runs truly easy.`;
    } else if (effortScore >= 80) {
      hook = "you went all out on this one";
      verdict = `Big effort today. Your body is going to need proper recovery to absorb this session. Make sure your next run is an easy one.`;
    } else if (activity.pr_count && activity.pr_count > 0) {
      hook = "new PR, nice work";
      verdict = `You set ${activity.pr_count} PR${activity.pr_count > 1 ? "s" : ""} today. That is your hard work paying off. The question is: are you recovering enough to keep progressing?`;
    }

    return {
      subject: `Your ${distanceLabel} Analysis: ${hook.charAt(0).toUpperCase() + hook.slice(1)}`,
      coachVerdictBody: verdict,
    };
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
}

export const stravaWebhookService = new StravaWebhookService();
