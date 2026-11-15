import { useEffect } from "react";
import { Link } from "wouter";
import { useSubscription } from "@/hooks/useSubscription";
import { trackFunnelEvent } from "@/lib/analytics";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { DAY_ONE_COACH_DASHBOARD, DAY_ONE_COACH_SOURCE } from "@shared/dayOneCoach";

export function DayOneTrialOffer({ after }: { after: "answer" | "prediction" }) {
  const { hasActiveSubscription, isLoading } = useSubscription();
  const capability = after === "answer" ? "ai_coach" : "training_plans";
  useEffect(() => {
    trackFunnelEvent("tool_completed", { source: DAY_ONE_COACH_SOURCE, capability }, { oncePerSession: true, dedupeParts: [DAY_ONE_COACH_SOURCE, after] });
    if (!hasActiveSubscription && !isLoading) {
      trackFunnelEvent("offer_viewed", { source: DAY_ONE_COACH_SOURCE, capability }, { oncePerSession: true, dedupeParts: [DAY_ONE_COACH_SOURCE, after] });
    }
  }, [after, capability, hasActiveSubscription, isLoading]);
  if (hasActiveSubscription || isLoading) return null;
  const href = buildUpgradeUrl({
    source: DAY_ONE_COACH_SOURCE, capability, returnTo: DAY_ONE_COACH_DASHBOARD,
    benefitKey: after === "answer" ? "ai_coach" : "training_plan",
  });
  return (
    <section className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-slate-900" data-testid="day-one-trial-offer">
      <p className="font-semibold">{after === "answer" ? "Want help adjusting the plan as your week changes?" : "Want a training plan for that race goal?"}</p>
      <p className="mt-1 text-xs">Eligible runners get 7 days free with Premium. Review pricing and renewal terms before starting.</p>
      <Link href={href} className="mt-2 inline-flex min-h-9 items-center font-semibold text-orange-800 underline underline-offset-2">
        See the 7-day trial
      </Link>
    </section>
  );
}
