import { storage, RUNNING_ACTIVITY_TYPES } from "../storage";
import { emailService } from "./email";
import { stravaWebhookService } from "./stravaWebhook";
import { authService } from "./auth";
import { db } from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

const BASE_URL = process.env.APP_URL || "https://aitracker.run";
const WORKER_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const SENT_KEY = "weekly_summary_last_sent_date"; // stored as YYYY-MM-DD UTC

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key",
});

type RawActivity = {
  strava_id: string | null;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  average_heartrate: number | null;
  start_date: string | Date;
  type: string;
};

function inRange(a: RawActivity, from: Date, to: Date): boolean {
  const d = new Date(a.start_date);
  return d >= from && d <= to;
}

async function generateNarrative(params: {
  firstName: string | null;
  totalRuns: number;
  totalDistanceM: number;
  priorDistanceM: number;
  unitPreference: "km" | "miles";
  planInfo: string | null;
  weekStr: string;
}): Promise<string | null> {
  const { firstName, totalRuns, totalDistanceM, priorDistanceM, unitPreference, planInfo, weekStr } = params;
  if (totalRuns === 0) return null;

  const METERS_PER_MILE = 1609.344;
  const fmtDist = (m: number) =>
    unitPreference === "miles"
      ? `${(m / METERS_PER_MILE).toFixed(1)} miles`
      : `${(m / 1000).toFixed(1)} km`;

  const changeText =
    priorDistanceM === 0
      ? ""
      : totalDistanceM >= priorDistanceM
      ? `up ${fmtDist(totalDistanceM - priorDistanceM)} vs last week`
      : `down ${fmtDist(priorDistanceM - totalDistanceM)} vs last week`;

  const prompt = [
    `Runner${firstName ? ` ${firstName}` : ""} logged ${totalRuns} run${totalRuns !== 1 ? "s" : ""} for ${fmtDist(totalDistanceM)} the week of ${weekStr}${changeText ? `, ${changeText}` : ""}.`,
    planInfo ? `Training context: ${planInfo}.` : "",
    "Write exactly one encouraging sentence (max 25 words) that celebrates this week and sets a forward-looking tone for next week.",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: "You are a supportive running coach writing motivational weekly recap emails. Be concise and personal." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 60,
      temperature: 0.7,
    });
    return resp.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.warn("[WeeklySummary] AI narrative failed:", (err as any)?.message);
    return null;
  }
}

export interface WeeklySummaryResult {
  sent: number;
  skipped: number;
  errors: number;
  total: number;
}

export async function sendWeeklySummaries(refDate?: Date): Promise<WeeklySummaryResult> {
  const ref = refDate ?? new Date();

  // Build last week's Mon 00:00 – Sun 23:59 UTC
  const today = new Date(ref);
  today.setUTCHours(0, 0, 0, 0);
  const dow = today.getUTCDay(); // 0=Sun … 6=Sat

  // weekEnd = last Sunday
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(today.getUTCDate() - (dow === 0 ? 1 : dow - 1) - 1);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekEnd.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Prior week: Mon-Sun immediately before weekStart
  const priorEnd = new Date(weekStart);
  priorEnd.setUTCMilliseconds(-1);
  const priorStart = new Date(priorEnd);
  priorStart.setUTCDate(priorEnd.getUTCDate() - 6);
  priorStart.setUTCHours(0, 0, 0, 0);

  // Grid: last 52 weeks
  const gridStart = new Date(weekEnd);
  gridStart.setUTCDate(weekEnd.getUTCDate() - 52 * 7);

  const runTypesArray = RUNNING_ACTIVITY_TYPES;
  const runTypesPlaceholders = runTypesArray.map((_, i) => `$${i + 2}`).join(", ");

  // Fetch opted-in users with email
  const optedInResult = await db.execute(sql`
    SELECT id, email, first_name, unit_preference
    FROM users
    WHERE coach_notify_weekly_summary = true
      AND email IS NOT NULL
      AND email != ''
    ORDER BY id
  `);

  type UserRow = {
    id: number;
    email: string;
    first_name: string | null;
    unit_preference: string | null;
  };

  const userList = (optedInResult.rows ?? []) as UserRow[];
  console.log(`[WeeklySummary] Sending to ${userList.length} opted-in users. Week: ${weekStart.toISOString()} – ${weekEnd.toISOString()}`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const u of userList) {
    try {
      // Fetch running activities in the 52-week window for this user
      const actsResult = await db.execute(sql`
        SELECT strava_id, name, distance, moving_time, total_elevation_gain, average_heartrate, start_date, type
        FROM activities
        WHERE user_id = ${u.id}
          AND start_date >= ${gridStart.toISOString()}
          AND type = ANY(${sql.raw(`ARRAY[${runTypesArray.map(t => `'${t}'`).join(",")}]`)})
        ORDER BY start_date DESC
      `);

      const allActivities = (actsResult.rows ?? []) as RawActivity[];

      const weekActs = allActivities.filter(a => inRange(a, weekStart, weekEnd));
      const priorActs = allActivities.filter(a => inRange(a, priorStart, priorEnd));

      const sumDist = (acts: RawActivity[]) => acts.reduce((s, a) => s + (a.distance ?? 0), 0);
      const sumTime = (acts: RawActivity[]) => acts.reduce((s, a) => s + (a.moving_time ?? 0), 0);
      const sumElev = (acts: RawActivity[]) => acts.reduce((s, a) => s + (a.total_elevation_gain ?? 0), 0);

      const totalDistanceM = sumDist(weekActs);
      const priorDistanceM = sumDist(priorActs);

      // Avg HR: average of per-run avg_heartrate where it exists
      const hrRuns = weekActs.filter(a => a.average_heartrate && a.average_heartrate > 0);
      const avgHeartrateWeek =
        hrRuns.length > 0
          ? Math.round(hrRuns.reduce((s, a) => s + (a.average_heartrate ?? 0), 0) / hrRuns.length)
          : null;

      // Top run = longest by distance
      const topRunRaw =
        weekActs.length > 0
          ? weekActs.reduce((best, a) => (a.distance > best.distance ? a : best))
          : null;

      // Build activity magic link for top run
      let topRunActivityUrl: string | null = null;
      if (topRunRaw?.strava_id) {
        topRunActivityUrl = await authService.wrapWithEmailMagicLink(
          u.email,
          `/activity/${topRunRaw.strava_id}`,
          BASE_URL
        );
      }

      // Activity grid: group by ISO date
      const gridDayMap = new Map<string, number>();
      for (const a of allActivities) {
        const key = new Date(a.start_date).toISOString().slice(0, 10);
        gridDayMap.set(key, (gridDayMap.get(key) ?? 0) + (a.distance ?? 0));
      }
      const gridDays = Array.from(gridDayMap.entries()).map(([date, distanceM]) => ({ date, distanceM }));

      // Active training plan
      let activePlan: {
        goalType: string;
        currentWeek: number;
        totalWeeks: number;
        plannedDistanceKm: number;
        completedDistanceKm: number;
        adherenceScore: number | null;
        phaseName: string | null;
      } | null = null;

      let planInfoLine: string | null = null;
      try {
        const plan = await storage.getActiveTrainingPlan(u.id);
        if (plan) {
          const planWeeks = await storage.getPlanWeeks(plan.id);
          const currentWeekNum = plan.currentWeek ?? 1;
          const currentWeekData = planWeeks.find(w => w.weekNumber === currentWeekNum);
          activePlan = {
            goalType: plan.goalType,
            currentWeek: currentWeekNum,
            totalWeeks: plan.totalWeeks,
            plannedDistanceKm: currentWeekData?.plannedDistanceKm ?? 0,
            completedDistanceKm: currentWeekData?.completedDistanceKm ?? 0,
            adherenceScore: currentWeekData?.adherenceScore ?? null,
            phaseName: currentWeekData?.phaseName ?? null,
          };
          planInfoLine = `Week ${currentWeekNum} of ${plan.totalWeeks} ${plan.goalType} plan`;
        }
      } catch (_) {}

      // AI narrative
      const weekLabel = (d: Date) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const weekStr = `${weekLabel(weekStart)} – ${weekLabel(weekEnd)}`;

      const aiNarrative = await generateNarrative({
        firstName: u.first_name,
        totalRuns: weekActs.length,
        totalDistanceM,
        priorDistanceM,
        unitPreference: (u.unit_preference as "km" | "miles") ?? "miles",
        planInfo: planInfoLine,
        weekStr,
      });

      const unsubToken = stravaWebhookService.generateWeeklyUnsubscribeToken(u.id);
      const unsubscribeUrl = `${BASE_URL}/api/notifications/unsubscribe-weekly?token=${unsubToken}`;
      const dashboardUrl = await authService.wrapWithEmailMagicLink(u.email, "/dashboard", BASE_URL);

      const ok = await emailService.sendWeeklySummaryEmail({
        to: u.email,
        firstName: u.first_name,
        unitPreference: (u.unit_preference as "km" | "miles") ?? "miles",
        weekStart,
        weekEnd,
        totalRuns: weekActs.length,
        totalDistanceM,
        totalTimeSec: sumTime(weekActs),
        totalElevationM: sumElev(weekActs),
        priorRuns: priorActs.length,
        priorDistanceM,
        priorTimeSec: sumTime(priorActs),
        priorElevationM: sumElev(priorActs),
        avgHeartrateWeek,
        gridDays,
        topRun: topRunRaw
          ? {
              name: topRunRaw.name,
              distanceM: topRunRaw.distance,
              movingTimeSec: topRunRaw.moving_time,
              avgHeartrate: topRunRaw.average_heartrate,
              activityUrl: topRunActivityUrl ?? dashboardUrl,
            }
          : null,
        activePlan,
        aiNarrative,
        unsubscribeUrl,
        dashboardUrl,
      });

      if (ok) {
        sent++;
      } else {
        skipped++;
      }

      // Stagger sends to stay within Resend rate limits
      await new Promise(r => setTimeout(r, 300));
    } catch (userErr) {
      console.error(`[WeeklySummary] Failed for user ${u.id}:`, userErr);
      errors++;
    }
  }

  console.log(`[WeeklySummary] Done: ${sent} sent, ${skipped} skipped, ${errors} errors`);
  return { sent, skipped, errors, total: userList.length };
}

// ─── Monday scheduler ────────────────────────────────────────────────────────

class WeeklySummaryWorker {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    if (this.intervalId) {
      console.log("[WeeklySummary] Worker already running");
      return;
    }
    // First check 60 s after boot (avoids startup storms)
    setTimeout(() => this.check(), 60_000);
    this.intervalId = setInterval(() => this.check(), WORKER_INTERVAL_MS);
    console.log("[WeeklySummary] Worker started — checks every hour, sends on Monday UTC");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async check(): Promise<void> {
    try {
      const now = new Date();
      const dow = now.getUTCDay();
      if (dow !== 1) return; // Not Monday (UTC)

      const todayStr = now.toISOString().slice(0, 10);
      const lastSentDate = await storage.getSystemSetting(SENT_KEY);
      if (lastSentDate === todayStr) {
        return; // Already sent today
      }

      console.log("[WeeklySummary] Monday detected — sending weekly summaries");
      const result = await sendWeeklySummaries(now);
      await storage.setSystemSetting(SENT_KEY, todayStr);
      console.log(`[WeeklySummary] Auto-send done: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`);
    } catch (err) {
      console.error("[WeeklySummary] Worker check failed:", err);
    }
  }
}

export const weeklySummaryWorker = new WeeklySummaryWorker();
