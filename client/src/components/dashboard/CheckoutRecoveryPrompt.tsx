import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirectCheckoutButton } from "@/components/DirectCheckoutButton";
import { TrialOfferDetails, useTrialOffer } from "@/components/TrialOfferDetails";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { buildUpgradeUrl } from "@shared/upgradeIntent";

interface RecoveryResponse {
  recovery: { id: number; source: string | null; capability: string | null } | null;
}

export default function CheckoutRecoveryPrompt() {
  const { user, isAuthenticated } = useAuth();
  const { isFree, isLoading: subscriptionLoading } = useSubscription();
  const { data: offer } = useTrialOffer();
  const [, refreshDismissal] = useState(0);
  const { data } = useQuery<RecoveryResponse>({
    queryKey: ["/api/stripe/checkout-recovery", user?.id],
    enabled: isAuthenticated && Boolean(user?.id) && !subscriptionLoading && isFree,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await fetch("/api/stripe/checkout-recovery", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Checkout recovery unavailable");
      return response.json();
    },
  });

  const recovery = data?.recovery;
  if (!recovery || !user?.id || !isFree) return null;
  const storageKey = `checkout-recovery-dismissed:${user.id}`;
  if (typeof window !== "undefined") {
    try {
      const dismissed = JSON.parse(localStorage.getItem(storageKey) || "null") as { id?: number; until?: number } | null;
      if (dismissed?.id === recovery.id && Number(dismissed.until) > Date.now()) return null;
    } catch { /* A corrupt local preference must not hide the prompt. */ }
  }

  const benefit = recovery.source === "coach_insights_preview"
    ? "the race outlook, training-load signals, and form trends from your running history."
    : recovery.source === "floating_ai_coach"
      ? "personalized coach answers based on your runs and goals."
      : "complete run analysis, training trends, and personalized coaching.";
  const upgradeUrl = buildUpgradeUrl({
    source: "checkout_recovery",
    capability: recovery.capability || "premium",
    benefitKey: "dashboard_trial",
    returnTo: "/dashboard",
  });

  return (
    <section className="mb-6 rounded-2xl border border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 p-5 shadow-sm" data-testid="checkout-recovery-prompt" aria-label="Continue Premium signup">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Pick up where you left off</p>
          <h2 className="mt-1 text-xl font-bold text-gray-950">Your Premium option is still available</h2>
          <p className="mt-1 text-sm text-gray-700">Checkout wasn't completed. You can review the terms and continue when you're ready.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Dismiss Premium reminder for a week"
          onClick={() => {
            localStorage.setItem(storageKey, JSON.stringify({ id: recovery.id, until: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
            refreshDismissal((value) => value + 1);
          }}
        ><X className="h-4 w-4" /></Button>
      </div>
      <TrialOfferDetails className="mt-4" benefit={benefit} />
      <DirectCheckoutButton upgradeUrl={upgradeUrl}>
        <Button className="mt-4 bg-strava-orange text-white hover:bg-orange-600" data-testid="checkout-recovery-continue">
          {offer?.trialEligible ? "Continue my 7-day trial" : "Continue to secure Checkout"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DirectCheckoutButton>
    </section>
  );
}
