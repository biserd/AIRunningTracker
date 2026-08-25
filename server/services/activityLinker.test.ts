import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Activity, PlanDay } from "@shared/schema";
import { deriveCalendarWeekNumber } from "@shared/trainingPlanProgress";
import { actualMetrics, calculateMatchScore, determineLinkedStatus } from "@shared/trainingPlanMatching";

function planDay(overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    id: 1,
    weekId: 10,
    planId: 76,
    date: new Date("2026-08-25T00:00:00.000Z"),
    dayOfWeek: "tuesday",
    workoutType: "easy",
    title: "Easy run",
    description: null,
    plannedDistanceKm: 10,
    plannedDurationMins: 60,
    targetPace: null,
    targetHrZone: null,
    intensity: "low",
    plannedVertGainM: null,
    isBackToBackLongRun: false,
    fuelingPractice: false,
    goalContribution: null,
    workoutStructure: null,
    status: "pending",
    linkedActivityId: null,
    actualDistanceKm: null,
    actualDurationMins: null,
    actualPace: null,
    userNotes: null,
    perceivedEffort: null,
    wasAdjusted: false,
    originalWorkoutType: null,
    originalDistanceKm: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 501,
    userId: 9,
    stravaId: "12345",
    name: "Morning Run",
    distance: 9_500,
    movingTime: 3_420,
    totalElevationGain: 50,
    averageSpeed: 2.78,
    maxSpeed: 4,
    startDate: new Date("2026-08-25T11:00:00.000Z"),
    type: "Run",
    ...overrides,
  } as Activity;
}

test("calendar progression derives week 10 from plan dates and clamps outside the plan", () => {
  const weeks = Array.from({ length: 18 }, (_, index) => {
    const start = new Date("2026-06-23T00:00:00.000Z");
    start.setUTCDate(start.getUTCDate() + index * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { weekNumber: index + 1, weekStartDate: start, weekEndDate: end };
  });

  assert.equal(deriveCalendarWeekNumber(weeks, new Date("2026-08-25T12:00:00.000Z"), "America/New_York"), 10);
  assert.equal(deriveCalendarWeekNumber(weeks, new Date("2026-06-01T12:00:00.000Z"), "UTC"), 1);
  assert.equal(deriveCalendarWeekNumber(weeks, new Date("2027-01-01T12:00:00.000Z"), "UTC"), 18);
});

test("activity matching respects the runner calendar date and workout evidence", () => {
  const day = planDay();
  const sameLocalDate = activity({ startDate: new Date("2026-08-26T01:00:00.000Z") });
  assert.ok(calculateMatchScore(day, sameLocalDate, "America/New_York") != null);
  assert.equal(determineLinkedStatus(day, sameLocalDate), "completed");

  const warmup = activity({ distance: 1_000, movingTime: 360 });
  assert.equal(calculateMatchScore(day, warmup, "America/New_York"), null);

  const adjacentIntervals = activity({
    name: "Track intervals",
    workoutType: 3,
    startDate: new Date("2026-08-26T11:00:00.000Z"),
  });
  assert.ok(calculateMatchScore(planDay({ workoutType: "intervals" }), adjacentIntervals, "America/New_York") != null);
});

test("actual metrics are bounded and avoid invalid pace output", () => {
  assert.deepEqual(actualMetrics(activity({ distance: 0, movingTime: 0 })), { distanceKm: 0, durationMins: 0 });
  assert.deepEqual(actualMetrics(activity({ distance: 10_000, movingTime: 3_000 })), {
    distanceKm: 10,
    durationMins: 50,
    pace: "5:00/km",
  });
});

test("all Strava ingestion paths trigger runner-scoped plan reconciliation", () => {
  const strava = readFileSync(new URL("./strava.ts", import.meta.url), "utf8");
  const webhook = readFileSync(new URL("./stravaWebhook.ts", import.meta.url), "utf8");
  const queue = readFileSync(new URL("./queue/jobQueue.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("../storage.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
  const generator = readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf8");

  assert.match(strava, /autoLinkActivitiesForUser\(userId\)/);
  assert.match(webhook, /autoLinkActivitiesForUser\(user\.id\)/);
  assert.match(queue, /autoLinkActivitiesForUser\(userId\)/);
  assert.match(storage, /deriveCalendarWeekNumber/);
  assert.match(routes, /reconcileTrainingPlanProgress\(day\.planId, userId\)/);
  assert.doesNotMatch(generator, /currentWeek:\s*completedWeeks\s*\+\s*1/);
});
