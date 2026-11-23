import { useEffect } from "react";
import { Link } from "wouter";
import { useSubscription } from "@/hooks/useSubscription";
import { trackFunnelEvent } from "@/lib/analytics";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { DAY_ONE_COACH_DASHBOARD, DAY_ONE_COACH_SOURCE, DAY_SEVEN_RACE_SOURCE } from "@shared/dayOneCoach";
import { daySevenPlanPath, RACE_GOALS, type RaceGoal } from "@shared/daySevenRace";
import { afterSignupEmailClick } from "@/lib/signupEmailAttribution";

export function SignupResultTrialOffer({ after, source = DAY_ONE_COACH_SOURCE, raceGoal, recordResult = true }: {
  after: "answer" | "prediction" | "fueling";
  source?: string;
  raceGoal?: RaceGoal;
  recordResult?: boolean;
}) {
  const { hasActiveSubscription, isLoading } = useSubscription();
  const capability = after === "answer" ? "ai_coach" : "training_plans";
  const resultCapability = after === "prediction" ? "race_prediction" : after === "fueling" ? "fueling_plan" : "ai_coach";
  useEffect(() => {
    if (recordResult) afterSignupEmailClick(() => trackFunnelEvent("tool_completed", { source, capability: resultCapability }, { oncePerSession: true, dedupeParts: [source, after] }));
    if (!hasActiveSubscription && !isLoading) {
      trackFunnelEvent("offer_viewed", { source, capability }, { oncePerSession: true, dedupeParts: [source, after] });
    }
  }, [after, capability, hasActiveSubscription, isLoading, recordResult, resultCapability, source]);
  const goal = source === DAY_SEVEN_RACE_SOURCE && raceGoal ? RACE_GOALS[raceGoal] : undefined;
  if (goal && raceGoal && hasActiveSubscription) {
    return <Link href={daySevenPlanPath(raceGoal)} className="mt-2 inline-flex min-h-9 items-center font-semibold text-orange-800 underline underline-offset-2">Build a plan for this race</Link>;
  }
  if (hasActiveSubscription || isLoading) return null;
  const href = buildUpgradeUrl({
    source, capability, returnTo: goal && raceGoal ? daySevenPlanPath(raceGoal) : source === DAY_ONE_COACH_SOURCE ? DAY_ONE_COACH_DASHBOARD : "/dashboard",
    benefitKey: after === "answer" ? "ai_coach" : "training_plan",
  });
  return (
    <section className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-slate-900" data-testid="signup-result-trial-offer">
      <p className="font-semibold">{goal ? `Want a training plan for your ${goal.label}?` : after === "answer" ? "Want help adjusting the plan as your week changes?" : after === "prediction" ? "Want a training plan for that race goal?" : "Want a training plan that builds toward race day?"}</p>
      <p className="mt-1 text-xs">Eligible runners get 7 days free with Premium. Review pricing and renewal terms before starting.</p>
      <Link href={href} className="mt-2 inline-flex min-h-9 items-center font-semibold text-orange-800 underline underline-offset-2">
        {goal ? "Build a plan for this race" : "See the 7-day trial"}
      </Link>
    </section>
  );
}
