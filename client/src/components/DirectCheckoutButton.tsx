import { Children, cloneElement, isValidElement, useState, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddEmailModal } from "@/components/AddEmailModal";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { trackFunnelEvent, useOfferTracking } from "@/lib/analytics";
import { parseUpgradeIntent } from "@shared/upgradeIntent";

/**
 * Starts a monthly Premium checkout directly from an authenticated feature
 * gate. Generic navigation and comparison-shopping links should continue to
 * use /pricing; this component is for runners who have already chosen Unlock.
 */
export function DirectCheckoutButton({
  upgradeUrl,
  children,
  onBeforeCheckout,
}: {
  upgradeUrl: string;
  children: ReactNode;
  onBeforeCheckout?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const queryIndex = upgradeUrl.indexOf("?");
  const intent = queryIndex >= 0 ? parseUpgradeIntent(upgradeUrl.slice(queryIndex)) : null;
  const trackOfferClick = useOfferTracking(upgradeUrl);
  const checkout = useCheckout(() => setShowEmailModal(true));

  const startCheckout = () => {
    onBeforeCheckout?.();
    trackOfferClick();
    if (!intent) {
      navigate(upgradeUrl);
      return;
    }
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(upgradeUrl)}`);
      return;
    }
    trackFunnelEvent("checkout_started", {
      source: intent.source,
      billingPeriod: "monthly",
      capability: String(intent.capability),
      activityId: intent.activityId,
    }, { dedupeParts: [intent.source, intent.capability, intent.activityId, Date.now()] });
    checkout.mutate({
      billingPeriod: "monthly",
      returnTo: intent.returnTo,
      source: intent.source,
      capability: String(intent.capability),
      activityId: intent.activityId,
      benefitKey: intent.benefitKey,
      pendingResourceId: intent.pendingResourceId,
      experimentVariant: intent.experimentVariant || "direct_checkout_v1",
    }, {
      onError: (error) => toast({
        title: "Checkout could not open",
        description: error instanceof Error ? error.message : "Please try again or review Premium pricing.",
        variant: "destructive",
      }),
    });
  };

  const child = Children.only(children);
  if (!isValidElement(child) || child.type !== Button) return null;
  const button = child as ReactElement<any>;
  const { children: label, onClick, disabled, ...buttonProps } = button.props;

  return (
    <>
      {cloneElement(button, {
        ...buttonProps,
        type: "button",
        disabled: disabled || checkout.isPending,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) startCheckout();
        },
        children: checkout.isPending
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening secure checkout…</>
          : label,
      })}
      <AddEmailModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={() => {
          setShowEmailModal(false);
          startCheckout();
        }}
      />
    </>
  );
}
