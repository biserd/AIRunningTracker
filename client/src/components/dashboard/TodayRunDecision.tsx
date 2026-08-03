import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footprints, Moon, RotateCcw } from "lucide-react";
import { getTodayRunDecision } from "@shared/todayRunDecision";

interface RecoveryData {
  daysSinceLastRun: number;
  readyToRun: boolean;
}

interface TodayRunDecisionProps {
  recoveryData?: RecoveryData;
  isStravaConnected: boolean;
  recentRuns: number;
  latestRunAt?: string | Date | null;
}

export default function TodayRunDecision({ recoveryData, isStravaConnected, recentRuns, latestRunAt }: TodayRunDecisionProps) {
  const decision = getTodayRunDecision({
    recoveryData,
    isStravaConnected,
    recentRuns,
    latestRunAt,
  });
  const Icon = decision.kind === "recovery" ? Moon : decision.kind === "return" ? RotateCcw : Footprints;

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
            <h2 className="text-xl font-bold text-charcoal">{decision.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">{decision.action}</p>
          </div>
        </div>
        <div className="shrink-0 text-xs text-gray-500 sm:max-w-[220px] sm:text-right">
          <p>{recentRuns > 0 ? `Based on ${recentRuns} recently imported run${recentRuns === 1 ? "" : "s"}${latestLabel ? ` · latest ${latestLabel}` : ""}.` : "Waiting for your first imported run."}</p>
          <p className="mt-1">Not based on sleep, soreness, illness, or injury data.</p>
        </div>
      </CardContent>
    </Card>
  );
}
