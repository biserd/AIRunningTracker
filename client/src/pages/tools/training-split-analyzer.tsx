import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { ArrowRight, TrendingUp, Info, Calculator, Activity as ActivityIcon, Target, Heart } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import AppHeader from "@/components/AppHeader";
import PublicHeader from "@/components/PublicHeader";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FAQSchema } from "@/components/FAQSchema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { summarizeTrainingSplit } from "@shared/trainingSplit";
import { ToolResultActions } from "@/components/ToolResultActions";
import { ToolEducationPanel } from "@/components/ToolEducationPanel";

const manualInputSchema = z.object({
  periodDays: z.coerce.number().min(28, "Minimum 28 days").max(42, "Maximum 42 days"),
  hrMax: z.coerce.number().min(140, "Heart rate too low").max(220, "Heart rate too high").optional(),
  lt1HR: z.coerce.number().min(100, "Heart rate too low").max(200, "Heart rate too high").optional(),
  lt2HR: z.coerce.number().min(120, "Heart rate too low").max(210, "Heart rate too high").optional(),
  zone1Minutes: z.coerce.number().min(0, "Must be positive").max(5000, "Too high"),
  zone2Minutes: z.coerce.number().min(0, "Must be positive").max(2000, "Too high"),
  zone3Minutes: z.coerce.number().min(0, "Must be positive").max(1000, "Too high"),
});

type ManualInputFormData = z.infer<typeof manualInputSchema>;

interface ZoneDistribution {
  zone1Percent: number;
  zone2Percent: number;
  zone3Percent: number;
  zone1Minutes: number;
  zone2Minutes: number;
  zone3Minutes: number;
  totalMinutes: number;
  periodDays: number;
  weeksInPeriod: number;
  weeklyAverageMinutes: number;
  classification: string;
  classificationColor: string;
  weeklyData?: Array<{
    week: string;
    zone1: number;
    zone2: number;
    zone3: number;
    total: number;
  }>;
  recommendations: Array<{
    zone: string;
    adjustment: string;
    rationale: string;
  }>;
}

const TRAINING_SPLIT_FAQS = [
  {
    question: "What is polarized vs pyramidal training?",
    answer: "Polarized training has a large easy share, limited moderate time and a distinct hard share. Pyramidal training also prioritizes easy work but contains more moderate than hard time. Both are reference patterns rather than universal targets, and the percentages depend on whether a source counts minutes or sessions."
  },
  {
    question: "How do I calculate my heart rate training zones?",
    answer: "A three-zone model is usually anchored around the first and second physiological thresholds. Lab or carefully conducted field testing is more individualized than percentages of maximum heart rate. If using estimates, treat the classification as provisional and verify it against breathing and talk-test cues."
  },
  {
    question: "Why is too much Zone 2 training problematic?",
    answer: "Spending 25%+ of training time in Zone 2 (tempo/threshold zone) is 'threshold-heavy' and can lead to chronic fatigue and inadequate recovery. Zone 2 is too hard to recover from quickly but not intense enough to provide the same fitness stimulus as true high-intensity Zone 3 work. This leads to accumulated fatigue without proportional gains. Most successful endurance programs keep Zone 2 work limited (10-20% of total volume) and emphasize either easy aerobic base building (Zone 1) or targeted high-intensity work (Zone 3)."
  },
  {
    question: "How can I improve my training distribution?",
    answer: "If you're threshold-heavy, reduce Zone 2 work and add more true easy running (Zone 1) and dedicated hard sessions (Zone 3). Make easy days truly easy - conversational pace where you could maintain a full conversation. Make hard days count - Zone 3 sessions should be structured intervals or tempo runs at significantly higher intensity. Avoid moderate-intensity 'junk miles' that fall between easy and hard. Aim for 70-80% easy, 10-20% moderate, 10-20% hard depending on your experience level and goals."
  },
  {
    question: "Should I use max HR or lactate thresholds for zone calculation?",
    answer: "Measured or well-estimated thresholds are more individualized than simple maximum-heart-rate percentages. The tool supports threshold inputs when you have them; otherwise its estimated zones should be treated as broad starting points."
  }
];

export default function TrainingSplitAnalyzer() {
  const { isAuthenticated } = useAuth();
  const [result, setResult] = useState<ZoneDistribution | null>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [periodDays, setPeriodDays] = useState<number>(28);

  const { data: stravaAnalysis, isLoading: isLoadingStrava, refetch: refetchStrava } = useQuery({
    queryKey: ['/api/training-split/analyze', periodDays],
    enabled: isAuthenticated && activeTab === "strava",
  });

  const form = useForm<ManualInputFormData>({
    resolver: zodResolver(manualInputSchema),
    defaultValues: {
      periodDays: 28,
      hrMax: 185,
      lt1HR: undefined,
      lt2HR: undefined,
      zone1Minutes: 1200,
      zone2Minutes: 200,
      zone3Minutes: 100,
    }
  });

  const calculateManualDistribution = (data: ManualInputFormData): ZoneDistribution => {
    const totalMinutes = data.zone1Minutes + data.zone2Minutes + data.zone3Minutes;
    const summary = summarizeTrainingSplit(
      data.zone1Minutes,
      data.zone2Minutes,
      data.zone3Minutes,
      data.periodDays,
    );

    return {
      zone1Percent: summary.zone1Percent,
      zone2Percent: summary.zone2Percent,
      zone3Percent: summary.zone3Percent,
      zone1Minutes: data.zone1Minutes,
      zone2Minutes: data.zone2Minutes,
      zone3Minutes: data.zone3Minutes,
      totalMinutes,
      periodDays: data.periodDays,
      weeksInPeriod: summary.weeksInPeriod,
      weeklyAverageMinutes: summary.weeklyAverageMinutes,
      classification: summary.classification,
      classificationColor: summary.classificationColor,
      recommendations: summary.recommendations,
    };
  };

  const onSubmit = (data: ManualInputFormData) => {
    const distribution = calculateManualDistribution(data);
    setResult(distribution);
  };

  const handleStravaAnalyze = () => {
    setResult(null);
    refetchStrava();
  };

  // Clear results when switching tabs
  useEffect(() => {
    setResult(null);
  }, [activeTab]);

  // Clear results when user is not authenticated
  useEffect(() => {
    if (!isAuthenticated && activeTab === "strava") {
      setResult(null);
      setActiveTab("manual");
    }
  }, [isAuthenticated, activeTab]);

  // Update result when Strava analysis completes
  useEffect(() => {
    if (stravaAnalysis && activeTab === "strava" && isAuthenticated) {
      setResult(stravaAnalysis as ZoneDistribution);
    }
  }, [stravaAnalysis, activeTab, isAuthenticated]);

  const ternaryData = result ? [
    { zone: 'Z1', value: result.zone1Percent, color: '#10b981' },
    { zone: 'Z2', value: result.zone2Percent, color: '#f59e0b' },
    { zone: 'Z3', value: result.zone3Percent, color: '#ef4444' },
  ] : [];

  return (
    <>
      <SEO
        title="Training Split Analyzer: Polarized vs Pyramidal vs Threshold"
        description="Analyze your training intensity distribution to see whether you run a polarized, pyramidal, or threshold model. Includes a breakdown of each zone's contribution."
        keywords="training split analyzer, polarized training, pyramidal training, running zones, training intensity distribution"
        url="https://aitracker.run/tools/training-split-analyzer"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Training Split Analyzer",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "description": "Analyze your running intensity distribution. Discover if you're training polarized, pyramidal, or threshold-heavy. Free with Strava sync."
        }}
      />
      <FAQSchema faqs={TRAINING_SPLIT_FAQS} />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <PublicHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Target className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Polarized vs Pyramidal Training Split Analyzer
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Analyze your training intensity distribution and discover if you're following a polarized, pyramidal, or threshold-heavy approach. 
              Explore more <Link href="/blog/best-strava-analytics-tools-2026" className="text-blue-600 hover:text-blue-800 underline">Strava analytics tools</Link>.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                What is Training Intensity Distribution?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Training intensity distribution describes how recorded time is allocated across easy, moderate and hard zones. The categories below are reference patterns, not universal prescriptions:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className="bg-blue-500">Polarized</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-2 font-semibold">≥70% Z1, ≥10% Z3, ≤20% Z2</p>
                    <p className="text-gray-600 dark:text-gray-400">Lots of easy running, limited moderate intensity and a distinct hard share.</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className="bg-green-500">Pyramidal</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-2 font-semibold">Z1 &gt; Z2 &gt; Z3 (Z2: 10-25%)</p>
                    <p className="text-gray-600 dark:text-gray-400">Progressive decrease in volume as intensity increases. Balanced approach with more threshold work.</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className="bg-orange-500">Threshold</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-2 font-semibold">Z2 ≥ 25%</p>
                    <p className="text-gray-600 dark:text-gray-400">Heavy emphasis on tempo/threshold running. Can lead to overtraining if not carefully managed.</p>
                  </CardContent>
                </Card>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Heart Rate Zones:</strong> Z1 (Easy/Recovery) &lt; 75% HRmax, Z2 (Threshold) 75-88% HRmax, Z3 (Hard/VO2max) &gt; 88% HRmax
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" data-testid="tab-manual">
                <Calculator className="w-4 h-4 mr-2" />
                Manual Input
              </TabsTrigger>
              <TabsTrigger value="strava" disabled={!isAuthenticated} data-testid="tab-strava">
                <ActivityIcon className="w-4 h-4 mr-2" />
                Analyze from Strava
                {!isAuthenticated && <Badge className="ml-2" variant="outline">Sign in required</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <Card>
                <CardHeader>
                  <CardTitle>Enter Your Training Distribution</CardTitle>
                  <CardDescription>
                    Input total time spent in each heart rate zone over the past 28-42 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="periodDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Analysis Period (Days)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-period-days" />
                              </FormControl>
                              <FormDescription>28-42 days recommended</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hrMax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Heart Rate (optional)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} placeholder="185" data-testid="input-hrmax" />
                              </FormControl>
                              <FormDescription>Used to estimate zones if LT1/LT2 not provided</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lt1HR"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LT1 Heart Rate (optional)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} placeholder="139" data-testid="input-lt1" />
                              </FormControl>
                              <FormDescription>First lactate threshold (~75% HRmax)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lt2HR"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LT2 Heart Rate (optional)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} placeholder="163" data-testid="input-lt2" />
                              </FormControl>
                              <FormDescription>Second lactate threshold (~88% HRmax)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-1">Time in Zone for the full period</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter totals for all {form.watch("periodDays")} days. Results also show a weekly average.</p>
                        <div className="grid md:grid-cols-3 gap-6">
                          <FormField
                            control={form.control}
                            name="zone1Minutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-green-500" />
                                  Zone 1 (Easy)
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-zone1-minutes" />
                                </FormControl>
                                <FormDescription>&lt; 75% HRmax</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="zone2Minutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-orange-500" />
                                  Zone 2 (Threshold)
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-zone2-minutes" />
                                </FormControl>
                                <FormDescription>75-88% HRmax</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="zone3Minutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Heart className="w-4 h-4 text-red-500" />
                                  Zone 3 (Hard)
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-zone3-minutes" />
                                </FormControl>
                                <FormDescription>&gt; 88% HRmax</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" size="lg" data-testid="button-analyze-manual">
                        <Calculator className="w-4 h-4 mr-2" />
                        Analyze Training Split
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strava">
              <Card>
                <CardHeader>
                  <CardTitle>Analyze Strava Activities</CardTitle>
                  <CardDescription>
                    Automatically analyze heart rate distribution from your recent Strava activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label>Analysis Period:</Label>
                    <Select value={periodDays.toString()} onValueChange={(val) => setPeriodDays(parseInt(val))}>
                      <SelectTrigger className="w-48" data-testid="select-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="28">Last 28 days</SelectItem>
                        <SelectItem value="35">Last 35 days</SelectItem>
                        <SelectItem value="42">Last 42 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      We'll analyze all your runs with heart rate data from the selected period and calculate your intensity distribution.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={handleStravaAnalyze} 
                    className="w-full" 
                    size="lg" 
                    disabled={isLoadingStrava}
                    data-testid="button-analyze-strava"
                  >
                    {isLoadingStrava ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <ActivityIcon className="w-4 h-4 mr-2" />
                        Analyze My Training
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {result && (
            <div className="space-y-6" data-testid="results-section">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Your Training Classification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <Badge className={`${result.classificationColor} text-white text-2xl px-6 py-3`} data-testid="badge-classification">
                      {result.classification}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950" data-testid="card-zone1">
                      <CardHeader>
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Zone 1 (Easy)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-zone1-percent">
                          {result.zone1Percent.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="text-zone1-minutes">
                          {Math.round(result.zone1Minutes)} period min · {Math.round(result.zone1Minutes / result.weeksInPeriod)} min/week
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950" data-testid="card-zone2">
                      <CardHeader>
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Zone 2 (Threshold)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-zone2-percent">
                          {result.zone2Percent.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="text-zone2-minutes">
                          {Math.round(result.zone2Minutes)} period min · {Math.round(result.zone2Minutes / result.weeksInPeriod)} min/week
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950" data-testid="card-zone3">
                      <CardHeader>
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Zone 3 (Hard)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400" data-testid="text-zone3-percent">
                          {result.zone3Percent.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="text-zone3-minutes">
                          {Math.round(result.zone3Minutes)} period min · {Math.round(result.zone3Minutes / result.weeksInPeriod)} min/week
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ternaryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="zone" />
                        <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Bar dataKey="value" name="Time Distribution">
                          {ternaryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {result.weeklyData && result.weeklyData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Training Distribution</CardTitle>
                    <CardDescription>Stacked view of time in each zone per week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="zone1" stackId="1" stroke="#10b981" fill="#10b981" name="Zone 1 (Easy)" />
                          <Area type="monotone" dataKey="zone2" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Zone 2 (Threshold)" />
                          <Area type="monotone" dataKey="zone3" stackId="1" stroke="#ef4444" fill="#ef4444" name="Zone 3 (Hard)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Training Recommendations
                    </CardTitle>
                    <CardDescription>
                      Suggested adjustments to optimize your training distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.recommendations.map((rec, idx) => (
                        <Card key={idx} className="border-2" data-testid={`card-recommendation-${idx}`}>
                          <CardHeader>
                            <CardTitle className="text-lg" data-testid={`text-rec-zone-${idx}`}>{rec.zone}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-2" data-testid={`text-rec-adjustment-${idx}`}>
                              {rec.adjustment}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-rec-rationale-${idx}`}>
                              {rec.rationale}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Understanding Your Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.classification === "Polarized" && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Excellent!</strong> Your training follows a polarized approach, which research shows is highly effective for endurance athletes. You're spending most time at easy intensity with regular high-intensity work and minimal moderate-intensity training.
                      </AlertDescription>
                    </Alert>
                  )}
                  {result.classification === "Pyramidal" && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Good balance!</strong> Your pyramidal distribution includes significant threshold work while maintaining a strong aerobic base. This approach works well for many runners, especially those building toward races.
                      </AlertDescription>
                    </Alert>
                  )}
                  {result.classification === "Threshold-Heavy" && (
                    <Alert className="border-orange-200 dark:border-orange-800">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Caution:</strong> Your training has a high proportion of threshold/moderate intensity work. Consider shifting some Zone 2 time to Zone 1 before adding any additional hard work.
                      </AlertDescription>
                    </Alert>
                  )}
                  {result.classification === "Mixed" && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your current distribution doesn't clearly match a polarized or pyramidal model. Consider the recommendations above to optimize your training approach based on your goals.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">
                      <strong>Weekly average:</strong> {Math.round(result.weeklyAverageMinutes)} minutes ({(result.weeklyAverageMinutes / 60).toFixed(1)} hours). <strong>Full period:</strong> {Math.round(result.totalMinutes)} minutes across {result.periodDays} days.
                    </p>
                    <p>
                      Distribution is only one part of training load. Review zone definitions, total volume, recovery and symptoms before changing the plan.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <ToolResultActions source="training_split_result" />
            </div>
          )}

          <Card className="mt-8 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
            <CardHeader>
              <CardTitle>Want More AI-Powered Insights?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Sign up for RunAnalytics to get comprehensive training analysis, AI-powered insights, personalized training plans, and race predictions, all completely free!
              </p>
              <Link href={isAuthenticated ? "/dashboard" : "/register"}>
                <Button className="w-full sm:w-auto" data-testid="link-get-started">
                  {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              <CardDescription>
                Learn about polarized vs pyramidal training and how to optimize your intensity distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {TRAINING_SPLIT_FAQS.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6"><ToolEducationPanel variant="training-split" /></div>
        <Footer />
      </div>
    </>
  );
}
