/**
 * Premium Preview: one deliberate, personalized preview created after a new
 * runner's first successful Strava sync (trial-conversion Phase 2).
 *
 * The preview shows exactly two findings, one next action, and the source
 * data it was derived from without revealing the complete Premium analysis.
 * It is created exactly once per user via a compare-and-set update.
 */
import { db } from "../db";
import { users, type Activity } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { storage } from "../storage";
import { hasPremiumAccess } from "@shared/entitlements";
import { normalizeCadenceToSpm } from "@shared/cadenceNormalization";

// Safe payload limits: the preview is stored on the users row and returned
// verbatim to the client, so it must stay small and free of bulky fields
// (streams, polylines, laps).
export const PREMIUM_PREVIEW_VERSION = 5;
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
  version: typeof PREMIUM_PREVIEW_VERSION;
  createdAt: string;
  unitPreference: "km" | "miles";
  activityId: number;
  findings: [string, string];
  nextAction: string;
  comparison: {
    sampleSize: number;
    baselinePaceSecondsPerUnit: number | null;
    paceDeltaSecondsPerUnit: number | null;
    baselineHeartRate: number | null;
    heartRateDelta: number | null;
    baselineCadence: number | null;
    cadenceDelta: number | null;
  } | null;
  sourceData: PremiumPreviewSourceData;
}

export interface PreviewEligibilitySummary {
  totalActivities: number;
  runningActivities: number;
  distanceQualifiedRuns: number;
  movingTimeQualifiedRuns: number;
  eligibleRuns: number;
}

type PreviewUnitPreference = "km" | "miles";

function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function isEligiblePreviewRun(activity: Pick<Activity, "type" | "distance" | "movingTime">): boolean {
  const type = activity.type?.trim().toLowerCase();
  const isRun = type === "run" || type === "trailrun" || type === "trail run" || type === "virtualrun" || type === "virtual run";
  return (
    isRun &&
    Number(activity.distance ?? 0) >= PREVIEW_MIN_DISTANCE_METERS &&
    Number(activity.movingTime ?? 0) > 0
  );
}

export function summarizePreviewEligibility(activities: Activity[]): PreviewEligibilitySummary {
  const runningActivities = activities.filter((activity) => {
    const type = activity.type?.trim().toLowerCase();
    return type === "run" || type === "trailrun" || type === "trail run" || type === "virtualrun" || type === "virtual run";
  });
  const distanceQualifiedRuns = runningActivities.filter(
    (activity) => Number(activity.distance ?? 0) >= PREVIEW_MIN_DISTANCE_METERS,
  );
  const movingTimeQualifiedRuns = distanceQualifiedRuns.filter(
    (activity) => Number(activity.movingTime ?? 0) > 0,
  );

  return {
    totalActivities: activities.length,
    runningActivities: runningActivities.length,
    distanceQualifiedRuns: distanceQualifiedRuns.length,
    movingTimeQualifiedRuns: movingTimeQualifiedRuns.length,
    eligibleRuns: movingTimeQualifiedRuns.length,
  };
}

/** Latest eligible run by start date, or null. */
export function selectLatestEligibleRun(activities: Activity[]): Activity | null {
  const eligible = activities.filter(isEligiblePreviewRun);
  if (eligible.length === 0) return null;
  return eligible.reduce((latest, activity) => {
    const latestTime = new Date(latest.startDate).getTime();
    const activityTime = new Date(activity.startDate).getTime();
    if (!Number.isFinite(latestTime)) return activity;
    if (!Number.isFinite(activityTime)) return latest;
    return activityTime > latestTime ? activity : latest;
  });
}

function formatDurationPerUnit(seconds: number, unitPreference: PreviewUnitPreference): string {
  const secondsPerUnit = Math.round(unitPreference === "miles" ? seconds * 1.609344 : seconds);
  const min = Math.floor(secondsPerUnit / 60);
  const sec = secondsPerUnit % 60;
  return `${min}:${String(sec).padStart(2, "0")}/${unitPreference === "miles" ? "mi" : "km"}`;
}

function formatDistance(distanceKm: number, unitPreference: PreviewUnitPreference): string {
  return unitPreference === "miles"
    ? `${(distanceKm * 0.621371).toFixed(1)} mi`
    : `${distanceKm.toFixed(1)} km`;
}

function formatElevation(elevationMeters: number, unitPreference: PreviewUnitPreference): string {
  return unitPreference === "miles"
    ? `${Math.round(elevationMeters * 3.28084)} ft`
    : `${Math.round(elevationMeters)} m`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function paceSecondsPerUnit(activity: Activity, unitPreference: PreviewUnitPreference): number | null {
  const distanceKm = Number(activity.distance ?? 0) / 1000;
  const movingTime = Number(activity.movingTime ?? 0);
  if (distanceKm <= 0 || movingTime <= 0) return null;
  const secondsPerKm = movingTime / distanceKm;
  return unitPreference === "miles" ? secondsPerKm * 1.609344 : secondsPerKm;
}

function formatPaceSeconds(seconds: number, unitPreference: PreviewUnitPreference): string {
  const rounded = Math.max(0, Math.round(seconds));
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${String(sec).padStart(2, "0")}/${unitPreference === "miles" ? "mi" : "km"}`;
}

function selectSimilarRuns(activity: Activity, activities: Activity[]): Activity[] {
  const targetDistance = Number(activity.distance ?? 0);
  if (targetDistance <= 0) return [];

  return activities
    .filter((candidate) => candidate.id !== activity.id && isEligiblePreviewRun(candidate))
    .filter((candidate) => {
      const ratio = Number(candidate.distance ?? 0) / targetDistance;
      return ratio >= 0.7 && ratio <= 1.3;
    })
    .sort((a, b) => {
      const aDistanceDelta = Math.abs(Number(a.distance ?? 0) - targetDistance);
      const bDistanceDelta = Math.abs(Number(b.distance ?? 0) - targetDistance);
      if (aDistanceDelta !== bDistanceDelta) return aDistanceDelta - bDistanceDelta;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    })
    .slice(0, 5);
}

/**
 * Build the preview payload from a single activity's summary data (never
 * streams/laps/polylines). Deterministic: no AI call: so the very first
 * impression a new runner gets is trustworthy and repeatable.
 */
export function buildPremiumPreviewPayload(
  activity: Activity,
  unitPreference: PreviewUnitPreference = "miles",
  now: Date = new Date(),
  comparisonActivities: Activity[] = [],
): PremiumPreviewPayload {
  const distanceKm = (activity.distance ?? 0) / 1000;
  const movingTime = activity.movingTime ?? 0;
  const paceSecPerKm = distanceKm > 0 ? movingTime / distanceKm : 0;
  const paceDisplay = formatDurationPerUnit(paceSecPerKm, unitPreference);
  const distanceDisplay = formatDistance(distanceKm, unitPreference);

  const candidates: string[] = [];
  const similarRuns = selectSimilarRuns(activity, comparisonActivities);
  const currentPace = paceSecondsPerUnit(activity, unitPreference);
  const baselinePace = average(similarRuns
    .map((run) => paceSecondsPerUnit(run, unitPreference))
    .filter((value): value is number => value !== null));
  const baselineHeartRate = average(similarRuns
    .map((run) => Number(run.averageHeartrate ?? 0))
    .filter((value) => value > 0));
  const baselineCadence = average(similarRuns
    .map((run) => normalizeCadenceToSpm(run.averageCadence))
    .filter((value) => value > 0));
  const currentHeartRate = Number(activity.averageHeartrate ?? 0) || null;
  const currentCadence = normalizeCadenceToSpm(activity.averageCadence) || null;
  const paceDelta = currentPace !== null && baselinePace !== null ? Math.round(currentPace - baselinePace) : null;
  const heartRateDelta = currentHeartRate !== null && baselineHeartRate !== null
    ? Math.round(currentHeartRate - baselineHeartRate)
    : null;
  const cadenceDelta = currentCadence !== null && baselineCadence !== null
    ? Math.round(currentCadence - baselineCadence)
    : null;

  if (similarRuns.length >= 2 && currentPace !== null && baselinePace !== null) {
    const unit = unitPreference === "miles" ? "mi" : "km";
    const paceComparison = Math.abs(paceDelta ?? 0) <= 5
      ? `matched your ${formatPaceSeconds(baselinePace, unitPreference)} baseline`
      : `was ${Math.abs(paceDelta!)} sec/${unit} ${paceDelta! < 0 ? "faster" : "slower"} than your ${formatPaceSeconds(baselinePace, unitPreference)} baseline`;
    const effortComparison = heartRateDelta === null
      ? ""
      : Math.abs(heartRateDelta) <= 2
        ? ", with a similar average heart rate"
        : `, while average heart rate was ${Math.abs(heartRateDelta)} bpm ${heartRateDelta > 0 ? "higher" : "lower"}`;
    candidates.push(
      `Compared with ${similarRuns.length} similar runs, your ${paceDisplay} pace ${paceComparison}${effortComparison}.`,
    );
  }

  // Effort / efficiency finding (HR-based) when heart rate exists.
  if (activity.averageHeartrate && candidates.length === 0) {
    const hr = Math.round(activity.averageHeartrate);
    candidates.push(
      `You averaged ${hr} bpm at ${paceDisplay}. This becomes your personal benchmark until more similar runs are available.`,
    );
  }

  // Cadence is stored as steps/minute in current ingestion, but historical
  // rows may still contain Strava's single-leg value. Normalize defensively.
  const normalizedCadence = currentCadence;
  if (normalizedCadence) {
    const spm = Math.round(normalizedCadence);
    if (similarRuns.length >= 2 && baselineCadence !== null && cadenceDelta !== null) {
      candidates.push(
        Math.abs(cadenceDelta) <= 1
          ? `Your ${spm} spm cadence matched your ${Math.round(baselineCadence)} spm baseline across ${similarRuns.length} similar runs.`
          : `Your ${spm} spm cadence was ${Math.abs(cadenceDelta)} spm ${cadenceDelta > 0 ? "higher" : "lower"} than your ${Math.round(baselineCadence)} spm baseline across ${similarRuns.length} similar runs.`,
      );
    } else {
      candidates.push(`You averaged ${spm} steps per minute. This is now a concrete cadence baseline for your next comparable run.`);
    }
  }

  // Elevation finding when meaningful climb exists.
  if ((activity.totalElevationGain ?? 0) >= 30) {
    candidates.push(
      `This run packed ${formatElevation(activity.totalElevationGain!, unitPreference)} of climbing into ${distanceDisplay}: hilly runs like this quietly build strength but also raise recovery cost.`,
    );
  }

  // Pacing/volume finding: always available as a fallback.
  candidates.push(
    `You held ${paceDisplay} across ${distanceDisplay}: consistent enough that a full split-by-split analysis would show exactly where you gained and lost time.`,
  );
  candidates.push(
    `This ${distanceDisplay}, ${Math.round(movingTime / 60)}-minute run gives Premium a useful baseline for comparisons with your future runs.`,
  );

  const findings: [string, string] = [
    cap(candidates[0], PREVIEW_TEXT_MAX),
    cap(candidates[1], PREVIEW_TEXT_MAX),
  ];

  const safeNextAction = cap(
    heartRateDelta !== null && baselineHeartRate !== null && heartRateDelta >= 5
      ? `Next similar run: start controlled and see whether average heart rate stays closer to your ${Math.round(baselineHeartRate)} bpm benchmark at about ${baselinePace ? formatPaceSeconds(baselinePace, unitPreference) : paceDisplay}.`
      : heartRateDelta !== null && baselineHeartRate !== null && heartRateDelta <= -5
        ? `Repeat a similar controlled run. If pace stays near ${baselinePace ? formatPaceSeconds(baselinePace, unitPreference) : paceDisplay} with heart rate around ${Math.round(baselineHeartRate)} bpm or lower, that strengthens the efficiency signal.`
        : `Next similar run: start controlled and use ${baselinePace ? formatPaceSeconds(baselinePace, unitPreference) : paceDisplay} as the reference pace. Adjust for how you feel rather than forcing the benchmark.`,
    PREVIEW_TEXT_MAX,
  );

  const payload: PremiumPreviewPayload = {
    kind: "premium_preview",
    version: PREMIUM_PREVIEW_VERSION,
    createdAt: now.toISOString(),
    unitPreference,
    activityId: activity.id,
    findings,
    nextAction: safeNextAction,
    comparison: similarRuns.length >= 2 ? {
      sampleSize: similarRuns.length,
      baselinePaceSecondsPerUnit: baselinePace === null ? null : Math.round(baselinePace),
      paceDeltaSecondsPerUnit: paceDelta,
      baselineHeartRate: baselineHeartRate === null ? null : Math.round(baselineHeartRate),
      heartRateDelta,
      baselineCadence: baselineCadence === null ? null : Math.round(baselineCadence),
      cadenceDelta,
    } : null,
    sourceData: {
      activityId: activity.id,
      stravaId: activity.stravaId ?? null,
      name: cap(activity.name ?? "Run", PREVIEW_NAME_MAX),
      startDate: activity.startDate ? new Date(activity.startDate).toISOString() : null,
      distanceMeters: Math.round(activity.distance ?? 0),
      movingTimeSec: movingTime,
      averageSpeed: activity.averageSpeed ?? null,
      averageHeartrate: activity.averageHeartrate ?? null,
      averageCadence: normalizedCadence || null,
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
  loadUser: () => Promise<{
    premiumPreview: unknown;
    unitPreference?: string | null;
    stravaConnected?: boolean | null;
    subscriptionPlan?: string | null;
    subscriptionStatus?: string | null;
  } | undefined>;
  loadActivities: () => Promise<Activity[]>;
  /** Atomic compare-and-set: persist only if no preview exists. Returns true when written. */
  persistIfAbsent: (payload: PremiumPreviewPayload) => Promise<boolean>;
  replaceIfStale?: (payload: PremiumPreviewPayload) => Promise<boolean>;
  now?: () => Date;
}

export type CreatePreviewResult =
  | { created: true; payload: PremiumPreviewPayload }
  | { created: false; reason: "already_exists" | "no_user" | "not_eligible" | "no_eligible_run" };

/**
 * Core creation logic, dependency-injected for testability. Guarantees at
 * most one preview per user given an atomic `persistIfAbsent`.
 */
export async function createPremiumPreviewCore(deps: CreatePreviewDeps): Promise<CreatePreviewResult> {
  const user = await deps.loadUser();
  if (!user) return { created: false, reason: "no_user" };
  const unitPreference: PreviewUnitPreference = user.unitPreference === "km" ? "km" : "miles";
  const existingPreview = user.premiumPreview as Partial<PremiumPreviewPayload> | null;
  const previewNeedsUnitRefresh = Boolean(
    existingPreview &&
    (existingPreview.version !== PREMIUM_PREVIEW_VERSION || existingPreview.unitPreference !== unitPreference),
  );
  if (existingPreview && !previewNeedsUnitRefresh) return { created: false, reason: "already_exists" };
  if (user.stravaConnected === false || hasPremiumAccess(user)) {
    return { created: false, reason: "not_eligible" };
  }

  const activities = await deps.loadActivities();
  const run = selectLatestEligibleRun(activities);
  if (!run) {
    console.info("[PremiumPreview] No eligible run found", summarizePreviewEligibility(activities));
    return { created: false, reason: "no_eligible_run" };
  }

  const payload = buildPremiumPreviewPayload(
    run,
    unitPreference,
    deps.now ? deps.now() : new Date(),
    activities,
  );
  const written = previewNeedsUnitRefresh
    ? await deps.replaceIfStale?.(payload)
    : await deps.persistIfAbsent(payload);
  if (previewNeedsUnitRefresh && !deps.replaceIfStale) {
    return { created: false, reason: "already_exists" };
  }
  if (!written) return { created: false, reason: "already_exists" };
  return { created: true, payload };
}

/**
 * Production entry point: create the one-time Premium Preview for a user
 * after their first successful Strava sync. Safe to call repeatedly: the
 * DB-level compare-and-set (`premium_preview IS NULL`) makes it exactly-once.
 */
export async function createPremiumPreviewForUser(userId: number): Promise<CreatePreviewResult> {
  const result = await createPremiumPreviewCore({
    loadUser: async () => {
      const u = await storage.getUser(userId);
      return u ? {
        premiumPreview: (u as any).premiumPreview,
        unitPreference: u.unitPreference,
        stravaConnected: u.stravaConnected,
        subscriptionPlan: u.subscriptionPlan,
        subscriptionStatus: u.subscriptionStatus,
      } : undefined;
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
    replaceIfStale: async (payload) => {
      const result = await db
        .update(users)
        .set({ premiumPreview: payload as any, premiumPreviewCreatedAt: new Date() })
        .where(and(
          eq(users.id, userId),
          sql`(
            ${users.premiumPreview} IS NULL OR
            (${users.premiumPreview}->>'version') IS NULL OR
            (${users.premiumPreview}->>'version')::int < ${PREMIUM_PREVIEW_VERSION} OR
            (${users.premiumPreview}->>'unitPreference') IS DISTINCT FROM ${payload.unitPreference}
          )`,
        ))
        .returning({ id: users.id });
      return result.length > 0;
    },
  });
  console.info(`[PremiumPreview] Creation result for user ${userId}:`, {
    created: result.created,
    reason: result.created ? undefined : result.reason,
  });
  return result;
}

/** Backward-compatible alias for existing sync callers. */
export const createPremiumPreviewAfterFirstSync = createPremiumPreviewForUser;
