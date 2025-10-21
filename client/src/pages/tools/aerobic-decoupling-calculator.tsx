import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { ArrowRight, TrendingDown, Info, Calculator, Activity as ActivityIcon } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Validation schema for manual input
const manualInputSchema = z.object({
  duration: z.coerce.number().min(30, "Run must be at least 30 minutes").max(600, "Run duration too long"),
  firstHalfPace: z.string().min(1, "Required").regex(/^\d+:\d{2}$/, "Format: MM:SS per mile/km"),
  secondHalfPace: z.string().min(1, "Required").regex(/^\d+:\d{2}$/, "Format: MM:SS per mile/km"),
  firstHalfHR: z.coerce.number().min(80, "Heart rate too low").max(220, "Heart rate too high"),
  secondHalfHR: z.coerce.number().min(80, "Heart rate too low").max(220, "Heart rate too high"),
  unit: z.enum(["mile", "km"])
});

type ManualInputFormData = z.infer<typeof manualInputSchema>;

interface DecouplingResult {
  decouplingPercent: number;
  interpretation: string;
  badge: string;
  color: string;
  firstHalfPaHR: number;
  secondHalfPaHR: number;
}

export default function AerobicDecouplingCalculator() {
  const { isAuthenticated, user } = useAuth();
  const [result, setResult] = useState<DecouplingResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>(isAuthenticated ? "strava" : "manual");

  const form = useForm<ManualInputFormData>({
    resolver: zodResolver(manualInputSchema),
    defaultValues: {
      duration: 60,
      firstHalfPace: "9:00",
      secondHalfPace: "9:15",
      firstHalfHR: 145,
      secondHalfHR: 150,
      unit: "mile"
    }
  });

  // Convert pace string (MM:SS) to speed in m/s
  const paceToSpeed = (paceStr: string, unit: "mile" | "km"): number => {
    const [minutes, seconds] = paceStr.split(":").map(Number);
    const totalSeconds = minutes * 60 + seconds;
    const distanceMeters = unit === "mile" ? 1609.34 : 1000;
    return distanceMeters / totalSeconds;
  };

  // Calculate aerobic decoupling
  const calculateDecoupling = (data: ManualInputFormData): DecouplingResult => {
    // Convert pace to speed
    const speed1 = paceToSpeed(data.firstHalfPace, data.unit);
    const speed2 = paceToSpeed(data.secondHalfPace, data.unit);

    // Calculate Pa:HR (pace-to-heart-rate ratio)
    const paHR1 = speed1 / data.firstHalfHR;
    const paHR2 = speed2 / data.secondHalfHR;

    // Calculate decoupling percentage
    const decouplingPercent = ((paHR2 / paHR1) - 1) * 100;

    // Interpret results
    let interpretation = "";
    let badge = "";
    let color = "";

    if (decouplingPercent <= -8) {
      badge = "Significant Fade";
      interpretation = "Your aerobic system showed significant fatigue in the second half. This suggests you may need to build more aerobic base or reduce your initial pace.";
      color = "bg-red-500";
    } else if (decouplingPercent <= -5) {
      badge = "Moderate Fade";
      interpretation = "Some aerobic fade detected. Consider slightly reducing your pace or building more aerobic endurance through longer, easier runs.";
      color = "bg-orange-500";
    } else if (decouplingPercent <= -3) {
      badge = "Mild Fade";
      interpretation = "Slight aerobic fade within normal range. Your pacing was generally good, with room for minor improvements.";
      color = "bg-yellow-500";
    } else if (decouplingPercent <= 3) {
      badge = "Excellent";
      interpretation = "Outstanding aerobic efficiency! Your pace and heart rate remained well-coupled throughout the run. Your aerobic base is strong.";
      color = "bg-green-500";
    } else {
      badge = "Improved";
      interpretation = "Interesting - you actually improved in the second half! This could indicate a conservative start or excellent negative-split pacing.";
      color = "bg-blue-500";
    }

    return {
      decouplingPercent,
      interpretation,
      badge,
      color,
      firstHalfPaHR: paHR1,
      secondHalfPaHR: paHR2
    };
  };

  const onSubmit = (data: ManualInputFormData) => {
    const calculatedResult = calculateDecoupling(data);
    setResult(calculatedResult);
  };

  return (
    <>
      <Helmet>
        <title>Aerobic Decoupling Calculator - Free Running Tool | RunAnalytics</title>
        <meta name="description" content="Free aerobic decoupling calculator for runners. Measure late-run aerobic fade by analyzing pace-to-heart-rate drift on long runs. Works with manual input or Strava data." />
        <meta property="og:title" content="Aerobic Decoupling Calculator | RunAnalytics" />
        <meta property="og:description" content="Quantify aerobic efficiency on your long runs. Free tool for all runners." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitracker.run/tools/aerobic-decoupling-calculator" />
      </Helmet>

      <div className="min-h-screen bg-light-grey">
        {/* Header */}
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
                    <TrendingDown className="text-white" size={20} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-charcoal">Aerobic Decoupling Calculator</h1>
                    <p className="text-sm text-gray-600">Measure endurance efficiency</p>
                  </div>
                </div>
              </div>
              {!isAuthenticated && (
                <Link href="/auth">
                  <Button className="bg-strava-orange text-white hover:bg-strava-orange/90" size="sm" data-testid="button-sign-in">
                    Sign In for Strava Import
                  </Button>
                </Link>
              )}
              {isAuthenticated && (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" data-testid="button-dashboard">
                    Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* What is Aerobic Decoupling */}
          <Alert className="mb-8 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700 ml-2">
              <strong>Aerobic Decoupling</strong> measures how your pace-to-heart-rate relationship changes during a long run. 
              A low decoupling (&lt;5%) indicates strong aerobic fitness. Higher values suggest you need more aerobic base training or started too fast.
            </AlertDescription>
          </Alert>

          {/* Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-strava-orange" />
                <span>Calculate Your Aerobic Decoupling</span>
              </CardTitle>
              <CardDescription>
                {isAuthenticated 
                  ? "Import data from a recent Strava run or enter values manually"
                  : "Enter your run data manually to calculate decoupling"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  {isAuthenticated && (
                    <TabsTrigger value="strava" data-testid="tab-strava">
                      <ActivityIcon className="h-4 w-4 mr-2" />
                      From Strava
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="manual" data-testid="tab-manual">
                    <Calculator className="h-4 w-4 mr-2" />
                    Manual Input
                  </TabsTrigger>
                </TabsList>

                {isAuthenticated && (
                  <TabsContent value="strava">
                    <div className="text-center py-12 text-gray-500">
                      <ActivityIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Strava Integration Coming Soon</p>
                      <p className="text-sm">Select a recent long run to auto-calculate decoupling</p>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="manual">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Run Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  data-testid="input-duration"
                                />
                              </FormControl>
                              <FormDescription>Total run time in minutes</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pace Unit</FormLabel>
                              <FormControl>
                                <select 
                                  {...field} 
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  data-testid="select-unit"
                                >
                                  <option value="mile">Per Mile</option>
                                  <option value="km">Per Kilometer</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-sm font-semibold text-charcoal mb-4">First Half Data</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="firstHalfPace"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Average Pace</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="9:00"
                                    {...field}
                                    data-testid="input-first-half-pace"
                                  />
                                </FormControl>
                                <FormDescription>Format: MM:SS</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="firstHalfHR"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Average Heart Rate (bpm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    {...field}
                                    data-testid="input-first-half-hr"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-sm font-semibold text-charcoal mb-4">Second Half Data</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="secondHalfPace"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Average Pace</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="9:15"
                                    {...field}
                                    data-testid="input-second-half-pace"
                                  />
                                </FormControl>
                                <FormDescription>Format: MM:SS</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="secondHalfHR"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Average Heart Rate (bpm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    {...field}
                                    data-testid="input-second-half-hr"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-strava-orange text-white hover:bg-strava-orange/90"
                        data-testid="button-calculate"
                      >
                        Calculate Decoupling
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              {/* Results */}
              {result && (
                <div className="mt-8 border-t pt-8">
                  <h3 className="text-lg font-semibold text-charcoal mb-4">Your Results</h3>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge className={`${result.color} text-white px-3 py-1`}>
                            {result.badge}
                          </Badge>
                          <span className="text-3xl font-bold text-charcoal">
                            {result.decouplingPercent.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Aerobic Decoupling</p>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>First Half Pa:HR: {result.firstHalfPaHR.toFixed(4)}</div>
                        <div>Second Half Pa:HR: {result.secondHalfPaHR.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <strong>Interpretation:</strong> {result.interpretation}
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6 grid sm:grid-cols-4 gap-4 text-sm">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="font-semibold text-green-700 mb-1">≤ 3%</div>
                      <div className="text-gray-600">Excellent</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="font-semibold text-blue-700 mb-1">3-5%</div>
                      <div className="text-gray-600">Good</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="font-semibold text-yellow-700 mb-1">5-8%</div>
                      <div className="text-gray-600">Borderline</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="font-semibold text-red-700 mb-1">&gt; 8%</div>
                      <div className="text-gray-600">Fade</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Educational Content */}
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Understanding Aerobic Decoupling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <p>
                  <strong>What it measures:</strong> Aerobic decoupling quantifies how your cardiovascular efficiency changes during sustained effort. 
                  It compares the ratio of pace to heart rate between the first and second halves of your run.
                </p>
                <p>
                  <strong>Why it matters:</strong> Low decoupling (&lt;5%) indicates a strong aerobic base and appropriate pacing. 
                  Higher values suggest either inadequate aerobic conditioning or starting too fast.
                </p>
                <p>
                  <strong>How to improve:</strong> Build aerobic endurance through consistent easy miles at conversational pace. 
                  Aim for 80% of your weekly volume below your aerobic threshold (typically 70-75% max HR).
                </p>
                <p>
                  <strong>Best use:</strong> Use this metric on steady, long runs (60+ minutes) at moderate effort. 
                  Avoid using on interval workouts or tempo runs where intentional pace variations occur.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
