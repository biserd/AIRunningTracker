import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Target, Clock, Trophy } from "lucide-react";

interface GoalProgressProps {
  userId: number;
  unitPreference?: string;
}

export default function GoalProgress({ userId, unitPreference = 'metric' }: GoalProgressProps) {
  const { data: goalsData } = useQuery({
    queryKey: ['goals-progress', userId],
    queryFn: () => 
      fetch(`/api/goals/progress/${userId}`)
        .then(res => res.json()),
    enabled: !!userId,
  });

  if (!goalsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Target className="mr-2 h-5 w-5 text-strava-orange" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600">Loading your goal progress...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const goals = goalsData.goals || [];

  const getGoalIcon = (type: string) => {
    if (type.includes('distance') || type.includes('monthly')) return Target;
    if (type.includes('time') || type.includes('pace') || type.includes('5K') || type.includes('10K')) return Clock;
    return Trophy;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'from-green-500 to-green-600';
    if (progress >= 70) return 'from-strava-orange to-yellow-500';
    if (progress >= 50) return 'from-blue-500 to-blue-600';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <Target className="mr-2 h-5 w-5 text-strava-orange" />
          Goal Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-6">
            <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">No active goals yet</p>
            <p className="text-sm text-gray-500">Goals will be automatically created based on your running patterns</p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal: any, index: number) => {
              const IconComponent = getGoalIcon(goal.title);
              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-4 w-4 text-strava-orange" />
                      <span className="text-sm font-medium text-gray-700">{goal.title}</span>
                    </div>
                    <span className="text-sm font-bold text-charcoal">
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`bg-gradient-to-r ${getProgressColor(goal.progress)} h-3 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${goal.progress >= 100 ? 'text-green-600' : goal.progress >= 70 ? 'text-strava-orange' : 'text-gray-600'}`}>
                      {goal.status}
                    </span>
                    <span className="text-gray-500">{goal.timeLeft}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
