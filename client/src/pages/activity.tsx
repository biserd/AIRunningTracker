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
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
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
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Main Stats Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h2>
          
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activity.formattedDistance}</div>
              <div className="text-sm text-gray-600">{activity.distanceUnit}</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activity.formattedDuration}</div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{activity.formattedPace}</div>
              <div className="text-sm text-gray-600">{activity.paceUnit}</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <Heart className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {activity.averageHeartrate ? Math.round(activity.averageHeartrate) : "N/A"}
              </div>
              <div className="text-sm text-gray-600">Avg HR</div>
            </div>
          </div>

          {/* Performance Metrics */}
          {(activity.calories || activity.averageCadence || activity.averageWatts || activity.sufferScore || activity.averageTemp) && (
            <div>
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {activity.calories && (
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <Flame className="h-5 w-5 text-orange-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{Math.round(activity.calories)}</div>
                      <div className="text-xs text-gray-600">Calories</div>
                    </div>
                  )}
                  {activity.averageCadence && (
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <Activity className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{Math.round(activity.averageCadence)}</div>
                      <div className="text-xs text-gray-600">Cadence</div>
                    </div>
                  )}
                  {activity.averageWatts && (
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{Math.round(activity.averageWatts)}</div>
                      <div className="text-xs text-gray-600">Power</div>
                    </div>
                  )}
                  {activity.sufferScore && (
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-red-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{activity.sufferScore}</div>
                      <div className="text-xs text-gray-600">Suffer Score</div>
                    </div>
                  )}
                  {activity.averageTemp && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Thermometer className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-gray-900">{Math.round(activity.averageTemp)}</div>
                      <div className="text-xs text-gray-600">Temp (°C)</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          
          {/* Route Map */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route</h3>
            <div className="aspect-video bg-gradient-to-br from-blue-100 via-green-100 to-purple-100 rounded-lg relative overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:"#22C55E", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#EF4444", stopOpacity:1}} />
                  </linearGradient>
                </defs>
                <path
                  d="M50,150 Q100,100 150,120 T250,110 Q300,90 350,100"
                  stroke="url(#routeGradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="150" r="8" fill="#22C55E" stroke="white" strokeWidth="3"/>
                <circle cx="350" cy="100" r="8" fill="#EF4444" stroke="white" strokeWidth="3"/>
              </svg>
              
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Start</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Finish</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Type</div>
                  <div className="text-gray-900 font-semibold">{activity.type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Elevation Gain</div>
                  <div className="text-gray-900 font-semibold">{activity.totalElevationGain} m</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Avg Speed</div>
                  <div className="text-gray-900 font-semibold">{activity.formattedSpeed} {activity.speedUnit}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Max Speed</div>
                  <div className="text-gray-900 font-semibold">{activity.formattedMaxSpeed} {activity.speedUnit}</div>
                </div>
                {activity.maxHeartrate && (
                  <div>
                    <div className="text-sm font-medium text-gray-600">Max HR</div>
                    <div className="text-gray-900 font-semibold">{Math.round(activity.maxHeartrate)} bpm</div>
                  </div>
                )}
                {activity.maxCadence && (
                  <div>
                    <div className="text-sm font-medium text-gray-600">Max Cadence</div>
                    <div className="text-gray-900 font-semibold">{Math.round(activity.maxCadence)} spm</div>
                  </div>
                )}
                {activity.maxWatts && (
                  <div>
                    <div className="text-sm font-medium text-gray-600">Max Power</div>
                    <div className="text-gray-900 font-semibold">{Math.round(activity.maxWatts)}W</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Performance Analysis */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analysis</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Pace Analysis</h4>
              <p className="text-sm text-blue-800">
                Your average pace of {activity.formattedPace} {activity.paceUnit} shows consistent effort throughout the activity.
              </p>
            </div>
            
            {activity.averageHeartrate && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Heart Rate Zone</h4>
                <p className="text-sm text-green-800">
                  Average HR of {Math.round(activity.averageHeartrate)} bpm indicates {
                    activity.averageHeartrate < 140 ? "aerobic base" : 
                    activity.averageHeartrate < 160 ? "aerobic threshold" : 
                    "anaerobic"
                  } training zone.
                </p>
              </div>
            )}

            {activity.averageCadence && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Running Form</h4>
                <p className="text-sm text-purple-800">
                  Cadence of {Math.round(activity.averageCadence)} spm is {
                    activity.averageCadence < 160 ? "below optimal range" :
                    activity.averageCadence < 180 ? "in good range" :
                    activity.averageCadence < 190 ? "excellent form" :
                    "very high turnover"
                  }.
                </p>
              </div>
            )}

            {activity.sufferScore && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">Training Load</h4>
                <p className="text-sm text-red-800">
                  Suffer score of {activity.sufferScore} indicates {
                    activity.sufferScore < 50 ? "low intensity" :
                    activity.sufferScore < 100 ? "moderate load" :
                    activity.sufferScore < 150 ? "challenging workout" :
                    "very demanding session"
                  }.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}