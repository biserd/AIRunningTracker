import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, PlayCircle, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Workout {
  type: string;
  distance: number;
  pace: string;
  description: string;
}

interface TrainingWeek {
  weekNumber: number;
  totalMileage: number;
  workouts: Workout[];
}

interface TrainingPlanProps {
  userId: number;
}

export default function TrainingPlan({ userId }: TrainingPlanProps) {
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const { toast } = useToast();

  const generatePlanMutation = useMutation({
    mutationFn: (weeks: number) => 
      fetch(`/api/ml/training-plan/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks })
      }).then(res => res.json()),
    onSuccess: (data) => {
      // Handle both nested and flat response structures
      const plan = data.trainingPlan?.trainingPlan || data.trainingPlan || data;
      setTrainingPlan(Array.isArray(plan) ? plan : []);
      toast({
        title: "Training plan generated",
        description: `Your ${selectedWeeks}-week personalized plan is ready`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate training plan",
        variant: "destructive",
      });
    },
  });

  const [trainingPlan, setTrainingPlan] = useState<TrainingWeek[]>([]);

  const getWorkoutTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'easy run':
        return "bg-green-100 text-green-800 border-green-200";
      case 'tempo run':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'speed work':
      case 'interval':
        return "bg-red-100 text-red-800 border-red-200";
      case 'long run':
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleGeneratePlan = () => {
    generatePlanMutation.mutate(selectedWeeks);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
          <CalendarDays className="mr-2 h-5 w-5 text-strava-orange" />
          AI Training Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trainingPlan.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-6">Generate a personalized training plan based on your running data</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan Duration</label>
              <div className="flex justify-center space-x-2">
                {[4, 6, 8, 12].map(weeks => (
                  <Button
                    key={weeks}
                    variant={selectedWeeks === weeks ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedWeeks(weeks)}
                    className={selectedWeeks === weeks ? "bg-strava-orange hover:bg-strava-orange/90" : ""}
                  >
                    {weeks} weeks
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleGeneratePlan}
              disabled={generatePlanMutation.isPending}
              className="bg-strava-orange hover:bg-strava-orange/90 text-white"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {generatePlanMutation.isPending ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-charcoal">
                Your {trainingPlan.length}-Week Training Plan
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGeneratePlan}
                disabled={generatePlanMutation.isPending}
              >
                Regenerate
              </Button>
            </div>

            <div className="grid gap-4">
              {trainingPlan.map((week) => (
                <div key={week.weekNumber} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-charcoal">Week {week.weekNumber}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{week.totalMileage} total miles/km</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {week.workouts.map((workout, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Badge className={getWorkoutTypeColor(workout.type)}>
                          {workout.type}
                        </Badge>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-1">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-500" />
                              <span className="text-sm font-medium">{workout.distance} mi/km</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-500" />
                              <span className="text-sm font-medium">{workout.pace} pace</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{workout.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Training Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Follow the 80/20 rule: 80% easy effort, 20% hard effort</li>
                <li>• Listen to your body and take extra rest if needed</li>
                <li>• Gradually increase intensity and distance</li>
                <li>• Stay hydrated and maintain proper nutrition</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}