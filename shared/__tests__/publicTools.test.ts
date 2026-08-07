import assert from "node:assert/strict";
import test from "node:test";
import { calculateAerobicDecoupling } from "../aerobicDecoupling";
import { summarizeTrainingSplit } from "../trainingSplit";
import { analyzeCadence } from "../cadenceAnalysis";
import { canonicalizeShoeCatalog } from "../shoeCanonicalization";
import { calculateRaceSplits, calculateTrainingPaces } from "../runningCalculators";

test("decoupling uses one positive-fade convention", () => {
  const faded = calculateAerobicDecoupling(3, 150, 2.8, 155);
  assert.ok(faded.decouplingPercent > 0);
  assert.equal(faded.classification, "Significant Fade");

  const improved = calculateAerobicDecoupling(2.8, 155, 3, 150);
  assert.ok(improved.decouplingPercent < 0);
  assert.equal(improved.classification, "Improved");
});

test("training recommendations are invariant across equivalent period lengths", () => {
  const fourWeeks = summarizeTrainingSplit(1200, 400, 0, 28);
  const sixWeeks = summarizeTrainingSplit(1800, 600, 0, 42);
  assert.equal(fourWeeks.weeklyAverageMinutes, sixWeeks.weeklyAverageMinutes);
  assert.deepEqual(fourWeeks.recommendations, sixWeeks.recommendations);
});

test("threshold-heavy advice redistributes time and never auto-adds hard minutes", () => {
  const result = summarizeTrainingSplit(900, 600, 0, 28, "race");
  assert.equal(result.classification, "Threshold-Heavy");
  assert.equal(result.recommendations[2].adjustment, "No automatic increase");
});

test("cadence score is always finite and within 0-100", () => {
  const result = analyzeCadence({
    dataPoints: [{ time: 0, cadence: 172 }, { time: 1800, cadence: 168 }],
    activityDuration: 1800,
  });
  assert.ok(Number.isFinite(result.formStabilityScore));
  assert.ok(result.formStabilityScore >= 0 && result.formStabilityScore <= 100);
});

test("shoe aliases resolve to one sourced canonical record", () => {
  const shoes = [
    { id: 1, brand: "ASICS", model: "Novablast 5 Men's", slug: "asics-novablast-5-mens" },
    { id: 2, brand: "Asics", model: "Novablast 5", slug: "asics-novablast-5", sourceUrl: "https://example.com", lastVerified: "2026-08-01" },
  ];
  const result = canonicalizeShoeCatalog(shoes);
  assert.equal(result.canonicalShoes.length, 1);
  assert.equal(result.aliasToCanonical.get("asics-novablast-5-mens"), "asics-novablast-5");
});

test("training paces are ordered from faster to slower within every zone", () => {
  const result = calculateTrainingPaces({
    distanceMeters: 10_000,
    timeSeconds: 45 * 60,
    raceAgeDays: 14,
    weeklyDistanceKm: 40,
  });
  assert.equal(result.confidence, "High");
  result.zones.forEach((zone) => assert.ok(zone.fasterSecondsPerKm <= zone.slowerSecondsPerKm));
  assert.ok(result.zones.find((zone) => zone.key === "easy")!.fasterSecondsPerKm > result.zones.find((zone) => zone.key === "threshold")!.fasterSecondsPerKm);
});

test("race splits always add up to the exact goal time", () => {
  for (const strategy of ["even", "conservative", "negative"] as const) {
    const result = calculateRaceSplits({ distanceMeters: 42_195, goalTimeSeconds: 4 * 3600, unit: "miles", strategy });
    assert.equal(result.rows.at(-1)?.cumulativeSeconds, 4 * 3600);
  }
});

test("negative split strategy makes the second half faster", () => {
  const result = calculateRaceSplits({ distanceMeters: 10_000, goalTimeSeconds: 50 * 60, unit: "km", strategy: "negative" });
  assert.ok(result.secondHalfSeconds < result.firstHalfSeconds);
});
