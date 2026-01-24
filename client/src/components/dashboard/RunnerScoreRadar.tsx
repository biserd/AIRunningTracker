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
    { label: 'Con', value: (data.consistency / 25) * 100, color: '#3B82F6' },
    { label: 'Perf', value: (data.performance / 25) * 100, color: '#EAB308' },
    { label: 'Vol', value: (data.volume / 25) * 100, color: '#10B981' },
    { label: 'Imp', value: (data.improvement / 25) * 100, color: '#8B5CF6' },
  ];

  const size = 120;
  const center = size / 2;
  const maxRadius = 45;
  
  const points = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    const radius = (score.value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      labelX: center + (maxRadius + 12) * Math.cos(angle),
      labelY: center + (maxRadius + 12) * Math.sin(angle),
      ...score
    };
  });

  const axisPoints = scores.map((_, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    return {
      x: center + maxRadius * Math.cos(angle),
      y: center + maxRadius * Math.sin(angle),
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={maxRadius * 0.5} fill="none" stroke="#E5E7EB" strokeWidth="1" />
      <circle cx={center} cy={center} r={maxRadius} fill="none" stroke="#E5E7EB" strokeWidth="1" />
      
      {axisPoints.map((point, index) => (
        <line key={index} x1={center} y1={center} x2={point.x} y2={point.y} stroke="#E5E7EB" strokeWidth="1" />
      ))}
      
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      
      {points.map((point, index) => (
        <g key={index}>
          <circle cx={point.x} cy={point.y} r="3" fill={point.color} stroke="white" strokeWidth="1.5" />
          <text x={point.labelX} y={point.labelY} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-gray-500 font-medium">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Runner Score
          </div>
          <Button onClick={handleShare} variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
            <Share2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center">
          {/* Left: Score */}
          <div className="flex flex-col items-center pr-4">
            <span className={`text-4xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
              {scoreData.totalScore}
            </span>
            <Badge className={`mt-1 text-xs px-2 py-0.5 font-semibold ${getGradeColor(scoreData.grade)}`}>
              {scoreData.grade}
            </Badge>
            <span className="text-[10px] text-gray-500 mt-0.5">Top {100 - scoreData.percentile}%</span>
          </div>
          
          {/* Center: Radar Chart */}
          <div className="flex-1 flex justify-center">
            <RadarChart data={scoreData.components} />
          </div>
          
          {/* Right: Badges */}
          {scoreData.badges.length > 0 && (
            <div className="flex flex-col gap-1 pl-2">
              {scoreData.badges.slice(0, 3).map((badge, index) => (
                <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}