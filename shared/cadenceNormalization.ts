/**
 * Cadence normalization helpers.
 *
 * Strava reports running cadence as per-leg RPM (revolutions/steps for ONE
 * leg), which is roughly half of the conventional "steps per minute" (spm)
 * runners expect (~85-95 per-leg vs ~170-190 spm). Ingestion pipelines already
 * double the raw Strava value once (see server ingest: `average_cadence * 2`),
 * so client-side code must NOT double again.
 *
 * These pure helpers let display code:
 *   - Reason about the canonical optimal cadence band (170-180 spm).
 *   - Defensively normalize a value that is *likely* still single-leg, without
 *     ever double-converting an already-normalized spm value.
 */

/** Canonical optimal running cadence band, in steps per minute. */
export const OPTIMAL_CADENCE_MIN_SPM = 170;
export const OPTIMAL_CADENCE_MAX_SPM = 180;

/** Midpoint of the optimal band; used as a display/target constant. */
export const OPTIMAL_CADENCE_TARGET_SPM = 180;

/**
 * Below this threshold a cadence value is treated as a plausible single-leg
 * (per-leg RPM) reading rather than steps-per-minute. Realistic running spm
 * is ~150-200; per-leg RPM is ~75-100. A value under ~120 is far more likely
 * to be single-leg than a genuine (extremely low) spm.
 */
export const SINGLE_LEG_MAX_THRESHOLD = 120;

/**
 * Above this we never treat a value as single-leg (it is unambiguously spm).
 * Kept explicit for readability / testing.
 */
export const DEFINITE_SPM_MIN_THRESHOLD = 120;

/**
 * Returns true when a cadence value looks like a single-leg (per-leg RPM)
 * reading that still needs doubling to become steps-per-minute.
 *
 * A value only qualifies when it is positive AND below the single-leg
 * threshold, so already-normalized spm values (e.g. 178) are left untouched,
 * avoiding double conversion.
 */
export function isLikelySingleLegCadence(value: number | null | undefined): boolean {
  if (value == null || !Number.isFinite(value) || value <= 0) return false;
  return value < SINGLE_LEG_MAX_THRESHOLD;
}

/**
 * Normalize a cadence value to steps-per-minute.
 *
 * - Non-finite / non-positive values return 0.
 * - Values that look single-leg (< threshold) are doubled once.
 * - Values already in spm range are returned unchanged (no double conversion).
 */
export function normalizeCadenceToSpm(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0;
  return isLikelySingleLegCadence(value) ? value * 2 : value;
}

/** True when a (normalized) spm value sits inside the optimal 170-180 band. */
export function isCadenceOptimal(spm: number): boolean {
  return spm >= OPTIMAL_CADENCE_MIN_SPM && spm <= OPTIMAL_CADENCE_MAX_SPM;
}

/**
 * Human-readable assessment of an spm value relative to the optimal band.
 * Returns one of: 'below' | 'optimal' | 'above'.
 */
export function cadenceBandPosition(spm: number): 'below' | 'optimal' | 'above' {
  if (spm < OPTIMAL_CADENCE_MIN_SPM) return 'below';
  if (spm <= OPTIMAL_CADENCE_MAX_SPM) return 'optimal';
  return 'above';
}
