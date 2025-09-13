import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Activity, Mail, TrendingUp, Calendar, Shield, Database, BarChart3, Clock, Target, Signal, Server, Cpu, HardDrive, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AdminStats {
  totalUsers: number;
  connectedUsers: number;
  totalActivities: number;
  totalWaitlistEmails: number;
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

interface WaitlistEmail {
  id: number;
  email: string;
  createdAt: string;
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
    type: string;
    message: string;
    endpoint?: string;
  }>;
  performanceTrend: Array<{
    timestamp: string;
    responseTime: number;
    requestCount: number;
    errorCount: number;
  }>;
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user,
  });

  const { data: waitlistEmails, isLoading: waitlistLoading } = useQuery<WaitlistEmail[]>({
    queryKey: ["/api/admin/waitlist"],
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-strava-orange" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600 mt-2">Platform overview and user management</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <CardTitle className="text-sm font-medium">Waitlist Emails</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalWaitlistEmails}</div>
              <p className="text-xs text-muted-foreground">
                Signed up for updates
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
                    <div key={index} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-red-800" data-testid={`error-type-${index}`}>
                            {error.type}
                          </span>
                          {error.endpoint && (
                            <Badge variant="outline" className="text-xs">
                              {error.endpoint}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-red-700 mb-1" data-testid={`error-message-${index}`}>
                          {error.message}
                        </p>
                        <p className="text-xs text-red-600">
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
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
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
                  {users?.map((user) => (
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

        {/* Waitlist Emails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Waitlist Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            {waitlistLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
                <p>Loading waitlist...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlistEmails?.length ? (
                    waitlistEmails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="font-medium">{email.email}</TableCell>
                        <TableCell>{formatDate(email.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                        No waitlist emails yet
                      </TableCell>
                    </TableRow>
                  )}
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