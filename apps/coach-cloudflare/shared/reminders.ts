import { Temporal } from "@js-temporal/polyfill";
export type ReminderProposal = {
  id: string;
  kind: "create" | "cancel";
  title: string;
  localTime: string;
  timezone: string;
};
export type ReminderIntent =
  | { kind: "create"; title: string; localTime: string }
  | { kind: "cancel"; reminderId: string };
export function reminderTime(
  localTime: string,
  timezone: string,
  now: number,
  expires: number,
) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localTime))
    throw new Error("Choose a date and time.");
  let due: number;
  try {
    due =
      Number(
        Temporal.ZonedDateTime.from(`${localTime}[${timezone}]`, {
          disambiguation: "reject",
        }).epochMilliseconds,
      ) / 1000;
  } catch {
    throw new Error(
      "That local time is ambiguous or unavailable because the clocks change. Choose another time.",
    );
  }
  if (due < now + 60)
    throw new Error("Choose a time at least one minute from now.");
  if (due >= expires - 60 || due > now + 7 * 86400)
    throw new Error("Choose a time before this seven-day preview expires.");
  return due;
}
export function reminderTitle(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 160 ||
    /[\r\n\x00-\x1f]/.test(value)
  )
    throw new Error("Use a reminder of 1 to 160 characters on one line.");
  return value.trim().replace(/\u2014/g, ", ");
}
export function validTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
