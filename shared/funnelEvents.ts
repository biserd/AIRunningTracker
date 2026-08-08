/**
 * Premium conversion funnel — canonical event catalog.
 *
 * Every step from a Premium offer impression to a paid conversion is
 * recorded as exactly one row in the funnel_events table, keyed by a
 * dedupe key so retries/replays can never double-count.
 *
 * Client-emitted events describe UI surfaces (offer, preview, pricing,
 * checkout intent). Server-emitted events are authoritative for money
 * states (checkout session, trial, cancellation, conversion) and may
 * only be written by the server — the ingestion endpoint rejects them.
 */

export type FunnelEventSide = "client" | "server";

export interface FunnelEventSpec {
  side: FunnelEventSide;
  /** Property names that MUST be present (non-empty) when recording. */
  required: readonly string[];
}

export const FUNNEL_EVENTS = {
  // --- Public acquisition tools ---
  tool_viewed: { side: "client", required: ["source", "capability"] },
  tool_completed: { side: "client", required: ["source", "capability"] },

  // --- Offer surfaces (Premium gates / CTAs) ---
  offer_viewed: { side: "client", required: ["source", "capability"] },
  offer_clicked: { side: "client", required: ["source", "capability"] },
  ebook_gumroad_clicked: { side: "client", required: ["source", "capability"] },

  // --- One-time Premium Preview ---
  preview_viewed: { side: "client", required: ["source", "activityId"] },
  preview_cta_clicked: { side: "client", required: ["source", "activityId"] },

  // --- Pricing page ---
  pricing_viewed: { side: "client", required: ["source"] },
  billing_period_selected: { side: "client", required: ["source", "billingPeriod"] },

  // --- Checkout ---
  checkout_started: { side: "client", required: ["source", "billingPeriod"] },
  checkout_abandoned: { side: "client", required: ["source"] },
  checkout_session_created: { side: "server", required: ["priceId", "billingPeriod"] },
  ebook_delivery_attempted: { side: "server", required: ["subscriptionId"] },
  ebook_downloaded: { side: "server", required: ["source"] },

  // --- Trial / paid lifecycle (server-authoritative, from Stripe webhooks) ---
  trial_started: { side: "server", required: ["subscriptionId"] },
  trial_converted: { side: "server", required: ["subscriptionId"] },
  subscription_activated: { side: "server", required: ["subscriptionId"] },
  cancellation_scheduled: { side: "server", required: ["subscriptionId"] },
  subscription_canceled: { side: "server", required: ["subscriptionId"] },
} as const satisfies Record<string, FunnelEventSpec>;

export type FunnelEventName = keyof typeof FUNNEL_EVENTS;

/**
 * Optional, well-known properties. Anything else supplied is still stored
 * in the properties JSON, but these get first-class columns/typing.
 */
export interface FunnelEventProps {
  source?: string;            // surface the step originated from
  capability?: string;        // gated capability the user wanted
  activityId?: number;        // activity context, when applicable
  billingPeriod?: string;     // 'monthly' | 'annual' | 'unknown'
  experimentVariant?: string; // experiment/variant tag, when running
  freshnessDays?: number;     // age of the content shown (e.g. preview age)
  priceId?: string;
  subscriptionId?: string;
  plan?: string;
  previousPlan?: string;
  trialEligible?: boolean;
  accountAgeDays?: number;    // account context
  runCount?: number;          // run context
  occurredAt?: string;        // ISO timestamp (client clock; server sets its own too)
  [key: string]: unknown;
}

export function isFunnelEvent(event: string): event is FunnelEventName {
  return Object.prototype.hasOwnProperty.call(FUNNEL_EVENTS, event);
}

/** Client-ingestible events. Server-authoritative events must be rejected at the API. */
export function isClientFunnelEvent(event: string): boolean {
  return isFunnelEvent(event) && FUNNEL_EVENTS[event].side === "client";
}

export function isServerFunnelEvent(event: string): boolean {
  return isFunnelEvent(event) && FUNNEL_EVENTS[event].side === "server";
}

function isMissing(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (typeof value === "number" && !Number.isFinite(value))
  );
}

/**
 * Validate an event + props against the catalog. Returns a list of
 * human-readable problems; empty list means valid.
 */
export function validateFunnelEvent(event: string, props: FunnelEventProps): string[] {
  const errors: string[] = [];
  if (!isFunnelEvent(event)) {
    errors.push(`unknown funnel event "${event}"`);
    return errors;
  }
  for (const key of FUNNEL_EVENTS[event].required) {
    if (isMissing((props as Record<string, unknown>)[key])) {
      errors.push(`event "${event}" missing required property "${key}"`);
    }
  }
  return errors;
}

/**
 * Deterministic dedupe key. Recording is idempotent on this key (unique
 * DB constraint), so the same logical step can never be counted twice.
 */
export function buildFunnelDedupeKey(
  event: string,
  parts: Array<string | number | null | undefined>,
): string {
  const cleaned = parts
    .filter((p) => p !== null && p !== undefined && String(p).length > 0)
    .map((p) => String(p).replace(/:/g, "_"));
  return [event, ...cleaned].join(":");
}

/**
 * Classify a Stripe subscription lifecycle change into the authoritative
 * conversion funnel event it represents (or null when it isn't one).
 *
 * - created + trialing            → trial_started
 * - created + active (no trial)   → subscription_activated
 * - updated  trialing → active    → trial_converted
 * - updated  <other>  → active    → subscription_activated
 *   (covers incomplete/past_due/unpaid → active recoveries; still idempotent
 *   because the dedupe key is derived from the subscription id)
 */
export function conversionEventForSubscriptionChange(
  eventType: string,
  status: string,
  previousStatus?: string | null,
): FunnelEventName | null {
  if (eventType === "customer.subscription.created") {
    if (status === "trialing") return "trial_started";
    if (status === "active") return "subscription_activated";
    return null;
  }
  if (
    eventType === "customer.subscription.updated" &&
    status === "active" &&
    previousStatus &&
    previousStatus !== "active"
  ) {
    return previousStatus === "trialing" ? "trial_converted" : "subscription_activated";
  }
  return null;
}

/** Map a Stripe recurring interval to our billingPeriod vocabulary. */
export function billingPeriodFromInterval(interval: unknown): string {
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return "unknown";
}
