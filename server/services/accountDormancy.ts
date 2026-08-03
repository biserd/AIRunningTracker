import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { User } from "@shared/schema";
import { users } from "@shared/schema";
import { db } from "../db";
import { storage } from "../storage";
import { isPaidPlan } from "../rateLimits";
import { authService } from "./auth";
import { emailService } from "./email";

export const ACCOUNT_DORMANCY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const BASE_URL = (process.env.APP_URL || "https://aitracker.run").replace(/\/$/, "");

export type DormancySubject = Pick<
  User,
  | "subscriptionPlan"
  | "subscriptionStatus"
  | "stravaConnected"
  | "lastSeenAt"
  | "createdAt"
>;

export function inactivityReferenceDate(user: DormancySubject): Date | null {
  const value = user.lastSeenAt ?? user.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function shouldPauseForInactivity(
  user: DormancySubject,
  now: Date = new Date(),
  inactivityDays: number = ACCOUNT_DORMANCY_DAYS,
): boolean {
  if (!user.stravaConnected) return false;
  if (isPaidPlan(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null)) return false;

  const reference = inactivityReferenceDate(user);
  if (!reference) return false;
  return now.getTime() - reference.getTime() >= inactivityDays * DAY_MS;
}

function rowsFromResult<T>(result: any): T[] {
  return (result?.rows ?? result ?? []) as T[];
}

async function markDormantIfEligible(userId: number, now: Date): Promise<boolean> {
  const cutoff = new Date(now.getTime() - ACCOUNT_DORMANCY_DAYS * DAY_MS);
  const result = await db.execute(sql`
    UPDATE users
    SET strava_webhook_paused_at = ${now}
    WHERE id = ${userId}
      AND strava_connected = TRUE
      AND strava_webhook_paused_at IS NULL
      AND COALESCE(last_seen_at, created_at) <= ${cutoff}
      AND NOT (
        COALESCE(subscription_plan, 'free') IN ('premium', 'pro')
        AND COALESCE(subscription_status, 'active') IN ('active', 'trialing')
      )
    RETURNING id
  `);
  return rowsFromResult<{ id: number }>(result).length > 0;
}

async function sendDormancyNoticeIfNeeded(userId: number, now: Date): Promise<boolean> {
  // Setting the timestamp before sending acts as an atomic claim so the
  // worker and a webhook arriving at the same time cannot send duplicates.
  const claim = await db.execute(sql`
    UPDATE users
    SET dormancy_notice_sent_at = ${now}
    WHERE id = ${userId}
      AND strava_webhook_paused_at IS NOT NULL
      AND dormancy_notice_sent_at IS NULL
      AND NOT (
        COALESCE(subscription_plan, 'free') IN ('premium', 'pro')
        AND COALESCE(subscription_status, 'active') IN ('active', 'trialing')
      )
    RETURNING email, first_name
  `);
  const [claimed] = rowsFromResult<{ email: string | null; first_name: string | null }>(claim);
  if (!claimed) return false;

  if (!claimed.email) return false;
  const reactivateUrl = await authService.wrapWithEmailMagicLink(
    claimed.email,
    "/dashboard?account=reactivate",
    BASE_URL,
  );
  const sent = await emailService.sendAccountDormantEmail({
    to: claimed.email,
    firstName: claimed.first_name,
    reactivateUrl,
    settingsUrl: `${BASE_URL}/settings`,
    inactivityDays: ACCOUNT_DORMANCY_DAYS,
  });

  if (!sent) {
    // Release the claim so the next scan can retry a transient email failure.
    await db.execute(sql`
      UPDATE users
      SET dormancy_notice_sent_at = NULL
      WHERE id = ${userId}
        AND dormancy_notice_sent_at = ${now}
    `);
  }
  return sent;
}

/**
 * Enforce dormancy immediately for a single webhook user. The paid/trial
 * exemption is checked both in application code and in the atomic SQL update.
 */
export async function enforceAccountDormancy(
  userId: number,
  now: Date = new Date(),
): Promise<{ paused: boolean; newlyPaused: boolean; noticeSent: boolean }> {
  const user = await storage.getUser(userId);
  if (!user) return { paused: false, newlyPaused: false, noticeSent: false };

  if (isPaidPlan(user.subscriptionPlan ?? null, user.subscriptionStatus ?? null)) {
    if (user.stravaWebhookPausedAt) {
      await storage.updateUser(user.id, {
        stravaWebhookPausedAt: null,
        dormancyNoticeSentAt: null,
      });
    }
    return { paused: false, newlyPaused: false, noticeSent: false };
  }

  let newlyPaused = false;
  if (!user.stravaWebhookPausedAt && shouldPauseForInactivity(user, now)) {
    newlyPaused = await markDormantIfEligible(user.id, now);
  }

  const paused = Boolean(user.stravaWebhookPausedAt) || newlyPaused;
  const noticeSent = paused ? await sendDormancyNoticeIfNeeded(user.id, now) : false;
  return { paused, newlyPaused, noticeSent };
}

export async function pauseInactiveFreeAccounts(now: Date = new Date()): Promise<{
  checked: number;
  paused: number;
  noticesSent: number;
}> {
  const cutoff = new Date(now.getTime() - ACCOUNT_DORMANCY_DAYS * DAY_MS);
  const candidates = await db
    .select()
    .from(users)
    .where(and(
      eq(users.stravaConnected, true),
      sql`COALESCE(${users.lastSeenAt}, ${users.createdAt}) <= ${cutoff}`,
      sql`NOT (
        COALESCE(${users.subscriptionPlan}, 'free') IN ('premium', 'pro')
        AND COALESCE(${users.subscriptionStatus}, 'active') IN ('active', 'trialing')
      )`,
      or(
        isNull(users.stravaWebhookPausedAt),
        isNull(users.dormancyNoticeSentAt),
      ),
    ))
    .limit(250);

  let paused = 0;
  let noticesSent = 0;
  for (const candidate of candidates) {
    const result = await enforceAccountDormancy(candidate.id, now);
    if (result.newlyPaused) paused++;
    if (result.noticeSent) noticesSent++;
  }

  return { checked: candidates.length, paused, noticesSent };
}

/** Reactivates webhook processing when a runner signs in or returns to the app. */
export async function reactivateDormantAccount(
  userId: number,
  now: Date = new Date(),
): Promise<{ reactivated: boolean }> {
  const reactivated = await db.execute(sql`
    UPDATE users
    SET last_seen_at = ${now},
        strava_webhook_paused_at = NULL,
        dormancy_notice_sent_at = NULL
    WHERE id = ${userId}
      AND strava_webhook_paused_at IS NOT NULL
    RETURNING id
  `);
  const didReactivate = rowsFromResult<{ id: number }>(reactivated).length > 0;

  if (!didReactivate) {
    await storage.updateUserLastSeen(userId);
  }
  return { reactivated: didReactivate };
}

class AccountDormancyWorker {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    if (this.intervalId) return;
    setTimeout(() => void this.runNow(), 60_000);
    this.intervalId = setInterval(() => void this.runNow(), SCAN_INTERVAL_MS);
    console.log("[AccountDormancy] Worker started - checks every 6 hours");
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async runNow(): Promise<void> {
    try {
      const result = await pauseInactiveFreeAccounts();
      if (result.checked > 0) {
        console.log(
          `[AccountDormancy] Checked ${result.checked}; paused ${result.paused}; sent ${result.noticesSent} notices`,
        );
      }
    } catch (error) {
      console.error("[AccountDormancy] Worker failed:", error);
    }
  }
}

export const accountDormancyWorker = new AccountDormancyWorker();
