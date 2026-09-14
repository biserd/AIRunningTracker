import {test} from "node:test";
import assert from "node:assert/strict";
import {accountAction,accountToken,loadAccount} from "../worker/account";
import {changePlan,evidence,seed} from "../shared/coach";
const snapshot={runner:{id:42,name:"Runner",timezone:"UTC",unitPreference:"km"},canUseAI:true,state:{...seed(),source:"production_account"}};
test("login stays server-side, uses a fixed backend and a secure host-only cookie",async()=>{
  const calls:Request[]=[];
  const env={BACKEND:{fetch:async(url:string,init:RequestInit)=>{
    const request=new Request(url,init);calls.push(request);
    return Response.json(calls.length===1?{token:"synthetic.signed.jwt"}:snapshot);
  }}} as unknown as Env;
  const response=await accountAction(env,"/api/account/login",{email:"runner@example.test",password:"synthetic",userId:999});
  assert.deepEqual(await response.json(),{ok:true});
  assert.equal(calls[0].url,"https://aitracker.run/api/auth/login");
  assert.deepEqual(await calls[0].json(),{email:"runner@example.test",password:"synthetic"});
  assert.equal(calls[1].url,"https://aitracker.run/api/coach/experience");
  assert.equal(calls[1].headers.get("Authorization"),"Bearer synthetic.signed.jwt");
  const cookie=response.headers.get("Set-Cookie")!;
  for(const flag of ["__Host-coach_account=","Secure","HttpOnly","SameSite=Strict","Path=/"]) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes("Domain="));
});
test("expired authentication never falls back to preview or another runner",async()=>{
  const env={BACKEND:{fetch:async()=>new Response("",{status:401})}} as unknown as Env;
  await assert.rejects(()=>loadAccount(env,"expired"),/Sign-in failed/);
  assert.equal(accountToken(new Request("https://new.aitracker.run",{headers:{cookie:"coach_preview=old"}})),null);
  const logout=await accountAction(env,"/api/account/logout",{});
  assert.ok(logout.headers.get("Set-Cookie")?.includes("Max-Age=0"));
});
test("email links use the approved coach destination only",async()=>{
  let payload:unknown;
  const env={BACKEND:{fetch:async(_url:string,init:RequestInit)=>{payload=JSON.parse(String(init.body));return Response.json({});}}} as unknown as Env;
  await accountAction(env,"/api/account/email",{email:"runner@example.test",redirect:"https://evil.test"});
  assert.deepEqual(payload,{email:"runner@example.test",client:"coach"});
  await assert.rejects(()=>accountAction(env,"/api/account/arbitrary",{path:"/admin"}),/Not found/);
});
test("real plans cannot mutate locally and weekly evidence uses dates",()=>{
  const state={...seed(),source:"production_account" as const,activities:[
    {date:"2026-09-07",km:5,minutes:30},{date:"2026-09-08",km:7,minutes:40},{date:"2026-09-14",km:3,minutes:20},
  ]};
  assert.throws(()=>changePlan(state,{dayId:state.days[0].id,kind:"rest"}),/Manage your real/);
  assert.deepEqual(evidence(state).weeks,[{label:"2026-09-07",runs:2,km:12},{label:"2026-09-14",runs:1,km:3}]);
});
