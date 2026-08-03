import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VO2MaxData {
  current: number;
  raceVO2Max: number;
  trainingVO2Max: number;
  trend: 'improving' | 'stable' | 'declining';
  comparison: string;
  raceComparison: string;
  trainingComparison: string;
}

interface VO2MaxTrackerProps {
  userId: number;
  batchData?: any;
}

export default function VO2MaxTracker({ userId, batchData }: VO2MaxTrackerProps) {
  const { data: vo2DataResponse, isLoading } = useQuery({
    queryKey: ['/api/performance/vo2max', userId],
    queryFn: () => apiRequest(`/api/performance/vo2max/${userId}`),
    enabled: batchData === undefined ? false : !batchData,
  });
  
  const vo2Data = batchData?.vo2Max ?? vo2DataResponse;

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            Estimated VO₂ Max
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
            Estimated VO₂ Max
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Heart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Not enough comparable efforts yet</p>
            <p className="mt-1 text-sm">We’ll estimate this after more suitable runs. This is a pace-based estimate, not a laboratory measurement.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Heart className="mr-2 h-5 w-5 text-red-500" />
          Estimated VO₂ Max
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
                Estimated from your faster eligible efforts
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
                Estimated from your regular eligible training runs
              </p>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-charcoal mb-2 flex items-center">
              <span className="mr-2">💡</span>
              Understanding these estimates
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong className="text-strava-orange">Race estimate</strong> uses your faster eligible efforts. It may move when a more representative effort is imported.
              </p>
              <p>
                <strong className="text-performance-blue">Training estimate</strong> uses regular training runs and is usually lower than the race estimate.
              </p>
              <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                These values are model estimates from pace and duration. Weather, terrain, stops, and effort can affect them.
              </p>
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
