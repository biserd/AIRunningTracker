import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, TrendingDown, Minus, Clock, ArrowUpRight, Sparkles, Flag, Calendar, Zap } from "lucide-react";
import { Link } from "wouter";

interface VerdictEvidence {
  type: "positive" | "neutral" | "negative";
  text: string;
}

interface CoachVerdictData {
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  summary: string;
  evidenceBullets?: VerdictEvidence[];
  effortScore: number;
  consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
  consistencyDescription?: string;
  comparison: {
    paceVsAvg: number;
    hrVsAvg: number;
    effortVsAvg: number;
    distanceVsAvg: number;
  };
  nextSteps: string[];
}

interface UnifiedCoachCardProps {
  verdictData: CoachVerdictData | null | undefined;
  isLoading?: boolean;
  formattedDistance?: string;
  distanceUnit?: string;
  formattedDuration?: string;
}

const gradeColors: Record<string, string> = {
  A: "bg-gradient-to-br from-emerald-500 to-green-600",
  B: "bg-gradient-to-br from-blue-500 to-indigo-600",
  C: "bg-gradient-to-br from-yellow-500 to-amber-600",
  D: "bg-gradient-to-br from-orange-500 to-red-500",
  F: "bg-gradient-to-br from-red-600 to-rose-700"
};

function getRecoveryHours(consistencyLabel: string): string {
  switch (consistencyLabel) {
    case 'recovery':
    case 'easier':
      return '12-24';
    case 'consistent':
      return '24-36';
    case 'harder':
      return '36-48';
    case 'much_harder':
      return '48-72';
    default:
      return '24-48';
  }
}

function getTrainingGuidance(consistencyLabel: string): string {
  switch (consistencyLabel) {
    case 'recovery':
      return 'Ready for your next workout';
    case 'easier':
      return 'Light activity is fine tomorrow';
    case 'consistent':
      return 'Normal training schedule continues';
    case 'harder':
      return 'Focus on easy runs for the next 36-48h';
    case 'much_harder':
      return 'Prioritize rest and recovery';
    default:
      return 'Listen to your body';
  }
}

export default function UnifiedCoachCard({ 
  verdictData, 
  isLoading,
  formattedDistance,
  distanceUnit,
  formattedDuration 
}: UnifiedCoachCardProps) {
  if (isLoading) {
    return (
      <Card className="border shadow-sm" data-testid="unified-coach-card-loading">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!verdictData) return null;

  const { grade, gradeLabel, summary, comparison, nextSteps, effortScore, consistencyLabel } = verdictData;
  const recoveryHours = getRecoveryHours(consistencyLabel);
  const trainingGuidance = getTrainingGuidance(consistencyLabel);

  const getStatColor = (label: string, value: number) => {
    if (label === "Pace") {
      return value < 0 ? 'text-emerald-600' : value > 0 ? 'text-red-500' : 'text-gray-600';
    }
    if (label === "Effort") {
      return value > 15 ? 'text-orange-600' : value < -15 ? 'text-blue-600' : 'text-gray-600';
    }
    if (label === "Distance") {
      return value > 0 ? 'text-blue-600' : value < 0 ? 'text-gray-500' : 'text-gray-600';
    }
    return 'text-gray-600';
  };

  const formatConsistency = (label: string) => {
    return label.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="border shadow-sm overflow-hidden" data-testid="unified-coach-card">
      <CardContent className="p-0">
        {/* Top Section: Coach Verdict Header */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-5 border-b">
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Award className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-800">Coach Verdict</span>
          </div>
          
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg ${gradeColors[grade]}`} data-testid="grade-badge">
              {grade}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg" data-testid="grade-label">{gradeLabel}</p>
              <p className="text-gray-600 text-sm mt-1" data-testid="verdict-summary">{summary}</p>
            </div>
          </div>

          {/* Distance & Time Summary */}
          {formattedDistance && formattedDuration && (
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
              <span>→</span>
              <span>{formattedDistance}{distanceUnit} in {formattedDuration}</span>
            </div>
          )}
        </div>

        {/* Comparison Stats Section */}
        <div className="p-5 border-b bg-gradient-to-b from-white to-slate-50/50">
          <p className="text-sm font-medium text-gray-500 text-center mb-4">vs last 42 days</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center gap-1 mb-1">
                {comparison.paceVsAvg < 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : comparison.paceVsAvg > 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-sm font-semibold text-gray-600">Pace</p>
              </div>
              <p className={`text-2xl font-black tracking-tight ${getStatColor('Pace', comparison.paceVsAvg)}`} data-testid="stat-pace">
                {comparison.paceVsAvg > 0 ? '+' : ''}{comparison.paceVsAvg}%
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center gap-1 mb-1">
                {comparison.hrVsAvg < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : comparison.hrVsAvg > 0 ? (
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-sm font-semibold text-gray-600">Heart Rate</p>
              </div>
              <p className={`text-2xl font-black tracking-tight ${getStatColor('HR', comparison.hrVsAvg)}`} data-testid="stat-hr">
                {comparison.hrVsAvg > 0 ? '+' : ''}{comparison.hrVsAvg}%
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center gap-1 mb-1">
                {comparison.effortVsAvg > 15 ? (
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                ) : comparison.effortVsAvg < -15 ? (
                  <TrendingDown className="w-4 h-4 text-blue-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-sm font-semibold text-gray-600">Effort</p>
              </div>
              <p className={`text-2xl font-black tracking-tight ${getStatColor('Effort', comparison.effortVsAvg)}`} data-testid="stat-effort">
                {comparison.effortVsAvg > 0 ? '+' : ''}{comparison.effortVsAvg}%
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center gap-1 mb-1">
                {comparison.distanceVsAvg > 0 ? (
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                ) : comparison.distanceVsAvg < 0 ? (
                  <TrendingDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <p className="text-sm font-semibold text-gray-600">Distance</p>
              </div>
              <p className={`text-2xl font-black tracking-tight ${getStatColor('Distance', comparison.distanceVsAvg)}`} data-testid="stat-distance">
                {comparison.distanceVsAvg > 0 ? '+' : ''}{comparison.distanceVsAvg}%
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps Section */}
        {nextSteps && nextSteps.length > 0 && (
          <div className="px-5 py-4 border-b bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Next Steps</p>
            <ul className="space-y-1">
              {nextSteps.map((step, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2" data-testid={`next-step-${index}`}>
                  <span className="text-gray-400">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Section: Two Panels */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Next 48 Hours Panel */}
          <div className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-gray-800">Next 48 Hours</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/70 border border-amber-100">
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{formatConsistency(consistencyLabel)} Effort</p>
                  <p className="text-xs text-gray-500">Effort Score: {effortScore}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/70 border border-amber-100">
                <Calendar className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Recovery Window</p>
                  <p className="text-xs text-gray-500">{recoveryHours} hours recommended</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/70 border border-amber-100">
                <Zap className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Training Guidance</p>
                  <p className="text-xs text-gray-500">{trainingGuidance}</p>
                </div>
              </div>
            </div>

            {nextSteps && nextSteps.length > 0 && (
              <div className="mt-4 pt-3 border-t border-amber-200/50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Coach Tips</p>
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-amber-500">›</span>
                  {nextSteps[0]}
                </p>
              </div>
            )}
          </div>

          {/* Goal Alignment Panel */}
          <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-800">Goal Alignment</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Training Consistency</span>
                <span className="font-bold text-blue-700">{formatConsistency(consistencyLabel)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Effort vs Average</span>
                <span className={`font-bold ${comparison.effortVsAvg > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {comparison.effortVsAvg > 0 ? '+' : ''}{comparison.effortVsAvg}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Distance vs Average</span>
                <span className={`font-bold ${comparison.distanceVsAvg > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                  {comparison.distanceVsAvg > 0 ? '+' : ''}{comparison.distanceVsAvg}%
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-blue-200/50">
              <Link href="/training-plans" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50" data-testid="button-training-plan">
                  <Flag className="h-3.5 w-3.5 mr-1.5" />
                  Training Plan
                </Button>
              </Link>
              <Link href="/coach" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50" data-testid="button-ask-coach">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Ask Coach
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
