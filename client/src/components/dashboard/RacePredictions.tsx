import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Clock } from "lucide-react";

interface RacePrediction {
  distance: string;
  predictedTime: string;
  confidence: number;
  recommendation: string;
}

interface RacePredictionsProps {
  userId: number;
  batchData?: any;
}

export default function RacePredictions({ userId, batchData }: RacePredictionsProps) {
  const { data: predictionsData, isLoading } = useQuery({
    queryKey: ['/api/ml/predictions', userId],
    queryFn: () => fetch(`/api/ml/predictions/${userId}`).then(res => res.json()),
    enabled: batchData === undefined ? false : !batchData,
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return "High";
    if (confidence >= 60) return "Medium";
    return "Low";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-strava-orange" />
            Race Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const predictions = batchData?.predictions ?? predictionsData?.predictions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-strava-orange" />
          Race Predictions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map((prediction: RacePrediction, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Target className="h-4 w-4 text-performance-blue" />
                  <h4 className="font-semibold text-charcoal">{prediction.distance}</h4>
                </div>
                <Badge className={getConfidenceColor(prediction.confidence)}>
                  {getConfidenceText(prediction.confidence)} Confidence
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-2xl font-bold text-charcoal">{prediction.predictedTime}</span>
              </div>
              
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <strong>Recommendation:</strong> {prediction.recommendation}
              </p>
            </div>
          ))}
          
          {predictions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>Complete more training runs to generate race predictions</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}