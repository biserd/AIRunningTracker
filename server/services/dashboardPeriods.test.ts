import assert from "node:assert/strict";
import {
  getDashboardCalendarPeriods,
  partitionDashboardActivities,
} from "./dashboardPeriods";

const now = new Date(2026, 7, 3, 12, 0, 0);
const periods = getDashboardCalendarPeriods(now);

assert.equal(periods.thisMonth.getFullYear(), 2026);
assert.equal(periods.thisMonth.getMonth(), 7);
assert.equal(periods.thisMonth.getDate(), 1);
assert.equal(periods.thisWeek.getDay(), 1, "week starts Monday");
assert.equal(periods.cachePartition, "2026-08-03");

const activities = [
  { id: "july", startDate: new Date(2026, 6, 11, 8, 0, 0) },
  { id: "august", startDate: new Date(2026, 7, 2, 8, 0, 0) },
  { id: "today", startDate: new Date(2026, 7, 3, 8, 0, 0) },
  { id: "future-today", startDate: new Date(2026, 7, 3, 18, 0, 0) },
  { id: "future-month", startDate: new Date(2026, 8, 1, 8, 0, 0) },
  { id: "invalid", startDate: "not-a-date" },
];

const partitioned = partitionDashboardActivities(activities, periods);
assert.deepEqual(partitioned.thisMonth.map((activity) => activity.id), ["august", "today"]);
assert.deepEqual(partitioned.lastMonth.map((activity) => activity.id), ["july"]);
assert.deepEqual(partitioned.thisWeek.map((activity) => activity.id), ["today"]);
assert.deepEqual(partitioned.lastWeek.map((activity) => activity.id), ["august"]);

const noAugustRun = partitionDashboardActivities(
  [{ id: "latest-run", startDate: new Date(2026, 6, 11, 8, 0, 0) }],
  periods,
);
assert.equal(noAugustRun.thisMonth.length, 0, "July's latest run must not become August activity");

console.log("dashboardPeriods.test: all assertions passed");
