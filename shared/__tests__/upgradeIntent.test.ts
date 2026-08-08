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
  benefitCopy,
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
check("accepts contextual pricing return used by auth", sanitizeReturnTo("/pricing?capability=ai_coach") === "/pricing?capability=ai_coach");
check("accepts ebook fulfillment return", sanitizeReturnTo("/ai-running-coaching-guide?download=1") === "/ai-running-coaching-guide?download=1");
check("accepts MCP consent return after sign-in", sanitizeReturnTo("/mcp/consent?request=ra_mcp_req_example") === "/mcp/consent?request=ra_mcp_req_example");
check("rejects protocol-relative", sanitizeReturnTo("//evil.com") === null);
check("rejects absolute URL", sanitizeReturnTo("https://evil.com") === null);
check("rejects scheme smuggling", sanitizeReturnTo("/javascript:alert(1)") === null);
check("rejects backslashes", sanitizeReturnTo("/\\evil.com") === null);
check("rejects empty string", sanitizeReturnTo("") === null);
check("rejects non-string", sanitizeReturnTo(42 as any) === null);
check("rejects overly long paths", sanitizeReturnTo("/" + "a".repeat(400)) === null);
check("rejects unapproved same-origin path", sanitizeReturnTo("/x?y=a:b") === null);

console.log("buildUpgradeUrl → parseUpgradeIntent round-trip");
const intent = {
  source: "activity_splits",
  capability: "activity_deep_dive",
  activityId: 987,
  benefitKey: "activity_splits" as const,
  returnTo: "/activity/987",
  pendingResourceId: "draft_123",
  experimentVariant: "context_v1",
};
const url = buildUpgradeUrl(intent);
check("URL targets /pricing", url.startsWith("/pricing?"));
const parsed = parseUpgradeIntent(url.split("?")[1]);
check("round-trip parses", parsed !== null);
check("source preserved", parsed?.source === intent.source);
check("capability preserved", parsed?.capability === intent.capability, parsed);
check("activityId preserved", parsed?.activityId === intent.activityId, parsed);
check("benefit key preserved", parsed?.benefitKey === intent.benefitKey, parsed);
check("benefit copy resolved from approved map", parsed?.benefit === benefitCopy(intent.benefitKey), parsed);
check("returnTo preserved", parsed?.returnTo === intent.returnTo, parsed);
check("pending resource preserved", parsed?.pendingResourceId === intent.pendingResourceId, parsed);
check("experiment preserved", parsed?.experimentVariant === intent.experimentVariant, parsed);

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
const injectedBenefit = parseUpgradeIntent("capability=ai_coach&benefit=Anything+an+attacker+wants&returnTo=/dashboard");
check("arbitrary benefit query copy is ignored", injectedBenefit?.benefit === undefined, injectedBenefit);
const unknownBenefit = parseUpgradeIntent("capability=ai_coach&benefitKey=unknown&returnTo=/dashboard");
check("unknown benefit key is ignored", unknownBenefit?.benefit === undefined, unknownBenefit);
const ebook = parseUpgradeIntent("capability=ebook_bundle&benefitKey=ebook_bundle&returnTo=/ai-running-coaching-guide?download=1");
check("ebook bundle resolves approved copy", ebook?.benefit === benefitCopy("ebook_bundle"), ebook);

console.log("capabilityLabel");
check("known capability labeled", capabilityLabel("training_plans") === "AI Training Plans");
check("ebook bundle labeled", capabilityLabel("ebook_bundle") === "AI Coaching Guide + Premium");
check("unknown capability falls back", capabilityLabel("mystery") === "Premium features");

if (failures > 0) {
  console.error(`\n${failures} upgrade-intent test(s) FAILED`);
  process.exit(1);
}
console.log("\nAll upgrade-intent tests passed ✓");
