import test from "node:test";
import assert from "node:assert/strict";
import { posterStats } from "../src/poster";

test("poster derives average from supplied totals and shows dates", () => {
  const result = posterStats({ totalRuns: 16, totalKm: 104, from: "2026-08-01", to: "2026-08-28" });
  assert.equal(result.average, "6.5");
  assert.equal(result.distance, "104");
  assert.equal(result.period, "Aug 1, 2026 to Aug 28, 2026");
});
test("empty history does not invent a run average or dates", () => {
  assert.equal(posterStats({ totalRuns: 0, totalKm: 0 }).average, "N/A");
  assert.equal(posterStats({ totalRuns: 0, totalKm: 0 }).period, "Available activity history");
});
test("invalid metrics cannot appear in the downloadable poster", () => {
  for (const data of [{ totalRuns: -1, totalKm: 4 }, { totalRuns: 2, totalKm: NaN }]) {
    assert.throws(() => posterStats(data));
  }
});
