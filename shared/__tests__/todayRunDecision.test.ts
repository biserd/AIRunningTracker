import assert from "node:assert/strict";
import test from "node:test";
import { getTodayRunDecision } from "../todayRunDecision";

const now = new Date("2026-08-03T12:00:00Z");

test("only disconnected users see the Connect Strava decision", () => {
  assert.equal(getTodayRunDecision({ isStravaConnected: false, recentRuns: 0, now }).kind, "connect");
  assert.notEqual(getTodayRunDecision({ isStravaConnected: true, recentRuns: 0, now }).kind, "connect");
  assert.notEqual(getTodayRunDecision({
    isStravaConnected: true,
    recentRuns: 10,
    latestRunAt: "2026-07-11T12:00:00Z",
    now,
  }).kind, "connect");
});

test("a connected runner returning after two weeks gets an ease-back decision without Premium recovery data", () => {
  const decision = getTodayRunDecision({
    isStravaConnected: true,
    recentRuns: 10,
    latestRunAt: "2026-07-11T12:00:00Z",
    now,
  });
  assert.equal(decision.kind, "return");
  assert.match(decision.title, /Ease back/i);
});

test("Premium recovery data overrides the basic recent-data fallback", () => {
  const decision = getTodayRunDecision({
    isStravaConnected: true,
    recentRuns: 4,
    latestRunAt: "2026-08-02T12:00:00Z",
    recoveryData: { daysSinceLastRun: 1, readyToRun: false },
    now,
  });
  assert.equal(decision.kind, "recovery");
});
