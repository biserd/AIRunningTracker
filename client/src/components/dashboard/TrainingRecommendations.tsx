import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Mountain, Clock, Target, TrendingUp, Info, Footprints, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface RecommendationData {
  title: string;
  content: string;
  confidence?: number;
}

interface TrainingRecommendationsProps {
  recommendations: RecommendationData[];
  userId?: number;
}

export default function TrainingRecommendations({ recommendations, userId }: TrainingRecommendationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: any) => {
      return apiRequest("/api/goals", "POST", goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${userId}`] });
      toast({
        title: "Goal Created!",
        description: "Your training goal has been added successfully.",
      });
      setIsModalOpen(false);
      setSelectedRecommendation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const handleActionClick = (recommendation: RecommendationData) => {
    setSelectedRecommendation(recommendation);
    setIsModalOpen(true);
  };

  const handleSetAsGoal = () => {
    if (!selectedRecommendation || !userId) return;

    const goalType = selectedRecommendation.title.toLowerCase().includes('speed') ? 'speed' :
                     selectedRecommendation.title.toLowerCase().includes('hill') ? 'hills' :
                     selectedRecommendation.title.toLowerCase().includes('long') ? 'endurance' : 'general';

    createGoalMutation.mutate({
      userId,
      title: selectedRecommendation.title,
      description: selectedRecommendation.content,
      type: goalType,
      status: 'active',
      source: 'recommendation',
    });
  };
  const getRecommendationIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('speed')) {
      return { icon: Flame, color: 'bg-strava-orange text-white' };
    }
    if (lowerTitle.includes('hill')) {
      return { icon: Mountain, color: 'bg-performance-blue text-white' };
    }
    if (lowerTitle.includes('gear') || lowerTitle.includes('shoe')) {
      return { icon: Footprints, color: 'bg-purple-600 text-white' };
    }
    return { icon: Clock, color: 'bg-achievement-green text-white' };
  };

  const getRecommendationBackground = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('speed')) {
      return 'bg-strava-orange/5';
    }
    if (lowerTitle.includes('hill')) {
      return 'bg-performance-blue/5';
    }
    if (lowerTitle.includes('gear') || lowerTitle.includes('shoe')) {
      return 'bg-purple-600/5';
    }
    return 'bg-achievement-green/5';
  };

  const isGearRecommendation = (title: string) => {
    const lowerTitle = title.toLowerCase();
    return lowerTitle.includes('gear') || lowerTitle.includes('shoe');
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

  // Show only top 3 recommendations
  const topRecommendations = recommendations.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-charcoal">Top 3 Training Recommendations</CardTitle>
          {recommendations.length > 3 && (
            <Badge variant="outline" className="text-xs">
              {recommendations.length} total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topRecommendations.map((recommendation, index) => {
            const { icon: Icon, color } = getRecommendationIcon(recommendation.title);
            const bgColor = getRecommendationBackground(recommendation.title);

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
                
                {isGearRecommendation(recommendation.title) ? (
                  <Link href="/tools/shoe-finder">
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
                      data-testid={`gear-button-${index}`}
                    >
                      <Footprints className="w-3 h-3 mr-1" />
                      Find Your Shoe
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleActionClick(recommendation)}
                    className="text-xs w-full sm:w-auto"
                    data-testid={`action-button-${index}`}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Action
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      
      {/* Recommendation Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="recommendation-modal">
          {selectedRecommendation && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const { icon: Icon, color } = getRecommendationIcon(selectedRecommendation.title);
                    return (
                      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} />
                      </div>
                    );
                  })()}
                  <div>
                    <DialogTitle className="text-xl">{selectedRecommendation.title}</DialogTitle>
                    {selectedRecommendation.confidence && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {Math.round(selectedRecommendation.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-strava-orange" />
                    <h4 className="font-semibold text-sm">Recommendation</h4>
                  </div>
                  <p className="text-sm text-gray-700 pl-6">{selectedRecommendation.content}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-performance-blue" />
                    <h4 className="font-semibold text-sm">Rationale</h4>
                  </div>
                  <p className="text-sm text-gray-700 pl-6">
                    {selectedRecommendation.title.toLowerCase().includes('speed') && 
                      "Based on your recent training patterns, incorporating speed work will improve your VO2 max and race pace. Short intervals help build cardiovascular efficiency and neuromuscular power."}
                    {selectedRecommendation.title.toLowerCase().includes('hill') && 
                      "Hill training strengthens key running muscles, improves form, and builds mental toughness. The analysis of your activity data suggests this would complement your current training well."}
                    {selectedRecommendation.title.toLowerCase().includes('long') && 
                      "Long runs build aerobic endurance and mental resilience. They're essential for improving your ability to sustain effort over distance and are a cornerstone of any training program."}
                    {isGearRecommendation(selectedRecommendation.title) && 
                      "Running shoes typically last 300-500 miles. Based on your cumulative mileage and training patterns, it may be time to evaluate your footwear. The right shoe can improve comfort, reduce injury risk, and enhance performance."}
                    {!selectedRecommendation.title.toLowerCase().includes('speed') && 
                     !selectedRecommendation.title.toLowerCase().includes('hill') && 
                     !selectedRecommendation.title.toLowerCase().includes('long') && 
                     !isGearRecommendation(selectedRecommendation.title) &&
                      "This recommendation is based on analysis of your training patterns and performance metrics. It's designed to address gaps in your current routine and optimize your progress."}
                  </p>
                </div>

                {isGearRecommendation(selectedRecommendation.title) ? (
                  <div className="bg-purple-600/10 p-4 rounded-lg border border-purple-600/20">
                    <h4 className="font-semibold text-sm mb-2">Explore Our Shoe Tools</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Find the perfect shoe for your training needs using our comprehensive shoe database and personalized recommendation tools.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/tools/shoe-finder">
                        <Button size="sm" variant="outline" className="text-xs">
                          Shoe Finder
                        </Button>
                      </Link>
                      <Link href="/tools/shoes">
                        <Button size="sm" variant="outline" className="text-xs">
                          Browse 100+ Shoes
                        </Button>
                      </Link>
                      <Link href="/tools/rotation-planner">
                        <Button size="sm" variant="outline" className="text-xs">
                          Build Rotation
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-strava-orange/10 p-4 rounded-lg border border-strava-orange/20">
                    <h4 className="font-semibold text-sm mb-2">Set as Training Goal</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Add this recommendation to your active goals. We'll track your progress and automatically mark it complete when you achieve it through your training activities.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  data-testid="modal-cancel-button"
                >
                  {isGearRecommendation(selectedRecommendation.title) ? "Close" : "Cancel"}
                </Button>
                {!isGearRecommendation(selectedRecommendation.title) && (
                  <Button
                    onClick={handleSetAsGoal}
                    disabled={createGoalMutation.isPending}
                    data-testid="modal-set-goal-button"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    {createGoalMutation.isPending ? "Creating..." : "Set as Goal"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
