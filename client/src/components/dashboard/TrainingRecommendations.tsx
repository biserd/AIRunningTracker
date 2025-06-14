import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Mountain, Clock } from "lucide-react";

interface RecommendationData {
  title: string;
  content: string;
}

interface TrainingRecommendationsProps {
  recommendations: RecommendationData[];
}

export default function TrainingRecommendations({ recommendations }: TrainingRecommendationsProps) {
  const getRecommendationIcon = (title: string) => {
    if (title.toLowerCase().includes('speed')) {
      return { icon: Flame, color: 'bg-strava-orange text-white' };
    }
    if (title.toLowerCase().includes('hill')) {
      return { icon: Mountain, color: 'bg-performance-blue text-white' };
    }
    return { icon: Clock, color: 'bg-achievement-green text-white' };
  };

  const getRecommendationBackground = (title: string) => {
    if (title.toLowerCase().includes('speed')) {
      return 'bg-strava-orange/5';
    }
    if (title.toLowerCase().includes('hill')) {
      return 'bg-performance-blue/5';
    }
    return 'bg-achievement-green/5';
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal">Training Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
            <p className="text-gray-500 text-sm">Generate AI insights to see training recommendations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal">Training Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => {
            const { icon: Icon, color } = getRecommendationIcon(recommendation.title);
            const bgColor = getRecommendationBackground(recommendation.title);
            
            return (
              <div key={index} className={`flex items-start space-x-3 p-3 ${bgColor} rounded-lg`}>
                <div className={`w-6 h-6 ${color} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon size={12} />
                </div>
                <div>
                  <h4 className="font-medium text-charcoal">{recommendation.title}</h4>
                  <p className="text-sm text-gray-600">{recommendation.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
