import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, Clock, TrendingUp, Zap } from "lucide-react";
import { Link } from "wouter";
import { StravaPoweredBy } from "@/components/StravaConnect";

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
}

export default function ActivitiesPage() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: activities, isLoading } = useQuery<ActivityData[]>({
    queryKey: ['/api/activities'],
    enabled: !!user,
  });

  const { data: dashboardData } = useQuery({
    queryKey: [`/api/dashboard/${user?.id}`],
    enabled: !!user,
  });

  const unitPreference = dashboardData?.user?.unitPreference || 'km';

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
          <p className="text-gray-600">Complete history of your running activities</p>
        </div>

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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
                <p className="text-gray-500">Connect to Strava and sync your activities to see them here.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <Link key={activity.id} href={`/activity/${activity.id}`}>
                      <div 
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        data-testid={`activity-item-${activity.id}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-strava-orange/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="h-5 w-5 text-strava-orange" />
                        </div>
                        
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
