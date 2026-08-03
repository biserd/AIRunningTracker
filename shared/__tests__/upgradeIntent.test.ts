/**
 * Regression tests for upgrade-intent preservation (task: keep each runner's
 * goal intact from upgrade click through trial activation).
 *
 * Run with: tsx shared/__tests__/upgradeIntent.test.ts
 */
import {
  sanitizeReturnTo,
  buildUpgradeUrl,
  parseUpgradeIntent,
  capabilityLabel,
} from "../upgradeIntent";

let failures = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}`, detail !== undefined ? JSON.stringify(detail) : "");
  }
}

console.log("sanitizeReturnTo");
check("accepts relative path", sanitizeReturnTo("/activity/123") === "/activity/123");
check("accepts path with query", sanitizeReturnTo("/coach-insights?tab=agent") === "/coach-insights?tab=agent");
check("rejects protocol-relative", sanitizeReturnTo("//evil.com") === null);
check("rejects absolute URL", sanitizeReturnTo("https://evil.com") === null);
check("rejects scheme smuggling", sanitizeReturnTo("/javascript:alert(1)") === null);
check("rejects backslashes", sanitizeReturnTo("/\\evil.com") === null);
check("rejects empty string", sanitizeReturnTo("") === null);
check("rejects non-string", sanitizeReturnTo(42 as any) === null);
check("rejects overly long paths", sanitizeReturnTo("/" + "a".repeat(400)) === null);
check("allows nested path segment with colon after ?", sanitizeReturnTo("/x?y=a:b") === "/x?y=a:b");

console.log("buildUpgradeUrl → parseUpgradeIntent round-trip");
const intent = {
  source: "activity_splits",
  capability: "activity_deep_dive",
  activityId: 987,
  benefit: "Break down every split of this run.",
  returnTo: "/activity/987",
};
const url = buildUpgradeUrl(intent);
check("URL targets /pricing", url.startsWith("/pricing?"));
const parsed = parseUpgradeIntent(url.split("?")[1]);
check("round-trip parses", parsed !== null);
check("source preserved", parsed?.source === intent.source);
check("capability preserved", parsed?.capability === intent.capability, parsed);
check("activityId preserved", parsed?.activityId === intent.activityId, parsed);
check("benefit preserved", parsed?.benefit === intent.benefit, parsed);
check("returnTo preserved", parsed?.returnTo === intent.returnTo, parsed);

console.log("parseUpgradeIntent edge cases");
check("plain pricing visit yields null", parseUpgradeIntent("") === null);
check("missing capability yields null", parseUpgradeIntent("source=x&returnTo=/dashboard") === null);
const unsafe = parseUpgradeIntent("capability=ai_coach&returnTo=https://evil.com");
check("unsafe returnTo falls back to /dashboard", unsafe?.returnTo === "/dashboard", unsafe);
const noActivity = parseUpgradeIntent("capability=training_plans&source=training_plan&returnTo=/dashboard");
check("intent without activityId parses", noActivity?.activityId === undefined && noActivity?.capability === "training_plans");
const badActivity = parseUpgradeIntent("capability=x&activityId=notanumber");
check("non-numeric activityId dropped", badActivity?.activityId === undefined);
check("leading ? tolerated", parseUpgradeIntent("?capability=ai_coach")?.capability === "ai_coach");

console.log("buildUpgradeUrl safety");
const evil = buildUpgradeUrl({ source: "s", capability: "c", returnTo: "https://evil.com" });
check("unsafe returnTo omitted from URL", !evil.includes("returnTo"), evil);
const longBenefit = buildUpgradeUrl({ source: "s", capability: "c", benefit: "b".repeat(500), returnTo: "/x" });
check("benefit truncated to 200 chars", (parseUpgradeIntent(longBenefit.split("?")[1])?.benefit?.length ?? 0) <= 200);

console.log("capabilityLabel");
check("known capability labeled", capabilityLabel("training_plans") === "AI Training Plans");
check("unknown capability falls back", capabilityLabel("mystery") === "Premium features");

if (failures > 0) {
  console.error(`\n${failures} upgrade-intent test(s) FAILED`);
  process.exit(1);
}
console.log("\nAll upgrade-intent tests passed ✓");
