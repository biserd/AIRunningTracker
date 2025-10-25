import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { ArrowRight, Info, Activity as ActivityIcon, TrendingUp, TrendingDown, Footprints, Target, CheckCircle2 } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CadenceAnalysisResult, formatDrift, getScoreColor } from "@shared/cadenceAnalysis";
import { apiRequest } from "@/lib/queryClient";

interface SuitableActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  average_cadence?: number;
  start_date: string;
}

export default function CadenceAnalyzer() {
  const { isAuthenticated } = useAuth();
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [result, setResult] = useState<CadenceAnalysisResult | null>(null);

  // Fetch suitable activities for logged-in users
  const { data: activitiesData, isLoading: isLoadingActivities, error: activitiesError } = useQuery<SuitableActivity[]>({
    queryKey: ['/api/cadence/suitable-activities'],
    enabled: isAuthenticated,
  });

  // Mutation to analyze activity
  const analyzeMutation = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await apiRequest('POST', '/api/cadence/analyze', { activityId });
      return response as CadenceAnalysisResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleAnalyze = (activityId: number) => {
    setSelectedActivityId(activityId);
    setResult(null);
    analyzeMutation.mutate(activityId);
  };

  const formatDistance = (meters: number): string => {
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} mi`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}min`;
  };

  // Get severity color class
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-semibold">{formatTime(payload[0].payload.time)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cadence: <span className="font-semibold text-strava-orange">{payload[0].value.toFixed(1)} spm</span>
          </p>
          {payload[1] && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Trend: <span className="font-semibold text-blue-500">{payload[1].value.toFixed(1)} spm</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Cadence Drift & Form Stability Analyzer - Free Running Tool | RunAnalytics</title>
        <meta name="description" content="Analyze your running form stability through cadence drift analysis. Detect form fade on long runs with our free cadence analyzer. Get your Form Stability Score (0-100) from Strava activities." />
        <meta property="og:title" content="Cadence Drift & Form Stability Analyzer | RunAnalytics" />
        <meta property="og:description" content="Free tool to analyze running form stability and cadence consistency. Identify form fade patterns on long runs." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitracker.run/tools/cadence-analyzer" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        {isAuthenticated ? (
          <AppHeader />
        ) : (
          <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                      <Footprints className="text-white" size={20} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-charcoal dark:text-white">Cadence Analyzer</h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Form stability insights</p>
                    </div>
                  </div>
                </div>
                <Link href="/auth">
                  <Button className="bg-strava-orange text-white hover:bg-strava-orange/90" size="sm" data-testid="button-sign-in">
                    Sign In with Strava
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* What is Cadence Drift Analysis */}
          <Alert className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-gray-700 dark:text-gray-300 ml-2">
              <strong>Cadence Drift Analysis</strong> measures how your running cadence changes during a run, detecting form fade and fatigue. 
              A stable cadence indicates good form endurance. Significant drift suggests you may need to work on strength and running economy.
            </AlertDescription>
          </Alert>

          {!isAuthenticated && (
            <Card className="mb-8 bg-gradient-to-r from-strava-orange/10 to-orange-100/50 dark:from-strava-orange/20 dark:to-orange-900/20 border-strava-orange/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Footprints className="h-5 w-5 text-strava-orange" />
                  <span>Connect Strava to Analyze Your Form</span>
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  This tool analyzes cadence data from your Strava activities to measure form stability. 
                  Sign in with Strava to analyze runs with 45+ minutes of cadence data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Form Stability Score</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Get a 0-100 score rating your form endurance</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Cadence Drift Detection</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">See how your cadence changes over time</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Personalized Recommendations</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Get actionable insights to improve form</p>
                      </div>
                    </div>
                  </div>
                  <Link href="/auth">
                    <Button className="w-full bg-strava-orange text-white hover:bg-strava-orange/90" data-testid="button-cta-signin">
                      <ActivityIcon className="mr-2 h-4 w-4" />
                      Connect Strava to Get Started
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Selection for Authenticated Users */}
          {isAuthenticated && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ActivityIcon className="h-5 w-5 text-strava-orange" />
                  <span>Select a Run to Analyze</span>
                </CardTitle>
                <CardDescription>
                  Choose a run with 45+ minutes and cadence data for form stability analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingActivities ? (
                  <div className="flex items-center justify-center py-8" data-testid="loading-activities">
                    <Loader2 className="h-6 w-6 animate-spin text-strava-orange" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading activities...</span>
                  </div>
                ) : activitiesError ? (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <AlertDescription className="text-red-700 dark:text-red-400">
                      Error loading activities. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : activitiesData && activitiesData.length === 0 ? (
                  <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-700 dark:text-yellow-400 ml-2">
                      No suitable activities found. We need runs with 45+ minutes and cadence data recorded.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {activitiesData?.map((activity) => (
                      <Card 
                        key={activity.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedActivityId === activity.id ? 'border-strava-orange border-2' : ''
                        }`}
                        onClick={() => handleAnalyze(activity.id)}
                        data-testid={`activity-card-${activity.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{activity.name}</h3>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                <span>{formatDistance(activity.distance)}</span>
                                <span>•</span>
                                <span>{formatDuration(activity.moving_time)}</span>
                                {activity.average_cadence && (
                                  <>
                                    <span>•</span>
                                    <span>{activity.average_cadence.toFixed(0)} spm avg</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              disabled={analyzeMutation.isPending && selectedActivityId === activity.id}
                              data-testid={`button-analyze-${activity.id}`}
                            >
                              {analyzeMutation.isPending && selectedActivityId === activity.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Analyzing...
                                </>
                              ) : (
                                'Analyze'
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {result && (
            <div className="space-y-6">
              {/* Form Stability Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-strava-orange" />
                    <span>Form Stability Score</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    {/* Score Gauge */}
                    <div className="relative w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: result.formStabilityScore },
                              { value: 100 - result.formStabilityScore }
                            ]}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                          >
                            <Cell fill={getScoreColor(result.formStabilityScore)} />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <div className="text-5xl font-bold" style={{ color: getScoreColor(result.formStabilityScore) }}>
                          {result.formStabilityScore}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">out of 100</div>
                      </div>
                    </div>

                    {/* Severity Badge */}
                    <Badge 
                      className={`mt-4 ${getSeverityColor(result.severityLevel)} text-white text-lg px-6 py-2`}
                      data-testid="badge-severity"
                    >
                      {result.severityLevel.charAt(0).toUpperCase() + result.severityLevel.slice(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Cadence Drift</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      {result.cadenceDrift >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-red-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="text-2xl font-bold" data-testid="text-drift-value">
                          {formatDrift(result.cadenceDrift)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {result.cadenceDrift >= 0 ? 'Increased' : 'Decreased'} over time
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Mean Cadence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-mean-cadence">
                        {result.meanCadence.toFixed(1)} <span className="text-sm font-normal">spm</span>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ± {result.cadenceStdDev.toFixed(1)} spm std dev
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Cadence Variability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-cadence-cv">
                        {result.cadenceCV.toFixed(1)}<span className="text-sm font-normal">%</span>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Coefficient of variation</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cadence vs Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cadence Over Time</CardTitle>
                  <CardDescription>
                    Your cadence throughout the run with trend line showing drift
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80" data-testid="chart-cadence-time">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          tickFormatter={formatTime}
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'Cadence (spm)', angle: -90, position: 'insideLeft' }}
                          domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="cadence" 
                          stroke="#ea580c" 
                          strokeWidth={2}
                          dot={false}
                          name="Actual Cadence"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="trendLine" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Trend"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Interpretation & Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>Analysis & Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Interpretation</h3>
                    <p className="text-gray-700 dark:text-gray-300" data-testid="text-interpretation">
                      {result.interpretation}
                    </p>
                  </div>

                  {result.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Recommendations</h3>
                      <ul className="space-y-2" data-testid="list-recommendations">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.meanStrideLength && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Mean Stride Length:</span>
                        <span className="font-semibold">{result.meanStrideLength.toFixed(2)} m</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-600 dark:text-gray-400">Stride Variability:</span>
                        <span className="font-semibold">{result.strideVariability.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analyze Another Activity */}
              {isAuthenticated && (
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setResult(null);
                      setSelectedActivityId(null);
                    }}
                    data-testid="button-analyze-another"
                  >
                    Analyze Another Activity
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* How It Works Section */}
          {!result && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>How Form Stability Analysis Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center space-x-2">
                      <TrendingDown className="h-5 w-5 text-strava-orange" />
                      <span>Cadence Drift Detection</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We analyze how your step rate changes throughout your run. Stable cadence indicates good form endurance, 
                      while significant drift (increase or decrease) suggests fatigue or form breakdown.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span>Form Stability Score</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your score (0-100) combines cadence drift, variability, and stride consistency. Higher scores indicate 
                      better form endurance. Elite runners typically score 85+.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center space-x-2">
                      <Footprints className="h-5 w-5 text-green-600" />
                      <span>Stride Analysis</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      When speed data is available, we calculate stride length variability. Consistent stride length 
                      is a marker of efficient running form.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600" />
                      <span>Actionable Insights</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get personalized recommendations based on your drift patterns, including strength training, 
                      cadence drills, and pacing strategies.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
