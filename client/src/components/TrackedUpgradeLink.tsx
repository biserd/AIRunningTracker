import { Link } from "wouter";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useOfferTracking } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

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
  const child = Children.only(children);

  // Existing callers pass a styled Button. Render that style onto the anchor
  // itself so the DOM contains one interactive element instead of a button
  // nested inside a link.
  if (isValidElement(child) && child.type === Button) {
    const button = child as ReactElement<any>;
    const { children: buttonChildren, onClick, disabled, ...buttonProps } = button.props;
    if (disabled) {
      return <Button {...buttonProps} disabled>{buttonChildren}</Button>;
    }
    return (
      <Button {...buttonProps} asChild>
        <Link
          href={href}
          onClick={(event) => {
            onClick?.(event);
            trackClick();
          }}
        >
          {buttonChildren}
        </Link>
      </Button>
    );
  }

  return (
    <Link href={href} onClick={trackClick}>
      {children}
    </Link>
  );
}
