/**
 * Regression tests for the Premium conversion funnel event catalog
 * (task: measure every step from Premium offer to paid conversion).
 *
 * Covers: required-property validation, client/server event classification
 * (server-authoritative events must not be ingestible from the client),
 * and dedupe-key determinism (the mechanism that prevents duplicate events).
 *
 * Run with: tsx shared/__tests__/funnelEvents.test.ts
 */
import {
  FUNNEL_EVENTS,
  isFunnelEvent,
  isClientFunnelEvent,
  isServerFunnelEvent,
  validateFunnelEvent,
  buildFunnelDedupeKey,
  billingPeriodFromInterval,
  conversionEventForSubscriptionChange,
} from "../funnelEvents";

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}`, detail !== undefined ? JSON.stringify(detail) : "");
  }
}

console.log("catalog completeness");
const expected = [
  "offer_viewed", "offer_clicked",
  "preview_viewed", "preview_cta_clicked",
  "pricing_viewed", "billing_period_selected",
  "checkout_started", "checkout_abandoned", "checkout_session_created",
  "trial_started", "trial_converted", "subscription_activated",
  "cancellation_scheduled", "subscription_canceled",
];
for (const e of expected) {
  check(`catalog defines ${e}`, isFunnelEvent(e));
}
check("unknown event not in catalog", !isFunnelEvent("made_up_event"));

console.log("client/server classification (server events are authoritative)");
for (const e of ["trial_started", "trial_converted", "subscription_activated", "cancellation_scheduled", "subscription_canceled", "checkout_session_created"]) {
  check(`${e} is server-side`, isServerFunnelEvent(e) && !isClientFunnelEvent(e));
}
for (const e of ["offer_viewed", "offer_clicked", "preview_viewed", "preview_cta_clicked", "pricing_viewed", "billing_period_selected", "checkout_started", "checkout_abandoned"]) {
  check(`${e} is client-side`, isClientFunnelEvent(e) && !isServerFunnelEvent(e));
}

console.log("required-property validation");
check("unknown event rejected", validateFunnelEvent("nope", {}).length === 1);
check(
  "offer_viewed requires source + capability",
  validateFunnelEvent("offer_viewed", {}).length === 2,
);
check(
  "offer_viewed valid with source + capability",
  validateFunnelEvent("offer_viewed", { source: "activity", capability: "activity_deep_dive" }).length === 0,
);
check(
  "empty-string source counts as missing",
  validateFunnelEvent("pricing_viewed", { source: "  " }).length === 1,
);
check(
  "preview_viewed requires numeric activityId",
  validateFunnelEvent("preview_viewed", { source: "premium_preview", activityId: NaN }).length === 1,
);
check(
  "preview_viewed valid",
  validateFunnelEvent("preview_viewed", { source: "premium_preview", activityId: 42 }).length === 0,
);
check(
  "checkout_started requires billingPeriod",
  validateFunnelEvent("checkout_started", { source: "pricing" }).length === 1,
);
check(
  "trial_started requires subscriptionId",
  validateFunnelEvent("trial_started", {}).length === 1,
);
check(
  "trial_started valid with subscriptionId",
  validateFunnelEvent("trial_started", { subscriptionId: "sub_123" }).length === 0,
);
check(
  "trial_converted requires subscriptionId",
  validateFunnelEvent("trial_converted", { billingPeriod: "monthly" }).length === 1,
);
check(
  "subscription_canceled requires subscriptionId",
  validateFunnelEvent("subscription_canceled", {}).length === 1,
);
check(
  "checkout_session_created requires priceId + billingPeriod",
  validateFunnelEvent("checkout_session_created", {}).length === 2,
);

console.log("dedupe keys (duplicate prevention)");
check(
  "deterministic for same inputs",
  buildFunnelDedupeKey("trial_started", ["sub_123"]) === buildFunnelDedupeKey("trial_started", ["sub_123"]),
);
check(
  "distinct across events for same subscription",
  buildFunnelDedupeKey("trial_started", ["sub_123"]) !== buildFunnelDedupeKey("trial_converted", ["sub_123"]),
);
check(
  "distinct across subscriptions",
  buildFunnelDedupeKey("trial_started", ["sub_123"]) !== buildFunnelDedupeKey("trial_started", ["sub_456"]),
);
check(
  "drops null/undefined/empty parts",
  buildFunnelDedupeKey("pricing_viewed", ["s1", null, undefined, "", "direct"]) === "pricing_viewed:s1:direct",
);
check(
  "escapes colons inside parts",
  buildFunnelDedupeKey("x" as any, ["a:b"]) === "x:a_b",
);

// Simulate the DB unique-constraint behavior: replaying the same logical
// step (same dedupe key) records exactly once.
const seen = new Set<string>();
const record = (key: string) => (seen.has(key) ? false : (seen.add(key), true));
const key = buildFunnelDedupeKey("trial_converted", ["sub_abc"]);
check("first record on a key succeeds", record(key) === true);
check("replayed webhook with same key is deduped", record(key) === false);
check("different subscription still records", record(buildFunnelDedupeKey("trial_converted", ["sub_def"])) === true);

console.log("stripe subscription transition → conversion event");
const t = conversionEventForSubscriptionChange;
check("created+trialing → trial_started", t("customer.subscription.created", "trialing") === "trial_started");
check("created+active → subscription_activated", t("customer.subscription.created", "active") === "subscription_activated");
check("created+incomplete → none", t("customer.subscription.created", "incomplete") === null);
check("updated trialing→active → trial_converted", t("customer.subscription.updated", "active", "trialing") === "trial_converted");
check("updated incomplete→active → subscription_activated", t("customer.subscription.updated", "active", "incomplete") === "subscription_activated");
check("updated past_due→active → subscription_activated", t("customer.subscription.updated", "active", "past_due") === "subscription_activated");
check("updated unpaid→active → subscription_activated", t("customer.subscription.updated", "active", "unpaid") === "subscription_activated");
check("updated active→active (no status change) → none", t("customer.subscription.updated", "active", "active") === null);
check("updated with no previous status → none (not a transition)", t("customer.subscription.updated", "active", null) === null);
check("updated active→past_due → none", t("customer.subscription.updated", "past_due", "active") === null);
check("deleted → none (handled by subscription_canceled)", t("customer.subscription.deleted", "canceled", "active") === null);
check(
  "replayed created+active and updated→active share one dedupe key",
  buildFunnelDedupeKey(t("customer.subscription.created", "active")!, ["sub_1"]) ===
    buildFunnelDedupeKey(t("customer.subscription.updated", "active", "incomplete")!, ["sub_1"]),
);

console.log("billing period mapping");
check("month → monthly", billingPeriodFromInterval("month") === "monthly");
check("year → annual", billingPeriodFromInterval("year") === "annual");
check("anything else → unknown", billingPeriodFromInterval(undefined) === "unknown");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll funnel event checks passed");
