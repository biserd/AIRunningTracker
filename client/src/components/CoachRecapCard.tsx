import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Target, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Activity,
  Sparkles
} from "lucide-react";
import type { CoachRecap } from "@shared/schema";

interface CoachRecapCardProps {
  recap: CoachRecap;
  compact?: boolean;
}

const nextStepColors: Record<string, { bg: string; text: string; icon: string }> = {
  rest: { bg: "bg-blue-500/10", text: "text-blue-600", icon: "Rest Day" },
  easy: { bg: "bg-green-500/10", text: "text-green-600", icon: "Easy Run" },
  workout: { bg: "bg-orange-500/10", text: "text-orange-600", icon: "Workout" },
  long_run: { bg: "bg-purple-500/10", text: "text-purple-600", icon: "Long Run" },
  recovery: { bg: "bg-teal-500/10", text: "text-teal-600", icon: "Recovery" },
};

const toneEmoji: Record<string, string> = {
  gentle: "🌱",
  direct: "💪",
  data_nerd: "📊",
};

export function CoachRecapCard({ recap, compact = false }: CoachRecapCardProps) {
  const nextStep = nextStepColors[recap.nextStep] || nextStepColors.easy;
  const bullets = recap.recapBullets || [];
  const hasConfidenceIssues = recap.confidenceFlags && recap.confidenceFlags.length > 0;

  if (compact) {
    return (
      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20" data-testid="coach-recap-compact">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  AI Coach Recap
                </span>
                <Badge variant="outline" className={`${nextStep.bg} ${nextStep.text} text-xs`}>
                  Next: {nextStep.icon}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {recap.coachingCue}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-t-4 border-t-amber-500 overflow-hidden" data-testid="coach-recap-full">
      <CardHeader className="pb-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Brain className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-amber-800 dark:text-amber-300">AI Coach Analysis</span>
            <span className="text-sm font-normal text-muted-foreground">
              {toneEmoji[recap.coachTone] || "💪"}
            </span>
          </CardTitle>
          {hasConfidenceIssues && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Limited Data
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Run Analysis
          </h4>
          <ul className="space-y-2">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`recap-bullet-${idx}`}>
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
            <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Target className="h-3 w-3" />
              Focus Cue
            </h4>
            <p className="text-sm text-purple-900 dark:text-purple-100 font-medium">
              {recap.coachingCue}
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${nextStep.bg.replace('/10', '/20')} border-current/20`}>
            <h4 className={`text-xs font-semibold ${nextStep.text} uppercase tracking-wide flex items-center gap-1 mb-2`}>
              <ArrowRight className="h-3 w-3" />
              Recommended Next
            </h4>
            <div className="flex items-center gap-2">
              <Badge className={`${nextStep.bg} ${nextStep.text} border-none`}>
                {nextStep.icon}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {recap.nextStepRationale}
            </p>
          </div>
        </div>

        {hasConfidenceIssues && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
            <AlertCircle className="h-3 w-3" />
            <span>Analysis based on limited data: {recap.confidenceFlags?.join(", ")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
