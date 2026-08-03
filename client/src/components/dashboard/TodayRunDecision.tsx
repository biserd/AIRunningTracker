import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footprints, Moon, RotateCcw } from "lucide-react";

interface RecoveryData {
  daysSinceLastRun: number;
  readyToRun: boolean;
}

interface TodayRunDecisionProps {
  recoveryData?: RecoveryData;
  recentRuns: number;
  latestRunAt?: string | Date | null;
}

export default function TodayRunDecision({ recoveryData, recentRuns, latestRunAt }: TodayRunDecisionProps) {
  let title = "Connect Strava to get your first recommendation";
  let action = "Once your runs arrive, this card will turn recent training into one clear next step.";
  let Icon = Footprints;

  if (recentRuns > 0 && recoveryData) {
    if (recoveryData.daysSinceLastRun >= 14) {
      title = "Ease back in";
      action = "Try 20–30 minutes at a conversational effort. Finish feeling like you could comfortably continue.";
      Icon = RotateCcw;
    } else if (recoveryData.readyToRun) {
      title = "An easy run is reasonable today";
      action = "Keep the first 10 minutes relaxed, then stay conversational. Save hard work for a planned session.";
      Icon = Footprints;
    } else {
      title = "Make today a recovery day";
      action = "Skip intensity. Choose rest, a walk, or easy mobility, then reassess how you feel tomorrow.";
      Icon = Moon;
    }
  }

  const latestLabel = latestRunAt
    ? new Date(latestRunAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white" data-testid="card-today-run-decision">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Icon className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Today’s run decision</p>
              <Badge variant="outline" className="border-blue-200 bg-white text-[10px] text-blue-700">
                Recent running only
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-charcoal">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">{action}</p>
          </div>
        </div>
        <div className="shrink-0 text-xs text-gray-500 sm:max-w-[220px] sm:text-right">
          <p>Based on {recentRuns} recently imported run{recentRuns === 1 ? "" : "s"}{latestLabel ? ` · latest ${latestLabel}` : ""}.</p>
          <p className="mt-1">Not based on sleep, soreness, illness, or injury data.</p>
        </div>
      </CardContent>
    </Card>
  );
}
