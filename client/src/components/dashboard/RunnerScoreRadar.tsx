import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Share2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RunnerScoreData {
  totalScore: number;
  grade: string;
  sampleSize: number;
  recentRunCount: number;
  isProvisional: boolean;
  percentile: number;
  components: {
    consistency: number;
    performance: number;
    volume: number;
    improvement: number;
  };
  trends: {
    weeklyChange: number;
    monthlyChange: number;
  };
  badges: string[];
  shareableMessage: string;
}

const ComponentBars = ({ data }: { data: RunnerScoreData['components'] }) => {
  const scores = [
    { label: 'Consistency', value: data.consistency, max: 25, color: 'bg-blue-500' },
    { label: 'Performance', value: data.performance, max: 25, color: 'bg-yellow-500' },
    { label: 'Volume', value: data.volume, max: 25, color: 'bg-green-500' },
    { label: 'Improvement', value: data.improvement, max: 25, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-2">
      {scores.map((score, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-20 truncate">{score.label}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${score.color} rounded-full transition-all`}
              style={{ width: `${(score.value / score.max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-medium text-gray-700">{score.value}/25</span>
        </div>
      ))}
    </div>
  );
};

export default function RunnerScoreRadar() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: scoreData, isLoading, error } = useQuery<RunnerScoreData>({
    queryKey: [`/api/runner-score/${user?.id}`],
    enabled: !!user?.id,
  });

  const handleShare = async () => {
    if (!scoreData || !user?.id) return;

    const shareUrl = `${window.location.origin}/runner-score/${user.id}`;
    const shareText = `${scoreData.shareableMessage} ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Runner Score",
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Share your runner score on social media",
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Share failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-amber-700";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Runner Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !scoreData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Runner Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600">Unable to load runner score</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scoreStatus = scoreData.totalScore >= 80
    ? "Strong training base"
    : scoreData.totalScore >= 65
      ? "Building momentum"
      : "Building consistency";
  const componentEntries = Object.entries(scoreData.components) as Array<[keyof RunnerScoreData["components"], number]>;
  const [weakestComponent] = componentEntries.reduce((weakest, current) => current[1] < weakest[1] ? current : weakest);
  const guidance: Record<keyof RunnerScoreData["components"], string> = {
    consistency: "Your clearest opportunity is repeating manageable weeks rather than chasing one big session.",
    performance: "Your recent pace and efficiency are the main area holding this score back; compare like-for-like runs before changing training.",
    volume: "Your recent weekly volume is the main limiter. Build gradually and keep recovery days easy.",
    improvement: "Recent improvement is the main limiter. Stable training can be useful even when pace is not rising yet.",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Runner Score
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {scoreData.isProvisional ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4" data-testid="runner-score-provisional">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">Building your score</p>
                <p className="mt-1 text-sm text-gray-600">
                  {scoreData.recentRunCount === 0
                    ? "No runs recorded in the last 30 days."
                    : `${scoreData.recentRunCount} of 3 recent runs recorded.`}
                </p>
              </div>
              <Badge variant="outline" className="border-blue-200 bg-white text-blue-700">Provisional</Badge>
            </div>
            <p className="mt-3 text-xs text-gray-500">The score and letter grade appear after three runs in 30 days so a single effort does not define your training.</p>
          </div>
        ) : (
          <>
        {/* Score row */}
        <div className="flex items-center gap-3">
          <span className={`text-4xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
            {scoreData.totalScore}
          </span>
          <span className="text-sm font-medium text-gray-500">/100</span>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
            {scoreStatus}
          </Badge>
          <span className="text-xs text-gray-500 ml-auto">Based on your last 30 days</span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3" data-testid="runner-score-explanation">
          <p className="text-sm font-medium text-charcoal">
            {scoreData.trends.monthlyChange > 0
              ? `Up ${scoreData.trends.monthlyChange} points from the previous period.`
              : scoreData.trends.monthlyChange < 0
                ? `Down ${Math.abs(scoreData.trends.monthlyChange)} points from the previous period.`
                : "Stable versus the previous period."}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-600">{guidance[weakestComponent]}</p>
        </div>
        
        {/* Component bars */}
        <ComponentBars data={scoreData.components} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
