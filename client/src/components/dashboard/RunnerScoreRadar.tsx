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
          <span className="text-xs font-medium text-gray-700 w-8 text-right">{score.value}</span>
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

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg";
    if (grade.startsWith('B')) return "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg";
    if (grade.startsWith('C')) return "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg";
    if (grade.startsWith('D')) return "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg";
    return "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg";
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Runner Score
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Score row */}
        <div className="flex items-center gap-3">
          <span className={`text-4xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
            {scoreData.totalScore}
          </span>
          <Badge className={`text-sm px-2.5 py-0.5 font-semibold ${getGradeColor(scoreData.grade)}`}>
            {scoreData.grade}
          </Badge>
          <span className="text-xs text-gray-500">Top {100 - scoreData.percentile}%</span>
          {/* Inline badges */}
          <div className="flex gap-1 ml-auto">
            {scoreData.badges.slice(0, 2).map((badge, index) => (
              <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Component bars */}
        <ComponentBars data={scoreData.components} />
      </CardContent>
    </Card>
  );
}