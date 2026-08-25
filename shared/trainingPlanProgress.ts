export type CalendarPlanWeek = {
  weekNumber: number;
  weekStartDate: Date | string;
  weekEndDate: Date | string;
};

function validTimeZone(timeZone?: string | null): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function instantDateKey(value: Date | string, timeZone?: string | null): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Plan dates represent calendar dates rather than instants. Reading their UTC
// components prevents the server timezone from moving a workout to another day.
export function planDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function calendarDayDifference(left: string, right: string): number {
  const leftTime = Date.parse(`${left}T00:00:00.000Z`);
  const rightTime = Date.parse(`${right}T00:00:00.000Z`);
  return Math.round((leftTime - rightTime) / 86_400_000);
}

export function deriveCalendarWeekNumber(
  weeks: CalendarPlanWeek[],
  now: Date = new Date(),
  timeZone?: string | null,
): number {
  if (!weeks.length) return 1;

  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const today = instantDateKey(now, timeZone);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  if (today < planDateKey(first.weekStartDate)) return first.weekNumber;
  if (today > planDateKey(last.weekEndDate)) return last.weekNumber;

  const matching = ordered.find((week) => (
    today >= planDateKey(week.weekStartDate) && today <= planDateKey(week.weekEndDate)
  ));
  if (matching) return matching.weekNumber;

  // Plans should be contiguous. If imported data contains a gap, advance to
  // the next dated week instead of leaving the pointer on a stale week.
  return ordered.find((week) => today < planDateKey(week.weekStartDate))?.weekNumber ?? last.weekNumber;
}
