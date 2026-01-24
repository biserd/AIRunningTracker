import { storage } from "../storage";
import { emailService } from "./email";
import { stravaService } from "./strava";

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

      await storage.saveStravaActivity(user.id, activity);
      console.log(`[Strava Webhook] Saved activity ${event.object_id} for user ${user.id}`);

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
      
      const insights = await this.generateQuickInsights(user, activity);

      await emailService.sendPostRunAnalysis({
        to: user.email,
        firstName,
        activityName: activity.name,
        distance: distanceDisplay,
        duration: durationDisplay,
        pace: paceDisplay,
        heartRate: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : null,
        elevation: activity.total_elevation_gain ? `${Math.round(activity.total_elevation_gain)}m` : null,
        insights,
        dashboardUrl
      });
      
      console.log(`[Strava Webhook] Sent post-run email to ${user.email}`);
    } catch (error) {
      console.error("[Strava Webhook] Error sending post-run email:", error);
    }
  }

  private async generateQuickInsights(user: any, activity: any): Promise<{ title: string; message: string }[]> {
    const insights: { title: string; message: string }[] = [];
    
    const distanceKm = activity.distance / 1000;
    if (distanceKm >= 20) {
      insights.push({
        title: "Long Run Completed",
        message: "Great endurance work! Long runs build aerobic base and mental toughness."
      });
    } else if (distanceKm >= 10) {
      insights.push({
        title: "Solid Distance",
        message: "Nice steady effort. This distance is perfect for building fitness."
      });
    }

    if (activity.average_heartrate) {
      if (activity.average_heartrate < 140) {
        insights.push({
          title: "Easy Effort",
          message: "Perfect zone for recovery and building aerobic base without fatigue."
        });
      } else if (activity.average_heartrate > 160) {
        insights.push({
          title: "High Intensity",
          message: "Great tempo work! Make sure to recover well after this effort."
        });
      }
    }

    if (activity.total_elevation_gain > 100) {
      insights.push({
        title: "Hill Training",
        message: `You climbed ${Math.round(activity.total_elevation_gain)}m - excellent strength work!`
      });
    }

    if (activity.pr_count && activity.pr_count > 0) {
      insights.push({
        title: "Personal Records",
        message: `You set ${activity.pr_count} new PR${activity.pr_count > 1 ? "s" : ""} on this run!`
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: "Keep It Going",
        message: "Every run counts toward your goals. Check your dashboard for full analysis!"
      });
    }

    return insights.slice(0, 3);
  }
}

export const stravaWebhookService = new StravaWebhookService();
