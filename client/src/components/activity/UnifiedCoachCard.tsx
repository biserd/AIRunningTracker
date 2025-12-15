import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, AlertCircle, Sparkles, Flag, ArrowRight } from "lucide-react";
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

const gradeColors: Record<string, { ring: string; text: string; bg: string }> = {
  A: { ring: "stroke-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  B: { ring: "stroke-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  C: { ring: "stroke-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50" },
  D: { ring: "stroke-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  F: { ring: "stroke-red-500", text: "text-red-600", bg: "bg-red-50" }
};

function gradeToScore(grade: string, effortScore: number): number {
  const baseScores: Record<string, number> = { A: 90, B: 75, C: 60, D: 45, F: 25 };
  const base = baseScores[grade] || 50;
  const effortModifier = Math.min(10, Math.max(-10, (effortScore - 50) / 5));
  return Math.round(Math.min(100, Math.max(0, base + effortModifier)));
}

function CircularGauge({ grade, score }: { grade: string; score: number }) {
  const colors = gradeColors[grade] || gradeColors.C;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={colors.ring}
          style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-4xl font-black ${colors.text}`} data-testid="grade-badge">
          {grade}
        </span>
      </div>
      <p className="mt-1 text-sm font-bold text-gray-600" data-testid="score-display">{score}/100</p>
    </div>
  );
}

function EvidenceIcon({ type }: { type: "positive" | "neutral" | "negative" }) {
  if (type === "positive") return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (type === "negative") return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  return <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
}

function ComparisonStat({ 
  label, 
  value, 
  type 
}: { 
  label: string; 
  value: number; 
  type: "pace" | "hr" | "effort" | "distance" 
}) {
  const isPositive = type === "pace" ? value < 0 : type === "hr" ? value < 0 : value > 0;
  const isNegative = type === "pace" ? value > 0 : type === "hr" ? value > 0 : value < 0;
  
  const color = isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-gray-600";
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const iconColor = isPositive ? "text-emerald-500" : isNegative ? "text-red-400" : "text-gray-400";

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <span className={`text-sm font-bold ${color}`}>
        {value > 0 ? "+" : ""}{value}%
      </span>
    </div>
  );
}

export default function UnifiedCoachCard({ 
  verdictData, 
  isLoading 
}: UnifiedCoachCardProps) {
  if (isLoading) {
    return (
      <Card className="border shadow-sm" data-testid="unified-coach-card-loading">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="w-[100px] h-[100px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="w-40 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!verdictData) return null;

  const { grade, gradeLabel, summary, comparison, nextSteps, effortScore, evidenceBullets } = verdictData;
  const score = gradeToScore(grade, effortScore);

  return (
    <Card className="border shadow-sm overflow-hidden" data-testid="unified-coach-card">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Award className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-800">Coach Verdict</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex flex-col sm:flex-row lg:flex-row gap-6 flex-1">
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                <CircularGauge grade={grade} score={score} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg" data-testid="grade-label">{gradeLabel}</p>
                <p className="text-gray-600 text-sm mt-1 mb-3" data-testid="verdict-summary">{summary}</p>
                
                {evidenceBullets && evidenceBullets.length > 0 && (
                  <div className="space-y-2" data-testid="evidence-bullets">
                    {evidenceBullets.slice(0, 3).map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <EvidenceIcon type={bullet.type} />
                        <span className="text-sm text-gray-700">{bullet.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:w-48 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center lg:text-left">vs 42-day avg</p>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                <ComparisonStat label="Pace" value={comparison.paceVsAvg} type="pace" />
                <ComparisonStat label="Heart Rate" value={comparison.hrVsAvg} type="hr" />
                <ComparisonStat label="Effort" value={comparison.effortVsAvg} type="effort" />
                <ComparisonStat label="Distance" value={comparison.distanceVsAvg} type="distance" />
              </div>
            </div>
          </div>
        </div>

        {nextSteps && nextSteps.length > 0 && (
          <div className="p-4 border-t bg-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Steps</p>
                <p className="text-sm text-gray-700 flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  {nextSteps[0]}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Link href="/training-plans">
                  <Button variant="outline" size="sm" className="text-xs font-semibold" data-testid="button-training-plan">
                    <Flag className="h-3.5 w-3.5 mr-1.5" />
                    Plan
                  </Button>
                </Link>
                <Link href="/coach">
                  <Button variant="outline" size="sm" className="text-xs font-semibold" data-testid="button-ask-coach">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Coach
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
