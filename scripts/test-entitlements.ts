import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canAccessCapability,
  FREE_ACTIVITY_LIMIT,
  getCapabilityMatrix,
  getEntitlementState,
  hasPremiumAccess,
} from "../shared/entitlements";

const cases = [
  [{ subscriptionPlan: "free", subscriptionStatus: "free" }, "free", false],
  [{ subscriptionPlan: "premium", subscriptionStatus: "trialing" }, "trial", true],
  [{ subscriptionPlan: "pro", subscriptionStatus: "active" }, "paid", true],
  [{ subscriptionPlan: "premium", subscriptionStatus: "canceled" }, "expired", false],
  [{ subscriptionPlan: "premium", subscriptionStatus: "past_due" }, "expired", false],
] as const;

for (const [subject, expectedState, expectedPremium] of cases) {
  assert.equal(getEntitlementState(subject), expectedState);
  assert.equal(hasPremiumAccess(subject), expectedPremium);
  assert.equal(
    canAccessCapability(subject, "activity_deep_dive"),
    expectedPremium,
  );
  assert.equal(canAccessCapability(subject, "activity_story"), true);
}

const freeMatrix = getCapabilityMatrix({
  subscriptionPlan: "free",
  subscriptionStatus: "free",
});
assert.equal(freeMatrix.limits.activities, FREE_ACTIVITY_LIMIT);
assert.equal(freeMatrix.capabilities.racePredictions, false);
assert.equal(freeMatrix.capabilities.injuryRisk, false);

const paidMatrix = getCapabilityMatrix({
  subscriptionPlan: "premium",
  subscriptionStatus: "active",
});
assert.equal(paidMatrix.limits.activities, null);
assert.equal(paidMatrix.capabilities.racePredictions, true);

const routesSource = readFileSync(
  new URL("../server/routes.ts", import.meta.url),
  "utf8",
);

const requiredRouteGuards = [
  ['"/api/ml/predictions/:userId"', '"race_predictions"'],
  ['"/api/ml/injury-risk/:userId"', '"injury_risk"'],
  ['"/api/activities/:activityId/comparison"', '"activity_comparison"'],
] as const;

for (const [route, capability] of requiredRouteGuards) {
  const routeStart = routesSource.indexOf(route);
  assert.notEqual(routeStart, -1, `Missing route ${route}`);
  const routeBody = routesSource.slice(routeStart, routeStart + 4_000);
  assert.match(
    routeBody,
    /authenticateJWT/,
    `${route} must require authentication`,
  );
  assert.ok(
    routeBody.includes(`requireCapability(req, res, ${capability})`),
    `${route} must require ${capability}`,
  );
}

// The one-run grant is scoped to the owned run, not a Premium entitlement.
for (const action of ["performance", "verdict", "efficiency", "quality", "coach-recap"]) {
  const start = routesSource.indexOf(`app.get("/api/activities/:activityId/${action}",`);
  assert.notEqual(start, -1, `Missing run-analysis route: ${action}`);
  const end = routesSource.indexOf("\n  app.", start + 1);
  const body = routesSource.slice(start, end === -1 ? undefined : end);
  assert.match(body, /authenticateJWT/);
  assert.match(body, /requireRunAnalysis\(req, res, /);
}
assert.match(routesSource.slice(
  routesSource.indexOf("async function requireRunAnalysis"),
  routesSource.indexOf("async function requireRunAnalysis") + 900,
), /canViewRunAnalysis\(user, activity\)/);

const detailRouteStart = routesSource.indexOf(
  'app.get("/api/activities/:activityId",',
);
const detailRoute = routesSource.slice(detailRouteStart, detailRouteStart + 8_000);
assert.match(detailRoute, /deepDiveLocked: !mayViewDeepDive/);
assert.match(detailRoute, /mayViewDeepDive \? \{/);
assert.match(detailRoute, /streamsData,/);
assert.match(detailRoute, /lapsData,/);

console.log("Entitlement matrix tests passed");
