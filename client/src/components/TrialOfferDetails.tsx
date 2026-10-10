import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export interface TrialOffer {
  billingPeriod: "monthly" | "annual";
  trialEligible: boolean;
  trialDays: number;
  estimatedFirstChargeAt: string | null;
  unitAmount: number;
  currency: string;
}

export function useTrialOffer(billingPeriod: "monthly" | "annual" = "monthly") {
  const { user, isAuthenticated } = useAuth();
  return useQuery<TrialOffer>({
    queryKey: ["/api/stripe/trial-offer", user?.id, billingPeriod],
    enabled: isAuthenticated && Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch(`/api/stripe/trial-offer?billingPeriod=${billingPeriod}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Trial offer unavailable");
      return response.json();
    },
  });
}

export function formatTrialAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() });
  const divisor = 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2);
  return formatter.format(amount / divisor);
}

export function TrialOfferDetails({
  benefit,
  billingPeriod = "monthly",
  className = "",
}: {
  benefit: string;
  billingPeriod?: "monthly" | "annual";
  className?: string;
}) {
  const { data: offer, isLoading } = useTrialOffer(billingPeriod);
  const interval = billingPeriod === "annual" ? "year" : "month";
  const amount = offer ? formatTrialAmount(offer.unitAmount, offer.currency) : null;
  const freeAmount = offer ? formatTrialAmount(0, offer.currency) : "$0";
  const chargeDate = offer?.estimatedFirstChargeAt
    ? new Date(offer.estimatedFirstChargeAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className={`rounded-xl border border-orange-200 bg-white/85 p-4 text-sm text-gray-800 ${className}`} data-testid="trial-offer-details">
      <p className="font-semibold text-gray-950">Premium unlocks {benefit}</p>
      {offer?.trialEligible && amount && chargeDate ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p><span className="font-bold text-orange-700">{freeAmount} today</span> · Your 7-day trial starts when you complete Checkout.</p>
          <p><span className="font-bold">Estimated first charge: {chargeDate}</span> · {amount}/{interval} after that.</p>
        </div>
      ) : offer && amount ? (
        <p className="mt-3">This account has used its free trial. {amount} is due today, then {amount}/{interval}.</p>
      ) : (
        <p className="mt-3 text-gray-600">{isLoading ? "Checking your trial and price…" : "Secure Checkout will confirm your price and first charge date before you pay."}</p>
      )}
      <p className="mt-2 text-xs text-gray-600">Cancel anytime in subscription settings. A payment method is requested at Checkout; Stripe confirms the exact charge date and any tax before you finish.</p>
    </div>
  );
}
