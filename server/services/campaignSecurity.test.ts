import assert from "node:assert/strict";
import { CLICK_SIGN_IN_TTL_SECONDS, createMarketingToken, isRecentCampaignClick, verifyMarketingToken } from "./campaignSecurity";

process.env.MARKETING_LINK_SIGNING_SECRET = "test-only-marketing-link-secret-with-more-than-32-characters";

const click = createMarketingToken({ kind: "click", userId: 7, jobId: 12 }, 60);
assert.deepEqual(verifyMarketingToken(click, "click"), { kind: "click", userId: 7, jobId: 12, exp: (verifyMarketingToken(click, "click") as any).exp });
assert.equal(verifyMarketingToken(click, "unsubscribe"), null, "tokens are bound to their purpose");
assert.equal(verifyMarketingToken(`${click.slice(0, -1)}x`, "click"), null, "tampered tokens are rejected");
assert.equal(verifyMarketingToken(createMarketingToken({ kind: "unsubscribe", userId: 7 }, -1), "unsubscribe"), null, "expired tokens are rejected");
assert.equal(
  createMarketingToken({ kind: "click", userId: 7, jobId: 12 }, 60, 1_800_000_000),
  createMarketingToken({ kind: "click", userId: 7, jobId: 12 }, 60, 1_800_000_000),
  "job-bound links stay identical across provider retries",
);
const now = Date.now();
assert.equal(CLICK_SIGN_IN_TTL_SECONDS, 72 * 60 * 60);
assert.equal(isRecentCampaignClick(new Date(now - CLICK_SIGN_IN_TTL_SECONDS * 1000), now), true);
assert.equal(isRecentCampaignClick(new Date(now - CLICK_SIGN_IN_TTL_SECONDS * 1000 - 1), now), false);
assert.equal(isRecentCampaignClick(new Date(now + 1), now), false);
assert.equal(isRecentCampaignClick(null, now), false);

console.log("Campaign link security tests passed");
