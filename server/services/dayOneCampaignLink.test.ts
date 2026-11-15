import assert from "node:assert/strict";
import { test } from "node:test";
import { createMarketingToken, isLegacyDayOneLink, verifyMarketingToken } from "./campaignSecurity";
import { DAY_ONE_COACH_DASHBOARD, DAY_ONE_COACH_ENTRY, DAY_ONE_COACH_SIGN_IN } from "../../shared/dayOneCoach";
import { sanitizeReturnTo } from "../../shared/upgradeIntent";

process.env.MARKETING_LINK_SIGNING_SECRET = "fixture-day-one-marketing-secret-32-characters";

test("an expired, valid Day 1 link is recognized for public routing only", async () => {
  const expired = createMarketingToken({kind:"click",userId:8,jobId:22}, -60);
  const job = {userId:8,jobType:"drip",status:"sent",campaign:"signup_unpaid",step:"DAY1"};
  assert.equal(verifyMarketingToken(expired,"click"),null);
  assert.equal(await isLegacyDayOneLink(expired,async id=>id===22?job:undefined),true);
  for (const mismatch of [{step:"DAY7"},{userId:9},{status:"pending"},{campaign:"checkout_abandoned"}]) {
    assert.equal(await isLegacyDayOneLink(expired,async()=>({...job,...mismatch})),false);
  }
  assert.equal(await isLegacyDayOneLink(expired+"tampered",async()=>job),false);
  const unsubscribe=createMarketingToken({kind:"unsubscribe",userId:8,jobId:22},60);
  assert.equal(await isLegacyDayOneLink(unsubscribe,async()=>job),false);
});

test("the email entry carries only a campaign tag and sign-in returns to the coach", () => {
  const base="https://aitracker.run";
  const entry=new URL(DAY_ONE_COACH_ENTRY,base);
  assert.deepEqual([...entry.searchParams],[["source","signup_day1"]]);
  assert.equal(sanitizeReturnTo(new URL(DAY_ONE_COACH_SIGN_IN,base).searchParams.get("redirect")),DAY_ONE_COACH_DASHBOARD);
});
