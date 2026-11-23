import assert from "node:assert/strict";
import test from "node:test";
import { daySevenPlanGoal, daySevenPlanPath, DAY_SEVEN_RACE_REVIEW, raceEstimate, raceEstimateSchema, raceWeekTip } from "../daySevenRace";
import { predictRaceTime } from "../racePrediction";
import { buildUpgradeUrl, parseUpgradeIntent, sanitizeReturnTo } from "../upgradeIntent";

test("Day 7 carries an allowlisted race distance through pricing, not the person's result", () => {
  const returnTo = daySevenPlanPath("half_marathon");
  const pricing = buildUpgradeUrl({ source: "signup_day7", capability: "training_plans", returnTo, benefitKey: "training_plan" });
  assert.equal(daySevenPlanGoal(parseUpgradeIntent(new URL(pricing, "https://example.test").search)?.returnTo), "half_marathon");
  assert.equal(daySevenPlanGoal(returnTo + "&seconds=9000"), null);
  assert.equal(daySevenPlanGoal("/training-plans?source=signup_day7&raceGoal=100_mile"), null);
  assert.equal(daySevenPlanGoal("https://example.test" + returnTo), null);
  assert.equal(sanitizeReturnTo(DAY_SEVEN_RACE_REVIEW), DAY_SEVEN_RACE_REVIEW);
  assert.equal(sanitizeReturnTo(DAY_SEVEN_RACE_REVIEW + "&redirect=//example.test"), null);
});

test("only a valid estimate for a supported distance is saved; advice is distance-aware", () => {
  const input = { baseEffort: { time: 2700, distance: 10000 }, targetDistance: 21097 };
  const result = predictRaceTime(input);
  const estimate = raceEstimate(input.targetDistance, result);
  assert.equal(estimate?.goal, "half_marathon");
  assert.equal(estimate?.seconds, Math.round(result.predictedTime));
  assert.equal(raceEstimate(0, result), null);
  assert.equal(raceEstimate(input.targetDistance, { ...result, predictedTime: Infinity }), null);
  assert.equal(raceEstimateSchema.safeParse({ ...estimate, userId: 12 }).success, false);
  assert.match(raceWeekTip("half_marathon"), /usual long run/);
  assert.match(raceWeekTip("5k"), /easy run/);
});
