import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Share2, TrendingUp, TrendingDown, Trophy, Target, Zap, Calendar, Activity, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
  userName: string;
}

export default function RunnerScorePage() {
  const { userId } = useParams();
  const { toast } = useToast();

  const { data: scoreData, isLoading, error } = useQuery<RunnerScoreData>({
    queryKey: ["/api/runner-score/public", userId],
    enabled: !!userId,
  });

  const handleShare = async () => {
    if (!scoreData) return;

    const shareUrl = `${window.location.origin}/runner-score/${userId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${scoreData.userName}'s Runner Score`,
          text: scoreData.shareableMessage,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(`${scoreData.shareableMessage} ${shareUrl}`);
        toast({
          title: "Copied to clipboard!",
          description: "Share this runner score on social media",
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Score Not Found</h2>
            <p className="text-gray-600 mb-6">This runner score is not available or has been set to private.</p>
            <Link href="/">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Go to RunAnalytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="animate-pulse space-y-6">
              <div className="text-center space-y-4">
                <div className="h-20 w-20 bg-gray-200 rounded-full mx-auto"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scoreData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                  <Activity className="text-white" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
              </div>
            </Link>
            <Button onClick={handleShare} className="bg-strava-orange hover:bg-strava-orange/90">
              <Share2 className="h-4 w-4 mr-2" />
              Share Score
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <Card className="shadow-xl">
          <CardContent className="p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <Trophy className="h-12 w-12 text-strava-orange mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-charcoal">{scoreData.userName}'s Runner Score</h1>
              <p className="text-gray-600">Performance rating based on training consistency, improvement, and achievements</p>
            </div>

            {/* Main Score Display */}
            <div className="text-center space-y-4">
              <div className={`text-8xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
                {scoreData.totalScore}
              </div>
              <div className="flex items-center justify-center gap-3">
                <Badge className={`text-lg px-4 py-2 ${getGradeColor(scoreData.grade)}`}>
                  Grade {scoreData.grade}
                </Badge>
                <span className="text-lg text-gray-600">
                  {scoreData.percentile}th percentile
                </span>
              </div>
            </div>

            {/* Score Components */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Consistency
                </div>
                <Progress value={(scoreData.components.consistency / 25) * 100} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{scoreData.components.consistency}/25</span>
                  <span className="font-medium">{Math.round((scoreData.components.consistency / 25) * 100)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  Performance
                </div>
                <Progress value={(scoreData.components.performance / 25) * 100} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{scoreData.components.performance}/25</span>
                  <span className="font-medium">{Math.round((scoreData.components.performance / 25) * 100)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-green-600" />
                  Volume
                </div>
                <Progress value={(scoreData.components.volume / 25) * 100} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{scoreData.components.volume}/25</span>
                  <span className="font-medium">{Math.round((scoreData.components.volume / 25) * 100)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  Improvement
                </div>
                <Progress value={(scoreData.components.improvement / 25) * 100} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{scoreData.components.improvement}/25</span>
                  <span className="font-medium">{Math.round((scoreData.components.improvement / 25) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center mb-1">
                  {scoreData.trends.weeklyChange >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-lg font-medium">
                    {scoreData.trends.weeklyChange >= 0 ? '+' : ''}{scoreData.trends.weeklyChange}
                  </span>
                </div>
                <span className="text-sm text-gray-600">Weekly Change</span>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-1 justify-center mb-1">
                  {scoreData.trends.monthlyChange >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-lg font-medium">
                    {scoreData.trends.monthlyChange >= 0 ? '+' : ''}{scoreData.trends.monthlyChange}
                  </span>
                </div>
                <span className="text-sm text-gray-600">Monthly Change</span>
              </div>
            </div>

            {/* Badges */}
            {scoreData.badges.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-center">Achievement Badges</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {scoreData.badges.map((badge, index) => (
                    <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold">Track Your Running Progress</h3>
              <p className="text-gray-600">Get your own Runner Score with AI-powered insights and training analytics</p>
              <Link href="/">
                <Button size="lg" className="bg-strava-orange hover:bg-strava-orange/90">
                  Start Free with RunAnalytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}