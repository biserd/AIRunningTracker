import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Clock, MapPin, Heart, TrendingUp, Zap, Flame, Thermometer } from "lucide-react";
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
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{activity.name}</h1>
          <p className="text-gray-600 text-lg">
            {new Date(activity.startDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Primary Metrics */}
        <div className="border-b border-gray-200 pb-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Distance</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{activity.formattedDistance}</div>
              <div className="text-sm text-gray-500">{activity.distanceUnit}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Duration</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{activity.formattedDuration}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Pace</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{activity.formattedPace}</div>
              <div className="text-sm text-gray-500">{activity.paceUnit}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Heart className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Avg HR</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {activity.averageHeartrate ? Math.round(activity.averageHeartrate) : "N/A"}
              </div>
              {activity.averageHeartrate && <div className="text-sm text-gray-500">bpm</div>}
            </div>
          </div>
        </div>

        {/* Activity Details */}
        <div className="border-b border-gray-200 pb-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Activity Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Type</p>
              <p className="text-gray-900 font-medium">{activity.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Elevation Gain</p>
              <p className="text-gray-900 font-medium">{activity.totalElevationGain} m</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Average Speed</p>
              <p className="text-gray-900 font-medium">{activity.formattedSpeed} {activity.speedUnit}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Max Speed</p>
              <p className="text-gray-900 font-medium">{activity.formattedMaxSpeed} {activity.speedUnit}</p>
            </div>
            {activity.maxHeartrate && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Max Heart Rate</p>
                <p className="text-gray-900 font-medium">{Math.round(activity.maxHeartrate)} bpm</p>
              </div>
            )}
            {activity.maxCadence && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Max Cadence</p>
                <p className="text-gray-900 font-medium">{Math.round(activity.maxCadence)} spm</p>
              </div>
            )}
            {activity.maxWatts && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Max Power</p>
                <p className="text-gray-900 font-medium">{Math.round(activity.maxWatts)}W</p>
              </div>
            )}
            {(activity.startLatitude && activity.startLongitude) && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Start Location</p>
                <p className="text-gray-900 font-medium text-xs">{activity.startLatitude.toFixed(4)}, {activity.startLongitude.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Extended Metrics */}
        {(activity.calories || activity.averageCadence || activity.averageWatts || activity.sufferScore || activity.averageTemp) && (
          <div className="border-b border-gray-200 pb-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Data</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {activity.calories && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Calories</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{Math.round(activity.calories)}</div>
                </div>
              )}

              {activity.averageCadence && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Activity className="h-5 w-5 text-indigo-600 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Cadence</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{Math.round(activity.averageCadence)}</div>
                  <div className="text-sm text-gray-500">spm</div>
                </div>
              )}

              {activity.averageWatts && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Power</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{Math.round(activity.averageWatts)}</div>
                  <div className="text-sm text-gray-500">W</div>
                </div>
              )}

              {activity.sufferScore && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Suffer Score</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{activity.sufferScore}</div>
                </div>
              )}

              {activity.averageTemp && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Thermometer className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Temperature</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{Math.round(activity.averageTemp)}</div>
                  <div className="text-sm text-gray-500">°C</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Route Map */}
        <div className="border-b border-gray-200 pb-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Route Map</h2>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 relative">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                <path
                  d="M50,150 Q100,100 150,120 T250,110 Q300,90 350,100"
                  stroke="#FC4C02"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="150" r="6" fill="#22C55E" stroke="white" strokeWidth="2"/>
                <circle cx="350" cy="100" r="6" fill="#EF4444" stroke="white" strokeWidth="2"/>
              </svg>
              
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
        </div>

        {/* Performance Analysis */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Analysis</h2>
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Pace Analysis</h4>
              <p className="text-blue-800">
                Your average pace of {activity.formattedPace} {activity.paceUnit} shows consistent effort throughout the activity.
              </p>
            </div>
            
            {activity.averageHeartrate && (
              <div className="p-6 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-3">Heart Rate Zone</h4>
                <p className="text-green-800">
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
              <div className="p-6 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-3">Running Form</h4>
                <p className="text-purple-800">
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
              <div className="p-6 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-3">Training Load</h4>
                <p className="text-red-800">
                  Suffer score of {activity.sufferScore} indicates {
                    activity.sufferScore < 50 ? "low intensity training" :
                    activity.sufferScore < 100 ? "moderate training load" :
                    activity.sufferScore < 150 ? "challenging workout" :
                    "very demanding session"
                  }. Allow adequate recovery time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}