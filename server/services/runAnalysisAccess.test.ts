import assert from "node:assert/strict";
import test from "node:test";
import { canGenerateRunCoachRecap, canViewRunAnalysis, isFreeAnalysisRun, savedPreviewRunId } from "./runAnalysisAccess";

const run = { id: 41, userId: 8, stravaId: "970", type: "Run" };
const runner = { id: 8, stravaConnected: true, subscriptionPlan: "free", subscriptionStatus: "active",
  premiumPreview: { activityId: 41, sourceData: { activityId: 41 } } };

test("the saved eligible Strava run is the only full analysis for a free owner", () => {
  assert.equal(isFreeAnalysisRun(runner, run), true);
  assert.equal(canViewRunAnalysis(runner, run), true);
  assert.equal(canGenerateRunCoachRecap(runner, run), true);
  for (const other of [{ ...run, id: 42 }, { ...run, userId: 9 }, { ...run, stravaId: null }, { ...run, type: "Ride" }]) {
    assert.equal(canViewRunAnalysis(runner, other), false);
    assert.equal(canGenerateRunCoachRecap(runner, other), false);
  }
  assert.equal(isFreeAnalysisRun({ ...runner, stravaConnected: false }, run), false);
  assert.equal(canViewRunAnalysis({ ...runner, premiumPreview: null }, run), false);
  assert.equal(canGenerateRunCoachRecap({ ...runner, coachEnabled: false }, run), false);
});

test("legacy preview IDs work, mismatched or malformed IDs fail closed", () => {
  assert.equal(savedPreviewRunId({ activityId: 41 }), 41);
  assert.equal(savedPreviewRunId({ sourceData: { activityId: 41 } }), 41);
  for (const preview of [null, {}, { activityId: "41" }, { activityId: -4 }, { activityId: 41, sourceData: { activityId: 42 } }]) {
    assert.equal(savedPreviewRunId(preview), null);
  }
});

test("paid and trial owners can still analyze other runs; an expired plan doesn't get unrestricted access", () => {
  const another = { ...run, id: 42 };
  for (const subscriptionStatus of ["active","trialing"]) {
    const paid = { ...runner, subscriptionPlan: "premium", subscriptionStatus };
    assert.equal(canViewRunAnalysis(paid, another), true);
    assert.equal(isFreeAnalysisRun(paid, run), false);
    assert.equal(canViewRunAnalysis(paid, { ...run, userId: 9 }), false);
    assert.equal(canGenerateRunCoachRecap(paid, another), false);
    assert.equal(canGenerateRunCoachRecap({ ...paid, coachOnboardingCompleted: true }, another), true);
  }
  assert.equal(canViewRunAnalysis({ ...runner, subscriptionPlan: "premium", subscriptionStatus: "canceled" }, another), false);
});
