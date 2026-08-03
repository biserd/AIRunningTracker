import assert from "node:assert/strict";
import {
  ACCOUNT_DORMANCY_DAYS,
  shouldPauseForInactivity,
  type DormancySubject,
} from "./accountDormancy";

const now = new Date("2026-08-03T12:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const freeUser = {
  subscriptionPlan: "free",
  subscriptionStatus: "active",
  stravaConnected: true,
  lastSeenAt: daysAgo(ACCOUNT_DORMANCY_DAYS),
  createdAt: daysAgo(100),
} satisfies DormancySubject;

assert.equal(
  shouldPauseForInactivity(freeUser, now),
  true,
  "a connected free account pauses at exactly 30 days",
);

assert.equal(
  shouldPauseForInactivity({ ...freeUser, lastSeenAt: new Date(now.getTime() - (30 * 24 - 1) * 60 * 60 * 1000) }, now),
  false,
  "an account just under 30 days inactive remains active",
);

assert.equal(
  shouldPauseForInactivity({ ...freeUser, lastSeenAt: daysAgo(2), createdAt: daysAgo(100) }, now),
  false,
  "a recent visit takes precedence over an old account creation date",
);

assert.equal(
  shouldPauseForInactivity({ ...freeUser, lastSeenAt: null, createdAt: daysAgo(31) }, now),
  true,
  "creation date is used when an account has never recorded a visit",
);

for (const paidSubject of [
  { subscriptionPlan: "premium", subscriptionStatus: "active" },
  { subscriptionPlan: "premium", subscriptionStatus: "trialing" },
  { subscriptionPlan: "pro", subscriptionStatus: "active" },
] as const) {
  assert.equal(
    shouldPauseForInactivity({ ...freeUser, ...paidSubject }, now),
    false,
    `${paidSubject.subscriptionPlan}/${paidSubject.subscriptionStatus} must never pause`,
  );
}

assert.equal(
  shouldPauseForInactivity({ ...freeUser, subscriptionPlan: "premium", subscriptionStatus: "canceled" }, now),
  true,
  "an expired premium account follows the free-account inactivity policy",
);

assert.equal(
  shouldPauseForInactivity({ ...freeUser, stravaConnected: false }, now),
  false,
  "an account without Strava connected has nothing to pause",
);

assert.equal(
  shouldPauseForInactivity({ ...freeUser, lastSeenAt: null, createdAt: null }, now),
  false,
  "missing activity timestamps do not cause an unsafe pause",
);

console.log("accountDormancy.test: all assertions passed");
