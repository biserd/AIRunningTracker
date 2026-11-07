/** First release deliberately keeps Garmin data out of Strava and AI pipelines. */
export const GARMIN_CALLBACK_PATH = '/api/garmin/callback';
export const GARMIN_PUSH_TYPES = ['activities', 'manuallyUpdatedActivities', 'deregistrations', 'userPermissionsChange'] as const;
export type GarminPushType = typeof GARMIN_PUSH_TYPES[number];
export type GarminPush = Partial<Record<GarminPushType, Record<string, unknown>[]>>;
const running = new Set(['RUNNING', 'INDOOR_RUNNING', 'OBSTACLE_RUN', 'STREET_RUNNING', 'TRACK_RUNNING', 'TRAIL_RUNNING', 'TREADMILL_RUNNING', 'ULTRA_RUN', 'VIRTUAL_RUN']);
const fields = ['userId', 'summaryId', 'activityId', 'activityType', 'activityName', 'startTimeInSeconds', 'startTimeOffsetInSeconds', 'durationInSeconds', 'distanceInMeters', 'averageSpeedInMetersPerSecond', 'maxSpeedInMetersPerSecond', 'averageHeartRateInBeatsPerMinute', 'maxHeartRateInBeatsPerMinute', 'averageRunCadenceInStepsPerMinute', 'totalElevationGainInMeters', 'activeKilocalories', 'deviceName', 'manual', 'permissions', 'changeTimeInSeconds'];
export function parseGarminPush(input: unknown): GarminPush {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GARMIN_PUSH');
  const result: GarminPush = {};
  let count = 0;
  for (const [key, entries] of Object.entries(input)) {
    if (!GARMIN_PUSH_TYPES.includes(key as GarminPushType) || !Array.isArray(entries)) throw new Error('UNSUPPORTED_GARMIN_PUSH');
    result[key as GarminPushType] = entries.map(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value) || ++count > 500) throw new Error('INVALID_GARMIN_PUSH');
      const entry = value as Record<string, unknown>;
      if (typeof entry.userId !== 'string' || !/^[\w-]{1,128}$/.test(entry.userId)) throw new Error('INVALID_GARMIN_USER');
      if (key === 'userPermissionsChange' && (!Array.isArray(entry.permissions) || entry.permissions.length > 20 || entry.permissions.some(p => typeof p !== 'string' || p.length > 80))) throw new Error('INVALID_GARMIN_PERMISSIONS');
      // Discard URLs, tokens, coordinates and unrequested sensor fields at receipt.
      return Object.fromEntries(fields.filter(field => entry[field] !== undefined).map(field => [field, entry[field]]));
    });
  }
  if (!count) throw new Error('EMPTY_GARMIN_PUSH');
  return result;
}
function number(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}
export interface GarminRun {
  id: string; name: string; type: string; startDate: string; offsetSeconds: number;
  distance: number; duration: number; averageSpeed: number; averageHeartRate: number | null;
  maxHeartRate: number | null; cadence: number | null; elevationGain: number | null;
  calories: number | null; device: string | null; manual: boolean;
}
export function normalizeGarminRun(entry: Record<string, unknown>): GarminRun | null {
  if (!running.has(String(entry.activityType))) return null;
  const rawId = entry.activityId ?? entry.summaryId;
  const id = typeof rawId === 'number' && Number.isSafeInteger(rawId) && rawId > 0 ? String(rawId) : rawId;
  if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw new Error('INVALID_GARMIN_ACTIVITY');
  const start = number(entry.startTimeInSeconds, 4102444800);
  const distance = number(entry.distanceInMeters, 2_000_000), duration = number(entry.durationInSeconds, 2_592_000);
  if (start === null || start < 946684800 || distance === null || duration === null) throw new Error('INVALID_GARMIN_METRICS');
  const text = (value: unknown, size: number) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').slice(0, size) : null;
  const offset = entry.startTimeOffsetInSeconds;
  return {
    id, name: text(entry.activityName, 180) || 'Garmin run', type: String(entry.activityType),
    startDate: new Date(start * 1000).toISOString(),
    offsetSeconds: typeof offset === 'number' && Number.isInteger(offset) && Math.abs(offset) <= 86400 ? offset : 0,
    distance, duration, averageSpeed: number(entry.averageSpeedInMetersPerSecond, 30) ?? (duration ? distance / duration : 0),
    averageHeartRate: number(entry.averageHeartRateInBeatsPerMinute, 300), maxHeartRate: number(entry.maxHeartRateInBeatsPerMinute, 300),
    cadence: number(entry.averageRunCadenceInStepsPerMinute, 400), elevationGain: number(entry.totalElevationGainInMeters, 100_000),
    calories: number(entry.activeKilocalories, 200_000), device: text(entry.deviceName, 100), manual: entry.manual === true,
  };
}
export interface GarminStatus {
  available: boolean; connected: boolean; status: 'not_connected' | 'connected' | 'permission_required' | 'disconnect_pending' | 'reconnect_required';
  connectedAt: string | null; lastSyncAt: string | null; activityCount: number;
}
