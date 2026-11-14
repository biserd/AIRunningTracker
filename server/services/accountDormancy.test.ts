import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  ACCOUNT_DORMANCY_DAYS,
  enforceAccountDormancy,
  shouldPauseForInactivity,
  type DormancySubject,
} from "./accountDormancy";
import { db } from "../db";
import { storage } from "../storage";
import { authService } from "./auth";
import { emailService } from "./email";
import type { CloudflareSuppressionCheck } from "./cloudflareEmail";

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

test("dormancy leaves account paused without attempting email to opted-out or suppressed recipients", async (t) => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, first_name TEXT,
      strava_webhook_paused_at TEXT, dormancy_notice_sent_at TEXT, subscription_plan TEXT,
      subscription_status TEXT, marketing_opt_out INTEGER, marketing_consent_status TEXT);
  `);
  t.after(() => sqlite.close());
  sqlite.prepare(`INSERT INTO users VALUES (1, 'runner@example.test', 'Runner', ?, NULL, 'free', 'active', 0, 'unknown')`)
    .run(now.toISOString());
  const dialect = new PgDialect();
  // Execute the production claim and release predicates against SQLite (D1's
  // dialect), replacing only the PostgreSQL positional placeholder syntax.
  t.mock.method(db, "execute", async (stmt: Parameters<typeof db.execute>[0]) => {
    const {sql, params} = dialect.sqlToQuery(stmt as import("drizzle-orm").SQL);
    const ordered: (string | number | null)[] = [];
    const query = sql.replace(/\$(\d+)/g, (_match, position) => {
      const value = params[Number(position) - 1];
      ordered.push(value instanceof Date ? value.toISOString() : value as string | number | null);
      return "?";
    });
    return { rows: sqlite.prepare(query).all(...ordered) };
  });
  t.mock.method(storage, "getUser", async () => ({...freeUser, id:1, stravaWebhookPausedAt:now}));
  let preflight: CloudflareSuppressionCheck = {status:"clear"};
  const check = t.mock.method(emailService, "checkCloudflareSuppression", async () => preflight);
  const link = t.mock.method(authService, "wrapWithEmailMagicLink", async () => "https://aitracker.run/dashboard");
  const send = t.mock.method(emailService, "sendAccountDormantEmail", async () => true);

  for (const [optOut, status] of [[1, "unknown"], [0, "unsubscribed"], [0, "suppressed"]] as const) {
    sqlite.prepare("UPDATE users SET marketing_opt_out=?, marketing_consent_status=?").run(optOut, status);
    assert.deepEqual(await enforceAccountDormancy(1, now), {paused:true, newlyPaused:false, noticeSent:false});
  }
  assert.equal(check.mock.callCount(), 0);
  assert.equal(link.mock.callCount(), 0);
  assert.equal(send.mock.callCount(), 0);

  sqlite.exec("UPDATE users SET marketing_opt_out=0, marketing_consent_status='unknown'");
  for (const state of [{status:"suppressed", reason:"manual"}, {status:"unavailable"}] as const) {
    preflight = state;
    assert.equal((await enforceAccountDormancy(1, now)).noticeSent, false);
    assert.equal(sqlite.prepare("SELECT dormancy_notice_sent_at FROM users").get()?.dormancy_notice_sent_at, null);
  }
  assert.equal(link.mock.callCount(), 0);
  assert.equal(send.mock.callCount(), 0);
  preflight = {status:"clear"};
  assert.equal((await enforceAccountDormancy(1, now)).noticeSent, true);
  assert.equal((await enforceAccountDormancy(1, now)).noticeSent, false);
  assert.equal(send.mock.callCount(), 1);
});
