import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { funnelEvents } from "@shared/schema";
import { readRaceEstimate } from "./raceEstimateStore";

export async function hasCompletedRaceEstimate(userId: number): Promise<boolean> {
  const saved = await import("../d1/runtimeDatabase")
    .then(({ applicationSqlDatabase }) => readRaceEstimate(applicationSqlDatabase, userId))
    .catch(() => null);
  if (saved) return true;
  // Older results may have a completion event but no restorable private estimate.
  const rows = await db.select({ id: funnelEvents.id }).from(funnelEvents).where(and(
    eq(funnelEvents.userId, userId), eq(funnelEvents.event, "tool_completed"), eq(funnelEvents.capability, "race_prediction"),
  )).limit(1);
  return rows.length > 0;
}
