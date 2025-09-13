import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Mountain, Clock, Play, MapPin, Target, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecommendationData {
  title: string;
  content: string;
  confidence?: number;
}

interface TrainingRecommendationsProps {
  recommendations: RecommendationData[];
}

export default function TrainingRecommendations({ recommendations }: TrainingRecommendationsProps) {
  const { toast } = useToast();

  // Action handlers for different recommendation types
  const handleAction = (type: string, action: string) => {
    switch (`${type}-${action}`) {
      case 'speed-start':
        toast({
          title: "Speed Session Started!",
          description: "Your interval training session is now active. Focus on maintaining form!",
        });
        break;
      case 'speed-workouts':
        toast({
          title: "Speed Workouts",
          description: "Opening speed training library...",
        });
        break;
      case 'speed-goal':
        toast({
          title: "Speed Goal Set",
          description: "New speed improvement goal added to your training plan.",
        });
        break;
      case 'hill-nearby':
        toast({
          title: "Finding Hills",
          description: "Searching for hill training routes in your area...",
        });
        break;
      case 'hill-start':
        toast({
          title: "Hill Session Started!",
          description: "Time to conquer those hills! Focus on steady effort.",
        });
        break;
      case 'hill-workouts':
        toast({
          title: "Hill Workouts",
          description: "Opening hill training library...",
        });
        break;
      case 'longrun-plan':
        toast({
          title: "Planning Long Run",
          description: "Creating your optimal long run route and pacing strategy...",
        });
        break;
      case 'longrun-start':
        toast({
          title: "Long Run Started!",
          description: "Enjoy your long run! Remember to pace yourself.",
        });
        break;
      case 'longrun-routes':
        toast({
          title: "Long Run Routes",
          description: "Showing scenic long run routes in your area...",
        });
        break;
      default:
        toast({
          title: "Action Triggered",
          description: "This feature will be available soon!",
        });
    }
  };

  const getRecommendationActions = (title: string) => {
    if (title.toLowerCase().includes('speed')) {
      return [
        { label: "Start Session", action: "start", icon: Play, variant: "default" as const },
        { label: "View Workouts", action: "workouts", icon: ExternalLink, variant: "outline" as const },
        { label: "Set Goal", action: "goal", icon: Target, variant: "outline" as const }
      ];
    }
    if (title.toLowerCase().includes('hill')) {
      return [
        { label: "Find Hills", action: "nearby", icon: MapPin, variant: "default" as const },
        { label: "Start Session", action: "start", icon: Play, variant: "outline" as const },
        { label: "View Workouts", action: "workouts", icon: ExternalLink, variant: "outline" as const }
      ];
    }
    if (title.toLowerCase().includes('long')) {
      return [
        { label: "Plan Route", action: "plan", icon: MapPin, variant: "default" as const },
        { label: "Start Run", action: "start", icon: Play, variant: "outline" as const },
        { label: "View Routes", action: "routes", icon: ExternalLink, variant: "outline" as const }
      ];
    }
    return [
      { label: "Take Action", action: "default", icon: Play, variant: "default" as const }
    ];
  };
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
            
            const actions = getRecommendationActions(recommendation.title);
            const recommendationType = recommendation.title.toLowerCase().includes('speed') ? 'speed' :
                                     recommendation.title.toLowerCase().includes('hill') ? 'hill' :
                                     recommendation.title.toLowerCase().includes('long') ? 'longrun' : 'default';

            return (
              <div key={index} className={`p-4 ${bgColor} rounded-lg border border-gray-200 hover:border-gray-300 transition-colors`} data-testid={`recommendation-${index}`}>
                <div className="flex items-start space-x-3 mb-3">
                  <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-charcoal">{recommendation.title}</h4>
                      {recommendation.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(recommendation.confidence * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{recommendation.content}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      size="sm"
                      variant={action.variant}
                      onClick={() => handleAction(recommendationType, action.action)}
                      className="text-xs"
                      data-testid={`action-${recommendationType}-${action.action}`}
                    >
                      <action.icon className="w-3 h-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
