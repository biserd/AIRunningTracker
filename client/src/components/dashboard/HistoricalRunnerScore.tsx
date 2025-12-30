import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, BarChart3, Calendar, RefreshCw, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useState, useEffect, useCallback } from "react";

interface HistoricalScorePoint {
  date: string;
  totalScore: number;
  grade: string;
  components: {
    consistency: number;
    performance: number;
    volume: number;
    improvement: number;
  };
}

const AnimatedNumber = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const startValue = displayValue;
    const endValue = value;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);
  
  return <span>{displayValue}</span>;
};

const ScoreChart = ({ data, isRefreshing }: { data: HistoricalScorePoint[]; isRefreshing: boolean }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>Not enough data for historical view</p>
          <p className="text-sm">Keep running to see your progress!</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: point.date,
    score: point.totalScore,
    grade: point.grade,
    consistency: Math.round((point.components.consistency / 25) * 100),
    performance: Math.round((point.components.performance / 25) * 100),
    volume: Math.round((point.components.volume / 25) * 100),
    improvement: Math.round((point.components.improvement / 25) * 100),
  }));

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return "#10B981";
    if (grade.startsWith('B')) return "#3B82F6";
    if (grade.startsWith('C')) return "#F59E0B";
    if (grade.startsWith('D')) return "#F97316";
    return "#EF4444";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-lg font-bold" style={{ color: getGradeColor(data.grade) }}>
            Score: {data.score} ({data.grade})
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-blue-600">Consistency: {data.consistency}%</p>
            <p className="text-yellow-600">Performance: {data.performance}%</p>
            <p className="text-green-600">Volume: {data.volume}%</p>
            <p className="text-purple-600">Improvement: {data.improvement}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`h-80 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#3B82F6"
            strokeWidth={3}
            fill="url(#scoreGradient)"
            dot={{ fill: "#3B82F6", strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, stroke: "#3B82F6", strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const ComponentChart = ({ data, component, isRefreshing }: { data: HistoricalScorePoint[], component: string, isRefreshing: boolean }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Math.round((point.components[component as keyof typeof point.components] / 25) * 100),
  }));

  const getComponentColor = (component: string) => {
    switch (component) {
      case 'consistency': return "#3B82F6";
      case 'performance': return "#EAB308";
      case 'volume': return "#10B981";
      case 'improvement': return "#8B5CF6";
      default: return "#6B7280";
    }
  };

  return (
    <div className={`h-64 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, component.charAt(0).toUpperCase() + component.slice(1)]}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={getComponentColor(component)}
            strokeWidth={3}
            dot={{ fill: getComponentColor(component), strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: getComponentColor(component), strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function HistoricalRunnerScore() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  const { data: historicalData, isLoading, error, isFetching, refetch } = useQuery<HistoricalScorePoint[]>({
    queryKey: [`/api/runner-score/${user?.id}/history`],
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  useEffect(() => {
    if (historicalData && !isFetching) {
      setLastUpdated(new Date());
      setIsManualRefresh(false);
    }
  }, [historicalData, isFetching]);

  const handleRefresh = useCallback(async () => {
    setIsManualRefresh(true);
    await refetch();
  }, [refetch]);

  const getScoreTrend = () => {
    if (!historicalData || historicalData.length < 2) return null;
    
    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];
    const change = latest.totalScore - previous.totalScore;
    
    return {
      change,
      isPositive: change > 0,
      percentage: Math.abs(change)
    };
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const trend = getScoreTrend();
  const isRefreshing = isFetching && isManualRefresh;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historical Runner Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !historicalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historical Runner Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600 dark:text-gray-400">Unable to load historical data</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historical Runner Score
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated {getTimeAgo(lastUpdated)}</span>
              </div>
            )}
            {trend && (
              <Badge 
                variant={trend.isPositive ? "default" : "secondary"}
                className={`flex items-center gap-1 transition-all duration-300 ${
                  trend.isPositive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.isPositive ? "+" : ""}{trend.change} pts
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-8 w-8 p-0"
              data-testid="refresh-runner-score"
            >
              <RefreshCw className={`h-4 w-4 transition-all duration-300 ${isFetching ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overall" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overall" data-testid="tab-overall">Overall</TabsTrigger>
            <TabsTrigger value="consistency" data-testid="tab-consistency">Consistency</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            <TabsTrigger value="volume" data-testid="tab-volume">Volume</TabsTrigger>
            <TabsTrigger value="improvement" data-testid="tab-improvement">Improvement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overall" data-testid="chart-overall">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Score Progression Over Time</h3>
              <div data-testid="historical-score-chart">
                <ScoreChart data={historicalData} isRefreshing={isRefreshing} />
              </div>
              {historicalData.length > 0 && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">Current Score</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="current-score-display">
                      <AnimatedNumber value={historicalData[historicalData.length - 1]?.totalScore || 0} />
                    </p>
                  </div>
                  <div className="space-y-1 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">Current Grade</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400" data-testid="current-grade-display">
                      {historicalData[historicalData.length - 1]?.grade || "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="consistency" data-testid="chart-consistency">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Consistency Score History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">How regularly you train each week</p>
              <ComponentChart data={historicalData} component="consistency" isRefreshing={isRefreshing} />
            </div>
          </TabsContent>

          <TabsContent value="performance" data-testid="chart-performance">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Score History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your pace and running efficiency</p>
              <ComponentChart data={historicalData} component="performance" isRefreshing={isRefreshing} />
            </div>
          </TabsContent>

          <TabsContent value="volume" data-testid="chart-volume">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Volume Score History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Weekly mileage and distance progression</p>
              <ComponentChart data={historicalData} component="volume" isRefreshing={isRefreshing} />
            </div>
          </TabsContent>

          <TabsContent value="improvement" data-testid="chart-improvement">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Improvement Score History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your progress and gains over time</p>
              <ComponentChart data={historicalData} component="improvement" isRefreshing={isRefreshing} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
