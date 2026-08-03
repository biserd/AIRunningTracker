/**
 * Backfill the one-time Premium Preview for eligible existing runners.
 *
 * Safe default is a dry run:
 *   tsx scripts/backfill-premium-previews.ts --limit=100
 * Apply writes explicitly:
 *   tsx scripts/backfill-premium-previews.ts --apply --limit=100
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { hasPremiumAccess } from "../shared/entitlements";
import { createPremiumPreviewForUser } from "../server/services/premiumPreview";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const requestedLimit = Number(limitArg?.split("=")[1] || 100);
const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
  ? Math.min(requestedLimit, 1000)
  : 100;

const candidates = await db
  .select({
    id: users.id,
    subscriptionPlan: users.subscriptionPlan,
    subscriptionStatus: users.subscriptionStatus,
  })
  .from(users)
  .where(and(eq(users.stravaConnected, true), isNull(users.premiumPreview)))
  .limit(limit);

const eligible = candidates.filter((user) => !hasPremiumAccess(user));
console.log(`[PremiumPreviewBackfill] ${eligible.length} eligible candidate(s); mode=${apply ? "apply" : "dry-run"}`);

if (!apply) {
  console.log(`[PremiumPreviewBackfill] Candidate user IDs: ${eligible.map((user) => user.id).join(", ") || "none"}`);
  process.exit(0);
}

const totals: Record<string, number> = {};
for (const user of eligible) {
  try {
    const result = await createPremiumPreviewForUser(user.id);
    const outcome = result.created ? "created" : result.reason;
    totals[outcome] = (totals[outcome] || 0) + 1;
  } catch (error) {
    totals.failed = (totals.failed || 0) + 1;
    console.error(`[PremiumPreviewBackfill] User ${user.id} failed:`, error);
  }
}

console.log("[PremiumPreviewBackfill] Complete", totals);
