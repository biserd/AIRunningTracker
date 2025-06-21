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
  // Convert scores to percentages (0-100)
  const scores = [
    { label: 'Consistency', value: (data.consistency / 25) * 100, color: '#3B82F6' },
    { label: 'Performance', value: (data.performance / 25) * 100, color: '#EAB308' },
    { label: 'Volume', value: (data.volume / 25) * 100, color: '#10B981' },
    { label: 'Improvement', value: (data.improvement / 25) * 100, color: '#8B5CF6' },
  ];

  const size = 400;
  const center = size / 2;
  const maxRadius = 150;
  
  // Calculate points for the radar chart
  const points = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2; // Start from top
    const radius = (score.value / 100) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, ...score };
  });

  // Generate grid circles
  const gridLevels = [20, 40, 60, 80, 100];
  
  // Generate axis lines and labels
  const axisPoints = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    const x = center + maxRadius * Math.cos(angle);
    const y = center + maxRadius * Math.sin(angle);
    const labelX = center + (maxRadius + 35) * Math.cos(angle);
    const labelY = center + (maxRadius + 35) * Math.sin(angle);
    return { x, y, labelX, labelY, label: score.label };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
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
        
        {/* Axis lines */}
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
        
        {/* Data area */}
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        
        {/* Data points */}
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
        
        {/* Labels with background */}
        {axisPoints.map((point, index) => (
          <g key={index}>
            {/* White background for label */}
            <rect
              x={point.labelX - 30}
              y={point.labelY - 8}
              width="60"
              height="16"
              fill="white"
              stroke="#E5E7EB"
              strokeWidth="1"
              rx="8"
            />
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-semibold fill-gray-800"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      
      {/* Score legend */}
      <div className="grid grid-cols-2 gap-4 mt-4 w-full">
        {scores.map((score, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: score.color }}
            />
            <span className="text-sm text-gray-600">{score.label}</span>
            <span className="text-sm font-medium ml-auto">{score.value.toFixed(0)}%</span>
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
    if (grade.startsWith('A')) return "bg-green-100 text-green-800";
    if (grade.startsWith('B')) return "bg-blue-100 text-blue-800";
    if (grade.startsWith('C')) return "bg-yellow-100 text-yellow-800";
    if (grade.startsWith('D')) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
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
          <div className={`text-5xl font-bold ${getScoreColor(scoreData.totalScore)}`}>
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

        {/* Radar Chart */}
        <RadarChart data={scoreData.components} />

        {/* Badges */}
        {scoreData.badges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Achievement Badges</h4>
            <div className="flex flex-wrap gap-2">
              {scoreData.badges.slice(0, 3).map((badge, index) => (
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