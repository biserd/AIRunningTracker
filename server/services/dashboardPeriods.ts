export interface DashboardCalendarPeriods {
  now: Date;
  thisMonth: Date;
  lastMonth: Date;
  thisWeek: Date;
  lastWeek: Date;
  threeMonthsAgo: Date;
  cachePartition: string;
}

export interface ActivityWithStartDate {
  startDate: Date | string | null | undefined;
}

export interface DashboardActivityPeriods<T> {
  thisMonth: T[];
  lastMonth: T[];
  thisWeek: T[];
  lastWeek: T[];
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Build every dashboard calendar boundary from one clock reading. Keeping the
 * same `now` prevents requests around midnight from mixing two periods.
 */
export function getDashboardCalendarPeriods(now: Date = new Date()): DashboardCalendarPeriods {
  const stableNow = new Date(now);

  const thisMonth = new Date(stableNow);
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const thisWeek = new Date(stableNow);
  const daysSinceMonday = (thisWeek.getDay() + 6) % 7;
  thisWeek.setDate(thisWeek.getDate() - daysSinceMonday);
  thisWeek.setHours(0, 0, 0, 0);

  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const threeMonthsAgo = new Date(thisMonth);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return {
    now: stableNow,
    thisMonth,
    lastMonth,
    thisWeek,
    lastWeek,
    threeMonthsAgo,
    // A response cached before midnight must never be reused for a new day.
    cachePartition: localDateKey(stableNow),
  };
}

/**
 * Partition activities into true calendar periods. The explicit `<= now`
 * upper bound prevents future-dated or timezone-skewed rows from appearing in
 * current totals.
 */
export function partitionDashboardActivities<T extends ActivityWithStartDate>(
  activities: T[],
  periods: DashboardCalendarPeriods,
): DashboardActivityPeriods<T> {
  const parsed = activities.flatMap((activity) => {
    if (!activity.startDate) return [];
    const at = new Date(activity.startDate);
    return Number.isFinite(at.getTime()) ? [{ activity, at }] : [];
  });

  const throughNow = ({ at }: { at: Date }) => at <= periods.now;

  return {
    thisMonth: parsed
      .filter((entry) => throughNow(entry) && entry.at >= periods.thisMonth)
      .map(({ activity }) => activity),
    lastMonth: parsed
      .filter(({ at }) => at >= periods.lastMonth && at < periods.thisMonth)
      .map(({ activity }) => activity),
    thisWeek: parsed
      .filter((entry) => throughNow(entry) && entry.at >= periods.thisWeek)
      .map(({ activity }) => activity),
    lastWeek: parsed
      .filter(({ at }) => at >= periods.lastWeek && at < periods.thisWeek)
      .map(({ activity }) => activity),
  };
}
