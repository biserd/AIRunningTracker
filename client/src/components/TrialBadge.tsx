import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight } from "lucide-react";
import { Link } from "wouter";

/**
 * Free-tier upgrade nudge shown on the dashboard.
 *
 * Shows a card-on-file Premium trial CTA to anyone who is NOT already on
 * an active paid plan (free users, canceled users, etc.). Hides itself
 * for users with an active or trialing subscription so we never nag
 * paying customers.
 */
export default function TrialBadge() {
  const { hasActiveSubscription, isLoading } = useSubscription();

  if (isLoading || hasActiveSubscription) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-orange-200 bg-orange-50 p-4 mb-6"
      data-testid="trial-badge"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 text-white flex-shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              You're on the free plan
            </div>
            <p className="text-sm text-gray-600">
              Showing your last 20 runs. Start a 14-day Premium trial to
              unlock unlimited history, AI insights, training plans, and the
              Coach Chat. Cancel anytime.
            </p>
          </div>
        </div>

        <Link href="/pricing">
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white border-0"
            data-testid="trial-upgrade-button"
          >
            Start 14-day trial
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
