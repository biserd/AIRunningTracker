/** D1 migration policy. Never use this policy to delete records from Neon. */
export const D1_ROW_LIMIT = 2_000_000;
// Leave space for SQLite's record header and columns added by subsequent updates.
export const D1_ACTIVITY_BUDGET = 1_998_000;
export const EXPECTED_LEGACY_EXCLUSIONS = 33;

export type ActivityExclusion = {
  activityId: number;
  userId: number;
  stravaId: string;
  payloadBytes: number;
};

export function positiveId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('INVALID_ID');
  }
  return value;
}

export function validateExclusions(rows: ActivityExclusion[]): ActivityExclusion[] {
  if (rows.length !== EXPECTED_LEGACY_EXCLUSIONS) throw new Error('EXCLUSION_COUNT_CHANGED');
  const ids = new Set<number>();
  const external = new Set<string>();
  for (const row of rows) {
    positiveId(row.activityId);
    positiveId(row.userId);
    if (!/^\d+$/.test(row.stravaId)) throw new Error('INVALID_STRAVA_ID');
    if (!Number.isSafeInteger(row.payloadBytes) || row.payloadBytes <= D1_ROW_LIMIT) {
      throw new Error('EXCLUSION_NOT_OVERSIZED');
    }
    const key = `${row.userId}:${row.stravaId}`;
    if (ids.has(row.activityId) || external.has(key)) throw new Error('DUPLICATE_EXCLUSION');
    ids.add(row.activityId);
    external.add(key);
  }
  return rows;
}

/** Conservative UTF-8 record size. Must run on fully merged inserts AND updates. */
export function recordBytes(row: Record<string, unknown>): number {
  let bytes = 64 + Object.keys(row).length * 9;
  for (const value of Object.values(row)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'number' || typeof value === 'boolean') { bytes += 8; continue; }
    if (typeof value === 'string') bytes += new TextEncoder().encode(value).byteLength;
    else throw new Error('ROW_NOT_ENCODED');
  }
  return bytes;
}

export function assertActivityFits(row: Record<string, unknown>): void {
  if (recordBytes(row) > D1_ACTIVITY_BUDGET) throw new Error('D1_ACTIVITY_TOO_LARGE');
}

/** Migration only: preserve plan history and agent records, detach unavailable runs. */
export function transformActivityReferences(
  table: string,
  source: Record<string, unknown>,
  excludedIds: ReadonlySet<number>,
  affectedUsers: ReadonlySet<number>,
): { row: Record<string, unknown> | null; reason?: string } {
  const row = { ...source };
  if (table === 'activities' && excludedIds.has(Number(row.id))) {
    return { row: null, reason: 'oversized_activity_left_in_neon' };
  }
  if (['activity_features', 'activity_route_map', 'similar_runs_cache', 'coach_recaps'].includes(table)
    && excludedIds.has(Number(row.activity_id))) {
    return { row: null, reason: 'excluded_activity_dependency' };
  }
  if (table === 'plan_days' && excludedIds.has(Number(row.linked_activity_id))) {
    // Completion and actual metrics describe historical training, not a live link.
    row.linked_activity_id = null;
    return { row, reason: 'detached_plan_activity_preserved_completion' };
  }
  if (table === 'agent_runs' && excludedIds.has(Number(row.activity_id))) {
    row.activity_id = null;
    return { row, reason: 'detached_agent_activity' };
  }
  if (table === 'similar_runs_cache' && affectedUsers.has(Number(row.user_id))) {
    return { row: null, reason: 'invalidate_affected_runner_similarity_cache' };
  }
  if (table === 'users' && affectedUsers.has(Number(row.id))) {
    row.cached_recovery_state = null;
    row.recovery_calculated_at = null;
    // A preview must not send a runner to an omitted activity.
    const preview = typeof row.premium_preview === 'string'
      ? JSON.parse(row.premium_preview) : row.premium_preview;
    if (preview && typeof preview === 'object') {
      // All affected runners need a fresh preview against retained history.
      row.premium_preview = null;
      row.premium_preview_created_at = null;
    }
    return { row, reason: 'invalidate_affected_runner_caches' };
  }
  return { row };
}
