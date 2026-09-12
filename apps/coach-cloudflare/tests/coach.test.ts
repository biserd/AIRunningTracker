import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, changePlan, evidence } from "../shared/coach";
const state = seed(new Date("2026-09-09T12:00:00Z"));
test("shortening is immutable and keeps completed sessions", () => {
  const changed = changePlan(state, {
    dayId: "day-2",
    kind: "shorten",
    minutes: 20,
  });
  assert.equal(changed.state.days[2].minutes, 20);
  assert.equal(state.days[2].minutes, 40);
  assert.deepEqual(changed.state.days.slice(0, 2), state.days.slice(0, 2));
});
test("completed, unknown and invalid edits are rejected", () => {
  for (const input of [
    { dayId: "day-0", kind: "rest" },
    { dayId: "another-user-day", kind: "rest" },
    { dayId: "day-2", kind: "shorten", minutes: 100 },
    { dayId: "day-2", kind: "shorten", minutes: 0 },
    { dayId: "day-2", kind: "shorten", minutes: 15.5 },
    { dayId: "day-2", kind: "move", date: "2026-09-10" },
  ])
    assert.throws(() =>
      changePlan(state, input as Parameters<typeof changePlan>[1]),
    );
});
test("rest removes workload without moving it elsewhere", () => {
  const next = changePlan(state, { dayId: "day-2", kind: "rest" }).state;
  assert.equal(next.days[2].minutes, 0);
  assert.equal(next.days[2].kind, "rest");
  assert.deepEqual(next.days[3], state.days[3]);
});
test("move swaps with an upcoming rest day and keeps unique dates", () => {
  const next = changePlan(state, {
    dayId: "day-2",
    kind: "move",
    date: "2026-09-11",
  }).state;
  assert.equal(next.days.find((d) => d.id === "day-2")?.date, "2026-09-11");
  assert.equal(new Set(next.days.map((d) => d.date)).size, 7);
});
test("sample evidence is calculated from activities", () => {
  const result = evidence(state);
  assert.equal(result.totalRuns, 16);
  assert.equal(result.totalKm, 104);
  assert.deepEqual(
    result.weeks.map((w) => w.runs),
    [4, 4, 4, 4],
  );
});
