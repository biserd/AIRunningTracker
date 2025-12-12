import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Pause, 
  Play, 
  RefreshCw,
  Server,
  Zap,
  TrendingUp,
  XCircle,
  ShieldAlert
} from "lucide-react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";

interface MetricEvent {
  timestamp: string;
  event: string;
  type?: string;
  details?: Record<string, any>;
}

interface MetricsSnapshot {
  jobsProcessed: Record<string, number>;
  jobsFailed: Record<string, number>;
  rateLimitHits: number;
  lastRateLimitPauseAt: string | null;
  lastRateLimitResumeAt: string | null;
  lastJobFailureAt: string | null;
  recentEvents: MetricEvent[];
  uptimeSeconds: number;
}

interface QueueStatus {
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  rateLimit: {
    shortTermUsage: number;
    shortTermLimit: number;
    longTermUsage: number;
    longTermLimit: number;
    isPaused: boolean;
    pauseUntil: string | null;
    lastUpdated: string;
  };
  userJobs: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  metrics: MetricsSnapshot;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function QueueDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(5000);
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: status, isLoading, refetch, isRefetching, error } = useQuery<QueueStatus>({
    queryKey: ["/api/strava/queue/status"],
    refetchInterval: autoRefresh ? refreshInterval : false,
    enabled: !!user?.isAdmin,
  });

  // Admin check - redirect non-admins
  if (!authLoading && user && !user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">This page is only accessible to administrators.</p>
        <Button onClick={() => navigate("/dashboard")} data-testid="button-go-dashboard">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const shortTermPercent = status?.rateLimit 
    ? (status.rateLimit.shortTermUsage / status.rateLimit.shortTermLimit) * 100 
    : 0;
  const longTermPercent = status?.rateLimit 
    ? (status.rateLimit.longTermUsage / status.rateLimit.longTermLimit) * 100 
    : 0;

  const totalProcessed = status?.metrics?.jobsProcessed 
    ? Object.values(status.metrics.jobsProcessed).reduce((a, b) => a + b, 0) 
    : 0;
  const totalFailed = status?.metrics?.jobsFailed 
    ? Object.values(status.metrics.jobsFailed).reduce((a, b) => a + b, 0) 
    : 0;

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'job_processed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'job_failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rate_limit_pause':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'rate_limit_resume':
        return <Play className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadgeVariant = (event: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (event) {
      case 'job_processed':
        return "default";
      case 'job_failed':
        return "destructive";
      case 'rate_limit_pause':
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <Helmet>
        <title>Queue Dashboard | Admin | RunAnalytics</title>
      </Helmet>
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Strava Queue Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor job processing, rate limits, and system health
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={autoRefresh ? "default" : "secondary"} className="gap-1">
              {autoRefresh ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {autoRefresh ? "Auto-refresh" : "Paused"}
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="button-toggle-refresh"
            >
              {autoRefresh ? "Pause" : "Resume"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-manual-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-uptime">
                {status ? formatUptime(status.metrics.uptimeSeconds) : "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Jobs Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-jobs-processed">
                {totalProcessed}
              </div>
              <p className="text-xs text-muted-foreground">
                LIST: {status?.metrics.jobsProcessed['LIST_ACTIVITIES'] || 0} | 
                HYDRATE: {status?.metrics.jobsProcessed['HYDRATE_ACTIVITY'] || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Jobs Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-jobs-failed">
                {totalFailed}
              </div>
              <p className="text-xs text-muted-foreground">
                Last failure: {formatTimeAgo(status?.metrics.lastJobFailureAt || null)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Rate Limit Hits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-rate-limit-hits">
                {status?.metrics.rateLimitHits || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Last pause: {formatTimeAgo(status?.metrics.lastRateLimitPauseAt || null)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rate Limiter Status */}
        <Card className={status?.rateLimit.isPaused ? "border-yellow-500 border-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Rate Limiter Status
              {status?.rateLimit.isPaused && (
                <Badge variant="secondary" className="ml-2">
                  <Pause className="h-3 w-3 mr-1" />
                  Paused
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Strava API usage tracking (thresholds: 80/100 short-term, 900/1000 daily)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">15-Minute Window</span>
                <span className="text-sm text-muted-foreground">
                  {status?.rateLimit.shortTermUsage || 0} / {status?.rateLimit.shortTermLimit || 100}
                </span>
              </div>
              <Progress 
                value={shortTermPercent} 
                className={shortTermPercent >= 80 ? "bg-yellow-100" : ""}
                data-testid="progress-short-term"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Daily Window</span>
                <span className="text-sm text-muted-foreground">
                  {status?.rateLimit.longTermUsage || 0} / {status?.rateLimit.longTermLimit || 1000}
                </span>
              </div>
              <Progress 
                value={longTermPercent}
                className={longTermPercent >= 90 ? "bg-yellow-100" : ""}
                data-testid="progress-long-term"
              />
            </div>

            {status?.rateLimit.isPaused && status.rateLimit.pauseUntil && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Requests paused until: {new Date(status.rateLimit.pauseUntil).toLocaleTimeString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Queue Status
              </CardTitle>
              <CardDescription>Current job queue state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending</span>
                  <Badge variant="outline" data-testid="badge-pending">
                    {status?.queue.pending || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Processing</span>
                  <Badge variant="default" data-testid="badge-processing">
                    {status?.queue.processing || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid="badge-completed">
                    {status?.queue.completed || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed</span>
                  <Badge variant="destructive" data-testid="badge-failed">
                    {status?.queue.failed || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Delayed (rate limited)</span>
                  <Badge variant="secondary" data-testid="badge-delayed">
                    {status?.queue.delayed || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Your Jobs
              </CardTitle>
              <CardDescription>Jobs for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending</span>
                  <Badge variant="outline" data-testid="badge-user-pending">
                    {status?.userJobs.pending || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Processing</span>
                  <Badge variant="default" data-testid="badge-user-processing">
                    {status?.userJobs.processing || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid="badge-user-completed">
                    {status?.userJobs.completed || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed</span>
                  <Badge variant="destructive" data-testid="badge-user-failed">
                    {status?.userJobs.failed || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Events
            </CardTitle>
            <CardDescription>Last 50 system events</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {status?.metrics.recentEvents && status.metrics.recentEvents.length > 0 ? (
                <div className="space-y-2">
                  {status.metrics.recentEvents.map((event, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      data-testid={`event-${idx}`}
                    >
                      {getEventIcon(event.event)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={getEventBadgeVariant(event.event)} className="text-xs">
                            {event.event.replace(/_/g, ' ')}
                          </Badge>
                          {event.type && (
                            <span className="text-xs text-muted-foreground">
                              {event.type}
                            </span>
                          )}
                        </div>
                        {event.details && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {JSON.stringify(event.details)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No events yet
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
