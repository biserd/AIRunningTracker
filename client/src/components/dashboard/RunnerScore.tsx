import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { Share2, TrendingUp, TrendingDown, Trophy, Target, Zap, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RunnerScoreData {
  totalScore: number;
  grade: string;
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

export default function RunnerScore() {
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
    return "text-red-600";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return "bg-green-100 text-green-800";
    if (grade.startsWith('B')) return "bg-blue-100 text-blue-800";
    if (grade.startsWith('C')) return "bg-yellow-100 text-yellow-800";
    if (grade.startsWith('D')) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
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
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
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
            <p className="text-sm text-red-600">{error.message || 'Error loading data'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) {
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
            <p className="text-gray-600">No score data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Runner Score
          </div>
          <div className="flex items-center gap-2">
            {/* Inline trends */}
            <div className="flex items-center gap-1 text-xs">
              {scoreData.trends.weeklyChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={scoreData.trends.weeklyChange >= 0 ? "text-green-600" : "text-red-600"}>
                {scoreData.trends.weeklyChange >= 0 ? '+' : ''}{scoreData.trends.weeklyChange}
              </span>
            </div>
            <Button onClick={handleShare} variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Score + Grade Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
              {scoreData.totalScore}
            </span>
            <div className="flex flex-col">
              <Badge className={`${getGradeColor(scoreData.grade)} text-xs`}>
                {scoreData.grade}
              </Badge>
              <span className="text-xs text-gray-500 mt-0.5">
                Top {100 - scoreData.percentile}%
              </span>
            </div>
          </div>
          {/* Badges inline */}
          {scoreData.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
              {scoreData.badges.slice(0, 2).map((badge, index) => (
                <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0">
                  {badge}
                </Badge>
              ))}
              {scoreData.badges.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{scoreData.badges.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Compact Component Quadrant */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
            <div className="flex-1">
              <Progress value={(scoreData.components.consistency / 25) * 100} className="h-1.5" />
            </div>
            <span className="text-[10px] text-gray-500 w-6">{scoreData.components.consistency}</span>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-gray-500 flex-shrink-0" />
            <div className="flex-1">
              <Progress value={(scoreData.components.performance / 25) * 100} className="h-1.5" />
            </div>
            <span className="text-[10px] text-gray-500 w-6">{scoreData.components.performance}</span>
          </div>

          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-gray-500 flex-shrink-0" />
            <div className="flex-1">
              <Progress value={(scoreData.components.volume / 25) * 100} className="h-1.5" />
            </div>
            <span className="text-[10px] text-gray-500 w-6">{scoreData.components.volume}</span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-gray-500 flex-shrink-0" />
            <div className="flex-1">
              <Progress value={(scoreData.components.improvement / 25) * 100} className="h-1.5" />
            </div>
            <span className="text-[10px] text-gray-500 w-6">{scoreData.components.improvement}</span>
          </div>
        </div>

        {/* Legend row */}
        <div className="flex justify-between text-[10px] text-gray-400 px-1">
          <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />Consistency</span>
          <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" />Performance</span>
          <span className="flex items-center gap-1"><Target className="h-2.5 w-2.5" />Volume</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />Improve</span>
        </div>
      </CardContent>
    </Card>
  );
}