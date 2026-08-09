import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/test";

test("quiet hours support overnight and daytime windows in runner timezone", async () => {
  const { isInQuietHours } = await import("./proactiveCoach");
  const overnight = { coachQuietHoursStart: 22, coachQuietHoursEnd: 7, coachTimezone: "America/New_York" };
  assert.equal(isInQuietHours(overnight as any, new Date("2026-08-08T06:00:00Z")), true); // 02:00 local
  assert.equal(isInQuietHours(overnight as any, new Date("2026-08-08T16:00:00Z")), false); // 12:00 local
  const daytime = { coachQuietHoursStart: 9, coachQuietHoursEnd: 17, coachTimezone: "UTC" };
  assert.equal(isInQuietHours(daytime as any, new Date("2026-08-08T12:00:00Z")), true);
});

test("invalid timezones are rejected before preferences are stored", async () => {
  const { isValidTimezone } = await import("./proactiveCoach");
  assert.equal(isValidTimezone("Europe/London"), true);
  assert.equal(isValidTimezone("Moon/Sea_of_Tranquility"), false);
});
