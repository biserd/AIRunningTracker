import assert from "node:assert/strict";
import test from "node:test";
import { raceActivityCandidates } from "../raceActivityCandidates";
import { isClientFunnelEvent, isServerFunnelEvent, validToolOfferSource } from "../funnelEvents";
import { saveToolResult } from "../../client/src/lib/toolJourney";
import { calculateFeedingEvents, calculateFuelingPlan, fuelingInputErrors, optimizeFuelingPlan, type FuelingInputs } from "../../client/src/lib/fuelingCalculator";
const inputs: FuelingInputs = { finishTimeMinutes: 240, feedingIntervalMinutes: 30, firstGelMinutes: 30, lastGelCutoffMinutes: 15, preStartGel: true, carbTargetPerHour: 60, sodiumTargetPerHour: 500, drinkVolumePerHour: 500, drinkSodiumPerLiter: 1000, drinkCarbsPerLiter: 15 };
test("new-account attribution is server-authoritative and bounded to known result offers", () => {
  assert.equal(isClientFunnelEvent("tool_signup_created"), false);
  assert.equal(isServerFunnelEvent("tool_signup_created"), true);
  assert.equal(validToolOfferSource("shoe_finder_result"), true);
  assert.equal(validToolOfferSource("https://untrusted.example"), false);
});
test("saved result content stays in browser storage and out of analytics, including dedupe keys", () => {
  const descriptors = new Map(["window", "localStorage", "sessionStorage", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const data = new Map<string, string>();
  let sent = "";
  const storage = { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => data.set(key, value) };
  try {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: storage, configurable: true });
    Object.defineProperty(globalThis, "fetch", { value: (_url: string, options: any) => { sent = options.body; return Promise.resolve({}); }, configurable: true });
    assert.equal(saveToolResult({ source: "race_predictor_result", title: "Private local copy", summary: "PRIVATE-RACE-TIME-04:17:23", path: "/tools/race-predictor" }), true);
    assert.ok(data.get("ra_saved_tool_result_v1")?.includes("PRIVATE-RACE-TIME"));
    assert.doesNotMatch(sent, /PRIVATE-RACE|04:17:23|Private local copy/);
    assert.match(sent, /tool_result_saved/);
  } finally {
    for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});

test("invalid feeding intervals and nonfinite inputs cannot hang or produce a plan", () => {
  for (const bad of [{ ...inputs, feedingIntervalMinutes: 0 }, { ...inputs, feedingIntervalMinutes: -1 }, { ...inputs, finishTimeMinutes: NaN }]) {
    assert.ok(fuelingInputErrors(bad).length);
    assert.deepEqual(calculateFeedingEvents(bad), []);
    assert.throws(() => calculateFuelingPlan(bad, []));
  }
});
test("worked four-hour schedule excludes pre-start fuel from hourly race intake", () => {
  const events = calculateFeedingEvents(inputs).map(e => ({ ...e, gelId: "precision-fuel-30" }));
  const p = calculateFuelingPlan(inputs, events);
  assert.equal(p.inRaceGels, 7);
  assert.equal(p.totalGels, 8);
  assert.equal(p.preStartCarbs, 30);
  assert.equal(p.totalCarbs, 240);
  assert.equal(p.carbsPerHour, 60);
  assert.equal(p.carbShortfall, 0);
  assert.equal(p.preStartSodium, 0);
  assert.equal(p.totalSodium, 2000); // Drink only: PF 30 gels contain no sodium.
});
test("optimization never adds caffeine and distinguishes the pre-start serving", () => {
  const p = calculateFuelingPlan(inputs, optimizeFuelingPlan(inputs, calculateFeedingEvents(inputs)));
  assert.equal(p.totalCaffeine, 0);
  assert.ok(p.preStartCarbs > 0);
  const highTarget = { ...inputs, carbTargetPerHour: 120 };
  assert.ok(optimizeFuelingPlan(highTarget, calculateFeedingEvents(highTarget)).every(e => e.gelId !== "precision-fuel-60"));
});
test("Strava candidates exclude other sports and prefer elapsed race time without inferring effort", () => {
  const base = { type: "Run", distance: 10000, movingTime: 2700, elapsedTime: 2760, workoutType: 0 };
  const results = raceActivityCandidates([base, { ...base, type: "Ride" }, { ...base, distance: 2000 }, { ...base, movingTime: 500 }, { ...base, elapsedTime: null, workoutType: 1 }]);
  assert.equal(results.length, 2);
  assert.equal(results[0].raceTime, 2760);
  assert.equal(results[0].isTaggedRace, false);
  assert.equal(results[1].timeBasis, "moving");
  assert.equal(results[1].isTaggedRace, true);
});
