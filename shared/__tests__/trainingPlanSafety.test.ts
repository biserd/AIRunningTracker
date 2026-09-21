import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeInitialRunDayCount,
  getRunFrequencyWarnings,
  normalizePreferredRunDays,
} from "../trainingPlanSafety";

test("the conservative frequency recommendation still reflects recent history", () => {
  assert.equal(getSafeInitialRunDayCount(1.3, 5), 2);
});

test("frequency can rise gradually for established runners", () => {
  assert.equal(getSafeInitialRunDayCount(2.2, 5), 3);
  assert.equal(getSafeInitialRunDayCount(4.1, 6), 5);
});

test("new runners default to at most two requested days", () => {
  assert.equal(getSafeInitialRunDayCount(null, 5), 2);
  assert.equal(getSafeInitialRunDayCount(0, 1), 1);
});

test("normalization removes invalid and duplicate names without truncating approved days", () => {
  assert.deepEqual(
    normalizePreferredRunDays(["Monday", "monday", "Funday", "Friday"]),
    ["monday", "friday"],
  );
  assert.deepEqual(
    normalizePreferredRunDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday", "Sunday"]),
    ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"],
  );
});

test("higher requested frequency produces a visible warning instead of changing days", () => {
  const warnings = getRunFrequencyWarnings(
    ["monday", "tuesday", "wednesday", "thursday", "saturday", "sunday"],
    2.25,
  );
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /selected 6 running days/);
  assert.match(warnings[0], /approved days were preserved/i);
});

