import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Clock, MapPin, Heart, TrendingUp, Zap, Flame, ThumbsUp, MessageCircle, Trophy, Thermometer } from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";

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
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
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

        {/* Primary Metrics */}
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

        {/* Extended Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          {activity.calories && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Flame className="mr-2 h-4 w-4" />
                  Calories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{Math.round(activity.calories)}</div>
              </CardContent>
            </Card>
          )}

          {activity.averageCadence && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Activity className="mr-2 h-4 w-4" />
                  Cadence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{Math.round(activity.averageCadence)} spm</div>
              </CardContent>
            </Card>
          )}

          {activity.averageWatts && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Zap className="mr-2 h-4 w-4" />
                  Power
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{Math.round(activity.averageWatts)}W</div>
              </CardContent>
            </Card>
          )}

          {activity.sufferScore && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Suffer Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{activity.sufferScore}</div>
              </CardContent>
            </Card>
          )}

          {activity.averageTemp && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Thermometer className="mr-2 h-4 w-4" />
                  Temperature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{Math.round(activity.averageTemp)}°C</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Social Metrics */}
        {(activity.kudosCount > 0 || activity.commentsCount > 0 || activity.achievementCount > 0) && (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Kudos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{activity.kudosCount || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{activity.commentsCount || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Trophy className="mr-2 h-4 w-4" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{activity.achievementCount || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

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
                <div>
                  <p className="text-sm font-medium text-gray-600">Max Heart Rate</p>
                  <p className="text-gray-900">{Math.round(activity.maxHeartrate)} bpm</p>
                </div>
              )}
              {activity.maxCadence && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Max Cadence</p>
                  <p className="text-gray-900">{Math.round(activity.maxCadence)} spm</p>
                </div>
              )}
              {activity.maxWatts && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Max Power</p>
                  <p className="text-gray-900">{Math.round(activity.maxWatts)}W</p>
                </div>
              )}
              {activity.hasHeartrate && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Heart Rate Device</p>
                  <p className="text-gray-900">Connected</p>
                </div>
              )}
              {activity.deviceWatts && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Power Device</p>
                  <p className="text-gray-900">Connected</p>
                </div>
              )}
              {(activity.startLatitude && activity.startLongitude) && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Location</p>
                  <p className="text-gray-900 text-xs">{activity.startLatitude.toFixed(4)}, {activity.startLongitude.toFixed(4)}</p>
                </div>
              )}
              {(activity.endLatitude && activity.endLongitude) && (
                <div>
                  <p className="text-sm font-medium text-gray-600">End Location</p>
                  <p className="text-gray-900 text-xs">{activity.endLatitude.toFixed(4)}, {activity.endLongitude.toFixed(4)}</p>
                </div>
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
                    {activity.maxHeartrate && ` Peak effort reached ${Math.round(activity.maxHeartrate)} bpm.`}
                  </p>
                </div>
              )}

              {activity.averageCadence && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Running Form</h4>
                  <p className="text-sm text-purple-800">
                    Cadence of {Math.round(activity.averageCadence)} steps per minute is {
                      activity.averageCadence < 160 ? "below optimal range - consider increasing turnover" :
                      activity.averageCadence < 180 ? "in good range" :
                      activity.averageCadence < 190 ? "excellent - efficient running form" :
                      "very high - ensure you're not overstriding"
                    }.
                  </p>
                </div>
              )}

              {activity.sufferScore && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Training Load</h4>
                  <p className="text-sm text-red-800">
                    Suffer Score of {activity.sufferScore} indicates {
                      activity.sufferScore < 50 ? "easy recovery effort" :
                      activity.sufferScore < 100 ? "moderate training stress" :
                      activity.sufferScore < 150 ? "hard training session" :
                      "very intense workout requiring adequate recovery"
                    }.
                  </p>
                </div>
              )}

              {activity.averageWatts && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Power Output</h4>
                  <p className="text-sm text-yellow-800">
                    Average power of {Math.round(activity.averageWatts)}W demonstrates your mechanical efficiency during this run.
                    {activity.maxWatts && ` Peak power reached ${Math.round(activity.maxWatts)}W.`}
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

              {activity.calories && (
                <div className="p-4 bg-pink-50 rounded-lg">
                  <h4 className="font-medium text-pink-900 mb-2">Energy Expenditure</h4>
                  <p className="text-sm text-pink-800">
                    You burned approximately {Math.round(activity.calories)} calories during this {activity.formattedDuration} workout.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}