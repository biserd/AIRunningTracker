import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { canAccessCapability } from "@shared/entitlements";
import type { User } from "@shared/schema";
import { isStrongApplicationSecret } from "../config/security";

const HOUR_MS = 60 * 60 * 1000;
const WORKER_INTERVAL_MS = HOUR_MS;
const EVENT_TIMEOUT_MS = 5_000;

export async function ensureProactiveCoachSchema(): Promise<void> {
  const statements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_enabled boolean DEFAULT true`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_timezone text DEFAULT 'UTC'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_briefing_enabled boolean DEFAULT true`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_briefing_hour integer DEFAULT 7`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_weather_enabled boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_weather_location jsonb`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_preferred_channel text DEFAULT 'email'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_snoozed_until timestamp`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_availability text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_daily_availability_date text`,
    `ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS processing_started_at timestamp`,
    `CREATE TABLE IF NOT EXISTS coach_message_feedback (
      id serial PRIMARY KEY,
      user_id integer NOT NULL,
      notification_id integer NOT NULL,
      rating text NOT NULL,
      reason text,
      created_at timestamp DEFAULT now(),
      UNIQUE(user_id, notification_id)
    )`,
    `CREATE INDEX IF NOT EXISTS coach_message_feedback_user_id_idx ON coach_message_feedback(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS coach_message_feedback_user_notification_idx ON coach_message_feedback(user_id, notification_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_dedupe_unique_idx ON notification_outbox(dedupe_key)`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error: any) {
      if (statement.includes("notification_outbox_dedupe_unique_idx") && error?.code === "23505") {
        console.warn("[ProactiveCoach] Existing duplicate notification keys prevented unique-index creation; advisory-lock dedupe remains active until rows are reconciled.");
        continue;
      }
      throw error;
    }
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "long",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    weekday: value("weekday").toLowerCase(),
  };
}

export function localDateKey(date: Date, timezone: string): string {
  return localParts(date, timezone).date;
}

export function isInQuietHours(user: Pick<User, "coachQuietHoursStart" | "coachQuietHoursEnd" | "coachTimezone">, now = new Date()): boolean {
  const start = user.coachQuietHoursStart;
  const end = user.coachQuietHoursEnd;
  if (start == null || end == null || start === end) return false;
  const hour = localParts(now, user.coachTimezone || "UTC").hour;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function nextQuietHoursEnd(user: Pick<User, "coachQuietHoursEnd" | "coachTimezone">, now = new Date()): Date {
  const endHour = user.coachQuietHoursEnd ?? 7;
  for (let offset = 1; offset <= 30; offset++) {
    const candidate = new Date(now.getTime() + offset * HOUR_MS);
    if (localParts(candidate, user.coachTimezone || "UTC").hour === endHour) return candidate;
  }
  return new Date(now.getTime() + 8 * HOUR_MS);
}

type WeatherSummary = {
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationProbability: number;
  windKph: number;
  weatherCode: number;
  observedFor: string;
};

async function getWeather(user: User, now: Date): Promise<WeatherSummary | null> {
  const location = user.coachWeatherLocation as { latitude?: number; longitude?: number } | null;
  if (!user.coachWeatherEnabled || !location || typeof location.latitude !== "number" || typeof location.longitude !== "number") return null;
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    forecast_days: "1",
    timezone: user.coachTimezone || "UTC",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!response.ok) return null;
    const payload: any = await response.json();
    const targetHour = localParts(now, user.coachTimezone || "UTC").hour;
    const summary = {
      temperatureC: Number(payload.hourly?.temperature_2m?.[targetHour]),
      apparentTemperatureC: Number(payload.hourly?.apparent_temperature?.[targetHour]),
      precipitationProbability: Number(payload.hourly?.precipitation_probability?.[targetHour]),
      windKph: Number(payload.hourly?.wind_speed_10m?.[targetHour]),
      weatherCode: Number(payload.hourly?.weather_code?.[targetHour]),
      observedFor: String(payload.hourly?.time?.[targetHour] || ""),
    };
    return [summary.temperatureC, summary.apparentTemperatureC, summary.precipitationProbability, summary.windKph, summary.weatherCode].every(Number.isFinite)
      ? summary
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function weatherCue(weather: WeatherSummary | null): string | null {
  if (!weather) return null;
  if (weather.weatherCode >= 95) return "Thunderstorms are forecast. Move the run indoors or delay it; do not run near lightning.";
  if (weather.apparentTemperatureC >= 30) return `It will feel near ${Math.round(weather.apparentTemperatureC)}°C. Run by effort, choose shade, and carry fluids for a longer session.`;
  if (weather.apparentTemperatureC <= -5) return `It will feel near ${Math.round(weather.apparentTemperatureC)}°C. Extend the warm-up and use a safe, grippy route.`;
  if (weather.precipitationProbability >= 60) return `${weather.precipitationProbability}% rain chance. Use a grippy route and keep the effort flexible.`;
  if (weather.windKph >= 30) return `Winds near ${Math.round(weather.windKph)} km/h. Run by effort and avoid judging the session by pace.`;
  return `Conditions look manageable at about ${Math.round(weather.temperatureC)}°C; no weather adjustment is needed.`;
}

function planDateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

async function buildMorningMessage(user: User, now: Date) {
  const timezone = user.coachTimezone || "UTC";
  const local = localParts(now, timezone);
  const [plan, recent, weather] = await Promise.all([
    storage.getActiveTrainingPlan(user.id),
    storage.getActivitiesByUserId(user.id, 20, new Date(now.getTime() - 28 * 86400000)),
    getWeather(user, now),
  ]);
  const planDays = plan ? await storage.getPlanDaysByPlanId(plan.id) : [];
  const today = planDays.find((day) => planDateKey(day.date) === local.date) || null;
  const yesterdayDate = localParts(new Date(now.getTime() - 24 * HOUR_MS), timezone).date;
  const missed = planDays.find((day) => planDateKey(day.date) === yesterdayDate && day.status === "pending") || null;
  const raceDays = user.coachRaceDate ? Math.ceil((new Date(user.coachRaceDate).getTime() - now.getTime()) / (24 * HOUR_MS)) : null;
  const raceWeek = raceDays != null && raceDays >= 0 && raceDays <= 7;
  const availability = user.coachDailyAvailabilityDate === local.date ? user.coachDailyAvailability : null;
  const lastRun = recent.find((activity) => activity.type?.includes("Run")) || null;
  const daysSinceRun = lastRun ? Math.max(0, Math.floor((now.getTime() - new Date(lastRun.startDate).getTime()) / (24 * HOUR_MS))) : null;
  const weatherLine = weatherCue(weather);

  let headline = "Keep today simple";
  let action = today ? `${today.title || today.workoutType}: ${today.description || "follow the planned effort"}.` : "No workout is scheduled today; recovery is a valid training choice.";
  const reasons: string[] = [];
  if (availability === "unavailable") {
    headline = "No run today—protect the week";
    action = "Skip today's workout. Do not stack it onto tomorrow; resume with the next planned session.";
    reasons.push("You marked today unavailable.");
  } else if (availability === "limited") {
    headline = "Use the short version today";
    action = today ? `Keep ${today.title || "the session"} easy and cap it at 30 minutes.` : "If useful, take a 20–30 minute easy run or walk; otherwise rest.";
    reasons.push("You marked today as limited.");
  } else if (raceWeek) {
    headline = raceDays === 0 ? "Race day: calm and familiar" : `${raceDays} day${raceDays === 1 ? "" : "s"} to race day`;
    reasons.push("Fitness is already built; freshness and familiar routines matter most now.");
    if (!today) action = "Keep movement light, prepare logistics, and avoid adding a new workout.";
  } else if (missed) {
    headline = "Leave yesterday's missed run behind";
    reasons.push(`${missed.title || "A planned workout"} was not completed yesterday.`);
    action = today ? `Do today's ${today.title || "planned session"}; do not add the missed mileage.` : "Resume with the next planned day; do not make up the session today.";
  } else if (today) {
    headline = `Today's run: ${today.title || today.workoutType || "planned session"}`;
    reasons.push(daysSinceRun == null ? "There is no recent run context yet." : `Your last recorded run was ${daysSinceRun} day${daysSinceRun === 1 ? "" : "s"} ago.`);
  }
  if (weatherLine) reasons.push(weatherLine);
  return {
    title: headline,
    body: `${reasons.slice(0, 2).join(" ")} ${action}${availability ? "" : " Tap your dashboard check-in if today is limited or unavailable."}`.trim(),
    data: { kind: raceWeek ? "race_week" : missed ? "missed_workout" : "morning_briefing", weather, planDayId: today?.id ?? null, availability },
  };
}

async function enqueueMorningBriefing(user: User, now = new Date()): Promise<boolean> {
  if (!canAccessCapability(user, "ai_coach") || !user.coachEnabled || !user.coachOnboardingCompleted || !user.coachDailyBriefingEnabled) return false;
  if (user.coachSnoozedUntil && new Date(user.coachSnoozedUntil) > now) return false;
  const timezone = user.coachTimezone || "UTC";
  const local = localParts(now, timezone);
  if (local.hour !== (user.coachDailyBriefingHour ?? 7) || isInQuietHours(user, now)) return false;
  const dedupeKey = `coach:morning:${user.id}:${local.date}`;
  if (await storage.getNotificationByDedupeKey(dedupeKey)) return false;
  const message = await buildMorningMessage(user, now);
  await storage.createNotification({
    userId: user.id,
    type: message.data.kind as "morning_briefing" | "missed_workout" | "race_week",
    channel: user.coachPreferredChannel || "email",
    title: message.title,
    body: message.body,
    data: { ...message.data, url: "/dashboard", generatedAt: now.toISOString() },
    dedupeKey,
    respectQuietHours: true,
  });
  return true;
}

export async function runMorningBriefings(now = new Date()) {
  await ensureProactiveCoachSchema();
  const result = await db.execute(sql`SELECT id FROM users WHERE coach_enabled = true AND coach_daily_briefing_enabled = true AND coach_onboarding_completed = true`);
  let queued = 0;
  let skipped = 0;
  for (const row of result.rows as Array<{ id: number }>) {
    const user = await storage.getUser(row.id);
    if (user && await enqueueMorningBriefing(user, now)) queued++;
    else skipped++;
  }
  return { queued, skipped };
}

export async function emitSignedCoachEvent(event: { activityId: number; userId: number; occurredAt?: Date }): Promise<boolean> {
  const url = process.env.COACH_AGENT_WEBHOOK_URL;
  const secret = process.env.COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2;
  if (!url || !secret) return false;
  if (!isStrongApplicationSecret(secret)) {
    console.warn("[CoachWebhook] Delivery disabled because COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2 is too weak.");
    return false;
  }

  // Until per-runner Telegram/Hermes bindings exist, this legacy webhook is
  // deliberately restricted to one explicitly configured pilot runner. This
  // prevents a shared Hermes instance from receiving events for every paid
  // account and selecting a tenant token heuristically.
  const pilotUserId = Number(process.env.COACH_AGENT_PILOT_USER_ID);
  if (!Number.isSafeInteger(pilotUserId) || pilotUserId <= 0 || pilotUserId !== event.userId) return false;

  const occurredAt = event.occurredAt || new Date();
  const timestamp = String(Math.floor(occurredAt.getTime() / 1000));
  const eventId = crypto
    .createHmac("sha256", secret)
    .update(`activity.ready:${event.userId}:${event.activityId}`)
    .digest("hex");
  const body = JSON.stringify({
    event_id: eventId,
    event_type: "activity.ready",
    occurred_at: occurredAt.toISOString(),
    activityId: Number(event.activityId),
  });
  const replaySafeSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  // Keep the original raw-body signature during the pilot migration while
  // requiring new receivers to verify timestamp + delivery ID for anti-replay.
  const legacySignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EVENT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Hub-Signature-256": `sha256=${legacySignature}`,
        "X-RunAnalytics-Signature": `v1=${replaySafeSignature}`,
        "X-RunAnalytics-Timestamp": timestamp,
        "X-RunAnalytics-Delivery": eventId,
      },
      body,
      signal: controller.signal,
    });
    const delivered = response.ok || response.status === 409;
    if (delivered) {
      console.log(`[CoachWebhook] activity.ready delivered for activityId=${event.activityId}`);
    } else {
      console.warn(`[CoachWebhook] Delivery returned ${response.status} for activityId=${event.activityId}`);
    }
    return delivered;
  } catch (error) {
    console.warn("[CoachWebhook] Delivery failed:", (error as Error).message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

class ProactiveCoachWorker {
  private intervalId: NodeJS.Timeout | null = null;
  start() {
    if (this.intervalId) return;
    setTimeout(() => void runMorningBriefings().catch((error) => console.error("[ProactiveCoach] Initial run failed:", error)), 90_000);
    this.intervalId = setInterval(() => void runMorningBriefings().catch((error) => console.error("[ProactiveCoach] Worker failed:", error)), WORKER_INTERVAL_MS);
    console.log("[ProactiveCoach] Worker started — hourly, runner-local delivery");
  }
  stop() { if (this.intervalId) clearInterval(this.intervalId); this.intervalId = null; }
}

export const proactiveCoachWorker = new ProactiveCoachWorker();
