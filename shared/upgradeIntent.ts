/**
 * Upgrade intent — preserves a runner's goal from the moment they click a
 * Premium gate all the way through trial activation.
 *
 * A gate encodes WHAT the user wanted (capability), WHERE they were
 * (source + returnTo), WHICH activity it concerns (activityId), and WHY it
 * matters to them (benefit). Pricing reads it, shows a contextual banner,
 * and threads returnTo through Stripe checkout so the success page can send
 * the user straight back to the feature they asked for — now unlocked.
 */

import type { Capability } from "./entitlements";

export interface UpgradeIntent {
  /** Where the upgrade click originated, e.g. "activity", "coach_insights". */
  source: string;
  /** The capability the user was trying to use. */
  capability: Capability | string;
  /** Activity the gate was rendered on, when applicable. */
  activityId?: number;
  /** Personalized benefit copy shown on the pricing page. */
  benefit?: string;
  /** In-app path to return to after trial activation. */
  returnTo: string;
}

const MAX_BENEFIT_LENGTH = 200;
const MAX_RETURN_TO_LENGTH = 300;

/**
 * Only allow same-app relative paths: must start with a single "/", never
 * "//" (protocol-relative) or anything with a scheme. Returns null when the
 * value is unsafe so callers fail closed to a default destination.
 */
export function sanitizeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > MAX_RETURN_TO_LENGTH) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return null;
  if (/^\/[^/?#]*:/.test(value)) return null; // e.g. "/javascript:..."
  return value;
}

/** Build the pricing URL that carries the full upgrade intent. */
export function buildUpgradeUrl(intent: UpgradeIntent): string {
  const params = new URLSearchParams();
  params.set("source", intent.source);
  params.set("capability", String(intent.capability));
  if (intent.activityId !== undefined && Number.isFinite(intent.activityId)) {
    params.set("activityId", String(intent.activityId));
  }
  if (intent.benefit) {
    params.set("benefit", intent.benefit.slice(0, MAX_BENEFIT_LENGTH));
  }
  const returnTo = sanitizeReturnTo(intent.returnTo);
  if (returnTo) params.set("returnTo", returnTo);
  return `/pricing?${params.toString()}`;
}

/**
 * Parse an upgrade intent out of a query string (with or without leading
 * "?"). Returns null when no capability is present — a plain /pricing visit.
 */
export function parseUpgradeIntent(search: string): UpgradeIntent | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const capability = params.get("capability");
  if (!capability) return null;

  const activityIdRaw = params.get("activityId");
  const activityId = activityIdRaw !== null ? Number(activityIdRaw) : undefined;
  const benefit = params.get("benefit") || undefined;
  const returnTo = sanitizeReturnTo(params.get("returnTo")) || "/dashboard";

  return {
    source: params.get("source") || "unknown",
    capability,
    activityId: activityId !== undefined && Number.isFinite(activityId) ? activityId : undefined,
    benefit: benefit ? benefit.slice(0, MAX_BENEFIT_LENGTH) : undefined,
    returnTo,
  };
}

/** Human labels for capabilities, used in contextual pricing copy. */
export const CAPABILITY_LABELS: Record<string, string> = {
  activity_deep_dive: "Deep-Dive Run Analysis",
  race_predictions: "Race Predictions",
  injury_risk: "Injury Risk Analysis",
  training_plans: "AI Training Plans",
  advanced_insights: "Advanced Insights",
  ai_coach: "AI Agent Coach",
  activity_comparison: "Run Comparison",
  unlimited_history: "Unlimited Activity History",
  unlimited_sync: "Unlimited Strava Sync",
};

export function capabilityLabel(capability: string): string {
  return CAPABILITY_LABELS[capability] || "Premium features";
}
