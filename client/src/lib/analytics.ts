/**
 * Client-side funnel analytics.
 *
 * trackFunnelEvent() is fire-and-forget: it must never block or break the
 * UI. Each event carries a deterministic dedupe key (event + session +
 * caller-supplied parts) so the server's unique constraint drops retries,
 * and view-type events are additionally guarded per browser session so a
 * re-render doesn't even attempt a duplicate send.
 */

import { useEffect } from "react";
import {
  type FunnelEventName,
  type FunnelEventProps,
  buildFunnelDedupeKey,
  isClientFunnelEvent,
} from "@shared/funnelEvents";
import { parseUpgradeIntent } from "@shared/upgradeIntent";

const SESSION_KEY = "ra_funnel_session";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "nosession";
  }
}

export interface TrackOptions {
  /** Extra parts for the dedupe key (e.g. activityId, source). */
  dedupeParts?: Array<string | number | null | undefined>;
  /** If true, this event fires at most once per browser session per dedupe key. */
  oncePerSession?: boolean;
}

export function trackFunnelEvent(
  event: FunnelEventName,
  props: FunnelEventProps = {},
  options: TrackOptions = {},
): void {
  try {
    if (!isClientFunnelEvent(event)) return; // server-authoritative events can't be sent from the client

    const sessionId = getSessionId();
    const dedupeKey = buildFunnelDedupeKey(event, [sessionId, ...(options.dedupeParts ?? [])]);

    if (options.oncePerSession) {
      const guardKey = `ra_fe_sent:${dedupeKey}`;
      try {
        if (sessionStorage.getItem(guardKey)) return;
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // sessionStorage unavailable — rely on server-side dedupe
      }
    }

    const token = localStorage.getItem("auth_token");
    void fetch("/api/analytics/funnel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        event,
        dedupeKey,
        props: { ...props, occurredAt: new Date().toISOString() },
      }),
    }).catch(() => {
      // analytics must never surface errors to the user
    });
  } catch {
    // never throw from analytics
  }
}

/**
 * Offer-impression tracking for Premium gates.
 *
 * Derives source/capability/activity context from the gate's pricing URL
 * (the upgrade-intent query string), fires `offer_viewed` once per session
 * per surface, and returns a click handler that fires `offer_clicked`.
 *
 * The click dedupe key intentionally omits any timestamp and matches the
 * key the pricing page uses when inferring a click from an arriving
 * upgrade intent — so a gate click followed by the pricing-page arrival
 * records exactly ONE offer_clicked row per session/surface/context.
 */
export function useOfferTracking(
  pricingUrl: string,
  override?: { source?: string; capability?: string; activityId?: number },
): () => void {
  const qIndex = pricingUrl.indexOf("?");
  const intent = qIndex >= 0 ? parseUpgradeIntent(pricingUrl.slice(qIndex)) : null;
  const source = override?.source || intent?.source || "gate";
  const capability = override?.capability || (intent ? String(intent.capability) : "premium_features");
  const activityId = override?.activityId ?? intent?.activityId;

  useEffect(() => {
    trackFunnelEvent(
      "offer_viewed",
      { source, capability, activityId },
      { oncePerSession: true, dedupeParts: [source, capability, activityId] },
    );
  }, [source, capability, activityId]);

  return () =>
    trackFunnelEvent(
      "offer_clicked",
      { source, capability, activityId },
      { dedupeParts: [source, capability, activityId] },
    );
}
