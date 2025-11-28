import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Activity, TrendingUp, Calendar, Shield, Database, BarChart3, Clock, Target, Signal, Server, Cpu, HardDrive, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";

interface AdminStats {
  totalUsers: number;
  connectedUsers: number;
  totalActivities: number;
  recentUsers: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    stravaConnected: boolean;
    createdAt: string;
  }[];
  recentActivities: {
    id: number;
    userId: number;
    name: string;
    distance: number;
    movingTime: number;
    startDate: string;
  }[];
}

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  stravaConnected: boolean;
  unitPreference: string;
  isAdmin: boolean;
  createdAt: string;
  lastSyncAt?: string;
}

interface UserAnalytics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgActivitiesPerUser: number;
  avgDistancePerActivity: number;
  avgTimePerActivity: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  syncSuccessRate: number;
  topActivityTypes: Array<{ type: string; count: number }>;
  userGrowthTrend: Array<{ date: string; count: number }>;
  activityTrend: Array<{ date: string; count: number }>;
}

interface SystemPerformance {
  apiMetrics: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    requestsPerHour: number;
  };
  databaseMetrics: {
    connectionStatus: 'healthy' | 'warning' | 'error';
    avgQueryTime: number;
    slowQueries: number;
    totalQueries: number;
  };
  systemHealth: {
    uptime: number;
    memoryUsage: number;
    diskUsage: number;
    status: 'operational' | 'degraded' | 'down';
  };
  recentErrors: Array<{
    timestamp: string;
    statusCode: number;
    endpoint: string;
    method: string;
    userId?: number | null;
    errorMessage?: string | null;
    errorDetails?: string | null;
    elapsedTime?: number | null;
    requestBody?: string | null;
    responseBody?: string | null;
  }>;
  performanceTrend: Array<{
    timestamp: string;
    responseTime: number;
    requestCount: number;
    errorCount: number;
  }>;
  slowRequests: Array<{
    timestamp: string;
    endpoint: string;
    method: string;
    userId?: number | null;
    elapsedTime: number;
    statusCode: number;
    requestBody?: string | null;
    responseBody?: string | null;
  }>;
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[], total: number }>({
    queryKey: ["/api/admin/users", page, pageSize],
    enabled: !!user,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<UserAnalytics>({
    queryKey: ["/api/admin/analytics"],
    enabled: !!user,
  });

  const { data: performance, isLoading: performanceLoading } = useQuery<SystemPerformance>({
    queryKey: ["/api/admin/performance"],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time monitoring
  });

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive"
      });
      setLocation("/dashboard");
    }
  }, [user, authLoading, toast, setLocation]);

  // Don't render if user is not admin
  if (authLoading || !user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-strava-orange" />
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
              <p className="text-gray-600 mt-2">Platform overview and user management</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setLocation('/admin/shoes')}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-shoes-admin"
              >
                <ShoppingBag className="h-4 w-4" />
                Shoe Database
              </Button>
              <Button 
                onClick={() => setLocation('/admin/performance-logs')}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-performance-logs"
              >
                <Server className="h-4 w-4" />
                Performance Logs
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "-" : stats?.connectedUsers} connected to Strava
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalActivities}</div>
              <p className="text-xs text-muted-foreground">
                Synced from Strava
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "-" : stats?.totalUsers ? Math.round((stats.connectedUsers / stats.totalUsers) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Users with Strava connected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Analytics Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Usage Analytics</h2>
            <p className="text-gray-600">Detailed platform usage and engagement metrics</p>
          </div>

          {/* Activity Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-daily-active-users">
                  {analyticsLoading ? "-" : analytics?.dailyActiveUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users with activities today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-weekly-active-users">
                  {analyticsLoading ? "-" : analytics?.weeklyActiveUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users active in last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-monthly-active-users">
                  {analyticsLoading ? "-" : analytics?.monthlyActiveUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users active in last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-new-users-today">
                  {analyticsLoading ? "-" : analytics?.newUsersToday}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyticsLoading ? "-" : analytics?.newUsersThisWeek} this week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Usage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Activities/User</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-avg-activities-per-user">
                  {analyticsLoading ? "-" : analytics?.avgActivitiesPerUser}
                </div>
                <p className="text-xs text-muted-foreground">
                  Activities per user average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Distance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-avg-distance">
                  {analyticsLoading ? "-" : `${analytics?.avgDistancePerActivity}km`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average per activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-avg-duration">
                  {analyticsLoading ? "-" : `${analytics?.avgTimePerActivity}min`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average per activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Success Rate</CardTitle>
                <Signal className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-sync-success-rate">
                  {analyticsLoading ? "-" : `${analytics?.syncSuccessRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users synced in last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  User Growth Trend (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics?.userGrowthTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any) => [value, 'New Users']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={{ fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activity Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Trend (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics?.activityTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any) => [value, 'Activities']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={{ fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Activity Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Activity Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
                  <p>Loading activity types...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {analytics?.topActivityTypes.map((type, index) => (
                      <div key={type.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ 
                              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5] 
                            }}
                          />
                          <span className="font-medium" data-testid={`activity-type-${type.type.toLowerCase()}`}>
                            {type.type}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900" data-testid={`activity-count-${type.type.toLowerCase()}`}>
                          {type.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analytics?.topActivityTypes}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analytics?.topActivityTypes.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Monitoring Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Performance</h2>
            <p className="text-gray-600">Real-time system health metrics and performance monitoring</p>
          </div>

          {/* System Health Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                {performanceLoading ? (
                  <Server className="h-4 w-4 text-muted-foreground" />
                ) : (
                  getStatusIcon(performance?.systemHealth.status || 'operational')
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(performance?.systemHealth.status || 'operational')}`} data-testid="system-status">
                    {performanceLoading ? "Loading..." : (performance?.systemHealth.status || 'operational').charAt(0).toUpperCase() + (performance?.systemHealth.status || 'operational').slice(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Uptime: {performanceLoading ? "-" : formatUptime(performance?.systemHealth.uptime || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                {performanceLoading ? (
                  <Database className="h-4 w-4 text-muted-foreground" />
                ) : (
                  getStatusIcon(performance?.databaseMetrics.connectionStatus || 'healthy')
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(performance?.databaseMetrics.connectionStatus || 'healthy')}`} data-testid="database-status">
                    {performanceLoading ? "Loading..." : (performance?.databaseMetrics.connectionStatus || 'healthy').charAt(0).toUpperCase() + (performance?.databaseMetrics.connectionStatus || 'healthy').slice(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Avg Query: {performanceLoading ? "-" : `${performance?.databaseMetrics.avgQueryTime}ms`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="memory-usage">
                  {performanceLoading ? "-" : `${performance?.systemHealth.memoryUsage}%`}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${(performance?.systemHealth.memoryUsage || 0) > 80 ? 'bg-red-500' : (performance?.systemHealth.memoryUsage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${performance?.systemHealth.memoryUsage || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="disk-usage">
                  {performanceLoading ? "-" : `${performance?.systemHealth.diskUsage}%`}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${(performance?.systemHealth.diskUsage || 0) > 80 ? 'bg-red-500' : (performance?.systemHealth.diskUsage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${performance?.systemHealth.diskUsage || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests/Hour</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="requests-per-hour">
                  {performanceLoading ? "-" : performance?.apiMetrics.requestsPerHour}
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceLoading ? "-" : `${performance?.apiMetrics.totalRequests} total requests`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="avg-response-time">
                  {performanceLoading ? "-" : `${performance?.apiMetrics.avgResponseTime}ms`}
                </div>
                <p className="text-xs text-muted-foreground">
                  API endpoint response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="error-rate">
                  {performanceLoading ? "-" : `${performance?.apiMetrics.errorRate}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Failed requests percentage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="total-queries">
                  {performanceLoading ? "-" : performance?.databaseMetrics.totalQueries}
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceLoading ? "-" : `${performance?.databaseMetrics.slowQueries} slow queries`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Trend (6 Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performance?.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    />
                    <YAxis yAxisId="responseTime" orientation="left" />
                    <YAxis yAxisId="requests" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                      formatter={(value: any, name: string) => {
                        if (name === 'responseTime') return [`${value}ms`, 'Response Time'];
                        if (name === 'requestCount') return [value, 'Requests'];
                        if (name === 'errorCount') return [value, 'Errors'];
                        return [value, name];
                      }}
                    />
                    <Line 
                      yAxisId="responseTime"
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      name="responseTime"
                    />
                    <Line 
                      yAxisId="requests"
                      type="monotone" 
                      dataKey="requestCount" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name="requestCount"
                    />
                    <Line 
                      yAxisId="requests"
                      type="monotone" 
                      dataKey="errorCount" 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      name="errorCount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
                  <p>Loading errors...</p>
                </div>
              ) : performance?.recentErrors.length ? (
                <div className="space-y-3">
                  {performance.recentErrors.map((error, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge 
                            variant={error.statusCode >= 500 ? "destructive" : "outline"} 
                            className="font-medium"
                            data-testid={`error-status-${index}`}
                          >
                            {error.statusCode} {error.method}
                          </Badge>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {error.endpoint}
                          </span>
                          {error.userId && (
                            <Badge variant="secondary" className="text-xs">
                              User {error.userId}
                            </Badge>
                          )}
                          {error.elapsedTime && error.elapsedTime > 10000 && (
                            <Badge variant="destructive" className="text-xs">
                              SLOW {(error.elapsedTime / 1000).toFixed(1)}s
                            </Badge>
                          )}
                        </div>
                        {error.errorMessage && (
                          <p className="text-sm font-medium text-red-700 dark:text-red-400 mt-1">
                            {error.errorMessage}
                          </p>
                        )}
                        {error.errorDetails && (
                          <details className="mt-1">
                            <summary className="text-xs text-red-600 dark:text-red-500 cursor-pointer hover:underline">
                              View error details
                            </summary>
                            <pre className="text-xs text-red-700 dark:text-red-400 mt-1 p-2 bg-red-100 dark:bg-red-900 rounded overflow-x-auto">
                              {error.errorDetails}
                            </pre>
                          </details>
                        )}
                        {error.requestBody && (
                          <details className="mt-1">
                            <summary className="text-xs text-red-600 dark:text-red-500 cursor-pointer hover:underline">
                              View request
                            </summary>
                            <pre className="text-xs text-red-700 dark:text-red-400 mt-1 p-2 bg-red-100 dark:bg-red-900 rounded overflow-x-auto">
                              {error.requestBody}
                            </pre>
                          </details>
                        )}
                        {error.responseBody && (
                          <details className="mt-1">
                            <summary className="text-xs text-red-600 dark:text-red-500 cursor-pointer hover:underline">
                              View response
                            </summary>
                            <pre className="text-xs text-red-700 dark:text-red-400 mt-1 p-2 bg-red-100 dark:bg-red-900 rounded overflow-x-auto">
                              {error.responseBody}
                            </pre>
                          </details>
                        )}
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          {new Date(error.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>No recent errors detected</p>
                  <p className="text-xs text-gray-400 mt-1">System is running smoothly</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Slow Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Slow Requests (&gt;10s)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
                  <p>Loading slow requests...</p>
                </div>
              ) : performance?.slowRequests?.length ? (
                <div className="space-y-3">
                  {performance.slowRequests.map((request, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-100 dark:border-orange-900 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="destructive" className="font-medium" data-testid={`slow-request-time-${index}`}>
                            {(request.elapsedTime / 1000).toFixed(1)}s
                          </Badge>
                          <Badge variant={request.statusCode >= 400 ? "destructive" : "outline"} className="text-xs">
                            {request.statusCode} {request.method}
                          </Badge>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {request.endpoint}
                          </span>
                          {request.userId && (
                            <Badge variant="secondary" className="text-xs">
                              User {request.userId}
                            </Badge>
                          )}
                        </div>
                        {request.requestBody && (
                          <details className="mt-1">
                            <summary className="text-xs text-orange-600 dark:text-orange-500 cursor-pointer hover:underline">
                              View request
                            </summary>
                            <pre className="text-xs text-orange-700 dark:text-orange-400 mt-1 p-2 bg-orange-100 dark:bg-orange-900 rounded overflow-x-auto">
                              {request.requestBody}
                            </pre>
                          </details>
                        )}
                        {request.responseBody && (
                          <details className="mt-1">
                            <summary className="text-xs text-orange-600 dark:text-orange-500 cursor-pointer hover:underline">
                              View response
                            </summary>
                            <pre className="text-xs text-orange-700 dark:text-orange-400 mt-1 p-2 bg-orange-100 dark:bg-orange-900 rounded overflow-x-auto">
                              {request.responseBody}
                            </pre>
                          </details>
                        )}
                        <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                          {new Date(request.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>No slow requests detected</p>
                  <p className="text-xs text-gray-400 mt-1">All requests are performing well</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users {usersData && `(${usersData.total})`}
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-20" data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {usersData ? Math.ceil(usersData.total / pageSize) : 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!usersData || page >= Math.ceil(usersData.total / pageSize)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
                <p>Loading users...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Strava</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.email.split('@')[0]}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.stravaConnected ? "default" : "secondary"}>
                          {user.stravaConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.unitPreference}</TableCell>
                      <TableCell>
                        {user.isAdmin && <Badge variant="outline">Admin</Badge>}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        {user.lastSyncAt ? formatDate(user.lastSyncAt) : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>


        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
                <p>Loading activities...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>{activity.userId}</TableCell>
                      <TableCell>{formatDistance(activity.distance)}</TableCell>
                      <TableCell>{formatDuration(activity.movingTime)}</TableCell>
                      <TableCell>{formatDate(activity.startDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}