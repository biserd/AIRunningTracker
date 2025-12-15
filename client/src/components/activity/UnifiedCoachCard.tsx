import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, AlertCircle, Sparkles, Flag, ArrowRight, Clock, Calendar, Zap, Activity, Heart, Gauge, Route } from "lucide-react";
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
  onAskCoach?: () => void;
}

const gradeConfig: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  A: { gradient: "from-emerald-500 to-green-600", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  B: { gradient: "from-blue-500 to-indigo-600", text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  C: { gradient: "from-amber-500 to-yellow-600", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  D: { gradient: "from-orange-500 to-red-500", text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  F: { gradient: "from-red-500 to-rose-600", text: "text-red-600", bg: "bg-red-50", border: "border-red-200" }
};

function gradeToScore(grade: string, effortScore: number): number {
  const baseScores: Record<string, number> = { A: 92, B: 78, C: 65, D: 50, F: 30 };
  const base = baseScores[grade] || 50;
  const effortModifier = Math.min(8, Math.max(-8, (effortScore - 50) / 6));
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

function GradeGauge({ grade, score }: { grade: string; score: number }) {
  const config = gradeConfig[grade] || gradeConfig.C;
  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const strokeColors: Record<string, string> = {
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444"
  };

  return (
    <div className="relative inline-flex flex-col items-center justify-center" data-testid="grade-gauge">
      <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
        <circle
          cx="80"
          cy="80"
          r="58"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
        />
        <circle
          cx="80"
          cy="80"
          r="58"
          fill="none"
          stroke={strokeColors[grade] || strokeColors.C}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-6xl font-black ${config.text}`} data-testid="grade-badge">
          {grade}
        </span>
        <span className="text-lg font-bold text-gray-500 -mt-1" data-testid="score-display">
          {score}/100
        </span>
      </div>
    </div>
  );
}

function EvidenceBullet({ evidence }: { evidence: VerdictEvidence }) {
  const Icon = evidence.type === "positive" ? CheckCircle2 : evidence.type === "negative" ? XCircle : AlertCircle;
  const iconColor = evidence.type === "positive" ? "text-emerald-500" : evidence.type === "negative" ? "text-red-500" : "text-amber-500";
  const bgColor = evidence.type === "positive" ? "bg-emerald-50" : evidence.type === "negative" ? "bg-red-50" : "bg-amber-50";

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${bgColor}`}>
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <span className="text-sm text-gray-700 leading-relaxed">{evidence.text}</span>
    </div>
  );
}

function ComparisonMetric({ 
  icon: Icon,
  label, 
  value, 
  type 
}: { 
  icon: any;
  label: string; 
  value: number; 
  type: "pace" | "hr" | "effort" | "distance" 
}) {
  const isPositive = type === "pace" ? value < 0 : type === "hr" ? value < 0 : value > 0;
  const isNegative = type === "pace" ? value > 0 : type === "hr" ? value > 0 : value < 0;
  
  const bgColor = isPositive ? "bg-emerald-50" : isNegative ? "bg-red-50" : "bg-gray-50";
  const textColor = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-gray-600";
  const iconColor = isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-gray-400";
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${bgColor} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg bg-white/70`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendIcon className={`w-4 h-4 ${iconColor}`} />
        <span className={`text-base font-bold ${textColor}`}>
          {value > 0 ? "+" : ""}{value}%
        </span>
      </div>
    </div>
  );
}

export default function UnifiedCoachCard({ 
  verdictData, 
  isLoading,
  onAskCoach 
}: UnifiedCoachCardProps) {
  if (isLoading) {
    return (
      <Card className="border shadow-lg overflow-hidden" data-testid="unified-coach-card-loading">
        <CardContent className="p-0">
          <div className="p-6 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex flex-col lg:flex-row gap-8">
              <Skeleton className="w-[160px] h-[160px] rounded-full mx-auto lg:mx-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="w-full lg:w-64 space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
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
  const config = gradeConfig[grade] || gradeConfig.C;

  return (
    <Card className="border shadow-lg overflow-hidden" data-testid="unified-coach-card">
      <CardContent className="p-0">
        {/* Header */}
        <div className={`px-6 py-4 bg-gradient-to-r ${config.bg} border-b ${config.border}`}>
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${config.text}`} />
            <span className={`font-bold ${config.text}`}>Coach Verdict</span>
          </div>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="p-6 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column - Grade Gauge */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center">
              <GradeGauge grade={grade} score={score} />
              <p className={`mt-3 text-lg font-bold ${config.text} text-center`} data-testid="grade-label">
                {gradeLabel}
              </p>
            </div>

            {/* Center Column - Summary & Evidence */}
            <div className="lg:col-span-5 flex flex-col">
              <p className="text-gray-600 text-base leading-relaxed mb-4" data-testid="verdict-summary">
                {summary}
              </p>
              
              {evidenceBullets && evidenceBullets.length > 0 && (
                <div className="space-y-2.5 flex-1" data-testid="evidence-bullets">
                  {evidenceBullets.slice(0, 3).map((bullet, idx) => (
                    <EvidenceBullet key={idx} evidence={bullet} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Comparison Stats */}
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                vs 42-Day Average
              </p>
              <div className="space-y-2.5">
                <ComparisonMetric icon={Gauge} label="Pace" value={comparison.paceVsAvg} type="pace" />
                <ComparisonMetric icon={Heart} label="Heart Rate" value={comparison.hrVsAvg} type="hr" />
                <ComparisonMetric icon={Activity} label="Effort" value={comparison.effortVsAvg} type="effort" />
                <ComparisonMetric icon={Route} label="Distance" value={comparison.distanceVsAvg} type="distance" />
              </div>
            </div>
          </div>
        </div>

        {/* Next 48 Hours Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-gray-800">Next 48 Hours</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-amber-100 shadow-sm">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{formatConsistency(consistencyLabel)} Effort</p>
                  <p className="text-sm text-gray-500">Effort Score: {effortScore}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-amber-100 shadow-sm">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Recovery Window</p>
                  <p className="text-sm text-gray-500">{recoveryHours} hours recommended</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-amber-100 shadow-sm">
                <div className="p-2 rounded-lg bg-amber-100">
                  <ArrowRight className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Guidance</p>
                  <p className="text-sm text-gray-500">{trainingGuidance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps & Actions */}
          <div className="px-5 pb-5 pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-amber-100 shadow-sm">
              <div className="flex-1">
                {nextSteps && nextSteps.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{nextSteps[0]}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/training-plans">
                  <Button variant="outline" size="sm" className="text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50" data-testid="button-training-plan">
                    <Flag className="h-3.5 w-3.5 mr-1.5" />
                    Training Plan
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
                  data-testid="button-ask-coach"
                  onClick={onAskCoach}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Ask Coach
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
