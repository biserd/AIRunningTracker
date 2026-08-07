import { Brain, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedUpgradeLink } from "@/components/TrackedUpgradeLink";
import { useSubscription } from "@/hooks/useSubscription";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { useEffect } from "react";
import { trackFunnelEvent } from "@/lib/analytics";

export function ToolResultActions({ source, capability = "public_tool" }: { source: string; capability?: string }) {
  const { hasActiveSubscription } = useSubscription();
  useEffect(() => {
    trackFunnelEvent("tool_completed", { source, capability }, { oncePerSession: true, dedupeParts: [source, capability] });
  }, [source, capability]);
  const coachHref = hasActiveSubscription
    ? "/dashboard?openChat=true"
    : buildUpgradeUrl({ source, capability: "ai_coach", benefitKey: "ai_coach", returnTo: "/dashboard?openChat=true" });
  const planHref = hasActiveSubscription
    ? "/training-plans"
    : buildUpgradeUrl({ source, capability: "training_plans", benefitKey: "training_plan", returnTo: "/training-plans" });

  return (
    <section className="mt-6 rounded-xl border border-orange-200 bg-orange-50/70 p-5" aria-label="Continue with this result">
      <h3 className="font-semibold text-charcoal mb-1">Put this result to work</h3>
      <p className="text-sm text-gray-600 mb-4">Continue with the result you just generated. Your intended destination is preserved through sign-in and trial activation.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <TrackedUpgradeLink href={coachHref} source={source} capability="ai_coach">
          <Button className="bg-strava-orange text-white hover:bg-strava-orange/90"><Brain className="h-4 w-4 mr-2" />Ask AI Coach about this</Button>
        </TrackedUpgradeLink>
        <TrackedUpgradeLink href={planHref} source={source} capability="training_plans">
          <Button variant="outline"><CalendarPlus className="h-4 w-4 mr-2" />Build a training plan</Button>
        </TrackedUpgradeLink>
      </div>
    </section>
  );
}
