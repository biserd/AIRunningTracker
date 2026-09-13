import { createHash } from 'node:crypto';
import type { StravaEvent } from './jobTypes';

export function parseStravaEvent(value: unknown, subscriptionId: string | undefined): StravaEvent | null {
  if (!value || typeof value !== 'object' || !subscriptionId || !/^[1-9][0-9]*$/.test(subscriptionId)) return null;
  const v = value as Record<string, unknown>;
  if (!['activity','athlete'].includes(String(v.object_type)) || !['create','update','delete'].includes(String(v.aspect_type))) return null;
  for (const key of ['object_id','owner_id','subscription_id','event_time']) {
    if (!Number.isSafeInteger(v[key]) || Number(v[key]) <= 0) return null;
  }
  if (v.subscription_id !== Number(subscriptionId)) return null;
  // The current handler processes creates only; do not persist arbitrary untrusted updates.
  return { object_type: v.object_type as StravaEvent['object_type'], aspect_type: v.aspect_type as StravaEvent['aspect_type'],
    object_id: Number(v.object_id), owner_id: Number(v.owner_id), subscription_id: Number(v.subscription_id), event_time: Number(v.event_time) };
}
export function stravaEventJobId(event: StravaEvent): string {
  return 'strava_' + createHash('sha256').update([event.subscription_id,event.owner_id,event.object_type,event.object_id,event.aspect_type,event.event_time].join(':')).digest('hex');
}
