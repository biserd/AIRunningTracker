import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeInitialRunDayCount,
  selectSafePreferredRunDays,
} from "../trainingPlanSafety";

test("a low-frequency runner is not scheduled for five runs in week one", () => {
  assert.equal(getSafeInitialRunDayCount(1.3, 5), 2);
  assert.deepEqual(
    selectSafePreferredRunDays(
      ["monday", "wednesday", "friday", "saturday", "sunday"],
      1.3,
    ),
    ["monday", "wednesday"],
  );
});

test("frequency can rise gradually for established runners", () => {
  assert.equal(getSafeInitialRunDayCount(2.2, 5), 3);
  assert.equal(getSafeInitialRunDayCount(4.1, 6), 5);
});

test("new runners default to at most two requested days", () => {
  assert.equal(getSafeInitialRunDayCount(null, 5), 2);
  assert.equal(getSafeInitialRunDayCount(0, 1), 1);
});

test("invalid and duplicate day names are removed", () => {
  assert.deepEqual(
    selectSafePreferredRunDays(["Monday", "monday", "Funday", "Friday"], 3),
    ["monday", "friday"],
  );
});

