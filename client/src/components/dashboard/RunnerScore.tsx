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

  const { data: scoreData, isLoading } = useQuery<RunnerScoreData>({
    queryKey: ["/api/runner-score", user?.id],
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

  if (!scoreData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Runner Score
          </div>
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center space-y-2">
          <div className={`text-6xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
            {scoreData.totalScore}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge className={getGradeColor(scoreData.grade)}>
              Grade {scoreData.grade}
            </Badge>
            <span className="text-sm text-gray-600">
              {scoreData.percentile}th percentile
            </span>
          </div>
        </div>

        {/* Score Components */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Consistency
            </div>
            <Progress value={(scoreData.components.consistency / 25) * 100} className="h-2" />
            <span className="text-xs text-gray-600">{scoreData.components.consistency}/25</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              Performance
            </div>
            <Progress value={(scoreData.components.performance / 25) * 100} className="h-2" />
            <span className="text-xs text-gray-600">{scoreData.components.performance}/25</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Volume
            </div>
            <Progress value={(scoreData.components.volume / 25) * 100} className="h-2" />
            <span className="text-xs text-gray-600">{scoreData.components.volume}/25</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Improvement
            </div>
            <Progress value={(scoreData.components.improvement / 25) * 100} className="h-2" />
            <span className="text-xs text-gray-600">{scoreData.components.improvement}/25</span>
          </div>
        </div>

        {/* Trends */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              {scoreData.trends.weeklyChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {scoreData.trends.weeklyChange >= 0 ? '+' : ''}{scoreData.trends.weeklyChange}
              </span>
            </div>
            <span className="text-xs text-gray-600">This Week</span>
          </div>

          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              {scoreData.trends.monthlyChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {scoreData.trends.monthlyChange >= 0 ? '+' : ''}{scoreData.trends.monthlyChange}
              </span>
            </div>
            <span className="text-xs text-gray-600">This Month</span>
          </div>
        </div>

        {/* Badges */}
        {scoreData.badges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Achievement Badges</h4>
            <div className="flex flex-wrap gap-2">
              {scoreData.badges.map((badge, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}