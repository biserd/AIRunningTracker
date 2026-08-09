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
  weeklyContextLine: string;            // e.g. "3 runs Â· 28.4 km this week"
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

  generateWeeklyUnsubscribeToken(userId: number): string {
    const payload = `unsub-weekly:${userId}`;
    const signature = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET).update(payload).digest("hex").slice(0, 16);
    return Buffer.from(`${userId}:${signature}`).toString("base64url");
  }

  verifyWeeklyUnsubscribeToken(token: string): number | null {
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      const [userIdStr, signature] = decoded.split(":");
      const userId = parseInt(userIdStr);
      if (isNaN(userId)) return null;
      const expected = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET).update(`unsub-weekly:${userId}`).digest("hex").slice(0, 16);
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

      // Active free users still get the AI coach email as a retention path.
      // We mark the activity as
      // `lockedForFree=true` so it doesn't appear in their visible 10-run
      // list; the email link routes to the activity page where the data is
      // rendered behind a blur + upgrade CTA.
      // Enforce the 30-day free-account pause before making any Strava API
      // call or doing any activity processing. Paid and trial users are
      // explicitly exempt inside the dormancy policy.
      const { enforceAccountDormancy } = await import("./accountDormancy");
      const dormancy = await enforceAccountDormancy(user.id);
      if (dormancy.paused) {
        console.log(`[Strava Webhook] User ${user.id} is an inactive free account; activity ${event.object_id} acknowledged without processing`);
        return dormancy.newlyPaused
          ? "skipped:free_account_became_dormant"
          : "skipped:dormant_free_account";
      }

      const { isPaidPlan } = await import("../rateLimits");
      const userIsPaid = isPaidPlan(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null);

      // Notification preferences should suppress only the email, not activity
      // ingestion or Premium Preview creation.
      let emailSkipReason: "notifications_disabled" | "weekly_throttle" | null = null;
      if (!user.notifyPostRun) {
        console.log(`[Strava Webhook] User ${user.id} has post-run notifications disabled; storing activity without email`);
        emailSkipReason = "notifications_disabled";
      }

      const frequency = user.postRunEmailFrequency ?? "every_run";
      if (frequency === "weekly" && user.lastPostRunEmailAt) {
        const daysSinceLastEmail = (Date.now() - new Date(user.lastPostRunEmailAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastEmail < 7) {
          console.log(`[Strava Webhook] User ${user.id} set to weekly emails, last sent ${daysSinceLastEmail.toFixed(1)} days ago â€” storing without email`);
          emailSkipReason = "weekly_throttle";
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
      // for history but never trigger an email â€” so there's no point spending a
      // Strava streams call or AI analysis on a run that won't be emailed.
      const minDistanceMeters = (user.unitPreference ?? "miles") === "km" ? 1000 : 1609.34;
      const meetsDistanceThreshold = (activity.distance ?? 0) >= minDistanceMeters;
      const willEmail = meetsDistanceThreshold && emailSkipReason === null;

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
          // Non-fatal â€” email can still go out with whatever context the DB has
        }
      } else {
        console.log(`[Strava Webhook] Activity ${stravaId} already in DB for user ${user.id}, skipping insert`);
      }

      // The first eligible run may arrive only through a webhook. Preview
      // creation is best-effort and exactly-once, so webhook retries and a
      // concurrent manual sync cannot create duplicates.
      if (!userIsPaid && activityDbId) {
        try {
          const { createPremiumPreviewForUser } = await import("./premiumPreview");
          const previewResult = await createPremiumPreviewForUser(user.id);
          console.log(
            `[PremiumPreview] Webhook preview for user ${user.id}: ` +
            (previewResult.created ? `created from activity ${previewResult.payload.activityId}` : `skipped (${previewResult.reason})`),
          );
        } catch (previewErr) {
          console.error(`[PremiumPreview] Webhook preview failed for user ${user.id}:`, previewErr);
        }
      }

      // Optional Hermes/agent handoff. The signed payload carries identifiers
      // only; the agent must use the runner-scoped OAuth MCP connection to read
      // the analysis-ready brief. Replays are identified by the stable event ID.
      if (userIsPaid && user.coachEnabled !== false && user.coachOnboardingCompleted && activityDbId) {
        const { emitSignedCoachEvent } = await import("./proactiveCoach");
        void emitSignedCoachEvent({
          eventId: `strava:${event.subscription_id}:${event.object_id}:${event.event_time}`,
          type: "activity.ready",
          userId: user.id,
          activityId: activityã¯:¶‰Ëkºwµçh€‘í‘¥ÍÑ…¹•¥ÍÁ±…åô€ ‘í‘¥ÍÑ…¹•1…‰•±ô¤4)A…”è€‘íÁ…•¥ÍÁ±…åô4)ÕÉ…Ñ¥½¸è€‘í5…Ñ ¹™±½½È¡…Ñ¥Ù¥Ñä¹µ½Ù¥¹}Ñ¥µ”€¼€ØÀ¥ôµ¥¹ÕÑ•Ì4)!•…ÉĞI…Ñ”è€‘í…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”€ü5…Ñ ¹É½Õ¹¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”¤€¬€ˆ‰Á´…Ùœˆ€¬€¡…Ñ¥Ù¥Ñä¹µ…á}¡•…ÉÑÉ…Ñ”€ü€ˆ°€ˆ€¬…Ñ¥Ù¥Ñä¹µ…á}¡•…ÉÑÉ…Ñ”€¬€ˆ‰Á´µ…àˆ€è€ˆˆ¤€è€‰¹½ĞÉ•½É‘•‰ô4)±•Ù…Ñ¥½¸è€‘í…Ñ¥Ù¥Ñä¹Ñ½Ñ…±}•±•Ù…Ñ¥½¹}…¥¸€ü5…Ñ ¹É½Õ¹¡…Ñ¥Ù¥Ñä¹Ñ½Ñ…±}•±•Ù…Ñ¥½¹}…¥¸¤€¬€‰´…¥¸ˆ€è€‰™±…Ğ‰ô4)™™½ÉĞM½É”è€‘í•™™½ÉÑM½É•ô¼ÄÀÀ4)IÕ¹¹¥¹œ™™¥¥•¹äè€‘í•™™¥¥•¹åI…Ñ¥¹œ¹±…‰•±ô4)AIÌÍ•Ğè€‘í…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹Ğñğ€Áô4(‘íÍÑÉ•…µ	±½­ô4)QÉ…¥¹¥¹œ½¹Ñ•áĞ€¡±…ÍĞ€ÌÀ‘…åÌ¤è4(´A…”ÙÌÉ••¹Ğè€‘íÁ…•QÉ•¹‘ô4(´Q¡¥Ìİ••¬è€‘íÑà¹ÉÕ¹ÍQ¡¥Í]••­ôÉÕ¸‘íÑà¹ÉÕ¹ÍQ¡¥Í]••¬€„ôô€Ä€ü€‰Ìˆ€è€ˆ‰ô°€‘íİ••­±å¥ÍÑ¥ÍÁ±…åôÑ½Ñ…°4(´IÕ¹Ì¥¸±…ÍĞ€ÌÀ‘…åÌè€‘íÑà¹Ñ½Ñ…±IÕ¹Í1…ÍĞÌÁ…åÍô‘íÍÑÉ•…­9½Ñ”€üq¸´ÕÉÉ•¹ĞÍÑÉ•…¬è€‘íÍÑÉ•…­9½Ñ•õ€€è€ˆ‰ô‘í±½…‘1¥¹•ô4(4)IÕ¹¹•ÈÁÉ½™¥±”è‘í½…±1…‰•°€üq¸´AÉ¥µ…Éä½…°è€‘í½…±1…‰•±õ€€è€ˆ‰ô‘íÍÑÉÕ±•1…‰•°€üq¸´5…¥¸ÍÑÉÕ±”è€‘íÍÑÉÕ±•1…‰•±õ€€è€ˆ‰ô4(4)•¹•É…Ñ”„)M=8É•ÍÁ½¹Í”İ¥Ñ •á…Ñ±äÑ¡•Í”€Ì™¥•±‘Ìè4(4(Ä¸€‰ÍÕ‰©•ĞˆèU¹‘•È€ØÔ¡…ÉÌ¸!½½¬Ñ¡•´İ¥Ñ Ñ¡”Í¥¹±”µ½ÍĞ¥¹Ñ•É•ÍÑ¥¹œ™¥¹‘¥¹œ€¡„ÍÁ±¥ĞÁ…ÑÑ•É¸°!H‘É¥™Ğ°™…ÍÑ•ÍĞÍ•µ•¹Ğ°Á…”µÙÌµ¹½É´°½È±½…ÑÉ•¹¤°¹½Ğ„•¹•É¥Œ€‰É•…ĞÉÕ¸„ˆ¸UÍ”Ñ¡”±…‰•°€ˆ‘í‘¥ÍÑ…¹•1…‰•±ôˆİ¡•É”¥ĞÉ•…‘Ì¹…ÑÕÉ…±±ä¸4(4(È¸€‰½…¡Y•É‘¥Ñ	½‘äˆè€È´ÌÍ•¹Ñ•¹•Ì°µ…àøÔÔİ½É‘Ì¸1İ¥Ñ Ñ¡”µ½ÍĞ¥¹Í¥¡Ñ™Õ°°¹½¸µ½‰Ù¥½ÕÌÑ¡¥¹œ¥¸Ñ¡”‘…Ñ„…‰½Ù”ƒŠPÍÑÉ½¹±äÁÉ•™•ÈÑ¡”ÉÕ¸…¹…±åÍ¥Ì€¡ÍÁ±¥Ğ‰•¡…Ù¥½ÕÈ°…•É½‰¥Œ‘•½ÕÁ±¥¹œ°™…ÍÑ•ÍĞÍÁ±¥Ğ¤½È¡½ÜÑ½‘…ä½µÁ…É•ÌÑ¼Ñ¡•¥ÈÉ••¹Ğ¹½É´€¼İ••­±ä±½…¸MÑ…Ñ”Ñ¡”…ÑÕ…°¹Õµ‰•ÉÌ™É½´Ñ¡…Ğ…¹…±åÍ¥Ì…¹•áÁ±…¥¸İ¡…ĞÑ¡•äµ•…¸°Ñ¡•¸½¹¹•Ğ¥ĞÑ¼Ñ¡•¥È½…°¥˜É•±•Ù…¹Ğ¸½… µÑ¼µ…Ñ¡±•Ñ”èİ…É´‰ÕĞ‘¥É•Ğ¸¼9=PÉ•ÍÑ…Ñ”Ñ¡”ÍÑ…ÑÌÑ…‰±”¸9¼•¹•É¥ŒÁÉ…¥Í”¸9¼•´‘…Í¡•Ì¸9¼€‰É•äi½¹”ˆ½È€‰)Õ¹¬5¥±•…”ˆ¸4(4(Ì¸€‰¹•áÑIÕ¹Q¥Àˆè=¹”½¹É•Ñ”°ÍÁ•¥™¥ŒÍ•¹Ñ•¹”½¸İ¡…ĞÑ¼‘¼¹•áĞ°©ÕÍÑ¥™¥•‰äÑ½‘…äÌ…¹…±åÍ¥Ì€¡‘•½ÕÁ±¥¹œ€¼•™™½ÉĞ€¼ÍÁ±¥Ğ‰•¡…Ù¥½ÕÈ¤…¹Ñ¡•¥Èİ••­±ä±½…¸9½Ğ„Ù…Õ”€‰Ñ…­”¥Ğ•…Íäˆ¸4(4)I•ÍÁ½¹İ¥Ñ =91dÙ…±¥)M=8°¹¼µ…É­‘½İ¸°¹¼½µµ•¹Ñ…Éä¹€ì4(4(€€€€€½¹ÍĞÉ•ÍÁ½¹Í”€ô…İ…¥Ğ½Á•¹…¤¹¡…Ğ¹½µÁ±•Ñ¥½¹Ì¹É•…Ñ”¡ì4(€€€€€€€µ½‘•°è€‰ÁĞ´Ô¸Ğµµ¥¹¤ˆ°4(€€€€€€€µ•ÍÍ…•Ìèl4(€€€€€€€€€ìÉ½±”è€‰ÍåÍÑ•´ˆ°½¹Ñ•¹Ğè€‰e½Ô…É”…¸•áÁ•ÉĞÉÕ¹¹¥¹œ½… İ¡¼É•…‘ÌÑ¡”‘…Ñ„…É•™Õ±±ä…¹ÍÕÉ™…•ÌÍÁ•¥™¥Œ°¹½¸µ½‰Ù¥½ÕÌ¥¹Í¥¡ÑÌ¸I•ÍÁ½¹İ¥Ñ Ù…±¥)M=8½¹±ä¸9•Ù•ÈÉ•ÍÑ…Ñ”É…ÜÍÑ…ÑÌÑ¡”…Ñ¡±•Ñ”…¸…±É•…‘äÍ•”¥¸Ñ¡•¥ÈÑ…‰±”¸9•Ù•ÈÕÍ”•´‘…Í¡•Ì°€É•äi½¹”œ°½È€)Õ¹¬5¥±•…”œ¸ˆô°4(€€€€€€€€€ìÉ½±”è€‰ÕÍ•Èˆ°½¹Ñ•¹ĞèÁÉ½µÁĞô4(€€€€€€€t°4(€€€€€€€µ…á}½µÁ±•Ñ¥½¹}Ñ½­•¹Ìè€ÄÈÀÀ°4(€€€€€€€Ñ•µÁ•É…ÑÕÉ”è€À¸Ü4(€€€€€ô¤ì4(4(€€€€€½¹ÍĞ½¹Ñ•¹Ğ€ôÉ•ÍÁ½¹Í”¹¡½¥•ÍlÁtü¹µ•ÍÍ…”ü¹½¹Ñ•¹Ğü¹ÑÉ¥´ ¤ì4(€€€€€¥˜€¡½¹Ñ•¹Ğ¤ì4(€€€€€€€½¹ÍĞ±•…¹•€ô½¹Ñ•¹Ğ¹É•Á±…” ½©Í½¹qÌ¨½œ°€ˆˆ¤¹É•Á±…” ½qÌ¨½œ°€ˆˆ¤¹ÑÉ¥´ ¤ì4(€€€€€€€½¹ÍĞÁ…ÉÍ•€ô)M=8¹Á…ÉÍ”¡±•…¹•¤ì4(€€€€€€€¥˜€¡Á…ÉÍ•¹ÍÕ‰©•Ğ€˜˜Á…ÉÍ•¹½…¡Y•É‘¥Ñ	½‘ä¤ì4(€€€€€€€€€É•ÑÕÉ¸ì4(€€€€€€€€€€€ÍÕ‰©•ĞèÁ…ÉÍ•¹ÍÕ‰©•Ğ¹Í±¥” À°€àÀ¤°4(€€€€€€€€€€€½…¡Y•É‘¥Ñ	½‘äèÁ…ÉÍ•¹½…¡Y•É‘¥Ñ	½‘ä°4(€€€€€€€€€€€¹•áÑIÕ¹Q¥ÀèÁ…ÉÍ•¹¹•áÑIÕ¹Q¥Àñğ€ˆˆ°4(€€€€€€€€€ôì4(€€€€€€€ô4(€€€€€ô4(€€€ô…Ñ €¡•ÉÉ½È¤ì4(€€€€€½¹Í½±”¹•ÉÉ½È ‰mMÑÉ…Ù„]•‰¡½½­t$•µ…¥°•¹•É…Ñ¥½¸™…¥±•èˆ°•ÉÉ½È¤ì4(€€€ô4(4(€€€É•ÑÕÉ¸Ñ¡¥Ì¹•Ñ…±±‰…­µ…¥°¡ÕÍ•È°…Ñ¥Ù¥Ñä°‘¥ÍÑ…¹•-´°‘¥ÍÑ…¹•1…‰•°°•™™½ÉÑM½É”°•™™¥¥•¹åI…Ñ¥¹œ°Ñà¤ì4(€ô4(4(€ÁÉ¥Ù…Ñ”•Ñ…±±‰…­µ…¥° 4(€€€ÕÍ•Èè…¹ä°…Ñ¥Ù¥Ñäè…¹ä°‘¥ÍÑ…¹•-´è¹Õµ‰•È°‘¥ÍÑ…¹•1…‰•°èÍÑÉ¥¹œ°4(€€€•™™½ÉÑM½É”è¹Õµ‰•È°•™™¥¥•¹åI…Ñ¥¹œèì±…‰•°èÍÑÉ¥¹œì¥½¸èÍÑÉ¥¹œô°4(€€€ÑàèQÉ…¥¹¥¹½¹Ñ•áĞ4(€€¤èìÍÕ‰©•ĞèÍÑÉ¥¹œì½…¡Y•É‘¥Ñ	½‘äèÍÑÉ¥¹œì¹•áÑIÕ¹Q¥ÀèÍÑÉ¥¹œôì4(€€€±•Ğ¡½½¬€ô€‰¡•É”¥Ìİ¡…ĞÑ¡”‘…Ñ„Í¡½İÌˆì4(€€€±•ĞÙ•É‘¥Ğ€ô€‰Ù•ÉäÉÕ¸¥Ì„‘…Ñ„Á½¥¹Ğ¸1•ĞÌµ…­”Ñ¡”¹•áĞ½¹”½Õ¹Ğ¸ˆì4(€€€±•Ğ¹•áÑIÕ¹Q¥À€ô€‰-••Àå½ÕÈ¹•áĞÉÕ¸•…ÍäÑ¼±•ĞÑ½‘…äÌ•™™½ÉĞ…‰Í½Éˆ¸ˆì4(4(€€€€¼¼A…”µ‰…Í•¡½½¬4(€€€¥˜€¡Ñà¹Á…•YÍI••¹ÑM•Œ€„ôô¹Õ±°€˜˜Ñà¹Á…•YÍI••¹ÑM•Œ€ğ€´ÄÀ¤ì4(€€€€€½¹ÍĞ…‰ÍM•Œ€ô5…Ñ ¹…‰Ì¡5…Ñ ¹É½Õ¹¡Ñà¹Á…•YÍI••¹ÑM•Œ¤¤ì4(€€€€€½¹ÍĞ…‰Í4€ô5…Ñ ¹™±½½È¡…‰ÍM•Œ€¼€ØÀ¤ì4(€€€€€½¹ÍĞ…‰ÍL€ô…‰ÍM•Œ€”€ØÀì4(€€€€€½¹ÍĞÁ…•¥™™µĞ€ô…‰Í4€ø€À€ü€‘í…‰Í5ôè‘í…‰ÍL¹Ñ½MÑÉ¥¹œ ¤¹Á…‘MÑ…ÉĞ È°€œÀœ¥ô½­µ€€è€Àè‘í…‰ÍL¹Ñ½MÑÉ¥¹œ ¤¹Á…‘MÑ…ÉĞ È°€œÀœ¥ô½­µ€ì4(€€€€€¡½½¬€ô€‘íÁ…•¥™™µÑô™…ÍÑ•ÈÑ¡…¸å½ÕÈÉ••¹Ğ…Ù•É…•€ì4(€€€€€Ù•É‘¥Ğ€ôe½ÔÉ…¸€‘íÁ…•¥™™µÑô™…ÍÑ•ÈÑ¡…¸å½ÕÈÉ••¹Ğ…Ù•É…”™½ÈÑ¡¥Ì‘¥ÍÑ…¹”¸e½ÕÈ™¥Ñ¹•ÍÌ¥Ì‰Õ¥±‘¥¹œ¸5…­”ÍÕÉ”å½ÕÈ¹•áĞÉÕ¸¥Ì•…Íä•¹½Õ Ñ¼…‰Í½ÉˆÑ¡¥Ì•™™½ÉĞ¹€ì4(€€€€€¹•áÑIÕ¹Q¥À€ô€‰½±±½ÜÑ¡¥ÌÕÀİ¥Ñ …¸•…ÍäÉÕ¸ƒŠPå½ÕÈ‰½‘ä¹••‘ÌÑ¡”É•½Ù•ÉäÑ¼±½¬¥¸Ñ¡•Í”…¥¹Ì¸ˆì4(€€€ô•±Í”¥˜€¡Ñà¹Á…•YÍI••¹ÑM•Œ€„ôô¹Õ±°€˜˜Ñà¹Á…•YÍI••¹ÑM•Œ€ø€ÄÔ¤ì4(€€€€€¡½½¬€ô€‰Í±½İ•ÈÑ¡…¸ÕÍÕ…°°İ¡¥ ¥Ì¹½Ğ…±İ…åÌ„‰…Ñ¡¥¹œˆì4(€€€€€Ù•É‘¥Ğ€ôe½ÕÈÁ…”İ…Ì„‰¥ĞÍ±½İ•ÈÑ¡…¸å½ÕÈÉ••¹Ğ…Ù•É…”Ñ½‘…ä¸Q¡…Ğ…¸‰”‘•±¥‰•É…Ñ”É•½Ù•Éä°½È„Í¥¹…°Ñ¼¡•¬å½ÕÈÍ±••À…¹¹ÕÑÉ¥Ñ¥½¸¸¥Ñ¡•Èİ…ä°½¹Í¥ÍÑ•¹ä¥Ìİ¡…Ğ‰Õ¥±‘Ì™¥Ñ¹•ÍÌ¹€ì4(€€€€€¹•áÑIÕ¹Q¥À€ô€‰½ÕÌ½¸½¹Í¥ÍÑ•¹ä½Ù•ÈÑ¡”¹•áĞ™•Ü‘…åÌÉ…Ñ¡•ÈÑ¡…¸ÁÕÍ¡¥¹œÁ…”¸ˆì4(€€€ô•±Í”¥˜€¡•™™¥¥•¹åI…Ñ¥¹œ¹±…‰•°€ôôô€‰1½Üˆ¤ì4(€€€€€¡½½¬€ô€‰Í½±¥•™™½ÉĞ°‰ÕĞ•™™¥¥•¹ä¡…ÌÉ½½´Ñ¼É½Üˆì4(€€€€€Ù•É‘¥Ğ€ôe½ÕÈ•™™½ÉĞİ…Ì¡¥ Ñ½‘…ä°‰ÕĞå½ÕÈÉÕ¹¹¥¹œ•™™¥¥•¹ä…µ”¥¸±½Ü¸Q¡…Ğ½™Ñ•¸µ•…¹Ìå½ÕÈ¡•…ÉĞÉ…Ñ”¥Ìİ½É­¥¹œ¡…É‘•ÈÑ¡…¸å½ÕÈÁ…”İ…ÉÉ…¹ÑÌ¸™•Ü•…Íä…•É½‰¥ŒÉÕ¹ÌÑ¡¥Ìİ••¬İ¥±°¡•±ÀÉ•Í•ĞÑ¡…Ğ¹€ì4(€€€€€¹•áÑIÕ¹Q¥À€ô€‰AÉ¥½É¥Ñ¥é”­••Á¥¹œå½ÕÈ¹•áĞ€Ä´ÈÉÕ¹Ì…Ğ„½¹Ù•ÉÍ…Ñ¥½¹…°Á…”¸ˆì4(€€€ô•±Í”¥˜€¡•™™½ÉÑM½É”€øô€àÀ¤ì4(€€€€€¡½½¬€ô€‰‰¥œ•™™½ÉĞÑ½‘…äˆì4(€€€€€Ù•É‘¥Ğ€ôe½ÔÁÕĞ½ÕĞ„¡¥ µ•™™½ÉĞÍ•ÍÍ¥½¸¸e½ÕÈ‰½‘ä¥Ì½¥¹œÑ¼¹••ÁÉ½Á•ÈÉ•½Ù•ÉäÑ¼…‰Í½ÉˆÑ¡¥Ì½¹”¸…ÍäÉÕ¹¹¥¹œ™½ÈÑ¡”¹•áĞ‘…ä½ÈÑİ¼¥Ì¹½Ğ½ÁÑ¥½¹…°ƒŠP¥Ğ¥ÌÁ…ÉĞ½˜Ñ¡”ÑÉ…¥¹¥¹œ¹€ì4(€€€€€¹•áÑIÕ¹Q¥À€ô€‰5…­”å½ÕÈ¹•áĞÉÕ¸•¹Õ¥¹•±ä•…ÍäƒŠP•™™½ÉĞÍ½É”±¥­”Ñ½‘…ä¹••‘Ì€ÈĞ´Ğà¡½ÕÉÌ½˜É•½Ù•Éä¸ˆì4(€€€ô•±Í”¥˜€¡…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹Ğ€˜˜…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹Ğ€ø€À¤ì4(€€€€€¡½½¬€ô€‘í…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹Ñô¹•ÜAH‘í…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹Ğ€ø€Ä€ü€‰Ìˆ€è€ˆ‰õ€ì4(€€€€€Ù•É‘¥Ğ€ôe½ÔÍ•Ğ€‘í…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹ÑôAH‘í…Ñ¥Ù¥Ñä¹ÁÉ}½Õ¹Ğ€ø€Ä€ü€‰Ìˆ€è€ˆ‰ôÑ½‘…ä¸Q¡…Ğ¥ÌÉ•…°ÁÉ½É•ÍÌÍ¡½İ¥¹œÕÀ¥¸Ñ¡”‘…Ñ„¸Q¡”ÅÕ•ÍÑ¥½¸¹½Ü¥Ìİ¡•Ñ¡•Èå½ÔÉ•½Ù•Èİ•±°•¹½Õ Ñ¼­••ÀÑ¡…ĞÑÉ…©•Ñ½Éä½¥¹œ¹€ì4(€€€€€¹•áÑIÕ¹Q¥À€ô€‰¥Ù”å½ÕÉÍ•±˜„ÁÉ½Á•È•…Íä‘…ä‰•™½É”å½ÕÈ¹•áĞ¡…ÉÍ•ÍÍ¥½¸¸ˆì4(€€€ô•±Í”¥˜€¡Ñà¹ÉÕ¹ÍQ¡¥Í]••¬€øô€Ì¤ì4(€€€€€½¹ÍĞİ­¥ÍÁ±…ä€ôÕÍ•È¹Õ¹¥ÑAÉ•™•É•¹”€ôôô€‰­´ˆ4(€€€€€€€€ü€‘íÑà¹­µQ¡¥Í]••¬¹Ñ½¥á• Ä¥ô­µ€4(€€€€€€€€è€‘ì¡Ñà¹­µQ¡¥Í]••¬€¨€À¸ØÈÄÌÜÄ¤¹Ñ½¥á• Ä¥ôµ¥€ì4(€€€€€¡½½¬€ôÉÕ¸€‘íÑà¹ÉÕ¹ÍQ¡¥Í]••­ô½˜Ñ¡”İ••¬¥Ì¥¸Ñ¡”‰½½­Í€ì4(€€€€€Ù•É‘¥Ğ€ôe½Ô¡…Ù”‰••¸½¹Í¥ÍÑ•¹ĞÑ¡¥Ìİ••¬ƒŠP€‘íÑà¹ÉÕ¹ÍQ¡¥Í]••­ôÉÕ¹Ì…¹€‘íİ­¥ÍÁ±…åô±½•¸½¹Í¥ÍÑ•¹ä¥ÌÑ¡”µ½ÍĞÕ¹‘•ÉÉ…Ñ•Á…ÉĞ½˜ÑÉ…¥¹¥¹œ¸-••À¥ĞÕÀ¹€ì4(€€€€€¹•áÑIÕ¹Q¥À€ô€‰e½Ô…É”‰Õ¥±‘¥¹œ„Í½±¥İ••¬¸5…­”ÍÕÉ”…Ğ±•…ÍĞ½¹”µ½É”ÉÕ¸Ñ¡¥Ìİ••¬¥Ì™Õ±±ä•…Íä¸ˆì4(€€€ô4(4(€€€€¼¼½…°µ…İ…É”±½Í¥¹œ¹Õ‘”4(€€€½¹ÍĞ½…±1…‰•°€ô=1}1	1MmÕÍ•È¹½¹‰½…É‘¥¹½…°ñğ€ˆ‰tñğ¹Õ±°ì4(€€€¥˜€¡½…±1…‰•°€˜˜Ù•É‘¥Ğ€ôôô€‰Ù•ÉäÉÕ¸¥Ì„‘…Ñ„Á½¥¹Ğ¸1•ĞÌµ…­”Ñ¡”¹•áĞ½¹”½Õ¹Ğ¸ˆ¤ì4(€€€€€Ù•É‘¥Ğ€ôe½Ô…É”€‘í½…±1…‰•±ô…¹Ñ½‘…ä¥Ì…¹½Ñ¡•ÈÍÑ•À¥¸Ñ¡…Ğ‘¥É•Ñ¥½¸¸½¹Í¥ÍÑ•¹ä½Ù•ÈÁ•É™•Ñ¥½¸ƒŠP­••ÀÍ¡½İ¥¹œÕÀ¹€ì4(€€€ô4(4(€€€É•ÑÕÉ¸ì4(€€€€€ÍÕ‰©•Ğèe½ÕÈ€‘í‘¥ÍÑ…¹•1…‰•±ô¹…±åÍ¥Ìè€‘í¡½½¬¹¡…ÉĞ À¤¹Ñ½UÁÁ•É…Í” ¤€¬¡½½¬¹Í±¥” Ä¥õ€°4(€€€€€½…¡Y•É‘¥Ñ	½‘äèÙ•É‘¥Ğ°4(€€€€€¹•áÑIÕ¹Q¥À°4(€€€ôì4(€ô4(4(€€¼¼½µÁÕÑ”ÍÕ‰ÍÑ…¹Ñ¥Ù”°¹½¸µ½‰Ù¥½ÕÌ¥¹Í¥¡ÑÌ™É½´Ñ¡”‘•Ñ…¥±•MÑÉ…Ù„ÍÑÉ•…µÌ¸4(€€¼¼­•å}‰å}ÑåÁ”õÑÉÕ”µ•…¹ÌÍÑÉ•…µÌ…ÉÉ¥Ù”…Ìì‘¥ÍÑ…¹”èì‘…Ñ„èl¸¸¹tô°€¸¸¸ô¸4(€€¼¼Ù•ÉåÑ¡¥¹œ¡•É”¥Ì‰•ÍĞµ•™™½ÉĞ…¹µÕÍĞ¹•Ù•ÈÑ¡É½Ü¥¹Ñ¼Ñ¡”•µ…¥°Á…Ñ ¸4(€ÁÉ¥Ù…Ñ”…¹…±åé•IÕ¹MÑÉ•…µÌ¡ÍÑÉ•…µÌè…¹ä°¥Í-´è‰½½±•…¸¤èMÑÉ•…µ¹…±åÍ¥Ìğ¹Õ±°ì4(€€€ÑÉäì4(€€€€€¥˜€ …ÍÑÉ•…µÌ¤É•ÑÕÉ¸¹Õ±°ì4(€€€€€½¹ÍĞ‘¥ÍĞè¹Õµ‰•Émt€ôÍÑÉ•…µÌ¹‘¥ÍÑ…¹”ü¹‘…Ñ„ñğmtì€€€€€€¼¼ÕµÕ±…Ñ¥Ù”µ•Ñ•ÉÌ4(€€€€€½¹ÍĞÑ¥µ”è¹Õµ‰•Émt€ôÍÑÉ•…µÌ¹Ñ¥µ”ü¹‘…Ñ„ñğmtì€€€€€€€€€€€¼¼Í•½¹‘Ì€¡•±…ÁÍ•¤4(€€€€€½¹ÍĞ¡Èè¹Õµ‰•Émt€ôÍÑÉ•…µÌ¹¡•…ÉÑÉ…Ñ”ü¹‘…Ñ„ñğmtì4(€€€€€½¹ÍĞ…è¹Õµ‰•Émt€ôÍÑÉ•…µÌ¹…‘•¹”ü¹‘…Ñ„ñğmtì4(€€€€€½¹ÍĞ¸€ô‘¥ÍĞ¹±•¹Ñ ì4(€€€€€¥˜€¡¸€ğ€ÈÀñğÑ¥µ”¹±•¹Ñ €„ôô¸¤É•ÑÕÉ¸¹Õ±°ì4(4(€€€€€½¹ÍĞÕ¹¥Ğ€ô¥Í-´€ü€‰­´ˆ€è€‰µ¤ˆì4(€€€€€½¹ÍĞÕ¹¥Ñ5•Ñ•ÉÌ€ô¥Í-´€ü€ÄÀÀÀ€è€ÄØÀä¸ÌĞì4(€€€€€½¹ÍĞÍÕµµ…Éå1¥¹•ÌèÍÑÉ¥¹mt€ômtì4(4(€€€€€€¼¼¥ÉÍĞ¡…±˜ÙÌÍ•½¹¡…±˜Á…¥¹œ€¡ÍÁ±¥Ğ‰ä‘¥ÍÑ…¹”¤4(€€€€€½¹ÍĞÑ½Ñ…±¥ÍĞ€ô‘¥ÍÑm¸€´€Åt€´‘¥ÍÑlÁtì4(€€€€€½¹ÍĞ¡…±˜€ô‘¥ÍÑlÁt€¬Ñ½Ñ…±¥ÍĞ€¼€Èì4(€€€€€±•ĞÍÁ±¥Ñ%‘à€ô‘¥ÍĞ¹™¥¹‘%¹‘•à¡€ôø€øô¡…±˜¤ì4(€€€€€¥˜€¡ÍÁ±¥Ñ%‘à€ğô€ÀñğÍÁ±¥Ñ%‘à€øô¸€´€Ä¤ÍÁ±¥Ñ%‘à€ô5…Ñ ¹™±½½È¡¸€¼€È¤ì4(€€€€€½¹ÍĞĞÄ€ôÑ¥µ•mÍÁ±¥Ñ%‘át€´Ñ¥µ•lÁtì4(€€€€€½¹ÍĞÄ€ô‘¥ÍÑmÍÁ±¥Ñ%‘át€´‘¥ÍÑlÁtì4(€€€€€½¹ÍĞĞÈ€ôÑ¥µ•m¸€´€Åt€´Ñ¥µ•mÍÁ±¥Ñ%‘átì4(€€€€€½¹ÍĞÈ€ô‘¥ÍÑm¸€´€Åt€´‘¥ÍÑmÍÁ±¥Ñ%‘átì4(4(€€€€€±•ĞÍÁ±¥Ñ1…‰•°€ô€‰Ù•¸Á…¥¹œˆì4(€€€€€±•ĞÍÁ±¥Ñ•±Ñ…M•Œ€ô€Àì4(€€€€€¥˜€¡Ä€ø€À€˜˜È€ø€À€˜˜ĞÄ€ø€À€˜˜ĞÈ€ø€À¤ì4(€€€€€€€½¹ÍĞÁ…”Ä€ô€¡ĞÄ€¼Ä¤€¨Õ¹¥Ñ5•Ñ•ÉÌì€¼¼Í•ŒÁ•ÈÕ¹¥Ğ4(€€€€€€€½¹ÍĞÁ…”È€ô€¡ĞÈ€¼È¤€¨Õ¹¥Ñ5•Ñ•ÉÌì4(€€€€€€€ÍÁ±¥Ñ•±Ñ…M•Œ€ô5…Ñ ¹É½Õ¹¡Á…”È€´Á…”Ä¤ì4(€€€€€€€½¹ÍĞ…‰ÍL€ô5…Ñ ¹…‰Ì¡ÍÁ±¥Ñ•±Ñ…M•Œ¤ì4(€€€€€€€¥˜€¡ÍÁ±¥Ñ•±Ñ…M•Œ€ğô€´à¤ì4(€€€€€€€€€ÍÁ±¥Ñ1…‰•°€ô€‰9•…Ñ¥Ù”ÍÁ±¥Ğ€¡™¥¹¥Í¡•™…ÍÑ•È¤ˆì4(€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡A…¥¹œè¹•…Ñ¥Ù”ÍÁ±¥ĞƒŠPÑ¡”Í•½¹¡…±˜İ…Ì…‰½ÕĞ€‘í…‰ÍMõÌ¼‘íÕ¹¥Ñô™…ÍÑ•ÈÑ¡…¸Ñ¡”™¥ÉÍĞ¸MÑÉ½¹œ°½¹ÑÉ½±±••™™½ÉĞ¹€¤ì4(€€€€€€€ô•±Í”¥˜€¡ÍÁ±¥Ñ•±Ñ…M•Œ€øô€à¤ì4(€€€€€€€€€ÍÁ±¥Ñ1…‰•°€ô€‰A½Í¥Ñ¥Ù”ÍÁ±¥Ğ€¡™…‘•±…Ñ”¤ˆì4(€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡A…¥¹œè™…‘•…‰½ÕĞ€‘í…‰ÍMõÌ¼‘íÕ¹¥Ñô¥¸Ñ¡”Í•½¹¡…±˜¸1¥­•±äİ•¹Ğ½ÕĞÑ½¼¡½Ğ°½È™…Ñ¥Õ”½™Õ•±¥¹œ…Õ¡ĞÕÀ¹€¤ì4(€€€€€€€ô•±Í”ì4(€€€€€€€€€ÍÁ±¥Ñ1…‰•°€ô€‰Ù•¸Á…¥¹œˆì4(€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡A…¥¹œèÙ•Éä•Ù•¸ƒŠPİ¥Ñ¡¥¸€‘í…‰ÍMõÌ¼‘íÕ¹¥Ñô‰•Ñİ••¸Ñ¡”™¥ÉÍĞ…¹Í•½¹¡…±˜¹€¤ì4(€€€€€€€ô4(€€€€€ô4(4(€€€€€€¼¼•É½‰¥Œ‘•½ÕÁ±¥¹œ€¡A„é!H‘É¥™Ğ¤è¡½ÜµÕ Á…”µÁ•Èµ¡•…ÉÑ‰•…Ğ‘•É…‘•¥¸Ñ¡”‰…¬¡…±˜4(€€€€€±•Ğ‘•½ÕÁ±¥¹AĞè¹Õµ‰•Èğ¹Õ±°€ô¹Õ±°ì4(€€€€€¥˜€¡¡È¹±•¹Ñ €ôôô¸€˜˜Ä€ø€À€˜˜È€ø€À€˜˜ĞÄ€ø€À€˜˜ĞÈ€ø€À¤ì4(€€€€€€€½¹ÍĞ…Ùœ€ô€¡…ÉÈè¹Õµ‰•Émt°„è¹Õµ‰•È°ˆè¹Õµ‰•È¤€ôøì4(€€€€€€€€€±•ĞÌ€ô€À°Œ€ô€Àì4(€€€€€€€€€™½È€¡±•Ğ¤€ô„ì¤€ğˆì¤¬¬¤ì¥˜€¡9Õµ‰•È¹¥Í¥¹¥Ñ”¡…ÉÉm¥t¤€˜˜…ÉÉm¥t€ø€À¤ìÌ€¬ô…ÉÉm¥tìŒ¬¬ìôô4(€€€€€€€€€É•ÑÕÉ¸Œ€üÌ€¼Œ€è€Àì4(€€€€€€€ôì4(€€€€€€€½¹ÍĞ¡ÈÄ€ô…Ùœ¡¡È°€À°ÍÁ±¥Ñ%‘à¤ì4(€€€€€€€½¹ÍĞ¡ÈÈ€ô…Ùœ¡¡È°ÍÁ±¥Ñ%‘à°¸¤ì4(€€€€€€€½¹ÍĞÍÀÄ€ôÄ€¼ĞÄì€¼¼´½Ì4(€€€€€€€½¹ÍĞÍÀÈ€ôÈ€¼ĞÈì4(€€€€€€€¥˜€¡¡ÈÄ€ø€À€˜˜¡ÈÈ€ø€À¤ì4(€€€€€€€€€½¹ÍĞÉ…Ñ¥¼Ä€ôÍÀÄ€¼¡ÈÄì4(€€€€€€€€€½¹ÍĞÉ…Ñ¥¼È€ôÍÀÈ€¼¡ÈÈì4(€€€€€€€€€‘•½ÕÁ±¥¹AĞ€ô5…Ñ ¹É½Õ¹  ¡É…Ñ¥¼Ä€´É…Ñ¥¼È¤€¼É…Ñ¥¼Ä¤€¨€ÄÀÀÀ¤€¼€ÄÀì4(€€€€€€€€€¥˜€¡‘•½ÕÁ±¥¹AĞ€ø€Ô¤ì4(€€€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡•É½‰¥Œ‘•½ÕÁ±¥¹œè€‘í‘•½ÕÁ±¥¹AÑô”ƒŠP¡•…ÉĞÉ…Ñ”‘É¥™Ñ•ÕÀÉ•±…Ñ¥Ù”Ñ¼Á…”€¡…‰½Ù”Ñ¡”øÔ”‘ÕÉ…‰¥±¥ÑäÑ¡É•Í¡½±¤¸Q¡”•™™½ÉĞİ…Ì‰•å½¹„½µ™½ÉÑ…‰±”…•É½‰¥Œé½¹”°½È…•É½‰¥Œ‘ÕÉ…‰¥±¥Ñä¥ÌÑ¡”ÕÉÉ•¹Ğ±¥µ¥Ñ•È¹€¤ì4(€€€€€€€€€ô•±Í”¥˜€¡‘•½ÕÁ±¥¹AĞ€øô€À¤ì4(€€€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡•É½‰¥Œ‘•½ÕÁ±¥¹œè€‘í‘•½ÕÁ±¥¹AÑô”ƒŠPİ•±°½ÕÁ±•€¡Õ¹‘•È€Ô”¤¸½½…•É½‰¥Œ‘ÕÉ…‰¥±¥Ñäì!H¡•±ÍÑ•…‘ä……¥¹ÍĞÁ…”¹€¤ì4(€€€€€€€€€ô•±Í”ì4(€€€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡•É½‰¥Œ‘•½ÕÁ±¥¹œè€‘í‘•½ÕÁ±¥¹AÑô”ƒŠPÁ…”µÁ•Èµ¡•…ÉÑ‰•…Ğ…ÑÕ…±±ä¥µÁÉ½Ù•±…Ñ”€¡İ…Éµ•¥¹Ñ¼¥Ğ¹¥•±ä¤¹€¤ì4(€€€€€€€€€ô4(€€€€€€€ô4(€€€€€ô4(4(€€€€€€¼¼…ÍÑ•ÍĞÍ¥¹±”­´€¼µ¥±”¸Qİ¼µÁ½¥¹Ñ•Èİ¥¹‘½Ü½Ù•ÈÕµÕ±…Ñ¥Ù”‘¥ÍÑ…¹”°4(€€€€€€¼¼¥¹Ñ•ÉÁ½±…Ñ¥¹œÑ¡”Ñ¥µ”…ĞÑ¡”•á…ĞÕ¹¥Ğ‰½Õ¹‘…ÉäÍ¼Ñ¡”ÍÁ±¥ĞÉ•™±•ÑÌ„4(€€€€€€¼¼ÑÉÕ”Í¥¹±”µÕ¹¥ĞÁ…”É…Ñ¡•ÈÑ¡…¸…¸½Ù•Èµ±½¹œ€¡…¹Ñ¡ÕÌÑ½¼µÍ±½Ü¤İ¥¹‘½Ü¸4(€€€€€±•Ğ™…ÍÑ•ÍÑMÁ±¥ÑA…”èÍÑÉ¥¹œğ¹Õ±°€ô¹Õ±°ì4(€€€€€¥˜€¡Ñ½Ñ…±¥ÍĞ€øôÕ¹¥Ñ5•Ñ•ÉÌ¤ì4(€€€€€€€±•Ğ‰•ÍĞ€ô%¹™¥¹¥Ñäì4(€€€€€€€±•Ğ¨€ô€Äì4(€€€€€€€™½È€¡±•Ğ¤€ô€Àì¤€ğ¸ì¤¬¬¤ì4(€€€€€€€€€¥˜€¡¨€ğô¤¤¨€ô¤€¬€Äì4(€€€€€€€€€½¹ÍĞÑ…É•Ğ€ô‘¥ÍÑm¥t€¬Õ¹¥Ñ5•Ñ•ÉÌì4(€€€€€€€€€İ¡¥±”€¡¨€ğ¸€˜˜‘¥ÍÑm©t€ğÑ…É•Ğ¤¨¬¬ì4(€€€€€€€€€¥˜€¡¨€øô¸¤‰É•…¬ì4(€€€€€€€€€½¹ÍĞ‘AÉ•Ø€ô‘¥ÍÑm¨€´€Åtì4(€€€€€€€€€½¹ÍĞ‘•¹½´€ô‘¥ÍÑm©t€´‘AÉ•Øì4(€€€€€€€€€½¹ÍĞ™É…Œ€ô‘•¹½´€ø€À€ü€¡Ñ…É•Ğ€´‘AÉ•Ø¤€¼‘•¹½´€è€Àì4(€€€€€€€€€½¹ÍĞÑÑQ…É•Ğ€ôÑ¥µ•m¨€´€Åt€¬™É…Œ€¨€¡Ñ¥µ•m©t€´Ñ¥µ•m¨€´€Åt¤ì4(€€€€€€€€€½¹ÍĞ‘Ğ€ôÑÑQ…É•Ğ€´Ñ¥µ•m¥tì4(€€€€€€€€€¥˜€¡‘Ğ€ø€À€˜˜‘Ğ€ğ‰•ÍĞ¤‰•ÍĞ€ô‘Ğì4(€€€€€€€ô4(€€€€€€€¥˜€¡‰•ÍĞ€„ôô%¹™¥¹¥Ñä¤ì4(€€€€€€€€€½¹ÍĞÑ½Ñ…±M•Œ€ô5…Ñ ¹É½Õ¹¡‰•ÍĞ¤ì4(€€€€€€€€€½¹ÍĞ´€ô5…Ñ ¹™±½½È¡Ñ½Ñ…±M•Œ€¼€ØÀ¤ì4(€€€€€€€€€½¹ÍĞÌ€ôÑ½Ñ…±M•Œ€”€ØÀì4(€€€€€€€€€™…ÍÑ•ÍÑMÁ±¥ÑA…”€ô€‘íµôè‘íMÑÉ¥¹œ¡Ì¤¹Á…‘MÑ…ÉĞ È°€ˆÀˆ¥ô€¼‘íÕ¹¥Ñõ€ì4(€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡…ÍÑ•ÍĞ€‘íÕ¹¥Ñôè€‘í™…ÍÑ•ÍÑMÁ±¥ÑA…•ô¹€¤ì4(€€€€€€€ô4(€€€€€ô4(4(€€€€€€¼¼Ù•É…”…‘•¹”€¡MÑÉ…Ù„É•Á½ÉÑÌÁ•Èµ±•œIA4ì‘½Õ‰±”™½ÈÍÑ•ÁÌ½µ¥¸¤4(€€€€€±•Ğ…Ù…‘•¹”è¹Õµ‰•Èğ¹Õ±°€ô¹Õ±°ì4(€€€€€¥˜€¡…¹±•¹Ñ ¤ì4(€€€€€€€½¹ÍĞÙ…±¥€ô…¹™¥±Ñ•È¡Œ€ôø9Õµ‰•È¹¥Í¥¹¥Ñ”¡Œ¤€˜˜Œ€ø€À¤ì4(€€€€€€€¥˜€¡Ù…±¥¹±•¹Ñ ¤ì4(€€€€€€€€€…Ù…‘•¹”€ô5…Ñ ¹É½Õ¹ ¡Ù…±¥¹É•‘Õ” ¡„°ˆ¤€ôø„€¬ˆ°€À¤€¼Ù…±¥¹±•¹Ñ ¤€¨€È¤ì4(€€€€€€€€€ÍÕµµ…Éå1¥¹•Ì¹ÁÕÍ ¡Ù•É…”…‘•¹”è€‘í…Ù…‘•¹•ôÍÁ´¹€¤ì4(€€€€€€€ô4(€€€€€ô4(4(€€€€€¥˜€ …ÍÕµµ…Éå1¥¹•Ì¹±•¹Ñ ¤É•ÑÕÉ¸¹Õ±°ì4(€€€€€É•ÑÕÉ¸ìÍÁ±¥Ñ1…‰•°°ÍÁ±¥Ñ•±Ñ…M•Œ°‘•½ÕÁ±¥¹AĞ°™…ÍÑ•ÍÑMÁ±¥ÑA…”°…Ù…‘•¹”°ÍÕµµ…Éå1¥¹•Ìôì4(€€€ô…Ñ €¡•ÉÈ¤ì4(€€€€€½¹Í½±”¹İ…É¸ ‰mMÑÉ…Ù„]•‰¡½½­tMÑÉ•…´…¹…±åÍ¥Ì™…¥±•èˆ°•ÉÈ¤ì4(€€€€€É•ÑÕÉ¸¹Õ±°ì4(€€€ô4(€ô4(4(€ÁÉ¥Ù…Ñ”…±Õ±…Ñ•™™½ÉÑM½É”¡…Ñ¥Ù¥Ñäè…¹ä¤è¹Õµ‰•Èì4(€€€±•ĞÍ½É”€ô€ÔÀì4(€€€€4(€€€¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”¤ì4(€€€€€¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”€ø€ÄÜÀ¤Í½É”€¬ô€ÈÔì4(€€€€€•±Í”¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”€ø€ÄÔÔ¤Í½É”€¬ô€ÄÔì4(€€€€€•±Í”¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”€ø€ÄĞÀ¤Í½É”€¬ô€àì4(€€€€€•±Í”Í½É”€¬ô€Ìì4(€€€ô4(€€€€4(€€€½¹ÍĞ‘¥ÍÑ…¹•-´€ô…Ñ¥Ù¥Ñä¹‘¥ÍÑ…¹”€¼€ÄÀÀÀì4(€€€¥˜€¡‘¥ÍÑ…¹•-´€øô€ÈÀ¤Í½É”€¬ô€ÈÀì4(€€€•±Í”¥˜€¡‘¥ÍÑ…¹•-´€øô€ÄÔ¤Í½É”€¬ô€ÄÔì4(€€€•±Í”¥˜€¡‘¥ÍÑ…¹•-´€øô€ÄÀ¤Í½É”€¬ô€ÄÀì4(€€€•±Í”¥˜€¡‘¥ÍÑ…¹•-´€øô€Ô¤Í½É”€¬ô€Ôì4(€€€€4(€€€¥˜€¡…Ñ¥Ù¥Ñä¹Ñ½Ñ…±}•±•Ù…Ñ¥½¹}…¥¸€ø€ÈÀÀ¤Í½É”€¬ô€ÄÀì4(€€€•±Í”¥˜€¡…Ñ¥Ù¥Ñä¹Ñ½Ñ…±}•±•Ù…Ñ¥½¹}…¥¸€ø€ÄÀÀ¤Í½É”€¬ô€Ôì4(€€€€4(€€€½¹ÍĞÁ…•A•É-´€ô…Ñ¥Ù¥Ñä¹µ½Ù¥¹}Ñ¥µ”€¼€ØÀ€¼‘¥ÍÑ…¹•-´ì4(€€€¥˜€¡Á…•A•É-´€ğ€Ğ¸Ô¤Í½É”€¬ô€ÄÔì4(€€€•±Í”¥˜€¡Á…•A•É-´€ğ€Ô¤Í½É”€¬ô€ÄÀì4(€€€•±Í”¥˜€¡Á…•A•É-´€ğ€Ô¸Ô¤Í½É”€¬ô€Ôì4(€€€€4(€€€É•ÑÕÉ¸5…Ñ ¹µ¥¸ ÄÀÀ°5…Ñ ¹µ…à À°Í½É”¤¤ì4(€ô4(4(€ÁÉ¥Ù…Ñ”‘•Ñ•ÑIÕ¹QåÁ”¡…Ñ¥Ù¥Ñäè…¹ä°‘¥ÍÑ…¹•-´è¹Õµ‰•È¤èÍÑÉ¥¹œì4(€€€½¹ÍĞÁ…•A•É-´€ô…Ñ¥Ù¥Ñä¹µ½Ù¥¹}Ñ¥µ”€¼€ØÀ€¼‘¥ÍÑ…¹•-´ì4(€€€€4(€€€¥˜€¡‘¥ÍÑ…¹•-´€øô€ÌÀ¤É•ÑÕÉ¸€‰U±ÑÉ„¥ÍÑ…¹”ˆì4(€€€¥˜€¡‘¥ÍÑ…¹•-´€øô€ÈÀ¤É•ÑÕÉ¸€‰1½¹œIÕ¸ˆì4(€€€¥˜€¡‘¥ÍÑ…¹•-´€øô€ÄÔ¤É•ÑÕÉ¸€‰AÉ½É•ÍÍ¥Ù”1½¹œIÕ¸ˆì4(€€€€4(€€€¥˜€¡…Ñ¥Ù¥Ñä¹İ½É­½ÕÑ}ÑåÁ”€ôôô€Ì¤É•ÑÕÉ¸€‰]½É­½ÕĞˆì4(€€€¥˜€¡…Ñ¥Ù¥Ñä¹İ½É­½ÕÑ}ÑåÁ”€ôôô€Ä¤É•ÑÕÉ¸€‰I…”ˆì4(€€€€4(€€€¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”¤ì4(€€€€€¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”€ø€ÄØÔ¤É•ÑÕÉ¸€‰Q•µÁ¼IÕ¸ˆì4(€€€€€¥˜€¡…Ñ¥Ù¥Ñä¹…Ù•É…•}¡•…ÉÑÉ…Ñ”€ğ€ÄÌÀ¤É•ÑÕÉ¸€‰I•½Ù•ÉäIÕ¸ˆì4(€€€ô4(€€€€4(€€€¥˜€¡Á…•A•É-´€ğ€Ğ¸Ô¤É•ÑÕÉ¸€‰MÁ••M•ÍÍ¥½¸ˆì4(€€€¥˜€¡Á…•A•É-´€ø€Ø¸Ô¤É•ÑÕÉ¸€‰…ÍäIÕ¸ˆì4(€€€€4(€€€¥˜€¡‘¥ÍÑ…¹•-´€øô€à¤É•ÑÕÉ¸€‰MÑ•…‘äIÕ¸ˆì4(€€€¥˜€¡‘¥ÍÑ…¹•-´€ğ€Ô¤É•ÑÕÉ¸€‰EÕ¥¬IÕ¸ˆì4(€€€€4(€€€É•ÑÕÉ¸€‰QÉ…¥¹¥¹œIÕ¸ˆì4(€ô4)ô4(4)•áÁ½ÉĞ½¹ÍĞÍÑÉ…Ù…]•‰¡½½­M•ÉÙ¥”€ô¹•ÜMÑÉ…Ù…]•‰¡½½­M•ÉÙ¥” ¤ì4