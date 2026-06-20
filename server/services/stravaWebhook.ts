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
  loadComparison: string | null;        // this week's volume vs the prior 3-week average
}

// Derived analysis from the detailed Strava streams (GPS/HR/cadence). These are
// things the runner CANNOT see in the summary stats table, so they give the AI
// something substantive to say instead of restating pace/distance/HR.
interface StreamAnalysis {
  splitLabel: string;            // "Negative split", "Positive split (faded)", "Even pacing"
  splitDeltaSec: number;         // sec/unit, second half minus first half (positive = slower late)
  decouplingPct: number | null;  // aerobic decoupling (Pa:HR drift) %, null if no HR
  fastestSplitPace: string | null;
  avgCadence: number | null;     // steps per minute
  summaryLines: string[];        // pre-formatted, human-readable lines for the prompt
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

      // Free users still get the AI coach email — it's a retention magnet to
      // pull them back into the funnel. We just mark the activity as
      // `lockedForFree=true` so it doesn't appear in their visible 10-run
      // list; the email link routes to the activity page where the data is
      // rendered behind a blur + upgrade CTA.
      const { isPaidPlan } = await import("../rateLimits");
      const userIsPaid = isPaidPlan(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null);

      if (!user.notifyPostRun) {
        console.log(`[Strava Webhook] User ${user.id} has post-run notifications disabled`);
        return "skipped:notifications_disabled";
      }

      const frequency = user.postRunEmailFrequency ?? "every_run";
      if (frequency === "weekly" && user.lastPostRunEmailAt) {
        const daysSinceLastEmail = (Date.now() - new Date(user.lastPostRunEmailAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastEmail < 7) {
          console.log(`[Strava Webhook] User ${user.id} set to weekly emails, last sent ${daysSinceLastEmail.toFixed(1)} days ago — skipping`);
          return "skipped:weekly_throttle";
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

      // Tiny activities (warmups, accidental starts, treadmill blips) get stored
      // for history but never trigger an email — so there's no point spending a
      // Strava streams call or AI analysis on a run that won't be emailed.
      const minDistanceMeters = (user.unitPreference ?? "miles") === "km" ? 1000 : 1609.34;
      const willEmail = (activity.distance ?? 0) >= minDistanceMeters;

      // Best-effort: pull the detailed streams (GPS/HR/cadence) so the AI email
      // can talk about pacing, fade, and aerobic decoupling instead of just
      // restating the summary stats. A streams failure must never block the email.
      let streams: any = null;
      if (willEmail) {
        try {
          streams = await stravaService.getActivityStreams(accessToken, event.object_id);
        } catch (streamErr) {
          console.warn(`[Strava Webhook] Could not fetch streams for ${event.object_id}:`, streamErr);
        }
      }

      // Store the activity in the DB so training context queries have accurate history.
      // Duplicate-safe: the regular sync job may also store this later; we skip if it exists.
      const stravaId = String(event.object_id);
      const existing = await storage.getActivityByStravaIdAndUser(stravaId, user.id);
      let activityDbId: number | null = existing?.id ?? null;
      if (!existing) {
        try {
          const created = await storage.createActivity({
            userId: user.id,
            stravaId,
            name: activity.name,
            distance: activity.distance,
            movingTime: activity.moving_time,
            totalElevationGain: activity.total_elevation_gain || 0,
            averageSpeed: activity.average_speed,
            maxSpeed: activity.max_speed,
            averageHeartrate: activity.average_heartrate || null,
            maxHeartrate: activity.max_heartrate || null,
            startDate: new Date(activity.start_date),
            type: activity.sport_type || activity.type,
            calories: activity.calories || null,
            averageCadence: activity.average_cadence ? activity.average_cadence * 2 : null,
            maxCadence: activity.max_cadence ? activity.max_cadence * 2 : null,
            averageWatts: activity.average_watts || null,
            maxWatts: activity.max_watts || null,
            sufferScore: activity.suffer_score || null,
            commentsCount: activity.comment_count || 0,
            kudosCount: activity.kudos_count || 0,
            achievementCount: activity.achievement_count || 0,
            startLatitude: activity.start_latlng?.[0] || null,
            startLongitude: activity.start_latlng?.[1] || null,
            endLatitude: activity.end_latlng?.[0] || null,
            endLongitude: activity.end_latlng?.[1] || null,
            polyline: activity.map?.summary_polyline || null,
            detailedPolyline: null,
            streamsData: streams ? JSON.stringify(streams) : null,
            lapsData: null,
            averageTemp: activity.average_temp || null,
            hasHeartrate: activity.has_heartrate || false,
            deviceWatts: activity.device_watts || false,
            elapsedTime: activity.elapsed_time || null,
            workoutType: activity.workout_type ?? null,
            prCount: activity.pr_count || 0,
            hydrationStatus: "pending",
            lockedForFree: !userIsPaid,
          });
          activityDbId = created?.id ?? null;
          console.log(`[Strava Webhook] Stored activity ${stravaId} for user ${user.id}`);
        } catch (storeErr) {
          console.error(`[Strava Webhook] Failed to store activity ${stravaId}:`, storeErr);
          // Non-fatal — email can still go out with whatever context the DB has
        }
      } else {
        console.log(`[Strava Webhook] Activity ${stravaId} already in DB for user ${user.id}, skipping insert`);
      }

      // Threshold gate computed above (willEmail). We already stored the activity
      // so history stays accurate even when we skip the email.
      if (!willEmail) {
        console.log(`[Strava Webhook] Activity ${event.object_id} too short (${activity.distance}m < ${minDistanceMeters}m) — stored but skipping email`);
        return `stored_no_email:below_min_distance(${Math.round(activity.distance ?? 0)}m)`;
      }

      console.log(`[Strava Webhook] Processing run activity ${event.object_id} for user ${user.id}`);
      await this.sendPostRunEmail(user, activity, stravaId, activityDbId, streams);
      await storage.updateUser(user.id, { lastPostRunEmailAt: new Date() });
      return "email_sent";
    } catch (error) {
      console.error("[Strava Webhook] Error processing new activity:", error);
      return `error:${String(error)}`;
    }
  }

  private async buildTrainingContext(userId: number, currentActivityDistanceKm: number, currentActivityDate: Date, currentStravaId: string, isKm: boolean = true): Promise<TrainingContext> {
    try {
      const thirtyDaysAgo = new Date(currentActivityDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentActivities = await storage.getActivitiesByUserId(userId, 60, thirtyDaysAgo);
      // Exclude today's newly-stored activity so we don't double-count it (we add +1 below)
      const runs = recentActivities.filter(a => RUNNING_ACTIVITY_TYPES.includes(a.type || "Run") && a.stravaId !== currentStravaId);

      const sevenDaysAgo = new Date(currentActivityDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const runsThisWeek = runs.filter(r => new Date(r.startDate) >= sevenDaysAgo);
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

      // Weekly load ramp: compare this week's volume to the prior 3-week average.
      // A sharp ramp is an injury-risk signal; a big drop is a recovery/detraining cue.
      const thisWeekTotalKm = kmThisWeek + currentActivityDistanceKm;
      const fourWeeksAgo = new Date(currentActivityDate.getTime() - 28 * 24 * 60 * 60 * 1000);
      const priorRuns = runs.filter(r => {
        const d = new Date(r.startDate);
        return d < sevenDaysAgo && d >= fourWeeksAgo;
      });
      const priorWeeklyAvgKm = priorRuns.reduce((sum, r) => sum + (r.distance || 0) / 1000, 0) / 3;
      let loadComparison: string | null = null;
      if (priorWeeklyAvgKm >= 1) {
        const ratio = thisWeekTotalKm / priorWeeklyAvgKm;
        const pct = Math.round((ratio - 1) * 100);
        if (ratio >= 1.3) loadComparison = `This week's volume is about ${pct}% above the prior 3-week average — ramping quickly, so recovery matters.`;
        else if (ratio <= 0.6) loadComparison = `This week's volume is well below the recent norm (a lighter or recovery week).`;
        else loadComparison = `This week's volume is roughly in line with the recent 3-week average.`;
      }

      const weeklyDistDisplay = isKm
        ? `${thisWeekTotalKm.toFixed(1)} km`
        : `${(thisWeekTotalKm * 0.621371).toFixed(1)} mi`;
      const weeklyContextLine = `${runsThisWeekCount + 1} run${runsThisWeekCount + 1 !== 1 ? "s" : ""} · ${weeklyDistDisplay} this week`;

      return {
        runsThisWeek: runsThisWeekCount + 1,
        kmThisWeek: thisWeekTotalKm,
        recentAvgPaceSecPerKm,
        paceVsRecentSec: null, // filled in sendPostRunEmail after pace is computed
        runStreak,
        totalRunsLast30Days: runs.length + 1,
        weeklyContextLine,
        loadComparison,
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
        loadComparison: null,
      };
    }
  }

  private async sendPostRunEmail(user: any, activity: any, stravaId: string, activityDbId: number | null, streams: any = null): Promise<void> {
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

      // Wrap the activity / dashboard link in a one-tap magic-link sign-in so
      // free users (who get these emails as a retention magnet) don't have to
      // remember a password — they go straight from inbox to the activity
      // (or dashboard) already logged in. Token is short-lived (15 min) and
      // purpose-scoped; falls back to a plain link if generation fails.
      const redirectPath = activityDbId ? `/activity/${activityDbId}` : `/dashboard`;
      const { authService } = await import("./auth");
      const baseUrl = `https://${domain}`;
      const activityUrl = await authService.wrapWithMagicLink(user.email, redirectPath, baseUrl);
      const dashboardUrl = await authService.wrapWithMagicLink(user.email, `/dashboard`, baseUrl);

      // Build training context from the last 30 days of activities
      const activityDate = new Date(activity.start_date || Date.now());
      const trainingContext = await this.buildTrainingContext(user.id, distanceKm, activityDate, stravaId, isKm);

      // Compute pace vs recent average (now that we have today's pace)
      if (trainingContext.recentAvgPaceSecPerKm !== null) {
        trainingContext.paceVsRecentSec = paceSecPerKm - trainingContext.recentAvgPaceSecPerKm;
      }

      // Derive substantive insights from the detailed streams (splits, decoupling,
      // fastest segment, cadence) — the things the runner can't read off the table.
      const streamAnalysis = this.analyzeRunStreams(streams, isKm);

      const aiResult = await this.generatePersonalizedEmail(
        user, activity, distanceKm, distanceLabel, runType, effortScore,
        efficiencyRating, paceDisplay, distanceDisplay, trainingContext, streamAnalysis
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
    ctx: TrainingContext, streamAnalysis: StreamAnalysis | null = null
  ): Promise<{ subject: string; coachVerdictBody: string; nextRunTip: string }> {
    try {
      const isKm = user.unitPreference === "km";
      const unit = isKm ? "km" : "mi";
      const firstName = user.firstName || user.email.split("@")[0];
      const goalLabel = GOAL_LABELS[user.onboardingGoal || ""] || null;
      const struggleLabel = STRUGGLE_LABELS[user.onboardingStruggle || ""] || null;
      const weeklyDistDisplay = isKm
        ? `${ctx.kmThisWeek.toFixed(1)} km`
        : `${(ctx.kmThisWeek * 0.621371).toFixed(1)} mi`;

      // Format pace trend (convert to the runner's unit so we never mix km and mi)
      // Use M:SS format — how runners actually talk about pace differences
      const fmtPaceDiff = (totalSec: number): string => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return m > 0
          ? `${m}:${s.toString().padStart(2, '0')}/${unit}`
          : `0:${s.toString().padStart(2, '0')}/${unit}`;
      };
      let paceTrend = "No recent data for comparison";
      if (ctx.paceVsRecentSec !== null) {
        const perUnit = isKm ? ctx.paceVsRecentSec : ctx.paceVsRecentSec / 0.621371;
        const absSec = Math.abs(Math.round(perUnit));
        if (absSec < 5) {
          paceTrend = "Right on their recent average pace for this distance";
        } else if (perUnit < 0) {
          paceTrend = `${fmtPaceDiff(absSec)} faster than their recent average for this distance`;
        } else {
          paceTrend = `${fmtPaceDiff(absSec)} slower than their recent average for this distance`;
        }
      }

      // Format streak
      const streakNote = ctx.runStreak >= 3 ? `${ctx.runStreak}-day running streak` : null;

      // Stream-derived analysis block — the substance the runner can't see in the table
      const streamBlock = streamAnalysis && streamAnalysis.summaryLines.length
        ? `\nRun analysis (computed from GPS + HR streams — the runner CANNOT see these in the stats table, so this is your richest material):\n${streamAnalysis.summaryLines.map(l => `- ${l}`).join("\n")}\n`
        : "";
      const loadLine = ctx.loadComparison ? `\n- Weekly load: ${ctx.loadComparison}` : "";

      const prompt = `You are the Running Coach for AITracker.run. Write a sharp, personalized post-run email for ${firstName}.

CRITICAL: The runner is already looking at a stats table showing pace, distance, duration, average HR, elevation, efficiency, and effort score. Restating any of those numbers is worthless. Your entire job is to tell them something they CANNOT see by reading that table — a pattern, a comparison, or what the numbers mean for their training.

Today's run type: ${runType}
Distance: ${distanceDisplay} (${distanceLabel})
Pace: ${paceDisplay}
Duration: ${Math.floor(activity.moving_time / 60)} minutes
Heart Rate: ${activity.average_heartrate ? Math.round(activity.average_heartrate) + " bpm avg" + (activity.max_heartrate ? ", " + activity.max_heartrate + " bpm max" : "") : "not recorded"}
Elevation: ${activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) + "m gain" : "flat"}
Effort Score: ${effortScore}/100
Running Efficiency: ${efficiencyRating.label}
PRs set: ${activity.pr_count || 0}
${streamBlock}
Training context (last 30 days):
- Pace vs recent: ${paceTrend}
- This week: ${ctx.runsThisWeek} run${ctx.runsThisWeek !== 1 ? "s" : ""}, ${weeklyDistDisplay} total
- Runs in last 30 days: ${ctx.totalRunsLast30Days}${streakNote ? `\n- Current streak: ${streakNote}` : ""}${loadLine}

Runner profile:${goalLabel ? `\n- Primary goal: ${goalLabel}` : ""}${struggleLabel ? `\n- Main struggle: ${struggleLabel}` : ""}

Generate a JSON response with exactly these 3 fields:

1. "subject": Under 65 chars. Hook them with the single most interesting finding (a split pattern, HR drift, fastest segment, pace-vs-norm, or load trend), not a generic "Great run!". Use the label "${distanceLabel}" where it reads naturally.

2. "coachVerdictBody": 2-3 sentences, max ~55 words. LEAD with the most insightful, non-obvious thing in the data above — strongly prefer the run analysis (split behaviour, aerobic decoupling, fastest split) or how today compares to their recent norm / weekly load. State the actual numbers from that analysis and explain what they mean, then connect it to their goal if relevant. Coach-to-athlete: warm but direct. Do NOT restate the stats table. No generic praise. No em dashes. No "Grey Zone" or "Junk Mileage".

3. "nextRunTip": One concrete, specific sentence on what to do next, justified by today's analysis (decoupling / effort / split behaviour) and their weekly load. Not a vague "take it easy".

Respond with ONLY valid JSON, no markdown, no commentary.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: "You are an expert running coach who reads the data carefully and surfaces specific, non-obvious insights. Respond with valid JSON only. Never restate raw stats the athlete can already see in their table. Never use em dashes, 'Grey Zone', or 'Junk Mileage'." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 1200,
        temperature: 0.7
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
      const absM = Math.floor(absSec / 60);
      const absS = absSec % 60;
      const paceDiffFmt = absM > 0 ? `${absM}:${absS.toString().padStart(2, '0')}/km` : `0:${absS.toString().padStart(2, '0')}/km`;
      hook = `${paceDiffFmt} faster than your recent average`;
      verdict = `You ran ${paceDiffFmt} faster than your recent average for this distance. Your fitness is building. Make sure your next run is easy enough to absorb this effort.`;
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
      const wkDisplay = user.unitPreference === "km"
        ? `${ctx.kmThisWeek.toFixed(1)} km`
        : `${(ctx.kmThisWeek * 0.621371).toFixed(1)} mi`;
      hook = `run ${ctx.runsThisWeek} of the week is in the books`;
      verdict = `You have been consistent this week — ${ctx.runsThisWeek} runs and ${wkDisplay} logged. Consistency is the most underrated part of training. Keep it up.`;
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

  // Compute substantive, non-obvious insights from the detailed Strava streams.
  // key_by_type=true means streams arrive as { distance: { data: [...] }, ... }.
  // Everything here is best-effort and must never throw into the email path.
  private analyzeRunStreams(streams: any, isKm: boolean): StreamAnalysis | null {
    try {
      if (!streams) return null;
      const dist: number[] = streams.distance?.data || [];      // cumulative meters
      const time: number[] = streams.time?.data || [];           // seconds (elapsed)
      const hr: number[] = streams.heartrate?.data || [];
      const cad: number[] = streams.cadence?.data || [];
      const n = dist.length;
      if (n < 20 || time.length !== n) return null;

      const unit = isKm ? "km" : "mi";
      const unitMeters = isKm ? 1000 : 1609.34;
      const summaryLines: string[] = [];

      // First half vs second half pacing (split by distance)
      const totalDist = dist[n - 1] - dist[0];
      const half = dist[0] + totalDist / 2;
      let splitIdx = dist.findIndex(d => d >= half);
      if (splitIdx <= 0 || splitIdx >= n - 1) splitIdx = Math.floor(n / 2);
      const t1 = time[splitIdx] - time[0];
      const d1 = dist[splitIdx] - dist[0];
      const t2 = time[n - 1] - time[splitIdx];
      const d2 = dist[n - 1] - dist[splitIdx];

      let splitLabel = "Even pacing";
      let splitDeltaSec = 0;
      if (d1 > 0 && d2 > 0 && t1 > 0 && t2 > 0) {
        const pace1 = (t1 / d1) * unitMeters; // sec per unit
        const pace2 = (t2 / d2) * unitMeters;
        splitDeltaSec = Math.round(pace2 - pace1);
        const absS = Math.abs(splitDeltaSec);
        if (splitDeltaSec <= -8) {
          splitLabel = "Negative split (finished faster)";
          summaryLines.push(`Pacing: negative split — the second half was about ${absS}s/${unit} faster than the first. Strong, controlled effort.`);
        } else if (splitDeltaSec >= 8) {
          splitLabel = "Positive split (faded late)";
          summaryLines.push(`Pacing: faded about ${absS}s/${unit} in the second half. Likely went out too hot, or fatigue/fueling caught up.`);
        } else {
          splitLabel = "Even pacing";
          summaryLines.push(`Pacing: very even — within ${absS}s/${unit} between the first and second half.`);
        }
      }

      // Aerobic decoupling (Pa:HR drift): how much pace-per-heartbeat degraded in the back half
      let decouplingPct: number | null = null;
      if (hr.length === n && d1 > 0 && d2 > 0 && t1 > 0 && t2 > 0) {
        const avg = (arr: number[], a: number, b: number) => {
          let s = 0, c = 0;
          for (let i = a; i < b; i++) { if (Number.isFinite(arr[i]) && arr[i] > 0) { s += arr[i]; c++; } }
          return c ? s / c : 0;
        };
        const hr1 = avg(hr, 0, splitIdx);
        const hr2 = avg(hr, splitIdx, n);
        const sp1 = d1 / t1; // m/s
        const sp2 = d2 / t2;
        if (hr1 > 0 && hr2 > 0) {
          const ratio1 = sp1 / hr1;
          const ratio2 = sp2 / hr2;
          decouplingPct = Math.round(((ratio1 - ratio2) / ratio1) * 1000) / 10;
          if (decouplingPct > 5) {
            summaryLines.push(`Aerobic decoupling: ${decouplingPct}% — heart rate drifted up relative to pace (above the ~5% durability threshold). The effort was beyond a comfortable aerobic zone, or aerobic durability is the current limiter.`);
          } else if (decouplingPct >= 0) {
            summaryLines.push(`Aerobic decoupling: ${decouplingPct}% — well coupled (under 5%). Good aerobic durability; HR held steady against pace.`);
          } else {
            summaryLines.push(`Aerobic decoupling: ${decouplingPct}% — pace-per-heartbeat actually improved late (warmed into it nicely).`);
          }
        }
      }

      // Fastest single km / mile. Two-pointer window over cumulative distance,
      // interpolating the time at the exact unit boundary so the split reflects a
      // true single-unit pace rather than an over-long (and thus too-slow) window.
      let fastestSplitPace: string | null = null;
      if (totalDist >= unitMeters) {
        let best = Infinity;
        let j = 1;
        for (let i = 0; i < n; i++) {
          if (j <= i) j = i + 1;
          const target = dist[i] + unitMeters;
          while (j < n && dist[j] < target) j++;
          if (j >= n) break;
          const dPrev = dist[j - 1];
          const denom = dist[j] - dPrev;
          const frac = denom > 0 ? (target - dPrev) / denom : 0;
          const tAtTarget = time[j - 1] + frac * (time[j] - time[j - 1]);
          const dt = tAtTarget - time[i];
          if (dt > 0 && dt < best) best = dt;
        }
        if (best !== Infinity) {
          const totalSec = Math.round(best);
          const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          fastestSplitPace = `${m}:${String(s).padStart(2, "0")} /${unit}`;
          summaryLines.push(`Fastest ${unit}: ${fastestSplitPace}.`);
        }
      }

      // Average cadence (Strava reports per-leg RPM; double for steps/min)
      let avgCadence: number | null = null;
      if (cad.length) {
        const valid = cad.filter(c => Number.isFinite(c) && c > 0);
        if (valid.length) {
          avgCadence = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 2);
          summaryLines.push(`Average cadence: ${avgCadence} spm.`);
        }
      }

      if (!summaryLines.length) return null;
      return { splitLabel, splitDeltaSec, decouplingPct, fastestSplitPace, avgCadence, summaryLines };
    } catch (err) {
      console.warn("[Strava Webhook] Stream analysis failed:", err);
      return null;
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
}

export const stravaWebhookService = new StravaWebhookService();
