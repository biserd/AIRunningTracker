import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function TrialBadge() {
  const { isReverseTrial, trialDaysRemaining } = useSubscription();

  if (!isReverseTrial) {
    return null;
  }

  const urgencyColor = trialDaysRemaining <= 2 
    ? "bg-red-500/10 text-red-600 border-red-200" 
    : trialDaysRemaining <= 4 
      ? "bg-yellow-500/10 text-yellow-700 border-yellow-200"
      : "bg-purple-500/10 text-purple-600 border-purple-200";

  return (
    <div className={`rounded-lg border p-4 mb-6 ${urgencyColor}`} data-testid="trial-badge">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Pro Trial Active</span>
              <Badge variant="secondary" className="text-xs" data-testid="trial-days-remaining">
                <Clock size={12} className="mr-1" />
                {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left
              </Badge>
            </div>
            <p className="text-sm opacity-80">
              {trialDaysRemaining <= 2 
                ? "Your trial ends soon! Upgrade to keep Pro features."
                : "Enjoy unlimited AI insights, training plans, and more!"}
            </p>
          </div>
        </div>
        
        <Link href="/pricing">
          <Button 
            variant={trialDaysRemaining <= 2 ? "default" : "outline"} 
            size="sm"
            className={trialDaysRemaining <= 2 ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-0" : ""}
            data-testid="trial-upgrade-button"
          >
            Upgrade to Pro
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
