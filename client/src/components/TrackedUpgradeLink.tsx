import { Link } from "wouter";
import type { ReactNode } from "react";
import { useOfferTracking } from "@/lib/analytics";

/**
 * Premium-gate CTA link with built-in funnel tracking.
 *
 * Fires `offer_viewed` once per session when the gate renders and
 * `offer_clicked` when the CTA is clicked. Attribution (source /
 * capability / activityId) can be passed explicitly, or is parsed from
 * an upgrade-intent pricing URL (`buildUpgradeUrl` output) in `href`.
 */
export function TrackedUpgradeLink({
  href,
  source,
  capability,
  activityId,
  children,
}: {
  href: string;
  source?: string;
  capability?: string;
  activityId?: number;
  children: ReactNode;
}) {
  const trackClick = useOfferTracking(href, { source, capability, activityId });
  return (
    <Link href={href} onClick={trackClick}>
      {children}
    </Link>
  );
}
