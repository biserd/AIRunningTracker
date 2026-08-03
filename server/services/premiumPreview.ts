/**
 * Premium Preview — one deliberate, personalized preview created after a new
 * runner's first successful Strava sync (trial-conversion Phase 2).
 *
 * The preview shows exactly two findings, one next action, and the source
 * data it was derived from — without revealing the complete Premium analysis.
 * It is created exactly once per user via a compare-and-set update.
 */
import { db } from "../db";
import { users, type Activity } from "@shared/schema";
import { and, eq, isNull } from "drizzle-orm";
import { storage, RUNNING_ACTIVITY_TYPES } from "../storage";

// Safe payload limits — the preview is stored on the users row and returned
// verbatim to the client, so it must stay small and free of bulky fields
// (streams, polylines, laps).
export const PREVIEW_TEXT_MAX = 240;
export const PREVIEW_NAME_MAX = 120;
export const PREVIEW_PAYLOAD_MAX_BYTES = 4096;
export const PREVIEW_MIN_DISTANCE_METERS = 1000;

export interface PremiumPreviewSourceData {
  activityId: number;
  stravaId: string | null;
  name: string;
  startDate: string | null;
  distanceMeters: number;
  movingTimeSec: number;
  averageSpeed: number | null;
  averageHeartrate: number | null;
  averageCadence: number | null;
  totalElevationGain: number | null;
}

export interface PremiumPreviewPayload {
  kind: "premium_preview";
  version: 1;
  createdAt: string;
  activityId: number;
  findings: [string, string];
  nextAction: string;
  sourceData: PremiumPreviewSourceData;
}

function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function isEligiblePreviewRun(activity: Pick<Activity, "type" | "distance" | "movingTime">): boolean {
  return (
    RUNNING_ACTIVITY_TYPES.includes(activity.type || "") &&
    (activity.distance ?? 0) >= PREVIEW_MIN_DISTANCE_METERS &&
    (activity.movingTime ?? 0) > 0
  );
}

/** Latest eligible run by start date, or null. */
export function selectLatestEligibleRun(activities: Activity[]): Activity | null {
  const eligible = activities.filter(isEligiblePreviewRun);
  if (eligible.length === 0) return null;
  return eligible.reduce((latest, a) =>
    new Date(a.startDate).getTime() > new Date(latest.startDate).getTime() ? a : latest,
  );
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

/**
 * Build the preview payload from a single activity's summary data (never
 * streams/laps/polylines). Deterministic — no AI call — so the very first
 * impression a new runner gets is trustworthy and repeatable.
 */
export function buildPremiumPreviewPayload(activity: Activity, now: Date = new Date()): PremiumPreviewPayload {
  const distanceKm = (activity.distance ?? 0) / 1000;
  const movingTime = activity.movingTime ?? 0;
  const paceSecPerKm = distanceKm > 0 ? movingTime / distanceKm : 0;
  const paceDisplay = formatPace(paceSecPerKm);

  const candidates: string[] = [];

  // Effort / efficiency finding (HR-based) when heart rate exists.
  if (activity.averageHeartrate) {
    const hr = Math.round(activity.averageHeartrate);
    const hrPerPaceMin = activity.averageHeartrate / (paceSecPerKm / 60);
    const effLabel = hrPerPaceMin < 24 ? "strong aerobic efficiency" : hrPerPaceMin < 28 ? "moderate aerobic efficiency" : "a high cardiac cost for the pace";
    candidates.push(
      `Your average heart rate of ${hr} bpm at ${paceDisplay} points to ${effLabel} — a signal most runners never see quantified.`,
    );
  }

  // Cadence finding when cadence exists.
  if (activity.averageCadence) {
    const spm = Math.round(activity.averageCadence);
    const cadenceNote = spm >= 170 && spm <= 185
      ? "right in the efficient 170–185 spm window"
      : spm < 170
        ? `below the efficient 170–185 spm window — a common source of overstriding`
        : `above the typical 170–185 spm window`;
    candidates.push(`You averaged ${spm} steps per minute, ${cadenceNote}.`);
  }

  // Elevation finding when meaningful climb exists.
  if ((activity.totalElevationGain ?? 0) >= 30) {
    candidates.push(
      `This run packed ${Math.round(activity.totalElevationGain!)} m of climbing into ${distanceKm.toFixed(1)} km — hilly runs like this quietly build strength but also raise recovery cost.`,
    );
  }

  // Pacing/volume finding — always available as a fallback.
  candidates.push(
    `You held ${paceDisplay} across ${distanceKm.toFixed(1)} km — consistent enough that a full split-by-split analysis would show exactly where you gained and lost time.`,
  );
  candidates.push(
    `A ${distanceKm.toFixed(1)} km run of ${Math.round(movingTime / 60)} minutes is a solid data sample — enough for Premium to model your race predictions and training load.`,
  );

  const findings: [string, string] = [
    cap(candidates[0], PREVIEW_TEXT_MAX),
    cap(candidates[1], PREVIEW_TEXT_MAX),
  ];

  const nextAction = cap(
    activity.averageHeartrate
      ? `Next run: keep your heart rate under ${Math.round(activity.averageHeartrate)} bpm for the first half, then let pace come to you — Premium's full analysis shows whether you fade late and by how much.`
      : `Next run: start 10–15 sec/km slower than ${paceDisplay} and aim to finish faster than you start — Premium's full analysis shows whether you fade late and by how much.`,
    PREVIEW_TEXT_MAX,
  );

  const payload: PremiumPreviewPayload = {
    kind: "premium_preview",
    version: 1,
    createdAt: now.toISOString(),
    activityId: activity.id,
    findings,
    nextAction,
    sourceData: {
      activityId: activity.id,
      stravaId: activity.stravaId ?? null,
      name: cap(activity.name ?? "Run", PREVIEW_NAME_MAX),
      startDate: activity.startDate ? new Date(activity.startDate).toISOString() : null,
      distanceMeters: Math.round(activity.distance ?? 0),
      movingTimeSec: movingTime,
      averageSpeed: activity.averageSpeed ?? null,
      averageHeartrate: activity.averageHeartrate ?? null,
      averageCadence: activity.averageCadence ?? null,
      totalElevationGain: activity.totalElevationGain ?? null,
    },
  };

  const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (bytes > PREVIEW_PAYLOAD_MAX_BYTES) {
    throw new Error(`Premium preview payload too large (${bytes} bytes > ${PREVIEW_PAYLOAD_MAX_BYTES})`);
  }
  return payload;
}

export interface CreatePreviewDeps {
  loadUser: () => Promise<{ premiumPreview: unknown } | undefined>;
  loadActivities: () => Promise<Activity[]>;
  /** Atomic compare-and-set: persist only if no preview exists. Returns true when written. */
  persistIfAbsent: (payload: PremiumPreviewPayload) => Promise<boolean>;
  now?: () => Date;
}

export type CreatePreviewResult =
  | { created: true; payload: PremiumPreviewPayload }
  | { created: false; reason: "already_exists" | "no_user" | "no_eligible_run" };

/**
 * Core creation logic, dependency-injected for testability. Guarantees at
 * most one preview per user given an atomic `persistIfAbsent`.
 */
export async function createPremiumPreviewCore(deps: CreatePreviewDeps): Promise<CreatePreviewResult> {
  const user = await deps.loadUser();
  if (!user) return { created: false, reason: "no_user" };
  if (user.premiumPreview) return { created: false, reason: "already_exists" };

  const activities = await deps.loadActivities();
  const run = selectLatestEligibleRun(activities);
  if (!run) return { created: false, reason: "no_eligible_run" };

  const payload = buildPremiumPreviewPayload(run, deps.now ? deps.now() : new Date());
  const written = await deps.persistIfAbsent(payload);
  if (!written) return { created: false, reason: "already_exists" };
  return { created: true, payload };
}

/**
 * Production entry point: create the one-time Premium Preview for a user
 * after their first successful Strava sync. Safe to call repeatedly — the
 * DB-level compare-and-set (`premium_preview IS NULL`) makes it exactly-once.
 */
export async function createPremiumPreviewAfterFirstSync(userId: number): Promise<CreatePreviewResult> {
  return createPremiumPreviewCore({
    loadUser: async () => {
      const u = await storage.getUser(userId);
      return u ? { premiumPreview: (u as any).premiumPreview } : undefined;
    },
    loadActivities: () => storage.getActivitiesByUserId(userId, 100),
    persistIfAbsent: async (payload) => {
      const result = await db
        .update(users)
        .set({ premiumPreview: payload as any, premiumPreviewCreatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.premiumPreview)))
        .returning({ id: users.id });
      return result.length > 0;
    },
  });
}
