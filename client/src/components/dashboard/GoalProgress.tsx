import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, CheckCircle2, Trash2, Flame, Mountain, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Goal } from "@shared/schema";

interface GoalProgressProps {
  userId: number;
  unitPreference?: string;
}

export default function GoalProgress({ userId, unitPreference = 'metric' }: GoalProgressProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: goalsData, isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals", userId],
    enabled: !!userId,
  });

  const completeGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      return apiRequest(`/api/goals/${goalId}/complete`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", userId] });
      toast({
        title: "Goal Completed!",
        description: "Congratulations on achieving your training goal!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete goal",
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      return apiRequest(`/api/goals/${goalId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", userId] });
      toast({
        title: "Goal Deleted",
        description: "Goal has been removed from your list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
    },
  });

  const handleCompleteGoal = (goalId: number) => {
    completeGoalMutation.mutate(goalId);
  };

  const handleDeleteGoal = (goalId: number) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  const getGoalIcon = (type: string) => {
    if (type === 'speed') return { icon: Flame, color: 'bg-strava-orange text-white' };
    if (type === 'hills') return { icon: Mountain, color: 'bg-green-600 text-white' };
    if (type === 'endurance') return { icon: Clock, color: 'bg-blue-600 text-white' };
    return { icon: Target, color: 'bg-purple-600 text-white' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Target className="mr-2 h-5 w-5 text-strava-orange" />
            My Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600">Loading your goals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeGoals = goalsData?.filter(g => g.status === 'active') || [];
  const completedGoals = goalsData?.filter(g => g.status === 'completed') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Target className="mr-2 h-5 w-5 text-strava-orange" />
          My Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <div className="text-center py-6">
            <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">No goals yet</p>
            <p className="text-sm text-gray-500">
              Click "Action" on training recommendations to set goals
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Active ({activeGoals.length})
                </h4>
                {activeGoals.map((goal) => {
                  const { icon: Icon, color } = getGoalIcon(goal.type);
                  return (
                    <div 
                      key={goal.id} 
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      data-testid={`goal-${goal.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h5 className="font-semibold text-charcoal text-sm">
                              {goal.title}
                            </h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                              data-testid={`delete-goal-${goal.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">{goal.description}</p>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`complete-${goal.id}`}
                              checked={false}
                              onCheckedChange={() => handleCompleteGoal(goal.id)}
                              disabled={completeGoalMutation.isPending}
                              data-testid={`complete-checkbox-${goal.id}`}
                            />
                            <label
                              htmlFor={`complete-${goal.id}`}
                              className="text-xs text-gray-600 cursor-pointer"
                            >
                              Mark as complete
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Completed ({completedGoals.length})
                </h4>
                {completedGoals.map((goal) => {
                  const { icon: Icon, color } = getGoalIcon(goal.type);
                  return (
                    <div 
                      key={goal.id} 
                      className="p-4 bg-green-50 rounded-lg border border-green-200"
                      data-testid={`completed-goal-${goal.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0 mt-1 opacity-75`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h5 className="font-semibold text-charcoal text-sm line-through opacity-75">
                              {goal.title}
                            </h5>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                data-testid={`delete-completed-goal-${goal.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 opacity-75">{goal.description}</p>
                          {goal.completedAt && (
                            <p className="text-xs text-green-600 mt-2">
                              Completed on {new Date(goal.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
