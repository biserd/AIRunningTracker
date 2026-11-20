import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import express from "express";
import type { AtomicSqlDatabase } from "../d1/jobStore";
import { starterWeekSchema, starterWeekWorkouts } from "../../shared/starterJourney";
import { starterJourneyReportSql } from "./starterJourneyReport";

const migration = readFileSync("apps/d1-migration/migrations/0045_starter_week.sql","utf8");
const day = (value: number, hour = 0) => new Date(Date.UTC(2026,10,value,hour)).toISOString();
function fixture() {
  const db=new DatabaseSync(":memory:",{enableForeignKeyConstraints:true});
  db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,created_at TEXT,is_admin INTEGER DEFAULT 0); CREATE TABLE funnel_events(id INTEGER PRIMARY KEY,user_id INTEGER,event TEXT,occurred_at TEXT,properties TEXT);");
  db.exec(migration); db.exec(migration);
  return db;
}

test("saved settings normalize duplicate days and exclude extra inputs", () => {
  const input={goalType:"5k",raceDate:"2026-11-30",preferredDays:["wednesday","monday","wednesday"],includeSpeedwork:false,includeLongRuns:true};
  const parsed=starterWeekSchema.parse({...input, userId:900, credentials:"not stored"});
  assert.deepEqual(Object.keys(parsed).sort(),["goalType","includeLongRuns","includeSpeedwork","preferredDays","raceDate"]);
  assert.equal(parsed.preferredDays.length,2);
  assert.deepEqual(starterWeekWorkouts(parsed.preferredDays,false,true).map(row=>row.workout),["Easy aerobic run","Long easy run"]);
  assert.equal(starterWeekSchema.safeParse({...input,preferredDays:["sunday","sunday"]}).success,false);
  assert.equal(starterWeekSchema.safeParse({...input,raceDate:"2026-02-30"}).success,false);
});

test("report deduplicates each path, excludes prior cohorts and counts only observable seven-day returns", () => {
  const db=fixture();
  try {
    const add=db.prepare("INSERT INTO users(id,created_at,is_admin) VALUES(?,?,?)");
    add.run(1,day(1),0);add.run(2,day(17),0);add.run(3,day(-15),0);add.run(4,day(4),0);
    add.run(5,day(4),1);add.run(6,day(-30),0);add.run(7,day(6),0);add.run(8,day(11),0);
    const addEvent=db.prepare("INSERT INTO funnel_events(user_id,event,occurred_at,properties) VALUES(?,'starter_journey',?,?)");
    const event=(user:number,at:string,action:string,session="A")=>addEvent.run(user,at,JSON.stringify({action,session}));
    event(1,day(1),"dashboard_started");event(1,day(1,1),"run_opened");event(1,day(1,1),"run_opened");
    event(1,day(1,1),"week_previewed");event(1,day(1,1),"week_saved");event(1,day(3),"dashboard_return","B");
    event(2,day(17),"dashboard_started");event(2,day(17,1),"coach_replied");event(2,day(18),"dashboard_started","B");
    event(3,day(3),"dashboard_started"); // account is not new
    event(4,day(4),"dashboard_started");event(4,day(4,1),"prediction_completed");event(4,day(4,1),"run_opened");
    event(4,day(4,2),"coach_replied","B");event(4,day(5),"dashboard_return");event(4,day(12),"dashboard_started","B"); // after day seven
    event(5,day(4),"dashboard_started"); // admin
    event(6,day(-29),"dashboard_started");event(6,day(5),"dashboard_started","B"); // first visit outside reporting window
    event(7,day(6),"dashboard_started");event(7,day(6,4),"dashboard_return","B"); // same day
    event(8,day(11),"dashboard_started");event(8,day(18),"dashboard_return","B"); // seven-day inclusive boundary
    const now=day(20);
    assert.deepEqual({...db.prepare(starterJourneyReportSql).get(now,now,now)},{
      starters:5,runs_opened:2,predictions:1,weeks_previewed:1,weeks_saved:1,coach_replies:1,
      two_actions:1,return_eligible:4,returned:2,
    });
  } finally { db.close(); }
});

test("Week 1 is saved to the authenticated runner only and admin data is protected", async () => {
  process.env.DATABASE_URL ||= "postgresql://fixture:fixture@127.0.0.1:1/fixture";
  const { registerStarterJourneyRoutes } = await import("./starterJourneyRoutes");
  const db=fixture();
  db.exec("INSERT INTO users(id) VALUES(1),(2)");
  const adapter={
    prepare(sql:string) { const query={bind(...params:(string|number|null)[]) {
      return {
        first:async()=>db.prepare(sql).get(...params)??null,
        run:async()=>db.prepare(sql).run(...params),
      };
    }}; return query; },
  } as unknown as AtomicSqlDatabase;
  const app=express();
  app.use(express.json());
  const events=new Map();
  registerStarterJourneyRoutes(app,{
    database:async()=>adapter,
    authenticate(req:any,res,next) {const id=Number(req.get("x-test-actor"));if(!id)return res.sendStatus(401);req.user={id};next();},
    admin(req,res,next) {if(req.get("x-test-actor")!=="99")return res.sendStatus(403);next();},
    async record(event) {if(events.has(event.dedupeKey))return {recorded:false,deduped:true};events.set(event.dedupeKey,event);return {recorded:true};},
  });
  const server=app.listen(0,"127.0.0.1");
  try {
    await new Promise(resolve=>server.once("listening",()=>resolve(undefined)));
    const address=server.address();if(!address||typeof address==="string")throw Error("test server failed");
    const request=(path:string, id?:number, method="GET", body?:unknown)=>fetch(`http://127.0.0.1:${address.port}${path}`,{
      method,headers:{"Content-Type":"application/json",...(id?{"X-Test-Actor":String(id)}:{})},body:body?JSON.stringify(body):undefined,
    });
    const week="/api/onboarding/starter-week";
    const body={goalType:"10k",raceDate:null,preferredDays:["monday","friday"],includeSpeedwork:false,includeLongRuns:true,userId:2};
    assert.equal((await request(week)).status,401);
    assert.equal((await request(week,1,"PUT",{...body,preferredDays:["monday","monday"]})).status,400);
    const saved=await request(week,1,"PUT",body);assert.equal(saved.status,200);
    assert.equal(saved.headers.get("Cache-Control"),"private, no-store");
    assert.equal((await (await request(week,1)).json()).week.goalType,"10k");
    assert.equal((await (await request(week,2)).json()).week,null);
    const event={session:randomUUID(),action:"week_saved",userId:2};
    assert.equal((await request("/api/onboarding/event",1,"POST",event)).status,204);
    assert.equal((await request("/api/onboarding/event",1,"POST",event)).status,204);
    assert.equal(events.size,1);
    assert.equal([...events.values()][0].userId,1);
    assert.deepEqual([...events.values()][0].props,{session:event.session,action:"week_saved"});
    assert.equal((await request("/api/admin/starter-journey",1)).status,403);
    assert.equal((await request("/api/admin/starter-journey",99)).status,200);
    db.exec("DELETE FROM users WHERE id=1");
    assert.equal(db.prepare("SELECT * FROM starter_weeks").get(),undefined);
  } finally { server.close();db.close(); }
});
