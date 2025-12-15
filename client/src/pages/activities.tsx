import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Calendar, Clock, TrendingUp, Zap, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Link } from "wouter";
import { StravaPoweredBy } from "@/components/StravaConnect";
import { useState } from "react";

interface ActivityData {
  id: number;
  stravaId: string;
  name: string;
  distance: number;
  movingTime: number;
  totalElevationGain: number;
  averageSpeed: number;
  startDate: string;
  type: string;
  averageHeartrate?: number;
  grade?: "A" | "B" | "C" | "D" | "F";
}

const gradeColors: Record<string, string> = {
  A: "bg-gradient-to-br from-emerald-500 to-green-600",
  B: "bg-gradient-to-br from-blue-500 to-indigo-600",
  C: "bg-gradient-to-br from-yellow-500 to-amber-600",
  D: "bg-gradient-to-br from-orange-500 to-red-500",
  F: "bg-gradient-to-br from-red-600 to-rose-700"
};

const gradeDescriptions: Record<string, string> = {
  A: "Excellent! Above average distance & pace",
  B: "Great run, better than your typical effort",
  C: "Solid effort, right at your average",
  D: "Lighter session, below your usual",
  F: "Recovery run or short session"
};

interface ActivitiesResponse {
  activities: ActivityData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ActivitiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [minDistance, setMinDistance] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: response, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ['/api/activities', page, pageSize, minDistance, maxDistance, startDate, endDate],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (minDistance) params.append('minDistance', minDistance);
      if (maxDistance) params.append('maxDistance', maxDistance);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/activities?${params.toString()}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
  });

  const { data: dashboardData } = useQuery({
    queryKey: [`/api/dashboard/${user?.id}`],
    enabled: !!user,
  });

  const unitPreference = dashboardData?.user?.unitPreference || 'km';
  const activities = response?.activities || [];
  const totalPages = response?.totalPages || 1;

  const formatDistance = (meters: number) => {
    if (unitPreference === 'miles') {
      const miles = meters / 1609.34;
      return miles.toFixed(2);
    }
    return (meters / 1000).toFixed(2);
  };

  const formatPace = (speedMps: number) => {
    if (unitPreference === 'miles') {
      const minutesPerMile = 26.8224 / speedMps;
      const minutes = Math.floor(minutesPerMile);
      const seconds = Math.round((minutesPerMile - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    const minutesPerKm = 16.6667 / speedMps;
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleClearFilters = () => {
    setMinDistance("");
    setMaxDistance("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters = minDistance || maxDistance || startDate || endDate;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Activities</h1>
          <p className="text-gray-600">
            {response?.total ? `${response.total} total activities` : 'Complete history of your running activities'}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="toggle-filters"
              >
                {showFilters ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Min Distance ({unitPreference === 'miles' ? 'mi' : 'km'})
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={minDistance}
                    onChange={(e) => {
                      setMinDistance(e.target.value);
                      setPage(1);
                    }}
                    placeholder="0"
                    data-testid="input-min-distance"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Max Distance ({unitPreference === 'miles' ? 'mi' : 'km'})
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={maxDistance}
                    onChange={(e) => {
                      setMaxDistance(e.target.value);
                      setPage(1);
                    }}
                    placeholder="100"
                    data-testid="input-max-distance"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : !activities || activities.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {hasActiveFilters ? 'No activities match your filters' : 'No activities yet'}
                </h3>
                <p className="text-gray-500">
                  {hasActiveFilters 
                    ? 'Try adjusting your filter criteria.' 
                    : 'Connect to Strava and sync your activities to see them here.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleClearFilters}
                    data-testid="button-clear-filters-empty"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {hasActiveFilters 
                      ? `${activities.length} Filtered Activities (${response?.total} total)`
                      : `${activities.length} Activities`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <Link key={activity.id} href={`/activity/${activity.id}`}>
                      <div 
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        data-testid={`activity-item-${activity.id}`}
                      >
                        {activity.grade ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-md flex-shrink-0 cursor-help ${gradeColors[activity.grade]}`} data-testid={`grade-badge-${activity.id}`}>
                                  {activity.grade}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-semibold">Run Score: {activity.grade}</p>
                                <p className="text-xs text-muted-foreground">{gradeDescriptions[activity.grade]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-strava-orange/10 flex items-center justify-center flex-shrink-0">
                            <Activity className="h-5 w-5 text-strava-orange" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-charcoal truncate">{activity.name}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(activity.startDate)}</span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <div className="font-semibold text-charcoal">
                              {formatDistance(activity.distance)} {unitPreference === 'miles' ? 'mi' : 'km'}
                            </div>
                            <div className="text-gray-600">Distance</div>
                          </div>

                          <div className="text-right">
                            <div className="font-semibold text-charcoal">
                              {formatPace(activity.averageSpeed)} /{unitPreference === 'miles' ? 'mi' : 'km'}
                            </div>
                            <div className="text-gray-600">Pace</div>
                          </div>

                          <div className="text-right">
                            <div className="font-semibold text-charcoal">
                              {formatDuration(activity.movingTime)}
                            </div>
                            <div className="text-gray-600">Time</div>
                          </div>

                          <div className="text-right">
                            <div className="font-semibold text-charcoal">
                              {Math.round(activity.totalElevationGain)} m
                            </div>
                            <div className="text-gray-600">Elevation</div>
                          </div>

                          {activity.averageHeartrate && (
                            <div className="text-right">
                              <div className="font-semibold text-charcoal flex items-center gap-1">
                                <Zap className="h-3 w-3 text-red-500" />
                                {Math.round(activity.averageHeartrate)}
                              </div>
                              <div className="text-gray-600">Avg HR</div>
                            </div>
                          )}
                        </div>

                        <div className="md:hidden text-right">
                          <div className="font-semibold text-charcoal">
                            {formatDistance(activity.distance)} {unitPreference === 'miles' ? 'mi' : 'km'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDuration(activity.movingTime)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
                  <StravaPoweredBy variant="orange" size="sm" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
