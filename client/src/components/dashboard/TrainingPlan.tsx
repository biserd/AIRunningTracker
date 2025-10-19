import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarDays, PlayCircle, Clock, MapPin, Target } from "lucide-react";
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

interface TrainingPlanParams {
  weeks: number;
  goal: string;
  daysPerWeek: number;
  targetDistance?: number;
  raceDate?: string;
  fitnessLevel: string;
}

export default function TrainingPlan({ userId }: TrainingPlanProps) {
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [trainingPlan, setTrainingPlan] = useState<TrainingWeek[]>([]);
  
  // Training plan configuration state
  const [goal, setGoal] = useState("general");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [targetDistance, setTargetDistance] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("intermediate");

  // Get user's unit preference
  const { data: userData } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => 
      fetch(`/api/user`)
        .then(res => res.json()),
    enabled: !!userId,
  });
  
  const distanceUnit = userData?.unitPreference === 'miles' ? 'mi' : 'km';

  // Load existing training plan
  const { data: savedPlan } = useQuery({
    queryKey: ['training-plan', userId],
    queryFn: () => 
      fetch(`/api/ml/training-plan/${userId}`)
        .then(res => res.json()),
    enabled: !!userId,
  });

  // Update local state when saved plan is loaded
  useEffect(() => {
    if (savedPlan?.trainingPlan) {
      // Handle nested structure: savedPlan.trainingPlan.trainingPlan
      const plan = savedPlan.trainingPlan.trainingPlan || savedPlan.trainingPlan;
      setTrainingPlan(Array.isArray(plan) ? plan : []);
    }
  }, [savedPlan]);

  const generatePlanMutation = useMutation({
    mutationFn: async (params: TrainingPlanParams) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for GPT-5 Mini
      
      try {
        const response = await fetch(`/api/ml/training-plan/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - GPT-5 is taking too long. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Invalidate the query cache to force a refetch
      await queryClient.invalidateQueries({ queryKey: ['training-plan', userId] });
      
      // Handle both nested and flat response structures
      const plan = data.trainingPlan?.trainingPlan || data.trainingPlan || data;
      setTrainingPlan(Array.isArray(plan) ? plan : []);
      setDialogOpen(false);
      toast({
        title: "Training plan generated",
        description: `Your ${selectedWeeks}-week personalized training plan is ready`,
      });
    },
    onError: async (error: any) => {
      setDialogOpen(false);
      
      // Even if there's a timeout error, the plan might have been generated
      // Try to refetch the plan in case it was created in the background
      await queryClient.invalidateQueries({ queryKey: ['training-plan', userId] });
      
      toast({
        title: "Generation may have timed out",
        description: "The plan might still be ready. Refreshing...",
        variant: "destructive",
      });
    },
  });

  const getWorkoutTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'easy run':
        return "bg-green-100 text-green-800 border-green-200";
      case 'tempo run':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'speed work':
        return "bg-red-100 text-red-800 border-red-200";
      case 'long run':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'interval':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'recovery':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleGeneratePlan = () => {
    const params: TrainingPlanParams = {
      weeks: selectedWeeks,
      goal,
      daysPerWeek,
      targetDistance: targetDistance ? parseFloat(targetDistance) : undefined,
      raceDate: raceDate || undefined,
      fitnessLevel,
    };
    generatePlanMutation.mutate(params);
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-strava-orange" />
              Configure Your Training Plan
            </DialogTitle>
            <DialogDescription>
              Tell us about your training goals to get a personalized plan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Training Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger id="goal" data-testid="select-goal">
                  <SelectValue placeholder="Select your goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5k">5K Race</SelectItem>
                  <SelectItem value="10k">10K Race</SelectItem>
                  <SelectItem value="half-marathon">Half Marathon</SelectItem>
                  <SelectItem value="marathon">Marathon</SelectItem>
                  <SelectItem value="general">General Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weeks">Plan Duration</Label>
              <div className="grid grid-cols-4 gap-2">
                {[4, 6, 8, 12].map(weeks => (
                  <Button
                    key={weeks}
                    variant={selectedWeeks === weeks ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedWeeks(weeks)}
                    className={selectedWeeks === weeks ? "bg-strava-orange hover:bg-strava-orange/90" : ""}
                    data-testid={`button-weeks-${weeks}`}
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Training Days per Week</Label>
              <Select value={daysPerWeek.toString()} onValueChange={(v) => setDaysPerWeek(parseInt(v))}>
                <SelectTrigger id="days" data-testid="select-days">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="4">4 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="6">6 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fitness">Current Fitness Level</Label>
              <Select value={fitnessLevel} onValueChange={setFitnessLevel}>
                <SelectTrigger id="fitness" data-testid="select-fitness">
                  <SelectValue placeholder="Select fitness level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Target Weekly Distance (optional)</Label>
              <Input 
                id="distance"
                type="number" 
                placeholder="e.g., 30 miles or km"
                value={targetDistance}
                onChange={(e) => setTargetDistance(e.target.value)}
                data-testid="input-target-distance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="raceDate">Race Date (optional)</Label>
              <Input 
                id="raceDate"
                type="date" 
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                data-testid="input-race-date"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGeneratePlan}
              disabled={generatePlanMutation.isPending}
              className="bg-strava-orange hover:bg-strava-orange/90"
              data-testid="button-submit-plan"
            >
              {generatePlanMutation.isPending ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    data-testid={`button-duration-${weeks}`}
                  >
                    {weeks} weeks
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleOpenDialog}
              disabled={generatePlanMutation.isPending}
              className="bg-strava-orange hover:bg-strava-orange/90 text-white"
              data-testid="button-generate-plan"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Generate Plan
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
                onClick={handleOpenDialog}
                disabled={generatePlanMutation.isPending}
                data-testid="button-regenerate-plan"
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
                      <span>{week.totalMileage} total {distanceUnit}</span>
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
                              <span className="text-sm font-medium">{workout.distance} {distanceUnit}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-500" />
                              <span className="text-sm font-medium">{workout.pace} min/{distanceUnit}</span>
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
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}