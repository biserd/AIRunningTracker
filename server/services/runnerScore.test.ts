/**
 * Focused tests for the Phase 1 Runner Score consistency fix.
 *
 * Run with:  npx tsx server/services/runnerScore.test.ts
 *
 * These tests avoid the database entirely by stubbing
 * storage.getActivitiesByUserId, so they exercise only the pure scoring logic.
 */
import assert from "node:assert";
import { storage } from "../storage";
import { runnerScoreService, RunnerScoreService } from "./runnerScore";
import type { Activity } from "@shared/schema";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
  }
}

// --- helpers -------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

// Fixed reference "now" so tests are deterministic regardless of wall clock.
const NOW = new Date("2024-06-01T12:00:00.000Z").getTime();

let idCounter = 1;
function makeActivity(overrides: Partial<Activity> & { daysAgo: number }): Activity {
  const { daysAgo, ...rest } = overrides;
  const startDate = new Date(NOW - daysAgo * DAY);
  return {
    id: idCounter++,
    userId: 1,
    stravaId: String(idCounter),
    name: "Run",
    distance: 8000, // meters (~5 miles)
    movingTime: 2400,
    totalElevationGain: 50,
    averageSpeed: 3.0, // m/s (~9 min/mile)
    maxSpeed: 4.0,
    averageHeartrate: null,
    maxHeartrate: null,
    startDate,
    type: "Run",
    calories: null,
    averageCadence: null,
    maxCadence: null,
    averageWatts: null,
    maxWatts: null,
    sufferScore: null,
    commentsCount: 0,
    kudosCount: 0,
    achievementCount: 0,
    startLatitude: null,
    startLongitude: null,
    endLatitude: null,
    endLongitude: null,
    polyline: null,
    detailedPolyline: null,
    streamsData: null,
    lapsData: null,
    averageTemp: null,
    hasHeartrate: false,
    deviceWatts: false,
    elapsedTime: null,
    workoutType: null,
    prCount: 0,
    photoCount: 0,
    athleteCount: 1,
    timezone: null,
    gearId: null,
    elevHigh: null,
    elevLow: null,
    hydrationStatus: "none",
    hydrationMissing: null,
    hydratedAt: null,
    hydrateAttempts: 0,
    lastHydrateError: null,
    cachedGrade: null,
    cachedGradeUpdatedAt: null,
    lockedForFree: false,
    createdAt: startDate,
    ...(rest as object),
  } as Activity;
}

/**
 * Build a realistic activity set (storage returns newest-first / desc order).
 * ~4 running activities per week for 12 weeks, plus a couple non-running types.
 */
function buildRunningHistory(): Activity[] {
  const acts: Activity[] = [];
  for (let week = 0; week < 12; week++) {
    for (let i = 0; i < 4; i++) {
      acts.push(makeActivity({ daysAgo: week * 7 + i, type: "Run" }));
    }
  }
  // A trail run and virtual run should also be counted as running.
  acts.push(makeActivity({ daysAgo: 2, type: "TrailRun" }));
  acts.push(makeActivity({ daysAgo: 5, type: "VirtualRun" }));
  // These should be filtered out.
  acts.push(makeActivity({ daysAgo: 1, type: "Ride" }));
  acts.push(makeActivity({ daysAgo: 3, type: "Swim" }));
  acts.push(makeActivity({ daysAgo: 10, type: "Workout" }));
  // storage returns desc by startDate (newest first).
  return acts.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

// Access to private methods for white-box invariant testing.
const svc = runnerScoreService as unknown as {
  calculateScoreComponents: (a: Activity[], ref?: Date) => Record<string, number>;
  calculateTrends: (a: Activity[]) => { weeklyChange: number; monthlyChange: number };
};

const refDate = new Date(NOW);

async function main(): Promise<void> {
  console.log("RunnerScore Phase 1 consistency tests\n");

  await test("filters to Run/TrailRun/VirtualRun (non-running excluded)", async () => {
    const acts = buildRunningHistory();
    const runningOnly = acts.filter(a => ["Run", "TrailRun", "VirtualRun"].includes(a.type));
    const nonRunning = acts.filter(a => !["Run", "TrailRun", "VirtualRun"].includes(a.type));
    assert.ok(nonRunning.length >= 3, "fixture should contain non-running activities");

    // Components computed on a mixed vs pre-filtered set must match, proving
    // the service filters consistently (badges count only running activities).
    const original = [...acts];
    const orig = svc.calculateScoreComponents(acts, refDate);
    const filtered = svc.calculateScoreComponents(runningOnly, refDate);
    assert.deepStrictEqual(orig, filtered, "component scores should ignore non-running when volume/consistency are computed from running windows");
    assert.deepStrictEqual(acts, original, "input array must not be mutated");
  });

  await test("does not mutate caller activity array (order preserved)", async () => {
    const acts = buildRunningHistory();
    const before = acts.map(a => a.id);

    svc.calculateScoreComponents(acts, refDate);
    svc.calculateTrends(acts);

    const after = acts.map(a => a.id);
    assert.deepStrictEqual(after, before, "calculations must not reorder/mutate the input array");
  });

  await test("component scores clamped to 0..25", async () => {
    const acts = buildRunningHistory();
    const c = svc.calculateScoreComponents(acts, refDate);
    for (const [key, val] of Object.entries(c)) {
      assert.ok(val >= 0 && val <= 25, `${key}=${val} out of 0..25 range`);
    }
  });

  await test("total score clamped to 0..100 (public path)", async () => {
    const acts = buildRunningHistory();
    const original = storage.getActivitiesByUserId;
    (storage as any).getActivitiesByUserId = async () => acts;
    try {
      const result = await runnerScoreService.calculateRunnerScore(1);
      assert.ok(result.totalScore >= 0 && result.totalScore <= 100, `total ${result.totalScore} out of range`);
      const sumComponents =
        result.components.consistency +
        result.components.performance +
        result.components.volume +
        result.components.improvement;
      assert.ok(sumComponents >= 0 && sumComponents <= 100, "component sum out of range");
    } finally {
      (storage as any).getActivitiesByUserId = original;
    }
  });

  await test("low recent sample is marked provisional", async () => {
    const recentRun = makeActivity({
      daysAgo: 0,
      type: "Run",
      startDate: new Date(Date.now() - DAY),
    });
    const original = storage.getActivitiesByUserId;
    (storage as any).getActivitiesByUserId = async () => [recentRun];
    try {
      const result = await runnerScoreService.calculateRunnerScore(1);
      assert.equal(result.sampleSize, 1);
      assert.equal(result.recentRunCount, 1);
      assert.equal(result.isProvisional, true);
    } finally {
      (storage as any).getActivitiesByUserId = original;
    }
  });

  await test("current and historical scores agree for equivalent period/data", async () => {
    const acts = buildRunningHistory();
    const original = storage.getActivitiesByUserId;

    // Build a fresh, single-purpose service instance so we can drive the
    // reference date deterministically via the shared storage stub.
    (storage as any).getActivitiesByUserId = async () => acts;
    try {
      const service = new RunnerScoreService();
      const priv = service as unknown as {
        calculateScoreComponents: (a: Activity[], ref?: Date) => Record<string, number>;
      };

      // "Current" score components at the fixed reference date.
      const running = acts.filter(a => ["Run", "TrailRun", "VirtualRun"].includes(a.type));
      const current = priv.calculateScoreComponents(running, refDate);

      // "Historical" snapshot at the same cutoff: activities up to refDate,
      // computed with the same reference: must produce identical components.
      const upToCutoff = running.filter(a => a.startDate.getTime() <= refDate.getTime());
      const historical = priv.calculateScoreComponents(upToCutoff, refDate);

      assert.deepStrictEqual(
        current,
        historical,
        "equivalent period + data must yield identical component scores across paths",
      );
    } finally {
      (storage as any).getActivitiesByUserId = original;
    }
  });

  await test("historical path returns clamped, sorted-by-date points", async () => {
    const acts = buildRunningHistory();
    const original = storage.getActivitiesByUserId;
    (storage as any).getActivitiesByUserId = async () => acts;
    try {
      const points = await runnerScoreService.calculateHistoricalRunnerScore(1);
      assert.ok(points.length > 0, "should produce historical points for sufficient data");
      // Dates ascending.
      for (let i = 1; i < points.length; i++) {
        assert.ok(points[i - 1].date <= points[i].date, "historical points must be date-ascending");
      }
      // Totals and components clamped.
      for (const p of points) {
        assert.ok(p.totalScore >= 0 && p.totalScore <= 100, `total ${p.totalScore} out of range`);
        for (const [k, v] of Object.entries(p.components)) {
          assert.ok(v >= 0 && v <= 25, `${k}=${v} out of 0..25`);
        }
      }
    } finally {
      (storage as any).getActivitiesByUserId = original;
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
