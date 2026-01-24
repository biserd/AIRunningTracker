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

const RadarChart = ({ data }: { data: RunnerScoreData['components'] }) => {
  const scores = [
    { label: 'Consistency', value: (data.consistency / 25) * 100, color: '#3B82F6' },
    { label: 'Performance', value: (data.performance / 25) * 100, color: '#EAB308' },
    { label: 'Volume', value: (data.volume / 25) * 100, color: '#10B981' },
    { label: 'Improvement', value: (data.improvement / 25) * 100, color: '#8B5CF6' },
  ];

  const size = 160;
  const center = size / 2;
  const maxRadius = 60;
  
  const points = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    const radius = (score.value / 100) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, ...score };
  });

  const gridLevels = [50, 100];
  
  const axisPoints = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    const x = center + maxRadius * Math.cos(angle);
    const y = center + maxRadius * Math.sin(angle);
    return { x, y };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * maxRadius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}
        
        {axisPoints.map((point, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}
        
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={point.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
      
      {/* Legend row below chart */}
      <div className="flex justify-center gap-3 mt-2">
        {scores.map((score, index) => (
          <div key={index} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: score.color }}
            />
            <span className="text-[10px] text-gray-500">{score.label.slice(0, 3)}</span>
          </div>
        ))}
      </div>
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Runner Score
          </div>
          <Button onClick={handleShare} variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-gray-700">
            <Share2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          {/* Left: Score display */}
          <div className="flex flex-col items-center">
            <span className={`text-5xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
              {scoreData.totalScore}
            </span>
            <Badge className={`mt-1 text-sm px-3 py-1 font-bold ${getGradeColor(scoreData.grade)}`}>
              Grade {scoreData.grade}
            </Badge>
            <span className="text-xs text-gray-500 mt-1">
              Top {100 - scoreData.percentile}%
            </span>
          </div>
          
          {/* Right: Radar Chart */}
          <div className="flex-1 flex justify-center">
            <RadarChart data={scoreData.components} />
          </div>
        </div>
        
        {/* Badges row at bottom */}
        {scoreData.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
            {scoreData.badges.slice(0, 4).map((badge, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}