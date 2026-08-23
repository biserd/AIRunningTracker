/**
 * Funnel analytics recorder.
 *
 * Single write path for every Premium-conversion funnel event. Validates
 * against the shared catalog (shared/funnelEvents.ts) and inserts with
 * ON CONFLICT DO NOTHING on the dedupe key, so recording is idempotent:
 * webhook replays, client retries, and double renders can never create
 * duplicate rows.
 *
 * Never throws: analytics must not break checkout or webhook processing.
 */

import { db } from "../db";
import { funnelEvents } from "@shared/schema";
import {
  type FunnelEventName,
  type FunnelEventProps,
  validateFunnelEvent,
} from "@shared/funnelEvents";

export interface RecordFunnelEventInput {
  event: FunnelEventName | string;
  /** Idempotency key: same key never records twice. */
  dedupeKey: string;
  userId?: number | null;
  props?: FunnelEventProps;
}

export interface RecordFunnelEventResult {
  recorded: boolean;
  deduped?: boolean;
  errors?: string[];
}

const FIRST_CLASS_KEYS = new Set([
  "source",
  "capability",
  "activityId",
  "billingPeriod",
  "experimentVariant",
]);

export async function recordFunnelEvent(
  input: RecordFunnelEventInput,
): Promise<RecordFunnelEventResult> {
  const props = input.props ?? {};
  const errors = validateFunnelEvent(String(input.event), props);
  if (!input.dedupeKey || typeof input.dedupeKey !== "string") {
    errors.push("missing dedupeKey");
  }
  if (errors.length > 0) {
    console.warn(`[funnel] rejected event "${input.event}":`, errors.join("; "));
    return { recorded: false, errors };
  }

  // Everything that isn't a first-class column goes into properties JSON.
  const extraProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!FIRST_CLASS_KEYS.has(k) && v !== undefined) extraProps[k] = v;
  }

  try {
    const rows = await db
      .insert(funnelEvents)
      .values({
        userId: input.userId ?? null,
        event: String(input.event),
        source: props.source ?? null,
        capability: props.capability ?? null,
        activityId:
          typeof props.activityId === "number" && Number.isFinite(props.activityId)
            ? props.activityId
            : null,
        billingPeriod: props.billingPeriod ?? null,
        experimentVariant: props.experimentVariant ?? null,
        properties: Object.keys(extraProps).length > 0 ? extraProps : null,
        dedupeKey: input.dedupeKey.slice(0, 512),
      })
      .onConflictDoNothing({ target: funnelEvents.dedupeKey })
      .returning({ id: funnelEvents.id });

    const recorded = rows.length > 0;
    if (!recorded) {
      console.log(`[funnel] deduped event "${input.event}" (key=${input.dedupeKey})`);
      return { recorded: false, deduped: true };
    }
    return { recorded: true };
  } catch (err) {
    console.error(`[funnel] failed to record event "${input.event}":`, (err as any)?.message);
    return { recorded: false, errors: ["db-error"] };
  }
}
