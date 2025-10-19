import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Heart, Target } from "lucide-react";

interface VO2MaxData {
  current: number;
  raceVO2Max: number;
  trainingVO2Max: number;
  trend: 'improving' | 'stable' | 'declining';
  ageGradePercentile: number;
  comparison: string;
  raceComparison: string;
  trainingComparison: string;
  targetRange: { min: number; max: number };
}

interface VO2MaxTrackerProps {
  userId: number;
}

export default function VO2MaxTracker({ userId }: VO2MaxTrackerProps) {
  const { data: vo2Data, isLoading } = useQuery({
    queryKey: ['/api/performance/vo2max', userId],
    queryFn: () => fetch(`/api/performance/vo2max/${userId}`).then(res => res.json()),
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return "bg-green-100 text-green-800 border-green-200";
      case 'declining':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return "text-green-600";
    if (percentile >= 60) return "text-blue-600";
    if (percentile >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            VO2 Max Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vo2Data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            VO2 Max Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Heart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Complete more training runs to calculate VO2 Max</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = Math.min(100, (vo2Data.current / 70) * 100); // Scale to 70 as max display

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Heart className="mr-2 h-5 w-5 text-red-500" />
          VO2 Max Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Race vs Training VO2 Max Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Race VO2 Max */}
            <div className="border-2 border-strava-orange bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-900">🏃‍♂️ Race VO2 Max</span>
                <Badge variant="outline" className="border-orange-400 text-orange-700 text-xs">Peak</Badge>
              </div>
              <div className="flex items-baseline space-x-1 mb-1">
                <span className="text-3xl font-bold text-orange-900">{vo2Data.raceVO2Max}</span>
                <span className="text-sm text-orange-700">ml/kg/min</span>
              </div>
              <p className="text-xs text-orange-800">{vo2Data.raceComparison}</p>
              <p className="text-xs text-orange-700 mt-2 italic">
                Your maximum aerobic capacity measured from race performances
              </p>
            </div>

            {/* Training VO2 Max */}
            <div className="border-2 border-performance-blue bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">🏃 Training VO2 Max</span>
                <Badge variant="outline" className="border-blue-400 text-blue-700 text-xs">Typical</Badge>
              </div>
              <div className="flex items-baseline space-x-1 mb-1">
                <span className="text-3xl font-bold text-blue-900">{vo2Data.trainingVO2Max}</span>
                <span className="text-sm text-blue-700">ml/kg/min</span>
              </div>
              <p className="text-xs text-blue-800">{vo2Data.trainingComparison}</p>
              <p className="text-xs text-blue-700 mt-2 italic">
                Your typical aerobic fitness from regular training runs
              </p>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-charcoal mb-2 flex items-center">
              <span className="mr-2">💡</span>
              Understanding Your VO2 Max Values
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong className="text-strava-orange">Race VO2 Max</strong> shows your peak aerobic capacity during race efforts. 
                It's calculated from your best 5K, 10K, and race performances where you pushed your hardest.
              </p>
              <p>
                <strong className="text-performance-blue">Training VO2 Max</strong> reflects your everyday training fitness. 
                It's based on regular training runs and shows your sustainable aerobic capacity.
              </p>
              <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                A gap between these values is normal - you run faster in races than in training!
              </p>
            </div>
          </div>

          {/* Age Grade Percentile */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-charcoal">Age Grade Percentile</span>
              <span className={`text-xl font-bold ${getPercentileColor(vo2Data.ageGradePercentile)}`}>
                {vo2Data.ageGradePercentile}%
              </span>
            </div>
            <Progress 
              value={vo2Data.ageGradePercentile} 
              className="h-2"
            />
            <p className="text-xs text-gray-600 mt-1">
              Compared to others in your age group
            </p>
          </div>

          {/* Target Range */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Target Range</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {vo2Data.targetRange.min} - {vo2Data.targetRange.max} ml/kg/min
              </span>
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                Improvement Goal
              </Badge>
            </div>
          </div>

          {/* VO2 Max Scale Reference */}
          <div className="space-y-3">
            <h4 className="font-medium text-charcoal">VO2 Max Scale</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Elite (60+)</span>
                <div className="flex-1 mx-3">
                  <div className="h-1 bg-green-200 rounded">
                    <div className="h-1 bg-green-500 rounded w-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Excellent (50-59)</span>
                <div className="flex-1 mx-3">
                  <div className="h-1 bg-blue-200 rounded">
                    <div className="h-1 bg-blue-500 rounded w-4/5"></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Good (40-49)</span>
                <div className="flex-1 mx-3">
                  <div className="h-1 bg-yellow-200 rounded">
                    <div className="h-1 bg-yellow-500 rounded w-3/5"></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fair (35-39)</span>
                <div className="flex-1 mx-3">
                  <div className="h-1 bg-orange-200 rounded">
                    <div className="h-1 bg-orange-500 rounded w-2/5"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Tips */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">How to Improve VO2 Max</h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Include high-intensity interval training (HIIT)</li>
              <li>• Focus on tempo runs at threshold pace</li>
              <li>• Maintain consistent aerobic base training</li>
              <li>• Allow adequate recovery between hard sessions</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}