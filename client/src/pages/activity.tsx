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
            <div className="text-2xl font-bold text-gray-900">{activity.formattedDistance} {activity.distanceUnit}</div>
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
            <div className="text-2xl font-bold text-gray-900">{activity.formattedDuration}</div>
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
            <div className="text-2xl font-bold text-gray-900">{activity.formattedPace} {activity.paceUnit}</div>
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
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 relative">
                {/* Simulated route path */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                  <path
                    d="M50,150 Q100,100 150,120 T250,110 Q300,90 350,100"
                    stroke="#FC4C02"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Start marker */}
                  <circle cx="50" cy="150" r="6" fill="#22C55E" stroke="white" strokeWidth="2"/>
                  {/* End marker */}
                  <circle cx="350" cy="100" r="6" fill="#EF4444" stroke="white" strokeWidth="2"/>
                </svg>
                
                {/* Map overlay info */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Start</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700">End</span>
                    </div>
                  </div>
                </div>
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
                <p className="text-gray-900">{activity.formattedSpeed} {activity.speedUnit}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Max Speed</p>
                <p className="text-gray-900">{activity.formattedMaxSpeed} {activity.speedUnit}</p>
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
                  Your average pace of {activity.formattedPace} {activity.paceUnit} shows consistent effort throughout the activity.
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