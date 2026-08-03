/**
 * Tests for the one-time Premium Preview (trial-conversion Phase 2).
 * Covers: creation exactly once (idempotent + concurrent CAS) and safe
 * payload limits. Run with: npm run test:premium-preview
 */
import assert from "node:assert/strict";
import {
  buildPremiumPreviewPayload,
  createPremiumPreviewCore,
  selectLatestEligibleRun,
  isEligiblePreviewRun,
  summarizePreviewEligibility,
  PREVIEW_TEXT_MAX,
  PREVIEW_NAME_MAX,
  PREVIEW_PAYLOAD_MAX_BYTES,
  type PremiumPreviewPayload,
} from "../server/services/premiumPreview";

function makeRun(overrides: Partial<any> = {}): any {
  return {
    id: 101,
    stravaId: "999001",
    name: "Morning Run",
    type: "Run",
    distance: 8123, // meters
    movingTime: 2400, // 40 min
    startDate: new Date("2026-08-01T07:00:00Z"),
    averageSpeed: 3.38,
    averageHeartrate: 152,
    averageCadence: 172,
    totalElevationGain: 84,
    ...overrides,
  };
}

// ---------- Eligibility & selection ----------

assert.equal(isEligiblePreviewRun(makeRun()), true);
assert.equal(isEligiblePreviewRun(makeRun({ type: "Ride" })), false, "non-running types are ineligible");
assert.equal(isEligiblePreviewRun(makeRun({ distance: 500 })), false, "sub-1km blips are ineligible");
assert.equal(isEligiblePreviewRun(makeRun({ movingTime: 0 })), false, "zero moving time is ineligible");
assert.equal(isEligiblePreviewRun(makeRun({ type: " trail run " })), true, "legacy spaced/cased run types are eligible");

const latest = selectLatestEligibleRun([
  makeRun({ id: 1, startDate: new Date("2026-07-01T07:00:00Z") }),
  makeRun({ id: 2, startDate: new Date("2026-08-02T07:00:00Z") }),
  makeRun({ id: 3, startDate: new Date("2026-08-03T07:00:00Z"), type: "Ride" }), // newer but not a run
  makeRun({ id: 4, startDate: new Date("2026-07-15T07:00:00Z") }),
]);
assert.equal(latest?.id, 2, "picks the latest eligible RUN, ignoring newer non-runs");
assert.equal(selectLatestEligibleRun([]), null);
assert.equal(selectLatestEligibleRun([makeRun({ type: "Ride" })]), null);
assert.equal(
  selectLatestEligibleRun([
    makeRun({ id: 5, type: "Run", startDate: new Date("invalid") }),
    makeRun({ id: 6, type: "Run", startDate: new Date("2026-08-04T07:00:00Z") }),
  ])?.id,
  6,
  "invalid legacy dates do not block a valid latest run",
);

assert.deepEqual(
  summarizePreviewEligibility([
    makeRun(),
    makeRun({ type: "Ride" }),
    makeRun({ distance: 500 }),
    makeRun({ movingTime: 0 }),
  ]),
  {
    totalActivities: 4,
    runningActivities: 3,
    distanceQualifiedRuns: 2,
    movingTimeQualifiedRuns: 1,
    eligibleRuns: 1,
  },
  "eligibility diagnostics describe why legacy activity sets do not qualify",
);

// ---------- Payload shape & safe limits ----------

const payload = buildPremiumPreviewPayload(makeRun(), new Date("2026-08-03T12:00:00Z"));
assert.equal(payload.kind, "premium_preview");
assert.equal(payload.findings.length, 2, "exactly two findings");
assert.ok(payload.nextAction.length > 0, "one next action present");
for (const f of payload.findings) {
  assert.ok(f.length <= PREVIEW_TEXT_MAX, `finding within ${PREVIEW_TEXT_MAX} chars`);
}
assert.ok(payload.nextAction.length <= PREVIEW_TEXT_MAX);
assert.ok(payload.sourceData.name.length <= PREVIEW_NAME_MAX);
assert.equal(payload.sourceData.activityId, 101);
assert.equal(payload.sourceData.distanceMeters, 8123);
assert.equal(payload.sourceData.averageCadence, 172, "already-normalized cadence is unchanged");

const historicalCadencePayload = buildPremiumPreviewPayload(makeRun({ averageCadence: 86 }));
assert.equal(historicalCadencePayload.sourceData.averageCadence, 172, "historical single-leg cadence is normalized once");
assert.ok(historicalCadencePayload.findings.some((finding) => finding.includes("172 steps per minute")));

// No bulky/raw fields may leak into the stored payload.
const json = JSON.stringify(payload);
assert.ok(Buffer.byteLength(json, "utf8") <= PREVIEW_PAYLOAD_MAX_BYTES, "payload under byte cap");
for (const forbidden of ["streamsData", "lapsData", "polyline", "latlng"]) {
  assert.ok(!json.includes(forbidden), `payload must not contain ${forbidden}`);
}

// Absurdly long activity name gets capped, payload stays under the byte cap.
const longName = "🏃".repeat(50) + "x".repeat(2000);
const cappedPayload = buildPremiumPreviewPayload(makeRun({ name: longName }));
assert.ok(cappedPayload.sourceData.name.length <= PREVIEW_NAME_MAX);
assert.ok(
  Buffer.byteLength(JSON.stringify(cappedPayload), "utf8") <= PREVIEW_PAYLOAD_MAX_BYTES,
);

// Works without HR/cadence/elevation (still exactly two findings + action).
const barePayload = buildPremiumPreviewPayload(
  makeRun({ averageHeartrate: null, averageCadence: null, totalElevationGain: 0 }),
);
assert.equal(barePayload.findings.length, 2);
assert.ok(barePayload.nextAction.length > 0);

// ---------- Creation exactly once ----------

function makeFakeStore(activities: any[]) {
  let stored: PremiumPreviewPayload | null = null;
  return {
    deps: {
      loadUser: async () => ({ premiumPreview: stored }),
      loadActivities: async () => activities,
      // Atomic compare-and-set, like the SQL `WHERE premium_preview IS NULL`.
      persistIfAbsent: async (p: PremiumPreviewPayload) => {
        if (stored) return false;
        stored = p;
        return true;
      },
    },
    get stored() {
      return stored;
    },
  };
}

const store = makeFakeStore([makeRun()]);
const first = await createPremiumPreviewCore(store.deps);
assert.equal(first.created, true, "first sync creates the preview");
const second = await createPremiumPreviewCore(store.deps);
assert.equal(second.created, false, "second call does not create a duplicate");
assert.equal((second as any).reason, "already_exists");
assert.ok(store.stored, "preview persisted exactly once");

// Concurrent calls: the CAS lets exactly one writer through.
const raceStore = makeFakeStore([makeRun()]);
const results = await Promise.all([
  createPremiumPreviewCore(raceStore.deps),
  createPremiumPreviewCore(raceStore.deps),
  createPremiumPreviewCore(raceStore.deps),
]);
assert.equal(results.filter((r) => r.created).length, 1, "exactly one concurrent creation wins");

// No eligible run → nothing created; user missing → nothing created.
const emptyStore = makeFakeStore([makeRun({ type: "Ride" })]);
const emptyResult = await createPremiumPreviewCore(emptyStore.deps);
assert.equal(emptyResult.created, false);
assert.equal((emptyResult as any).reason, "no_eligible_run");
assert.equal(emptyStore.stored, null);

const noUserResult = await createPremiumPreviewCore({
  loadUser: async () => undefined,
  loadActivities: async () => [makeRun()],
  persistIfAbsent: async () => {
    throw new Error("should not persist without a user");
  },
});
assert.equal(noUserResult.created, false);
assert.equal((noUserResult as any).reason, "no_user");

const paidUserResult = await createPremiumPreviewCore({
  loadUser: async () => ({ premiumPreview: null, stravaConnected: true, subscriptionPlan: "premium", subscriptionStatus: "active" }),
  loadActivities: async () => [makeRun()],
  persistIfAbsent: async () => {
    throw new Error("should not create a free preview for a paid user");
  },
});
assert.equal(paidUserResult.created, false);
assert.equal((paidUserResult as any).reason, "not_eligible");

const disconnectedUserResult = await createPremiumPreviewCore({
  loadUser: async () => ({ premiumPreview: null, stravaConnected: false, subscriptionPlan: "free", subscriptionStatus: "free" }),
  loadActivities: async () => {
    throw new Error("should not load activities before Strava is connected");
  },
  persistIfAbsent: async () => {
    throw new Error("should not create a preview before Strava is connected");
  },
});
assert.equal(disconnectedUserResult.created, false);
assert.equal((disconnectedUserResult as any).reason, "not_eligible");

console.log("test-premium-preview: all assertions passed ✔");
