import assert from "node:assert/strict";
import { test } from "node:test";
import { createMarketingToken, legacySignupValuePath, verifyMarketingToken } from "./campaignSecurity";
import { DAY_ONE_COACH_DASHBOARD, DAY_ONE_COACH_ENTRY, DAY_ONE_COACH_SIGN_IN, SIGNUP_VALUE_LINKS } from "../../shared/dayOneCoach";
import { sanitizeReturnTo } from "../../shared/upgradeIntent";

process.env.MARKETING_LINK_SIGNING_SECRET = "fixture-day-one-marketing-secret-32-characters";

test("expired, valid signup links are recognized for public routing only", async () => {
  const expired = createMarketingToken({kind:"click",userId:8,jobId:22}, -60);
  const job = {userId:8,jobType:"drip",status:"sent",campaign:"signup_unpaid",step:"DAY1"};
  assert.equal(verifyMarketingToken(expired,"click"),null);
  for (const [step,path] of Object.entries(SIGNUP_VALUE_LINKS)) {
    assert.equal(await legacySignupValuePath(expired,async id=>id===22?{...job,step}:undefined),path);
  }
  for (const mismatch of [{step:"constructor"},{step:"DAY28"},{userId:9},{status:"pending"},{campaign:"checkout_abandoned"}]) {
    assert.equal(await legacySignupValuePath(expired,async()=>({...job,...mismatch})),null);
  }
  assert.equal(await legacySignupValuePath(expired+"tampered",async()=>job),null);
  const unsubscribe=createMarketingToken({kind:"unsubscribe",userId:8,jobId:22},60);
  assert.equal(await legacySignupValuePath(unsubscribe,async()=>job),null);
});

test("the email entry carries only a campaign tag and sign-in returns to the coach", () => {
  const base="https://aitracker.run";
  const entry=new URL(DAY_ONE_COACH_ENTRY,base);
  assert.deepEqual([...entry.searchParams],[["source","signup_day1"]]);
  assert.equal(sanitizeReturnTo(new URL(DAY_ONE_COACH_SIGN_IN,base).searchParams.get("redirect")),DAY_ONE_COACH_DASHBOARD);
});
