/**
 * Pure, bounded zone-duration calculation utilities.
 *
 * These helpers guarantee three invariants that were previously violated by the
 * ad-hoc zone math in the activity page:
 *   1. No single zone duration can exceed the activity duration.
 *   2. No zone percentage can exceed 100 (or be negative).
 *   3. The sum of the normalized zone durations equals the total captured time,
 *      and the sum of the percentages never exceeds 100.
 *
 * The functions are framework-agnostic and side-effect free so they can be
 * unit-tested directly through tsx/Node.
 */

export interface ZoneBucket {
  /** Raw accumulated seconds in this zone before normalization. */
  seconds: number;
}

export interface NormalizedZone {
  /** Bounded seconds in this zone (0..activityDuration, summing to captured time). */
  seconds: number;
  /** Whole-number minutes for display. */
  minutes: number;
  /** Bounded whole-number percentage (0..100), summing to <= 100. */
  percentage: number;
  /** Fraction of captured time (0..1). */
  fraction: number;
}

/**
 * Clamp a numeric value to the inclusive [min, max] range. Non-finite inputs
 * collapse to `min` so downstream math stays bounded.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Normalize raw per-zone second buckets into bounded display values.
 *
 * @param rawSeconds     Accumulated seconds per zone (any length). Negative or
 *                       non-finite entries are treated as 0.
 * @param activityDuration Total activity/moving time in seconds. Used as the
 *                       hard upper bound for any single zone and for the whole.
 *
 * Guarantees:
 *   - Each `seconds` is within [0, activityDuration].
 *   - Sum of `seconds` <= activityDuration (buckets are rescaled if the raw
 *     total overshoots, e.g. due to noisy/overlapping stream samples).
 *   - Percentages are integers in [0, 100] whose sum is <= 100 (largest-
 *     remainder rounding avoids the "adds up to 101%" artifact).
 */
export function normalizeZoneDurations(
  rawSeconds: number[],
  activityDuration: number,
): NormalizedZone[] {
  const duration = Number.isFinite(activityDuration) && activityDuration > 0
    ? activityDuration
    : 0;

  // Sanitize raw inputs: no negatives, no NaN/Infinity.
  const sanitized = rawSeconds.map((s) =>
    Number.isFinite(s) && s > 0 ? s : 0,
  );

  const rawTotal = sanitized.reduce((sum, s) => sum + s, 0);

  if (duration === 0 || rawTotal === 0) {
    return sanitized.map(() => ({
      seconds: 0,
      minutes: 0,
      percentage: 0,
      fraction: 0,
    }));
  }

  // If the captured/raw time overshoots the activity duration (overlapping or
  // noisy samples), rescale so the total never exceeds the real duration.
  const scale = rawTotal > duration ? duration / rawTotal : 1;

  const scaledSeconds = sanitized.map((s) => clamp(s * scale, 0, duration));
  const scaledTotal = scaledSeconds.reduce((sum, s) => sum + s, 0);

  // Percentages relative to the (bounded) total, using largest-remainder
  // rounding so the integer percentages sum to <= 100.
  const percentages = allocateRoundedPercentages(scaledSeconds, scaledTotal);

  return scaledSeconds.map((seconds, i) => ({
    seconds,
    minutes: Math.round(seconds / 60),
    percentage: percentages[i],
    fraction: scaledTotal > 0 ? seconds / scaledTotal : 0,
  }));
}

/**
 * Convert a fractional distribution (e.g. [0.15, 0.65, 0.15, 0.04, 0.01]) into
 * bounded zone durations against the activity duration. Fractions are clamped
 * and re-normalized so they never imply more than 100% of the activity.
 */
export function zonesFromFractions(
  fractions: number[],
  activityDuration: number,
): NormalizedZone[] {
  const duration = Number.isFinite(activityDuration) && activityDuration > 0
    ? activityDuration
    : 0;
  const sanitized = fractions.map((f) =>
    Number.isFinite(f) && f > 0 ? f : 0,
  );
  const seconds = sanitized.map((f) => f * duration);
  return normalizeZoneDurations(seconds, duration);
}

/**
 * Largest-remainder (Hamilton) rounding of a set of values into integer
 * percentages that sum to <= 100 and are each within [0, 100].
 */
function allocateRoundedPercentages(values: number[], total: number): number[] {
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (v / total) * 100);
  const floored = exact.map((v) => Math.floor(v));
  let remaining = 100 - floored.reduce((sum, v) => sum + v, 0);

  // Distribute the leftover whole points to the largest fractional remainders.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (let k = 0; k < order.length && remaining > 0; k++) {
    result[order[k].i] += 1;
    remaining--;
  }

  return result.map((v) => clamp(v, 0, 100));
}
