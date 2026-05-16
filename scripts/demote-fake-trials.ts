/**
 * One-shot migration: demote stale reverse-trial users.
 *
 * The free-tier pivot retired the 7-day card-free Premium "reverse trial".
 * Any user whose `trialEndsAt` is still in the future BUT who has never
 * attached a Stripe subscription (i.e. they were on the old reverse trial,
 * not a real Stripe trialing customer) must be demoted to plain free so
 * the dashboard renders the 20-run cap and the Premium upgrade nudge.
 *
 * Real Stripe customers in `trialing` status are left untouched —
 * the filter `stripeSubscriptionId IS NULL` guarantees we never touch them.
 *
 * Usage:  npx tsx scripts/demote-fake-trials.ts
 */
import { db } from "../server/db";
import { users } from "@shared/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

async function main() {
  const now = new Date();

  const candidates = await db
    .select({
      id: users.id,
      email: users.email,
      trialEndsAt: users.trialEndsAt,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(
      and(
        gt(users.trialEndsAt, now),
        isNull(users.stripeSubscriptionId),
      ),
    );

  console.log(`[demote-fake-trials] found ${candidates.length} candidate user(s) with active reverse trial and no Stripe sub`);
  for (const u of candidates) {
    console.log(
      `  - id=${u.id} email=${u.email ?? "(none)"} plan=${u.subscriptionPlan} status=${u.subscriptionStatus} trialEndsAt=${u.trialEndsAt?.toISOString()}`,
    );
  }

  if (candidates.length === 0) {
    console.log("[demote-fake-trials] nothing to do.");
    return;
  }

  const result = await db
    .update(users)
    .set({
      trialEndsAt: null,
      subscriptionPlan: "free",
      subscriptionStatus: "free",
    })
    .where(
      and(
        gt(users.trialEndsAt, now),
        isNull(users.stripeSubscriptionId),
      ),
    )
    .returning({ id: users.id });

  console.log(`[demote-fake-trials] demoted ${result.length} user(s) to plan='free' status='free' trialEndsAt=null`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[demote-fake-trials] failed:", err);
    process.exit(1);
  });
