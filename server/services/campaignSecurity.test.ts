import assert from "node:assert/strict";
import { createMarketingToken, verifyMarketingToken } from "./campaignSecurity";

process.env.MARKETING_LINK_SIGNING_SECRET = "test-only-marketing-link-secret-with-more-than-32-characters";

const click = createMarketingToken({ kind: "click", userId: 7, jobId: 12 }, 60);
assert.deepEqual(verifyMarketingToken(click, "click"), { kind: "click", userId: 7, jobId: 12, exp: (verifyMarketingToken(click, "click") as any).exp });
assert.equal(verifyMarketingToken(click, "unsubscribe"), null, "tokens are bound to their purpose");
assert.equal(verifyMarketingToken(`${click.slice(0, -1)}x`, "click"), null, "tampered tokens are rejected");
assert.equal(verifyMarketingToken(createMarketingToken({ kind: "unsubscribe", userId: 7 }, -1), "unsubscribe"), null, "expired tokens are rejected");

console.log("Campaign link security tests passed");
