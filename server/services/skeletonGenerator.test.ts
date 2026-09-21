import assert from "node:assert/strict";
import test from "node:test";
import type { AthleteProfile } from "@shared/schema";
import { generateSkeleton } from "./skeletonGenerator";

test("the skeleton preserves every approved run day", () => {
  const preferredRunDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "saturday",
    "sunday",
  ];
  const profile = {
    baselineWeeklyMileageKm: 43.8,
    longestRecentRunKm: 22.5,
    avgRunsPerWeek: 2.25,
    typicalEasyPaceMin: 6.5,
  } as AthleteProfile;

  const skeleton = generateSkeleton({
    userId: 105,
    goalType: "50_mile",
    raceDate: "2026-12-16",
    preferredRunDays,
    maxWeeklyHours: 12,
    constraints: "Weekend back-to-backs after the November marathon.",
  }, profile, 12);

  assert.deepEqual(skeleton.trainingPlan.preferredDays, preferredRunDays);
  assert.equal(skeleton.trainingPlan.daysPerWeek, 6);
  const firstWeekRunDays = skeleton.weeks[0].days
    .filter((day) => day.workoutType !== "rest")
    .map((day) => day.dayOfWeek);
  assert.deepEqual(firstWeekRunDays, ["Mon", "Tue", "Wed", "Thu", "Sat", "Sun"]);
});
