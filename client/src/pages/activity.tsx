import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Clock, MapPin, Heart, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function ActivityPage() {
  const [match, params] = useRoute("/activity/:id");
  const activityId = params?.id;

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['/api/activities', activityId],
    queryFn: () => fetch(`/api/activities/${activityId}`).then(res => res.json()),
    enabled: !!activityId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!activityData?.activity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Activity Not Found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activity = activityData.activity;
  const distanceKm = (activity.distance / 1000).toFixed(2);
  const paceMinKm = activity.distance > 0 ? (activity.movingTime / 60) / (activity.distance / 1000) : 0;
  const paceDisplay = paceMinKm > 0 ? `${Math.floor(paceMinKm)}:${String(Math.round((paceMinKm % 1) * 60)).padStart(2, '0')}` : "0:00";
  const durationDisplay = `${Math.floor(activity.movingTime / 60)}:${String(activity.movingTime % 60).padStart(2, '0')}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{activity.name}</h1>
        <p className="text-gray-600">
          {new Date(activity.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Distance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{distanceKm} km</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{durationDisplay}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Pace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{paceDisplay} /km</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Heart className="mr-2 h-4 w-4" />
              Avg HR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Route Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-600">Route visualization</p>
                <p className="text-sm text-gray-500">GPS data from Strava activity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <p className="text-gray-900">{activity.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Elevation Gain</p>
                <p className="text-gray-900">{activity.totalElevationGain} m</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average Speed</p>
                <p className="text-gray-900">{(activity.averageSpeed * 3.6).toFixed(1)} km/h</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Max Speed</p>
                <p className="text-gray-900">{(activity.maxSpeed * 3.6).toFixed(1)} km/h</p>
              </div>
              {activity.maxHeartrate && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Max Heart Rate</p>
                    <p className="text-gray-900">{Math.round(activity.maxHeartrate)} bpm</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Pace Analysis</h4>
                <p className="text-sm text-blue-800">
                  Your average pace of {paceDisplay} /km shows {paceMinKm < 5 ? "strong" : paceMinKm < 6 ? "moderate" : "easy"} effort intensity.
                </p>
              </div>
              
              {activity.averageHeartrate && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Heart Rate Zone</h4>
                  <p className="text-sm text-green-800">
                    Average HR of {Math.round(activity.averageHeartrate)} bpm indicates {
                      activity.averageHeartrate < 140 ? "aerobic base" : 
                      activity.averageHeartrate < 160 ? "aerobic threshold" : 
                      "anaerobic"
                    } training zone.
                  </p>
                </div>
              )}

              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Elevation Challenge</h4>
                <p className="text-sm text-orange-800">
                  {activity.totalElevationGain > 100 ? 
                    `Significant elevation gain of ${activity.totalElevationGain}m added challenge to this run.` :
                    activity.totalElevationGain > 50 ?
                    `Moderate elevation gain of ${activity.totalElevationGain}m provided good hill training.` :
                    `Flat route with ${activity.totalElevationGain}m elevation gain - great for speed work.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}