import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowRight, Trophy, Info, Calculator, Activity as ActivityIcon, Target, TrendingUp, Zap } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  RacePredictionInput, 
  RacePredictionResult, 
  formatTime, 
  formatPace, 
  paceKmToMile 
} from "@shared/racePrediction";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const manualInputSchema = z.object({
  baseDistance: z.coerce.number().min(1000, "Minimum 1000m").max(50000, "Maximum 50km"),
  baseTime: z.coerce.number().min(180, "Minimum 3 minutes").max(18000, "Maximum 5 hours"),
  targetDistance: z.coerce.number().min(5000, "Invalid target distance"),
  weeklyMileage: z.coerce.number().min(10, "Minimum 10 km/week").max(200, "Maximum 200 km/week"),
  trainingConsistency: z.coerce.number().min(0, "Minimum 0").max(1, "Maximum 1"),
  courseAdjustment: z.coerce.number().min(-600, "Too negative").max(600, "Too positive"),
  weatherAdjustment: z.coerce.number().min(-600, "Too negative").max(600, "Too positive"),
});

type ManualInputFormData = z.infer<typeof manualInputSchema>;

const RACE_DISTANCES = [
  { label: "5K", value: 5000 },
  { label: "10K", value: 10000 },
  { label: "Half Marathon", value: 21097 },
  { label: "Marathon", value: 42195 },
];

export default function RacePredictor() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<RacePredictionResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [selectedPaceTier, setSelectedPaceTier] = useState<number>(2);

  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['/api/race-predictor/suitable-activities'],
    enabled: isAuthenticated && activeTab === "strava",
  });

  const form = useForm<ManualInputFormData>({
    resolver: zodResolver(manualInputSchema),
    defaultValues: {
      baseDistance: 10000,
      baseTime: 2700,
      targetDistance: 42195,
      weeklyMileage: 50,
      trainingConsistency: 0.7,
      courseAdjustment: 0,
      weatherAdjustment: 0,
    }
  });

  const calculateMutation = useMutation({
    mutationFn: async (input: RacePredictionInput) => {
      return apiRequest('/api/race-predictor/calculate', 'POST', input);
    },
    onSuccess: (data) => {
      setResult(data as RacePredictionResult);
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate race prediction",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ManualInputFormData) => {
    const input: RacePredictionInput = {
      baseEffort: {
        distance: data.baseDistance,
        time: data.baseTime,
      },
      targetDistance: data.targetDistance,
      weeklyMileage: data.weeklyMileage,
      trainingConsistency: data.trainingConsistency,
      courseAdjustment: data.courseAdjustment,
      weatherAdjustment: data.weatherAdjustment,
    };
    calculateMutation.mutate(input);
  };

  const handleActivitySelect = async (activityId: number) => {
    try {
      setSelectedActivityId(activityId);
      const activity = (activitiesData as any).activities.find((a: any) => a.id === activityId);
      
      if (!activity) return;

      const input: RacePredictionInput = {
        baseEffort: {
          distance: activity.distance,
          time: activity.movingTime,
          activityName: activity.name,
          date: activity.startDate,
        },
        targetDistance: form.getValues("targetDistance"),
        weeklyMileage: form.getValues("weeklyMileage"),
        trainingConsistency: form.getValues("trainingConsistency"),
        courseAdjustment: form.getValues("courseAdjustment"),
        weatherAdjustment: form.getValues("weatherAdjustment"),
      };

      calculateMutation.mutate(input);
    } catch (error) {
      console.error("Error selecting activity:", error);
    }
  };

  const getConfidenceChartData = () => {
    if (!result) return [];
    
    const targetDistanceKm = form.getValues("targetDistance") / 1000;
    const splits = Math.ceil(targetDistanceKm);
    const data = [];
    
    for (let i = 0; i <= splits; i++) {
      const distanceKm = (targetDistanceKm / splits) * i;
      const timePredicted = result.predictedPace * distanceKm;
      const timeLower = (result.confidenceLower / targetDistanceKm) * distanceKm;
      const timeUpper = (result.confidenceUpper / targetDistanceKm) * distanceKm;
      
      data.push({
        distance: distanceKm.toFixed(1),
        predicted: timePredicted / 60,
        lower: timeLower / 60,
        upper: timeUpper / 60,
      });
    }
    
    return data;
  };

  const getDistanceLabel = (meters: number): string => {
    const distance = RACE_DISTANCES.find(d => d.value === meters);
    return distance ? distance.label : `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <>
      <Helmet>
        <title>Race Time Predictor - Free Running Calculator | RunAnalytics</title>
        <meta name="description" content="Free race time prediction calculator using Riegel formula. Predict marathon, half marathon, 10K, and 5K finish times based on recent race efforts. Import from Strava or enter manually." />
        <meta property="og:title" content="Race Time Predictor - Calculate Your Goal Pace | RunAnalytics" />
        <meta property="og:description" content="Science-based race time predictions with personalized Riegel exponent, confidence bands, and pace tables. Free tool for all runners." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-light-grey">
        {isAuthenticated ? (
          <AppHeader />
        ) : (
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/tools">
                    <Button variant="ghost" size="sm" data-testid="button-back-tools">
                      <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                      All Tools
                    </Button>
                  </Link>
                  <div className="hidden sm:flex items-center space-x-3">
                    <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                      <Trophy className="text-white" size={20} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-charcoal">Race Time Predictor</h1>
                      <p className="text-sm text-gray-600">Science-based performance forecasting</p>
                    </div>
                  </div>
                </div>
                <Link href="/auth">
                  <Button className="bg-strava-orange text-white hover:bg-strava-orange/90" size="sm" data-testid="button-sign-in">
                    Sign In for Strava Import
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Alert className="mb-8 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700 ml-2">
              <strong>Race Prediction</strong> uses the Riegel formula with personalized adjustments based on your training volume, 
              consistency, and race-specific factors. Predictions include confidence bands to account for variability in performance.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-strava-orange" />
                <span>Predict Your Race Time</span>
              </CardTitle>
              <CardDescription>
                {isAuthenticated 
                  ? "Import a recent race effort from Strava or enter your base performance manually"
                  : "Enter your base performance and target race distance to get predictions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="manual" data-testid="tab-manual">
                    <Calculator className="h-4 w-4 mr-2" />
                    Manual Input
                  </TabsTrigger>
                  {isAuthenticated && (
                    <TabsTrigger value="strava" data-testid="tab-strava">
                      <ActivityIcon className="h-4 w-4 mr-2" />
                      From Strava
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="manual">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="border-b pb-6">
                        <h3 className="text-sm font-semibold text-charcoal mb-4">Base Race Effort</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="baseDistance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Distance (meters)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field}
                                    data-testid="input-base-distance"
                                  />
                                </FormControl>
                                <FormDescription>Your recent race distance</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="baseTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time (seconds)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    {...field}
                                    data-testid="input-base-time"
                                  />
                                </FormControl>
                                <FormDescription>Your finish time in seconds</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="border-b pb-6">
                        <h3 className="text-sm font-semibold text-charcoal mb-4">Target Race</h3>
                        <FormField
                          control={form.control}
                          name="targetDistance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Distance</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-target-distance">
                                    <SelectValue placeholder="Select race distance" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {RACE_DISTANCES.map((dist) => (
                                    <SelectItem key={dist.value} value={dist.value.toString()}>
                                      {dist.label} ({(dist.value / 1000).toFixed(1)}km)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-b pb-6">
                        <h3 className="text-sm font-semibold text-charcoal mb-4">Training Context</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="weeklyMileage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weekly Mileage (km)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    {...field}
                                    data-testid="input-weekly-mileage"
                                  />
                                </FormControl>
                                <FormDescription>Average km per week</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="trainingConsistency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Training Consistency: {field.value.toFixed(2)}</FormLabel>
                                <FormControl>
                                  <div className="pt-2">
                                    <Slider
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      value={[field.value]}
                                      onValueChange={(vals) => field.onChange(vals[0])}
                                      data-testid="slider-consistency"
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription>0 = inconsistent, 1 = very consistent</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="border-b pb-6">
                        <h3 className="text-sm font-semibold text-charcoal mb-4">Race Day Adjustments</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="courseAdjustment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Course Adjustment (seconds)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    {...field}
                                    data-testid="input-course-adjustment"
                                  />
                                </FormControl>
                                <FormDescription>Add time for hills/elevation</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="weatherAdjustment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weather Adjustment (seconds)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    {...field}
                                    data-testid="input-weather-adjustment"
                                  />
                                </FormControl>
                                <FormDescription>Add time for heat/wind</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-strava-orange text-white hover:bg-strava-orange/90"
                        disabled={calculateMutation.isPending}
                        data-testid="button-calculate"
                      >
                        {calculateMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          'Calculate Race Prediction'
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {isAuthenticated && (
                  <TabsContent value="strava">
                    {isLoadingActivities ? (
                      <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-strava-orange" />
                        <p className="text-gray-600">Loading your race activities...</p>
                      </div>
                    ) : activitiesData && (activitiesData as any).activities && (activitiesData as any).activities.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Select a recent race or hard effort to use as your base prediction:
                        </p>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {(activitiesData as any).activities.map((activity: any) => (
                            <button
                              key={activity.id}
                              onClick={() => handleActivitySelect(activity.id)}
                              className={`w-full text-left p-4 rounded-lg border transition-all ${
                                selectedActivityId === activity.id
                                  ? 'border-strava-orange bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              data-testid={`button-activity-${activity.id}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-charcoal">{activity.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {new Date(activity.startDate).toLocaleDateString()}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="text-gray-500">Distance:</span>{' '}
                                  <span className="font-medium">{(activity.distance / 1000).toFixed(1)} km</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Time:</span>{' '}
                                  <span className="font-medium">{formatTime(activity.movingTime)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Pace:</span>{' '}
                                  <span className="font-medium">{formatPace(activity.movingTime / (activity.distance / 1000))}/km</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="border-t pt-6">
                          <h3 className="text-sm font-semibold text-charcoal mb-4">Adjust Settings</h3>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Target Distance</Label>
                              <Select 
                                onValueChange={(value) => form.setValue("targetDistance", parseInt(value))}
                                value={form.getValues("targetDistance").toString()}
                              >
                                <SelectTrigger data-testid="select-strava-target-distance">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {RACE_DISTANCES.map((dist) => (
                                    <SelectItem key={dist.value} value={dist.value.toString()}>
                                      {dist.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Weekly Mileage (km)</Label>
                              <Input 
                                type="number"
                                value={form.watch("weeklyMileage")}
                                onChange={(e) => form.setValue("weeklyMileage", parseInt(e.target.value) || 50)}
                                data-testid="input-strava-weekly-mileage"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <ActivityIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">No Suitable Activities Found</p>
                        <p className="text-sm">
                          We look for race-pace efforts (5K-Marathon distance). 
                          Try syncing your Strava data or use manual input.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>

              {result && (
                <div className="mt-8 border-t pt-8">
                  <h3 className="text-lg font-semibold text-charcoal mb-6">Your Race Prediction</h3>
                  
                  <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-600 mb-1">Predicted Time</div>
                        <div className="text-3xl font-bold text-charcoal" data-testid="text-predicted-time">
                          {formatTime(result.predictedTime)}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          {formatPace(result.predictedPace)}/km pace
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-600 mb-1">Confidence Range (80%)</div>
                        <div className="text-lg font-bold text-charcoal" data-testid="text-confidence-range">
                          {formatTime(result.confidenceLower)} - {formatTime(result.confidenceUpper)}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          ±{Math.round((result.confidenceUpper - result.confidenceLower) / 2 / 60)} minutes
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-strava-orange text-white">
                            Riegel k = {result.riegelExponent.toFixed(3)}
                          </Badge>
                          <Badge variant="outline">
                            TCI = {result.trainingConsistencyIndex.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Adjustments: {result.adjustments.total >= 0 ? '+' : ''}{result.adjustments.total}s
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Course: {result.adjustments.course}s, Weather: {result.adjustments.weather}s
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-base">Confidence Band Visualization</CardTitle>
                      <CardDescription>Predicted time range throughout the race</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={getConfidenceChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="distance" 
                            label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            label={{ value: 'Time (minutes)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value: number) => `${value.toFixed(1)} min`}
                            labelFormatter={(label) => `${label} km`}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="upper" 
                            stackId="1"
                            stroke="#93c5fd" 
                            fill="#dbeafe" 
                            name="Upper Bound"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="predicted" 
                            stackId="2"
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            name="Predicted"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="lower" 
                            stackId="3"
                            stroke="#93c5fd" 
                            fill="#dbeafe" 
                            name="Lower Bound"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center space-x-2">
                        <Target className="h-4 w-4" />
                        <span>Pace Strategy Ladder</span>
                      </CardTitle>
                      <CardDescription>Different pacing scenarios for your target race</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-pace-ladder">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Strategy</th>
                              <th className="text-left py-2 px-4">Pace/km</th>
                              <th className="text-left py-2 px-4">Pace/mi</th>
                              <th className="text-left py-2 px-4">Finish Time</th>
                              <th className="text-center py-2 px-4">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.paceTable.map((tier, idx) => (
                              <tr 
                                key={idx} 
                                className={`border-b hover:bg-gray-50 ${idx === 2 ? 'bg-blue-50 font-semibold' : ''}`}
                                data-testid={`row-pace-tier-${idx}`}
                              >
                                <td className="py-3 px-4">
                                  {tier.label}
                                  {idx === 2 && <Badge className="ml-2 bg-blue-500">Goal</Badge>}
                                </td>
                                <td className="py-3 px-4">{formatPace(tier.pace)}/km</td>
                                <td className="py-3 px-4">{formatPace(paceKmToMile(tier.pace))}/mi</td>
                                <td className="py-3 px-4">{formatTime(tier.finishTime)}</td>
                                <td className="py-3 px-4 text-center">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedPaceTier(idx)}
                                    data-testid={`button-view-splits-${idx}`}
                                  >
                                    View Splits
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {result.paceTable[selectedPaceTier] && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>Split Times - {result.paceTable[selectedPaceTier].label}</span>
                        </CardTitle>
                        <CardDescription>
                          Projected split times at {formatPace(result.paceTable[selectedPaceTier].pace)}/km pace
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" data-testid="grid-split-times">
                          {result.paceTable[selectedPaceTier].splitTimes.map((split, idx) => (
                            <div 
                              key={idx} 
                              className="border rounded-lg p-3 hover:bg-gray-50"
                              data-testid={`split-${idx}`}
                            >
                              <div className="text-xs text-gray-500 mb-1">
                                {split.distance >= 1000 
                                  ? `${(split.distance / 1000).toFixed(1)}K`
                                  : `${split.distance}m`}
                              </div>
                              <div className="text-lg font-semibold text-charcoal">
                                {formatTime(split.time)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
    </>
  );
}
