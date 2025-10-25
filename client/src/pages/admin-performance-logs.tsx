import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Filter, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface PerformanceLog {
  id: number;
  userId: number | null;
  endpoint: string;
  method: string;
  statusCode: number;
  elapsedTime: number;
  timestamp: Date;
}

export default function AdminPerformanceLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Filter state
  const [limit, setLimit] = useState("100");
  const [method, setMethod] = useState<string>("");
  const [endpoint, setEndpoint] = useState<string>("");
  const [minStatus, setMinStatus] = useState<string>("");
  const [maxStatus, setMaxStatus] = useState<string>("");

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  // Build query params
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', limit);
  if (method) queryParams.append('method', method);
  if (endpoint) queryParams.append('endpoint', endpoint);
  if (minStatus) queryParams.append('minStatusCode', minStatus);
  if (maxStatus) queryParams.append('maxStatusCode', maxStatus);

  const { data, isLoading, refetch } = useQuery<{ logs: PerformanceLog[]; count: number }>({
    queryKey: ["/api/admin/performance-logs", queryParams.toString()],
    enabled: !!user && user.isAdmin,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  const logs = data?.logs || [];
  const avgResponseTime = logs.length > 0
    ? logs.reduce((sum, log) => sum + log.elapsedTime, 0) / logs.length
    : 0;

  const successfulRequests = logs.filter(log => log.statusCode >= 200 && log.statusCode < 300).length;
  const errorRequests = logs.filter(log => log.statusCode >= 400).length;
  const successRate = logs.length > 0 ? (successfulRequests / logs.length) * 100 : 0;

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="default" className="bg-green-500">{ {statusCode}}</Badge>;
    } else if (statusCode >= 300 && statusCode < 400) {
      return <Badge variant="secondary">{statusCode}</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge variant="destructive">{statusCode}</Badge>;
    } else {
      return <Badge variant="destructive" className="bg-red-700">{statusCode}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500",
      POST: "bg-green-600",
      PUT: "bg-orange-500",
      DELETE: "bg-red-600",
      PATCH: "bg-purple-500",
    };
    return <Badge className={colors[method] || "bg-gray-500"}>{method}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance Logs</h1>
            <p className="text-muted-foreground">Real-time API performance monitoring</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">
                Last {limit} requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground">
                {avgResponseTime < 500 ? (
                  <span className="text-green-500 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Excellent performance
                  </span>
                ) : avgResponseTime < 1000 ? (
                  <span className="text-yellow-500">Good performance</span>
                ) : (
                  <span className="text-red-500 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Needs attention
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {successfulRequests} successful, {errorRequests} errors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Limit</label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="100"
                  data-testid="filter-limit"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Method</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger data-testid="filter-method">
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint</label>
                <Input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="e.g. /api/dashboard"
                  data-testid="filter-endpoint"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Min Status</label>
                <Input
                  type="number"
                  value={minStatus}
                  onChange={(e) => setMinStatus(e.target.value)}
                  placeholder="200"
                  data-testid="filter-min-status"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Status</label>
                <Input
                  type="number"
                  value={maxStatus}
                  onChange={(e) => setMaxStatus(e.target.value)}
                  placeholder="599"
                  data-testid="filter-max-status"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Request Logs ({data?.count || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                        <TableCell className="font-mono text-xs" data-testid={`log-timestamp-${log.id}`}>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell data-testid={`log-method-${log.id}`}>
                          {getMethodBadge(log.method)}
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`log-endpoint-${log.id}`}>
                          {log.endpoint}
                        </TableCell>
                        <TableCell data-testid={`log-status-${log.id}`}>
                          {getStatusBadge(log.statusCode)}
                        </TableCell>
                        <TableCell data-testid={`log-time-${log.id}`}>
                          <span className={log.elapsedTime > 1000 ? "text-red-500 font-semibold" : ""}>
                            {log.elapsedTime}ms
                          </span>
                        </TableCell>
                        <TableCell data-testid={`log-user-${log.id}`}>
                          {log.userId || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
