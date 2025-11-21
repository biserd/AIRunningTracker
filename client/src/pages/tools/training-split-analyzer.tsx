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
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
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
    answer: "Polarized training emphasizes a clear split: 70-80% easy/recovery runs (Zone 1), minimal moderate intensity (10-20% Zone 2), and 10-20% high-intensity (Zone 3). This minimizes time in the 'grey zone' that can lead to fatigue without enough stimulus. Pyramidal training has a gradual distribution with most time easy (60-70% Zone 1), moderate Zone 2 work (20-30%), and smaller amounts of high intensity (5-15% Zone 3). Both are effective - polarized is popular for elite endurance athletes, while pyramidal works well for many recreational runners."
  },
  {
    question: "How do I calculate my heart rate training zones?",
    answer: "The most accurate zones use lactate threshold testing, but you can estimate: Zone 1 (Easy/Recovery) is below your first lactate threshold (LT1), typically 60-75% max HR or conversational pace. Zone 2 (Tempo/Threshold) is between LT1 and second lactate threshold (LT2), roughly 75-85% max HR - comfortably hard but sustainable for 30-60 minutes. Zone 3 (VO2max/High Intensity) is above LT2, typically 85%+ max HR - hard efforts you can sustain for 5-15 minutes. This tool uses these thresholds to classify your training distribution."
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
    answer: "Lactate thresholds (LT1 and LT2) are more accurate for defining training zones than simple max HR percentages. The tool allows both: if you know your threshold heart rates from testing, use those for precise zones. If not, the tool will estimate zones from max HR. LT1 typically occurs around 70-75% max HR (where breathing becomes noticeably harder), and LT2 around 85-90% max HR (sustainable hard effort for 30-60 min). Lab testing or field tests can determine your specific thresholds."
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

  const classifyDistribution = (z1Pct: number, z2Pct: number, z3Pct: number): { classification: string; color: string } => {
    if (z1Pct >= 70 && z3Pct >= 10 && z2Pct <= 20) {
      return { classification: "Polarized", color: "bg-blue-500" };
    } else if (z2Pct >= 25) {
      return { classification: "Threshold-Heavy", color: "bg-orange-500" };
    } else if (z1Pct > z2Pct && z2Pct > z3Pct && z2Pct >= 10 && z2Pct <= 25) {
      return { classification: "Pyramidal", color: "bg-green-500" };
    } else {
      return { classification: "Mixed", color: "bg-gray-500" };
    }
  };

  const generateRecommendations = (z1Pct: number, z2Pct: number, z3Pct: number, totalMin: number, classification: string): Array<{ zone: string; adjustment: string; rationale: string }> => {
    const recs = [];
    
    if (classification === "Threshold-Heavy") {
      const reduceZ2 = Math.round((z2Pct - 20) * totalMin / 100);
      const addZ1 = Math.round(reduceZ2 * 0.7);
      const addZ3 = Math.round(reduceZ2 * 0.3);
      
      recs.push({
        zone: "Zone 1",
        adjustment: `+${addZ1} min/week`,
        rationale: "Increase aerobic base to balance intensity"
      });
      recs.push({
        zone: "Zone 2",
        adjustment: `-${reduceZ2} min/week`,
        rationale: "Reduce threshold work to prevent overtraining"
      });
      recs.push({
        zone: "Zone 3",
        adjustment: `+${addZ3} min/week`,
        rationale: "Add high-intensity to maintain fitness"
      });
    } else if (classification === "Polarized" || classification === "Pyramidal") {
      recs.push({
        zone: "Current Split",
        adjustment: "Maintain",
        rationale: "Your distribution is well-balanced for sustainable progress"
      });
      
      if (z3Pct < 15) {
        recs.push({
          zone: "Zone 3",
          adjustment: `+${Math.round((15 - z3Pct) * totalMin / 100)} min/week`,
          rationale: "Consider adding more high-intensity for speed development"
        });
      }
    } else {
      const targetZ1 = 75;
      const targetZ2 = 15;
      const targetZ3 = 10;
      
      const z1Delta = Math.round((targetZ1 - z1Pct) * totalMin / 100);
      const z2Delta = Math.round((targetZ2 - z2Pct) * totalMin / 100);
      const z3Delta = Math.round((targetZ3 - z3Pct) * totalMin / 100);
      
      if (Math.abs(z1Delta) > 30) {
        recs.push({
          zone: "Zone 1",
          adjustment: `${z1Delta > 0 ? '+' : ''}${z1Delta} min/week`,
          rationale: z1Delta > 0 ? "Build aerobic base" : "Reduce easy volume slightly"
        });
      }
      if (Math.abs(z2Delta) > 20) {
        recs.push({
          zone: "Zone 2",
          adjustment: `${z2Delta > 0 ? '+' : ''}${z2Delta} min/week`,
          rationale: z2Delta > 0 ? "Add threshold work" : "Reduce threshold volume"
        });
      }
      if (Math.abs(z3Delta) > 15) {
        recs.push({
          zone: "Zone 3",
          adjustment: `${z3Delta > 0 ? '+' : ''}${z3Delta} min/week`,
          rationale: z3Delta > 0 ? "Increase high-intensity" : "Reduce high-intensity volume"
        });
      }
    }
    
    return recs;
  };

  const calculateManualDistribution = (data: ManualInputFormData): ZoneDistribution => {
    const totalMinutes = data.zone1Minutes + data.zone2Minutes + data.zone3Minutes;
    const z1Pct = (data.zone1Minutes / totalMinutes) * 100;
    const z2Pct = (data.zone2Minutes / totalMinutes) * 100;
    const z3Pct = (data.zone3Minutes / totalMinutes) * 100;

    const { classification, color } = classifyDistribution(z1Pct, z2Pct, z3Pct);
    const recommendations = generateRecommendations(z1Pct, z2Pct, z3Pct, totalMinutes, classification);

    return {
      zone1Percent: z1Pct,
      zone2Percent: z2Pct,
      zone3Percent: z3Pct,
      zone1Minutes: data.zone1Minutes,
      zone2Minutes: data.zone2Minutes,
      zone3Minutes: data.zone3Minutes,
      totalMinutes,
      classification,
      classificationColor: color,
      recommendations,
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
      <Helmet>
        <title>Polarized vs Pyramidal Training Split Analyzer - Free Running Tool | RunAnalytics</title>
        <meta name="description" content="Analyze your training intensity distribution. Discover if you're following polarized, pyramidal, or threshold-heavy training. Get personalized zone recommendations based on heart rate data from Strava or manual input." />
        <meta property="og:title" content="Polarized vs Pyramidal Training Split Analyzer - RunAnalytics" />
        <meta property="og:description" content="Free tool to analyze training intensity distribution and classify your training approach (polarized, pyramidal, threshold-heavy) with personalized recommendations." />
      </Helmet>
      <FAQSchema faqs={TRAINING_SPLIT_FAQS} />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {isAuthenticated ? (
          <AppHeader />
        ) : (
          <nav className="border-b bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                  RunAnalytics
                </Link>
                <div className="flex items-center gap-4">
                  <Link href="/tools" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    ← Back to Tools
                  </Link>
                  <Link href="/auth">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        )}

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
              Analyze your training intensity distribution and discover if you're following a polarized, pyramidal, or threshold-heavy approach
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
                Training intensity distribution refers to how you allocate your training time across different heart rate or power zones. Research shows that elite endurance athletes typically follow one of three main approaches:
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
                    <p className="text-gray-600 dark:text-gray-400">Lots of easy running, minimal moderate intensity, regular hard efforts. Popular among elite marathoners.</p>
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
                        <h3 className="text-lg font-semibold mb-4">Time in Zone (minutes)</h3>
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
                          {result.zone1Minutes} minutes
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
                          {result.zone2Minutes} minutes
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
                          {result.zone3Minutes} minutes
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
                        <strong>Caution:</strong> Your training has a high proportion of threshold/moderate intensity work. While this can build fitness quickly, it may increase injury risk and lead to overtraining. Consider shifting some Zone 2 time to Zone 1 (easy) and Zone 3 (hard).
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
                      <strong>Total Training Time:</strong> {result.totalMinutes} minutes ({(result.totalMinutes / 60).toFixed(1)} hours)
                    </p>
                    <p>
                      Research from elite endurance athletes suggests that polarized and pyramidal distributions are associated with better performance and lower injury rates compared to threshold-heavy approaches.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="mt-8 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
            <CardHeader>
              <CardTitle>Want More AI-Powered Insights?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Sign up for RunAnalytics to get comprehensive training analysis, AI-powered insights, personalized training plans, and race predictions—all completely free!
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

        <Footer />
      </div>
    </>
  );
}
