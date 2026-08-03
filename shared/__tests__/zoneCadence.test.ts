/**
 * Focused tests for Phase 1 zone + cadence utilities.
 *
 * Runnable without extra dependencies:
 *   npx tsx shared/__tests__/zoneCadence.test.ts
 * (Excluded from `tsc` via the tsconfig `**\/*.test.ts` exclude.)
 */
import assert from "node:assert/strict";
import {
  clamp,
  normalizeZoneDurations,
  zonesFromFractions,
} from "../zoneCalculations.ts";
import {
  OPTIMAL_CADENCE_MIN_SPM,
  OPTIMAL_CADENCE_MAX_SPM,
  isLikelySingleLegCadence,
  normalizeCadenceToSpm,
  isCadenceOptimal,
  cadenceBandPosition,
} from "../cadenceNormalization.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("zoneCalculations");

test("clamp bounds values and handles non-finite", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
  // Non-finite inputs collapse to `min` per the documented contract.
  assert.equal(clamp(NaN, 2, 10), 2);
  assert.equal(clamp(Infinity, 2, 10), 2);
});

test("normalizeZoneDurations: no zone exceeds activity duration", () => {
  const duration = 600; // 10 min
  const zones = normalizeZoneDurations([100, 200, 300, 400, 500], duration);
  for (const z of zones) {
    assert.ok(z.seconds <= duration, `seconds ${z.seconds} > ${duration}`);
    assert.ok(z.seconds >= 0);
  }
});

test("normalizeZoneDurations: sum of seconds never exceeds duration", () => {
  const duration = 600;
  // Raw total (1500) overshoots duration -> must rescale.
  const zones = normalizeZoneDurations([100, 200, 300, 400, 500], duration);
  const total = zones.reduce((s, z) => s + z.seconds, 0);
  assert.ok(total <= duration + 1e-9, `total ${total} > ${duration}`);
});

test("normalizeZoneDurations: percentages within 0..100 and sum <= 100", () => {
  const zones = normalizeZoneDurations([100, 200, 300, 400, 500], 600);
  let sum = 0;
  for (const z of zones) {
    assert.ok(z.percentage >= 0 && z.percentage <= 100, `pct ${z.percentage}`);
    sum += z.percentage;
  }
  assert.ok(sum <= 100, `percentage sum ${sum} > 100`);
});

test("normalizeZoneDurations: largest-remainder avoids >100% artifact", () => {
  // Three equal buckets -> 33.33% each. Naive rounding would give 33+33+33=99
  // or 34*3=102; Hamilton keeps the sum <= 100.
  const zones = normalizeZoneDurations([1, 1, 1], 300);
  const sum = zones.reduce((s, z) => s + z.percentage, 0);
  assert.ok(sum <= 100, `sum ${sum}`);
  assert.ok(sum >= 99, `sum ${sum} too low`);
});

test("normalizeZoneDurations: raw under duration keeps proportions", () => {
  const duration = 1000;
  const zones = normalizeZoneDurations([100, 300], duration);
  // Total raw (400) < duration -> not rescaled; captured time = 400.
  assert.equal(zones[0].seconds, 100);
  assert.equal(zones[1].seconds, 300);
  assert.equal(zones[0].percentage, 25);
  assert.equal(zones[1].percentage, 75);
});

test("normalizeZoneDurations: handles zero/empty/invalid input", () => {
  assert.deepEqual(normalizeZoneDurations([], 600), []);
  const z = normalizeZoneDurations([0, 0, 0], 600);
  assert.ok(z.every((x) => x.seconds === 0 && x.percentage === 0));
  const z2 = normalizeZoneDurations([100, 200], 0);
  assert.ok(z2.every((x) => x.seconds === 0 && x.percentage === 0));
  const z3 = normalizeZoneDurations([NaN, -5, Infinity, 300], 600);
  assert.equal(z3[0].seconds, 0);
  assert.equal(z3[1].seconds, 0);
  assert.equal(z3[2].seconds, 0);
  assert.equal(z3[3].seconds, 300);
});

test("zonesFromFractions: fractions summing >1 stay bounded", () => {
  const duration = 600;
  // Deliberately over-1 fractions; must clamp to <= duration total.
  const zones = zonesFromFractions([0.5, 0.5, 0.5], duration);
  const total = zones.reduce((s, z) => s + z.seconds, 0);
  assert.ok(total <= duration + 1e-9, `total ${total}`);
  const pct = zones.reduce((s, z) => s + z.percentage, 0);
  assert.ok(pct <= 100, `pct ${pct}`);
});

test("zonesFromFractions: standard HR distribution sums to <=100%", () => {
  const zones = zonesFromFractions([0.15, 0.65, 0.15, 0.04, 0.01], 3600);
  const pct = zones.reduce((s, z) => s + z.percentage, 0);
  assert.ok(pct <= 100 && pct >= 99, `pct ${pct}`);
  for (const z of zones) assert.ok(z.seconds <= 3600);
});

console.log("cadenceNormalization");

test("optimal band constants are 170-180", () => {
  assert.equal(OPTIMAL_CADENCE_MIN_SPM, 170);
  assert.equal(OPTIMAL_CADENCE_MAX_SPM, 180);
});

test("isLikelySingleLegCadence detects per-leg RPM values", () => {
  assert.equal(isLikelySingleLegCadence(88), true);
  assert.equal(isLikelySingleLegCadence(95), true);
  assert.equal(isLikelySingleLegCadence(178), false);
  assert.equal(isLikelySingleLegCadence(120), false);
  assert.equal(isLikelySingleLegCadence(0), false);
  assert.equal(isLikelySingleLegCadence(-5), false);
  assert.equal(isLikelySingleLegCadence(null), false);
  assert.equal(isLikelySingleLegCadence(undefined), false);
  assert.equal(isLikelySingleLegCadence(NaN), false);
});

test("normalizeCadenceToSpm doubles single-leg but never double-converts spm", () => {
  assert.equal(normalizeCadenceToSpm(88), 176); // single-leg doubled
  assert.equal(normalizeCadenceToSpm(178), 178); // already spm, untouched
  assert.equal(normalizeCadenceToSpm(180), 180);
  assert.equal(normalizeCadenceToSpm(0), 0);
  assert.equal(normalizeCadenceToSpm(null), 0);
  assert.equal(normalizeCadenceToSpm(undefined), 0);
  // Idempotency on an already-normalized value: no further doubling.
  assert.equal(normalizeCadenceToSpm(normalizeCadenceToSpm(178)), 178);
});

test("isCadenceOptimal reflects 170-180 band", () => {
  assert.equal(isCadenceOptimal(170), true);
  assert.equal(isCadenceOptimal(175), true);
  assert.equal(isCadenceOptimal(180), true);
  assert.equal(isCadenceOptimal(169), false);
  assert.equal(isCadenceOptimal(181), false);
});

test("cadenceBandPosition classifies relative to band", () => {
  assert.equal(cadenceBandPosition(160), "below");
  assert.equal(cadenceBandPosition(175), "optimal");
  assert.equal(cadenceBandPosition(190), "above");
});

console.log(`\n${passed} assertions groups passed.`);
if (process.exitCode === 1) {
  console.error("TESTS FAILED");
} else {
  console.log("ALL TESTS PASSED");
}
