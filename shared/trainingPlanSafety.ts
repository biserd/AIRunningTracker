const VALID_RUN_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

/**
 * Limit a plan's running frequency to no more than one day above the
 * athlete's recent whole-number baseline. New or very low-frequency runners
 * start with at most two run days. This is deliberately conservative: a
 * runner can build frequency later after the plan has evidence they are
 * tolerating the current schedule.
 */
export function getSafeInitialRunDayCount(
  averageRunsPerWeek: number | null | undefined,
  requestedDays: number,
): number {
  const requested = Math.max(0, Math.min(7, Math.floor(requestedDays)));
  const baseline = Number.isFinite(averageRunsPerWeek)
    ? Math.max(0, Number(averageRunsPerWeek))
    : 0;
  const safeMaximum = baseline > 0
    ? Math.max(2, Math.min(5, Math.ceil(baseline)))
    : 2;

  return Math.min(requested, safeMaximum);
}

/**
 * Normalize availability without changing the runner's approved schedule.
 * Safety recommendations must be reported to the runner, never applied as a
 * hidden rewrite of their selected weekdays.
 */
export function normalizePreferredRunDays(
  preferredDays: string[] | null | undefined,
): string[] {
  return Array.from(new Set(
    (preferredDays ?? [])
      .map((day) => day.trim().toLowerCase())
      .filter((day) => VALID_RUN_DAYS.has(day)),
  ));
}

export function getRunFrequencyWarnings(
  preferredDays: string[] | null | undefined,
  averageRunsPerWeek: number | null | undefined,
): string[] {
  const normalizedDays = normalizePreferredRunDays(preferredDays);
  const safeInitialCount = getSafeInitialRunDayCount(averageRunsPerWeek, normalizedDays.length);
  if (normalizedDays.length <= safeInitialCount) return [];

  const baseline = Number.isFinite(averageRunsPerWeek)
    ? Number(averageRunsPerWeek).toFixed(1).replace(/\.0$/, "")
    : "no established";
  return [
    `You selected ${normalizedDays.length} running days while your recent baseline is ${baseline} runs per week. The approved days were preserved; ease into the added frequency and use recovery days when needed.`,
  ];
}

