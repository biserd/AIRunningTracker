import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FitnessMetric {
  date: string;
  trainingLoad: number;
  ctl: number; // Fitness
  atl: number; // Fatigue
  tsb: number; // Form
}

interface FitnessData {
  metrics: FitnessMetric[];
  currentForm: FitnessMetric | null;
  interpretation: {
    status: string;
    description: string;
    color: string;
  } | null;
}

interface FitnessChartProps {
  userId: number;
}

export function FitnessChart({ userId }: FitnessChartProps) {
  const [timeRange, setTimeRange] = useState<30 | 90 | 180>(90);
  const [showAbout, setShowAbout] = useState(false);

  const { data, isLoading, error } = useQuery<FitnessData>({
    queryKey: [`/api/fitness/${userId}`, { days: timeRange }],
    queryFn: () => apiRequest(`/api/fitness/${userId}?days=${timeRange}`, "GET"),
    enabled: !!userId,
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format chart data for Recharts
  const chartData = data?.metrics.map((m) => ({
    ...m,
    date: formatDate(m.date),
  })) || [];

  if (isLoading) {
    return (
      <Card data-testid="fitness-chart-loading">
        <CardHeader>
          <CardTitle>Fitness, Fatigue & Form</CardTitle>
          <CardDescription>Track your training load and recovery status</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="fitness-chart-error">
        <CardHeader>
          <CardTitle>Fitness, Fatigue & Form</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Unable to load fitness data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.metrics.length === 0) {
    return (
      <Card data-testid="fitness-chart-no-data">
        <CardHeader>
          <CardTitle>Fitness, Fatigue & Form</CardTitle>
          <CardDescription>Track your training load and recovery status</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No activity data available yet. Sync your activities to see your fitness trends.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="fitness-chart" className="bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              Fitness, Fatigue & Form
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Info className="h-4 w-4 text-gray-500 dark:text-gray-400 cursor-help" data-testid="info-icon" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Understanding the Chart:</p>
                    <ul className="text-sm space-y-1">
                      <li><strong className="text-blue-600 dark:text-blue-400">CTL (Fitness):</strong> Your long-term training buildup</li>
                      <li><strong className="text-pink-600 dark:text-pink-400">ATL (Fatigue):</strong> Your recent training stress</li>
                      <li><strong className="text-yellow-600 dark:text-yellow-500">TSB (Form):</strong> Your readiness to race (positive = fresh)</li>
                    </ul>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Track your training load and recovery status over time
            </CardDescription>
          </div>
          
          {/* Time range selector */}
          <div className="flex gap-2">
            <Button
              variant={timeRange === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(30)}
              data-testid="timerange-30"
              className={timeRange === 30 ? "" : "text-gray-700 dark:text-gray-300"}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(90)}
              data-testid="timerange-90"
              className={timeRange === 90 ? "" : "text-gray-700 dark:text-gray-300"}
            >
              90 Days
            </Button>
            <Button
              variant={timeRange === 180 ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(180)}
              data-testid="timerange-180"
              className={timeRange === 180 ? "" : "text-gray-700 dark:text-gray-300"}
            >
              180 Days
            </Button>
          </div>
        </div>

        {/* Current form status */}
        {data.interpretation && (
          <Alert 
            className="mt-4" 
            style={{ 
              borderColor: data.interpretation.color,
              backgroundColor: `${data.interpretation.color}10`,
            }}
            data-testid="form-status-alert"
          >
            <AlertDescription>
              <strong className="text-gray-900 dark:text-white">Current Form: {data.interpretation.status}</strong>
              <br />
              <span className="text-gray-700 dark:text-gray-300">{data.interpretation.description}</span>
              {data.currentForm && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  (TSB: {data.currentForm.tsb.toFixed(1)})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        {/* Chart */}
        <div className="h-[300px] w-full" data-testid="fitness-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: "currentColor" }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: "currentColor" }}
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgb(255, 255, 255)",
                  border: "1px solid rgb(209, 213, 219)",
                  borderRadius: "6px",
                  color: "rgb(17, 24, 39)"
                }}
                labelStyle={{ color: "rgb(17, 24, 39)" }}
              />
              <Legend wrapperStyle={{ color: "currentColor" }} />
              
              {/* TSB as bars (Form - positive is fresh, negative is fatigued) */}
              <Bar 
                dataKey="tsb" 
                name="TSB (Form)" 
                fill="#eab308"
                opacity={0.6}
              />
              
              {/* CTL line (Fitness) */}
              <Line
                type="monotone"
                dataKey="ctl"
                name="CTL (Fitness)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              
              {/* ATL line (Fatigue) */}
              <Line
                type="monotone"
                dataKey="atl"
                name="ATL (Fatigue)"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* About this chart section */}
        <div className="mt-4 border-t pt-4 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAbout(!showAbout)}
            className="w-full text-gray-700 dark:text-gray-300"
            data-testid="about-toggle"
          >
            <span className="flex items-center gap-2">
              {showAbout ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              About this chart
            </span>
          </Button>

          {showAbout && (
            <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300" data-testid="about-content">
              <div>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400">CTL (Chronic Training Load) - Fitness</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Your long-term fitness level based on the last 42 days of training. 
                  This builds slowly over weeks of consistent training.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-pink-600 dark:text-pink-400">ATL (Acute Training Load) - Fatigue</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Your recent training stress from the last 7 days. 
                  This changes quickly based on your current week's workouts.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-yellow-600 dark:text-yellow-500">TSB (Training Stress Balance) - Form</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Your race readiness calculated as CTL - ATL. 
                  Positive values mean you're fresh (good for racing), 
                  negative values mean you're fatigued (building fitness).
                </p>
              </div>

              <div className="pt-2 border-t dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Common Scenarios:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li><strong>Building fitness:</strong> TSB negative (-10 to -30) as you train hard</li>
                  <li><strong>Tapering:</strong> TSB rising toward positive as you reduce volume</li>
                  <li><strong>Race day:</strong> TSB positive (+5 to +15) when you're fresh and ready</li>
                  <li><strong>Recovery week:</strong> ATL drops, TSB increases toward zero</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
