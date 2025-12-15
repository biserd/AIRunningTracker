import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, AlertCircle, Sparkles, Flag, ArrowRight, Clock, Calendar, Zap } from "lucide-react";
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

function formatConsistency(label: string) {
  return label.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function CircularGauge({ grade, score }: { grade: string; score: number }) {
  const colors = gradeColors[grade] || gradeColors.C;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-gray-200"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={colors.ring}
          style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-5xl font-black ${colors.text}`} data-testid="grade-badge">
          {grade}
        </span>
      </div>
      <p className="mt-2 text-base font-bold text-gray-700" data-testid="score-display">{score}/100</p>
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
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <span className={`text-base font-bold ${color}`}>
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
            <Skeleton className="w-[140px] h-[140px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="w-48 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!verdictData) return null;

  const { grade, gradeLabel, summary, comparison, nextSteps, effortScore, consistencyLabel, evidenceBullets } = verdictData;
  const score = gradeToScore(grade, effortScore);
  const recoveryHours = getRecoveryHours(consistencyLabel);
  const trainingGuidance = getTrainingGuidance(consistencyLabel);

  return (
    <Card className="border shadow-sm overflow-hidden" data-testid="unified-coach-card">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6">
          <div className="flex items-center gap-2 text-gray-600 mb-5">
            <Award className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-800">Coach Verdict</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex flex-col sm:flex-row lg:flex-row gap-6 flex-1">
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                <CircularGauge grade={grade} score={score} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-xl mb-1" data-testid="grade-label">{gradeLabel}</p>
                <p className="text-gray-600 text-sm mb-4" data-testid="verdict-summary">{summary}</p>
                
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

            <div className="lg:w-52 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center lg:text-left">vs 42-day avg</p>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                <ComparisonStat label="Pace" value={comparison.paceVsAvg} type="pace" />
                <ComparisonStat label="Heart Rate" value={comparison.hrVsAvg} type="hr" />
                <ComparisonStat label="Effort" value={comparison.effortVsAvg} type="effort" />
                <ComparisonStat label="Distance" value={comparison.distanceVsAvg} type="distance" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-gray-800">Next 48 Hours</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/70 border border-amber-100">
                <Zap className="w-4 h-4 text-amber-600" />
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
                <ArrowRight className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Guidance</p>
                  <p className="text-xs text-gray-500">{trainingGuidance}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-800">Next Steps</span>
            </div>
            
            {nextSteps && nextSteps.length > 0 && (
              <div className="space-y-2 mb-4">
                {nextSteps.slice(0, 2).map((step, idx) => (
                  <p key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-500 font-bold">{idx + 1}.</span>
                    {step}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-100">
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
