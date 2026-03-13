import { storage, RUNNING_ACTIVITY_TYPES } from "../storage";
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

interface TrainingContext {
  runsThisWeek: number;
  kmThisWeek: number;
  recentAvgPaceSecPerKm: number | null; // avg pace for similar-distance runs, last 30 days
  paceVsRecentSec: number | null;       // negative = faster than usual, positive = slower
  runStreak: number;
  totalRunsLast30Days: number;
  weeklyContextLine: string;            // e.g. "3 runs · 28.4 km this week"
}

const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || "runanalytics_webhook_verify_2024";
const UNSUBSCRIBE_SECRET = process.env.JWT_SECRET || "runanalytics_unsub_secret_2024";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key" 
});

const GOAL_LABELS: Record<string, string> = {
  race: "training for a race",
  faster: "getting faster / beating PRs",
  endurance: "building endurance",
  injury_free: "staying injury-free",
};

const STRUGGLE_LABELS: Record<string, string> = {
  plateau: "hitting a performance plateau",
  burnout: "fatigue and feeling burnt out",
  inconsistency: "sticking to a consistent schedule",
  guesswork: "not knowing if training is on track",
};

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

  async handleEvent(event: StravaWebhookEvent): Promise<string> {
    console.log(`[Strava Webhook] Received event: ${event.aspect_type} ${event.object_type} ${event.object_id} for athlete ${event.owner_id}`);

    if (event.object_type === "activity" && event.aspect_type === "create") {
      return await this.handleNewActivity(event);
    }

    return `skipped:${event.aspect_type}_${event.object_type}`;
  }

  private async handleNewActivity(event: StravaWebhookEvent): Promise<string> {
    try {
      const stravaAthleteId = String(event.owner_id);
      const user = await storage.getUserByStravaId(stravaAthleteId);
      
      if (!user) {
        console.log(`[Strava Webhook] No user found for Strava athlete ${stravaAthleteId}`);
        return "skipped:no_user_found";
      }

      if (!user.stravaConnected) {
        console.log(`[Strava Webhook] User ${user.id} is not connected to Strava`);
        return "skipped:strava_not_connected";
      }

      if (!user.notifyPostRun) {
        console.log(`[Strava Webhook] User ${user.id} has post-run notifications disabled`);
        return "skipped:notifications_disabled";
      }

      const frequency = user.postRunEmailFrequency ?? "every_run";

      // Hard minimum gap between any two post-run emails (prevents bulk-import floods)
      const MIN_GAP_HOURS = frequency === "weekly" ? 168 : 4;
      if (user.lastPostRunEmailAt) {
        const hoursSinceLastEmail = (Date.now() - new Date(user.lastPostRunEmailAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastEmail < MIN_GAP_HOURS) {
          console.log(`[Strava Webhook] User ${user.id} throttled — last email sent ${hoursSinceLastEmail.toFixed(1)}h ago (min gap: ${MIN_GAP_HOURS}h)`);
          return "skipped:throttle";
        }
      }

      if (!user.stravaAccessToken) {
        console.log(`[Strava Webhook] User ${user.id} missing Strava access token`);
        return "skipped:no_access_token";
      }

      let accessToken = user.stravaAccessToken;

      let activity = null;
      try {
        activity = await stravaService.getActivityById(accessToken, event.object_id);
      } catch (fetchError: any) {
        if (fetchError.message?.includes('Unauthorized') && user.stravaRefreshToken) {
          console.log(`[Strava Webhook] Token expired for user ${user.id}, refreshing...`);
          try {
            const tokenData = await stravaService.refreshAccessToken(user.stravaRefreshToken);
            accessToken = tokenData.access_token;
            await storage.updateUser(user.id, {
              stravaAccessToken: tokenData.access_token,
              stravaRefreshToken: tokenData.refresh_token,
            });
            console.log(`[Strava Webhook] Token refreshed for user ${user.id}`);
            activity = await stravaService.getActivityById(accessToken, event.object_id);
          } catch (refreshError) {
            console.error(`[Strava Webhook] Token refresh failed for user ${user.id}:`, refreshError);
            return `error:token_refresh_failed:${String(refreshError)}`;
          }
        } else {
          return `error:activity_fetch:${String(fetchError)}`;
        }
      }

      if (!activity) {
        console.log(`[Strava Webhook] Failed to fetch activity ${event.object_id}`);
        return "skipped:activity_fetch_failed";
      }

      if (!RUNNING_ACTIVITY_TYPES.includes(activity.type)) {
        console.log(`[Strava Webhook] Activity ${event.object_id} is not a run (${activity.type})`);
        return `skipped:not_a_run(${activity.type})`;
      }

      console.log(`[Strava Webhook] Processing run activity ${event.object_id} for user ${user.id}`);
      await this.sendPostRunEmail(user, activity);
      await storage.updateUser(user.id, { lastPostRunEmailAt: new Date() });
      return "email_sent";
    } catch (error) {
      console.error("[Strava Webhook] Error processing new activity:", error);
      return `error:${String(error)}`;
    }
  }

  private async buildTrainingContext(userId: number, currentActivityDistanceKm: number, currentActivityDate: Date): Promise<TrainingContext> {
    try {
      const thirtyDaysAgo = new Date(currentActivityDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentActivities = await storage.getActivitiesByUserId(userId, 60, thirtyDaysAgo);
      const runs = recentActivities.filter(a => RUNNING_ACTIVITY_TYPES.includes(a.type || "Run"));

      const sevenDaysAgo = new Date(currentActivityDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const runsThisWeek = runs.filter(r => new Date(r.startDate) >= sevenDaysAgo && r.stravaId !== String(currentActivityDate.getTime()));
      const runsThisWeekCount = runsThisWeek.length;
      const kmThisWeek = runsThisWeek.reduce((sum, r) => sum + (r.distance || 0) / 1000, 0);

      // Pace trend: compare today's pace to average for similar-distance runs (±40% of today's distance)
      const distanceLow = currentActivityDistanceKm * 0.6;
      const distanceHigh = currentActivityDistanceKm * 1.4;
      const similarRuns = runs.filter(r => {
        const km = (r.distance || 0) / 1000;
        return km >= distanceLow && km <= distanceHigh && r.movingTime && r.distance;
      });

      let recentAvgPaceSecPerKm: number | null = null;
      if (similarRuns.length >= 2) {
        const totalPace = similarRuns.reduce((sum, r) => {
          const km = (r.distance || 0) / 1000;
          const paceSecPerKm = (r.movingTime || 0) / km;
          return sum + paceSecPerKm;
        }, 0);
        recentAvgPaceSecPerKm = totalPace / similarRuns.length;
      }

      // Run streak: count consecutive days with at least one run ending today
      let runStreak = 1;
      const runDates = new Set(runs.map(r => new Date(r.startDate).toDateString()));
      for (let i = 1; i <= 30; i++) {
        const d = new Date(currentActivityDate.getTime() - i * 24 * 60 * 60 * 1000);
        if (runDates.has(d.toDateString())) {
          runStreak++;
        } else {
          break;
        }
      }

      const weeklyContextLine = `${runsThisWeekCount + 1} run${runsThisWeekCount + 1 !== 1 ? "s" : ""} · ${(kmThisWeek + currentActivityDistanceKm).toFixed(1)} km this week`;

      return {
        runsThisWeek: runsThisWeekCount + 1,
        kmThisWeek: kmThisWeek + currentActivityDistanceKm,
        recentAvgPaceSecPerKm,
        paceVsRecentSec: null, // filled in sendPostRunEmail after pace is computed
        runStreak,
        totalRunsLast30Days: runs.length + 1,
        weeklyContextLine,
      };
    } catch (err) {
      console.error("[Strava Webhook] Failed to build training context:", err);
      return {
        runsThisWeek: 1,
        kmThisWeek: currentActivityDistanceKm,
        recentAvgPaceSecPerKm: null,
        paceVsRecentSec: null,
        runStreak: 1,
        totalRunsLast30Days: 1,
        weeklyContextLine: "",
      };
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
      const paceSecPerKm = pacePerKm * 60;

      const domain = "aitracker.run";
      const firstName = user.firstName || user.email.split("@")[0];
      const runType = this.detectRunType(activity, distanceKm);
      const distanceLabel = this.getDistanceLabel(distanceKm, distanceMiles, isKm);
      const effortScore = this.calculateEffortScore(activity);
      const efficiencyRating = this.getEfficiencyRating(activity, pacePerKm);

      const unsubscribeToken = this.generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `https://${domain}/api/notifications/unsubscribe?token=${unsubscribeToken}`;
      const dashboardUrl = `https://${domain}/dashboard`;
      const activityUrl = `https://${domain}`;

      // Build training context from the last 30 days of activities
      const activityDate = new Date(activity.start_date || Date.now());
      const trainingContext = await this.buildTrainingContext(user.id, distanceKm, activityDate);

      // Compute pace vs recent average (now that we have today's pace)
      if (trainingContext.recentAvgPaceSecPerKm !== null) {
        trainingContext.paceVsRecentSec = paceSecPerKm - trainingContext.recentAvgPaceSecPerKm;
      }

      const aiResult = await this.generatePersonalizedEmail(
        user, activity, distanceKm, distanceLabel, runType, effortScore,
        efficiencyRating, paceDisplay, distanceDisplay, trainingContext
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
        nextRunTip: aiResult.nextRunTip,
        weeklyContext: trainingContext.weeklyContextLine || undefined,
        insights: [],
        dashboardUrl,
        subject: aiResult.subject,
        efficiencyRating,
        unsubscribeUrl,
        activityUrl,
      });
      
      console.log(`[Strava Webhook] Sent post-run email to ${user.email}`);
    } catch (error) {
      console.error("[Strava Webhook] Error sending post-run email:", error);
    }
  }

  private getDistanceLabel(distanceKm: number, distanceMiles: number, isKm: boolean): string {
    if (distanceKm >= 40 && distanceKm <= 44) return "Marathon";
    if (distanceKm >= 20 && distanceKm <= 22) return "Half Marathon";
    if (distanceKm >= 14 && distanceKm <= 16) return "15k";
    if (distanceKm >= 9.5 && distanceKm <= 10.5) return "10k";
    if (distanceKm >= 4.8 && distanceKm <= 5.2) return "5k";
    if (distanceKm >= 2.8 && distanceKm <= 3.2) return "3k";
    if (distanceKm >= 1.5 && distanceKm <= 1.7) return "Mile";
    if (isKm) return `${distanceKm.toFixed(1)}k`;
    return `${distanceMiles.toFixed(1)} mi`;
  }

  private getEfficiencyRating(activity: any, pacePerKm: number): { label: string; icon: string } {
    if (!activity.average_heartrate) return { label: "Unknown", icon: "?" };
    const hrPerPace = activity.average_heartrate / pacePerKm;
    if (hrPerPace < 24) return { label: "High", icon: "checkmark" };
    if (hrPerPace < 28) return { label: "Moderate", icon: "warning" };
    return { label: "Low", icon: "warning" };
  }

  private async generatePersonalizedEmail(
    user: any, activity: any, distanceKm: number, distanceLabel: string,
    runType: string, effortScore: number, efficiencyRating: { label: string; icon: string },
    paceDisplay: string, distanceDisplay: string,
    ctx: TrainingContext
  ): Promise<{ subject: string; coachVerdictBody: string; nextRunTip: string }> {
    try {
      const isKm = user.unitPreference === "km";
      const firstName = user.firstName || user.email.split("@")[0];
      const goalLabel = GOAL_LABELS[user.onboardingGoal || ""] || null;
      const struggleLabel = STRUGGLE_LABELS[user.onboardingStruggle || ""] || null;

      // Format pace trend
      let paceTrend = "No recent data for comparison";
      if (ctx.paceVsRecentSec !== null) {
        const absSec = Math.abs(Math.round(ctx.paceVsRecentSec));
        if (absSec < 5) {
          paceTrend = "Right on their recent average pace for this distance";
        } else if (ctx.paceVsRecentSec < 0) {
          paceTrend = `${absSec} sec/km faster than their recent average for this distance`;
        } else {
          paceTrend = `${absSec} sec/km slower than their recent average for this distance`;
        }
      }

      // Format streak
      const streakNote = ctx.runStreak >= 3 ? `${ctx.runStreak}-day running streak` : null;

      const prompt = `You are the Running Coach for AITracker.run. Generate a highly personalized post-run email for this runner based on ALL the data below — not just today's run.

Runner: ${firstName}
Today's run type: ${runType}
Distance: ${distanceDisplay} (${distanceLabel})
Pace: ${paceDisplay}
Duration: ${Math.floor(activity.moving_time / 60)} minutes
Heart Rate: ${activity.average_heartrate ? Math.round(activity.average_heartrate) + " bpm avg, " + (activity.max_heartrate ? activity.max_heartrate + " bpm max" : "no max recorded") : "not recorded"}
Elevation: ${activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + "m gain" : "flat"}
Effort Score: ${effortScore}/100
Running Efficiency: ${efficiencyRating.label}
PRs set: ${activity.pr_count || 0}

Training context (last 30 days):
- Pace vs recent: ${paceTrend}
- This week: ${ctx.runsThisWeek} run${ctx.runsThisWeek !== 1 ? "s" : ""}, ${ctx.kmThisWeek.toFixed(1)} km total
- Runs in last 30 days: ${ctx.totalRunsLast30Days}
${streakNote ? `- Current streak: ${streakNote}` : ""}

Runner profile:
${goalLabel ? `- Primary goal: ${goalLabel}` : ""}
${struggleLabel ? `- Main struggle: ${struggleLabel}` : ""}

Generate a JSON response with exactly these 3 fields:

1. "subject": Email subject line under 65 chars. Reference something specific from today's run. Use distance label "${distanceLabel}". Create curiosity. Example formats:
   - "Your ${distanceLabel} today: pace trend is moving in the right direction"
   - "${distanceLabel} done — your HR tells a different story"
   - "Strong ${distanceLabel}, but your effort score says recovery time"

2. "coachVerdictBody": 2-3 sentences. Be specific to this runner's data. Mention at least one thing from their training context (pace trend, weekly load, streak, or goal alignment) — not just today's run in isolation. One observation about today. One about the bigger picture. Be warm but direct. No generic praise. No em dashes. No "Grey Zone" or "Junk Mileage" terminology.

3. "nextRunTip": One short, concrete sentence telling them what to do on their next run. Base it on today's effort score, their goal, and their weekly load. Examples:
   - "Keep your next run easy — 3 days in a row at this effort needs a recovery day."
   - "You have room for a quality session tomorrow — your effort today was controlled."
   - "Aim for a longer easy run this weekend to build on your weekly mileage."

Respond with ONLY valid JSON, no markdown, no commentary.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert running coach. Respond with valid JSON only. Never use em dashes, 'Grey Zone', or 'Junk Mileage' in your writing." },
          { role: "user", content: prompt }
        ],
        max_tokens: 450,
        temperature: 0.75
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.subject && parsed.coachVerdictBody) {
          return {
            subject: parsed.subject.slice(0, 80),
            coachVerdictBody: parsed.coachVerdictBody,
            nextRunTip: parsed.nextRunTip || "",
          };
        }
      }
    } catch (error) {
      console.error("[Strava Webhook] AI email generation failed:", error);
    }

    return this.getFallbackEmail(user, activity, distanceKm, distanceLabel, effortScore, efficiencyRating, ctx);
  }

  private getFallbackEmail(
    user: any, activity: any, distanceKm: number, distanceLabel: string,
    effortScore: number, efficiencyRating: { label: string; icon: string },
    ctx: TrainingContext
  ): { subject: string; coachVerdictBody: string; nextRunTip: string } {
    let hook = "here is what the data shows";
    let verdict = "Every run is a data point. Let's make the next one count.";
    let nextRunTip = "Keep your next run easy to let today's effort absorb.";

    // Pace-based hook
    if (ctx.paceVsRecentSec !== null && ctx.paceVsRecentSec < -10) {
      const absSec = Math.abs(Math.round(ctx.paceVsRecentSec));
      hook = `${absSec} seconds faster than your recent average`;
      verdict = `You ran ${absSec} sec/km faster than your recent average for this distance. Your fitness is building. Make sure your next run is easy enough to absorb this effort.`;
      nextRunTip = "Follow this up with an easy run — your body needs the recovery to lock in these gains.";
    } else if (ctx.paceVsRecentSec !== null && ctx.paceVsRecentSec > 15) {
      hook = "slower than usual, which is not always a bad thing";
      verdict = `Your pace was a bit slower than your recent average today. That can be deliberate recovery, or a signal to check your sleep and nutrition. Either way, consistency is what builds fitness.`;
      nextRunTip = "Focus on consistency over the next few days rather than pushing pace.";
    } else if (efficiencyRating.label === "Low") {
      hook = "solid effort, but efficiency has room to grow";
      verdict = `Your effort was high today, but your running efficiency came in low. That often means your heart rate is working harder than your pace warrants. A few easy aerobic runs this week will help reset that.`;
      nextRunTip = "Prioritize keeping your next 1-2 runs at a conversational pace.";
    } else if (effortScore >= 80) {
      hook = "big effort today";
      verdict = `You put out a high-effort session. Your body is going to need proper recovery to absorb this one. Easy running for the next day or two is not optional — it is part of the training.`;
      nextRunTip = "Make your next run genuinely easy — effort score like today needs 24-48 hours of recovery.";
    } else if (activity.pr_count && activity.pr_count > 0) {
      hook = `${activity.pr_count} new PR${activity.pr_count > 1 ? "s" : ""}`;
      verdict = `You set ${activity.pr_count} PR${activity.pr_count > 1 ? "s" : ""} today. That is real progress showing up in the data. The question now is whether you recover well enough to keep that trajectory going.`;
      nextRunTip = "Give yourself a proper easy day before your next hard session.";
    } else if (ctx.runsThisWeek >= 3) {
      hook = `run ${ctx.runsThisWeek} of the week is in the books`;
      verdict = `You have been consistent this week — ${ctx.runsThisWeek} runs and ${ctx.kmThisWeek.toFixed(1)} km logged. Consistency is the most underrated part of training. Keep it up.`;
      nextRunTip = "You are building a solid week. Make sure at least one more run this week is fully easy.";
    }

    // Goal-aware closing nudge
    const goalLabel = GOAL_LABELS[user.onboardingGoal || ""] || null;
    if (goalLabel && verdict === "Every run is a data point. Let's make the next one count.") {
      verdict = `You are ${goalLabel} and today is another step in that direction. Consistency over perfection — keep showing up.`;
    }

    return {
      subject: `Your ${distanceLabel} Analysis: ${hook.charAt(0).toUpperCase() + hook.slice(1)}`,
      coachVerdictBody: verdict,
      nextRunTip,
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
