/**
 * Upgrade intent preserves the runner's goal from a Premium gate through
 * pricing, authentication, Stripe Checkout, and the post-trial return.
 *
 * Benefit copy is selected from this file rather than accepted from query
 * parameters. That keeps pricing copy consistent and prevents arbitrary text
 * from being reflected into a trusted purchase screen.
 */
import type { Capability } from "./entitlements";

export const BENEFIT_COPY = {
  premium_preview: "See how this run compared with similar efforts, where the signal changed, and what to try next.",
  activity_history: "Unlock the full breakdown of this run, including splits, route map, coach verdict, and next-run guidance.",
  activity_metrics: "See drift, pacing stability, and baseline comparison for this run.",
  activity_timeline: "Replay this run with interactive pace, heart-rate, and elevation charts.",
  activity_splits: "Break down every split with pace consistency and effort distribution.",
  activity_charts: "See heart-rate, cadence, and power charts for this run.",
  activity_comparison: "Compare this run against your personal bests and similar past activities.",
  dashboard_trial: "Unlock ongoing personalized analysis, adaptive training plans, and unlimited Strava history.",
  unlimited_sync: "Keep importing new Strava activities and analyzing every run.",
  fitness_form: "Track fitness, fatigue, and form so you can time hard sessions and recovery with confidence.",
  advanced_insights: "See the training patterns, recovery signals, and technique insights hidden in your running history.",
  race_predictions: "Get personalized 5K, 10K, half-marathon, and marathon predictions from your recent training.",
  injury_risk: "Understand training-load risk factors and receive practical recovery recommendations.",
  training_plan: "Turn your goal, recent mileage, and available running days into a complete adaptive plan.",
  ai_coach: "Get proactive post-run recaps and personalized coaching after every run.",
  telegram_coach: "Get private post-run analysis, proactive check-ins, and weather-aware running guidance in Telegram.",
  ebook_bundle: "Start your 14-day Premium trial and receive The Runner's Guide to AI Coaching free - a $49 standalone value.",
  mcp_access: "Connect an authorized AI client to your runner-scoped profile, activities, analytics, goals, and plans through read-only MCP tools.",
} as const;

export type BenefitKey = keyof typeof BENEFIT_COPY;

export interface UpgradeIntent {
  /** Where the upgrade click originated, e.g. "activity_splits". */
  source: string;
  /** The capability the user was trying to use. */
  capability: Capability | string;
  /** Activity the gate was rendered on, when applicable. */
  activityId?: number;
  /** Server-approved benefit copy identifier. */
  benefitKey?: BenefitKey;
  /** Derived from benefitKey while parsing; never trusted from the URL. */
  benefit?: string;
  /** In-app path to return to after trial activation. */
  returnTo: string;
  /** Optional local/server draft identifier, never a serialized draft payload. */
  pendingResourceId?: string;
  /** Optional analytics experiment variant. */
  experimentVariant?: string;
}

const MAX_RETURN_TO_LENGTH = 300;
const MAX_FIELD_LENGTH = 80;

// Only destinations that make sense after an upgrade are accepted. Add new
// destinations deliberately rather than allowing arbitrary same-origin paths.
const ALLOWED_RETURN_PATHS = [
  /^\/dashboard(?:[/?#]|$)/,
  /^\/pricing(?:[/?#]|$)/,
  /^\/activities(?:[/?#]|$)/,
  /^\/activity\/\d+(?:[/?#]|$)/,
  /^\/coach-insights(?:[/?#]|$)/,
  /^\/training-plans(?:\/\d+)?(?:[/?#]|$)/,
  /^\/billing(?:[/?#]|$)/,
  /^\/settings(?:[/?#]|$)/,
  /^\/coach\/settings(?:[/?#]|$)/,
  /^\/ai-running-coaching-guide(?:[/?#]|$)/,
  /^\/mcp\/consent(?:[/?#]|$)/,
  /^\/mcp-server(?:[/?#]|$)/,
  /^\/developers\/mcp(?:[/?#]|$)/,
];

function cleanField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().slice(0, MAX_FIELD_LENGTH);
  return clean || undefined;
}

export function isBenefitKey(value: unknown): value is BenefitKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BENEFIT_COPY, value);
}

export function benefitCopy(key: unknown): string | undefined {
  return isBenefitKey(key) ? BENEFIT_COPY[key] : undefined;
}

/** Accept only explicitly approved, same-app relative destinations. */
export function sanitizeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > MAX_RETURN_TO_LENGTH) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return null;
  if (/^\/[^/?#]*:/.test(value)) return null;
  return ALLOWED_RETURN_PATHS.some((pattern) => pattern.test(value)) ? value : null;
}

/** Build a pricing URL carrying only bounded, non-sensitive intent fields. */
export function buildUpgradeUrl(intent: UpgradeIntent): string {
  const params = new URLSearchParams();
  params.set("source", cleanField(intent.source) || "unknown");
  params.set("capability", cleanField(String(intent.capability)) || "premium");
  if (intent.activityId !== undefined && Number.isInteger(intent.activityId) && intent.activityId > 0) {
    params.set("activityId", String(intent.activityId));
  }
  if (intent.benefitKey && isBenefitKey(intent.benefitKey)) {
    params.set("benefitKey", intent.benefitKey);
  }
  const returnTo = sanitizeReturnTo(intent.returnTo);
  if (returnTo) params.set("returnTo", returnTo);
  const pendingResourceId = cleanField(intent.pendingResourceId);
  if (pendingResourceId) params.set("pendingResourceId", pendingResourceId);
  const experimentVariant = cleanField(intent.experimentVariant);
  if (experimentVariant) params.set("experimentVariant", experimentVariant);
  return `/pricing?${params.toString()}`;
}

/** Parse and validate an upgrade intent from a query string. */
export function parseUpgradeIntent(search: string): UpgradeIntent | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const capability = cleanField(params.get("capability"));
  if (!capability) return null;

  const activityIdRaw = params.get("activityId");
  const activityId = activityIdRaw !== null ? Number(activityIdRaw) : undefined;
  const benefitKeyRaw = params.get("benefitKey");
  const benefitKey = isBenefitKey(benefitKeyRaw) ? benefitKeyRaw : undefined;

  return {
    source: cleanField(params.get("source")) || "unknown",
    capability,
    activityId: activityId !== undefined && Number.isInteger(activityId) && activityId > 0 ? activityId : undefined,
    benefitKey,
    benefit: benefitCopy(benefitKey),
    returnTo: sanitizeReturnTo(params.get("returnTo")) || "/dashboard",
    pendingResourceId: cleanField(params.get("pendingResourceId")),
    experimentVariant: cleanField(params.get("experimentVariant")),
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
  ebook_bundle: "AI Coaching Guide + Premium",
  activity_comparison: "Run Comparison",
  unlimited_history: "Unlimited Activity History",
  unlimited_sync: "Unlimited Strava Sync",
  mcp_access: "Read-Only MCP Access",
};

export function capabilityLabel(capability: string): string {
  return CAPABILITY_LABELS[capability] || "Premium features";
}
