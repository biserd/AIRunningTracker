import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, TrendingDown, Minus, Lock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

interface VerdictEvidence {
  type: "positive" | "neutral" | "negative";
  text: string;
}

interface CoachVerdictData {
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  summary: string;
  evidenceBullets: VerdictEvidence[];
  effortScore: number;
  consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
  consistencyDescription: string;
  comparison: {
    paceVsAvg: number;
    hrVsAvg: number;
    effortVsAvg: number;
    distanceVsAvg: number;
  };
  nextSteps: string[];
}

interface CoachVerdictProps {
  activityId: number;
  compact?: boolean;
}

const gradeColors: Record<string, string> = {
  A: "bg-gradient-to-br from-emerald-500 to-green-600 text-white",
  B: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
  C: "bg-gradient-to-br from-yellow-500 to-amber-600 text-white",
  D: "bg-gradient-to-br from-orange-500 to-red-500 text-white",
  F: "bg-gradient-to-br from-red-600 to-rose-700 text-white"
};

const gradeBorderColors: Record<string, string> = {
  A: "border-emerald-200",
  B: "border-blue-200",
  C: "border-yellow-200",
  D: "border-orange-200",
  F: "border-red-200"
};

export default function CoachVerdict({ activityId, compact = false }: CoachVerdictProps) {
  const { data, isLoading, error } = useQuery<CoachVerdictData>({
    queryKey: ['/api/activities', activityId, 'verdict'],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/verdict`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fetch verdict');
      }
      return res.json();
    },
    retry: false
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed" data-testid="card-coach-verdict-loading">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message;
    const requiresPro = errorMessage.includes('Pro subscription');
    
    if (requiresPro) {
      return (
        <Card className="border-2 border-dashed border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50" data-testid="card-coach-verdict-locked">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                <Lock className="w-8 h-8 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-900">Coach Verdict</p>
                <p className="text-sm text-orange-700">Unlock AI-powered run analysis with Pro</p>
                <Link href="/pricing">
                  <span className="text-sm font-medium text-orange-600 hover:text-orange-800 inline-flex items-center gap-1 mt-1 cursor-pointer" data-testid="link-upgrade-pro">
                    Upgrade now <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return null;
  }

  if (!data) return null;

  const getEvidenceIcon = (type: string) => {
    if (type === "positive") return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (type === "negative") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3" data-testid="coach-verdict-compact">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${gradeColors[data.grade]}`}>
          {data.grade}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{data.gradeLabel}</p>
          <p className="text-xs text-gray-500">Effort Score: {data.effortScore}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-2 ${gradeBorderColors[data.grade]} overflow-hidden`} data-testid="card-coach-verdict">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="w-5 h-5 text-orange-500" />
          Coach Verdict
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg ${gradeColors[data.grade]}`} data-testid="text-grade">
            {data.grade}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900" data-testid="text-grade-label">{data.gradeLabel}</p>
            <p className="text-sm text-gray-600 mt-1" data-testid="text-verdict-summary">{data.summary}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {data.evidenceBullets.map((bullet, index) => (
            <div key={index} className="flex items-start gap-2 text-sm" data-testid={`evidence-bullet-${index}`}>
              {getEvidenceIcon(bullet.type)}
              <span className={bullet.type === "positive" ? "text-emerald-700" : bullet.type === "negative" ? "text-red-700" : "text-gray-600"}>
                {bullet.text}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
          <ComparisonStat label="Pace" value={data.comparison.paceVsAvg} />
          <ComparisonStat label="Heart Rate" value={data.comparison.hrVsAvg} />
          <ComparisonStat label="Effort" value={data.comparison.effortVsAvg} />
          <ComparisonStat label="Distance" value={data.comparison.distanceVsAvg} />
        </div>

        {data.nextSteps.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Next Steps</p>
            {data.nextSteps.map((step, index) => (
              <p key={index} className="text-sm text-gray-600" data-testid={`next-step-${index}`}>
                • {step}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonStat({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-medium ${
        isPositive ? 'text-emerald-600' : 
        isNegative ? 'text-red-600' : 
        'text-gray-600'
      }`} data-testid={`stat-${label.toLowerCase().replace(' ', '-')}`}>
        {isPositive && '+'}{value}%
      </p>
    </div>
  );
}