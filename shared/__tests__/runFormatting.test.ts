import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
  runUnitLabels,
} from "../runFormatting";

test("activity header and preview can share identical imperial formatting", () => {
  const distanceMeters = 8400;
  const movingTimeSeconds = 3378;
  assert.equal(formatRunDistance(distanceMeters, "miles"), "5.22");
  assert.equal(formatRunPace(movingTimeSeconds, distanceMeters, "miles"), "10:47");
  assert.deepEqual(runUnitLabels("miles"), { distanceUnit: "mi", paceUnit: "/mi" });
});

test("pace rounding carries cleanly instead of producing 9:60", () => {
  assert.equal(formatRunPace(599.6, 1000, "km"), "10:00");
});

test("invalid totals render safe zero values", () => {
  assert.equal(formatRunDistance(Number.NaN, "km"), "0.00");
  assert.equal(formatRunPace(0, 5000, "km"), "0:00");
  assert.equal(formatRunDuration(3378), "56:18");
});
