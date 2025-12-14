import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Activity, Clock, MapPin, Heart, TrendingUp, Zap, Flame, Thermometer, BarChart3, Timer, Trophy, Mountain, Pause, Flag, Users, BookOpen, BarChart2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import RouteMap from "../components/RouteMap";
import DetailedSplitsAnalysis from "@/components/activity/DetailedSplitsAnalysis";
import CoachVerdict from "@/components/activity/CoachVerdict";
import TrainingConsistency from "@/components/activity/TrainingConsistency";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ViewOnStravaLink, StravaPoweredBy } from "@/components/StravaConnect";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ViewMode = "story" | "deep_dive" | "minimal";

export default function ActivityPage() {
  const [match, params] = useRoute("/activity/:id");
  const activityId = params?.id;
  const [viewMode, setViewMode] = useState<ViewMode>("story");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isChartsOpen, setIsChartsOpen] = useState(false);

  const { data: userData } = useQuery<{ activityViewMode?: string }>({
    queryKey: ['/api/user'],
  });

  useEffect(() => {
    if (userData?.activityViewMode) {
      setViewMode(userData.activityViewMode as ViewMode);
    }
  }, [userData?.activityViewMode]);

  const updatePreferenceMutation = useMutation({
    mutationFn: async (newMode: ViewMode) => {
      return fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ activityViewMode: newMode }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    }
  });

  const handleViewModeChange = (newMode: string) => {
    if (newMode && ['story', 'deep_dive', 'minimal'].includes(newMode)) {
      setViewMode(newMode as ViewMode);
      updatePreferenceMutation.mutate(newMode as ViewMode);
    }
  };

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['/api/activities', activityId],
    queryFn: () => fetch(`/api/activities/${activityId}`).then(res => res.json()),
    enabled: !!activityId
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/activities', activityId, 'performance'],
    queryFn: () => fetch(`/api/activities/${activityId}/performance`).then(res => res.json()),
    enabled: !!activityId
  });

  const { data: verdictData } = useQuery({
    queryKey: ['/api/activities', activityId, 'verdict'],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/verdict`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch verdict');
      return res.json();
    },
    enabled: !!activityId && viewMode === 'story',
    retry: false
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{activity.name}</h1>
                {verdictData && (
                  <TrainingConsistency
                    consistencyLabel={verdictData.consistencyLabel}
                    effortScore={verdictData.effortScore}
                    effortVsAverage={verdictData.comparison?.effortVsAvg || 0}
                    compact
                  />
                )}
                {activity.prCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium" data-testid="badge-pr-count">
                    <Trophy className="h-4 w-4" />
                    {activity.prCount} PR{activity.prCount > 1 ? 's' : ''}
                  </span>
                )}
                {activity.workoutType !== null && activity.workoutType !== undefined && activity.workoutType !== 0 && activity.workoutType !== 10 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                    activity.workoutType === 1 || activity.workoutType === 11 ? 'bg-red-100 text-red-800' :
                    activity.workoutType === 2 || activity.workoutType === 12 ? 'bg-blue-100 text-blue-800' :
                    activity.workoutType === 3 || activity.workoutType === 13 ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`} data-testid="badge-workout-type">
                    {activity.workoutType === 1 || activity.workoutType === 11 ? <><Flag className="h-4 w-4" /> Race</> :
                     activity.workoutType === 2 || activity.workoutType === 12 ? <><Mountain className="h-4 w-4" /> Long Run</> :
                     activity.workoutType === 3 || activity.workoutType === 13 ? <><Zap className="h-4 w-4" /> Workout</> :
                     'Default'}
                  </span>
                )}
                {activity.athleteCount > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium" data-testid="badge-group-run">
                    <Users className="h-4 w-4" />
                    Group ({activity.athleteCount})
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-lg mb-3">
                {new Date(activity.startDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="flex items-center gap-4">
                <ViewOnStravaLink 
                  activityId={activity.stravaActivityId || activity.id}
                  className="text-sm"
                />
                <StravaPoweredBy variant="orange" size="sm" />
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-gray-500">View Mode</span>
              <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} data-testid="toggle-view-mode">
                <ToggleGroupItem value="story" aria-label="Story Mode" className="px-3" data-testid="toggle-story">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Story
                </ToggleGroupItem>
                <ToggleGroupItem value="deep_dive" aria-label="Deep Dive Mode" className="px-3" data-testid="toggle-deep-dive">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Deep Dive
                </ToggleGroupItem>
                <ToggleGroupItem value="minimal" aria-label="Minimal Mode" className="px-3" data-testid="toggle-minimal">
                  <Minimize2 className="h-4 w-4 mr-1" />
                  Minimal
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Story Mode: Coach Verdict (Pro feature) */}
        {viewMode === 'story' && (
          <div className="mb-6">
            <CoachVerdict activityId={parseInt(activityId || '0')} />
          </div>
        )}

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

        {/* Route & Details Section - Collapsible in Story Mode, Hidden in Minimal */}
        {viewMode !== 'minimal' && (
          <Collapsible open={viewMode === 'deep_dive' || isMapOpen} onOpenChange={setIsMapOpen}>
            {viewMode === 'story' && (
              <CollapsibleTrigger asChild>
                <button className="w-full mb-3 flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors" data-testid="button-toggle-map">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Route & Details</span>
                  </div>
                  {isMapOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent className={viewMode === 'deep_dive' ? '' : 'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'}>
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Route</h3>
                  <RouteMap 
                    polyline={activity.polyline}
                    startLat={activity.startLatitude}
                    startLng={activity.startLongitude}
                    endLat={activity.endLatitude}
                    endLng={activity.endLongitude}
                  />
                </div>

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
                      {activity.elapsedTime && activity.elapsedTime > activity.movingTime && (
                        <div data-testid="stat-stop-time">
                          <div className="text-sm font-medium text-gray-600">Stop Time</div>
                          <div className="text-gray-900 font-semibold">
                            {Math.round((activity.elapsedTime - activity.movingTime) / 60)}m ({Math.round(((activity.elapsedTime - activity.movingTime) / activity.elapsedTime) * 100)}%)
                          </div>
                        </div>
                      )}
                      {activity.elevHigh !== null && activity.elevLow !== null && (
                        <div data-testid="stat-elev-range">
                          <div className="text-sm font-medium text-gray-600">Elevation Range</div>
                          <div className="text-gray-900 font-semibold">
                            {Math.round(activity.elevLow)}m - {Math.round(activity.elevHigh)}m
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Performance Analysis - Show in Story (always visible) and Deep Dive, hide in Minimal */}
        {viewMode !== 'minimal' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
        )}

        {/* Charts Section - Collapsible in Story Mode, Expanded in Deep Dive, Hidden in Minimal */}
        {viewMode !== 'minimal' && (
          <Collapsible open={viewMode === 'deep_dive' || isChartsOpen} onOpenChange={setIsChartsOpen}>
            {viewMode === 'story' && (
              <CollapsibleTrigger asChild>
                <button className="w-full mb-3 flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors" data-testid="button-toggle-charts">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Detailed Charts & Splits</span>
                  </div>
                  {isChartsOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent className={viewMode === 'deep_dive' ? '' : 'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <DetailedSplitsAnalysis
                  activity={activity}
                  streams={performanceData?.streams}
                  laps={performanceData?.laps}
                />

                {activity.averageHeartrate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Heart className="mr-2 h-5 w-5 text-red-600" />
                          Heart Rate Analysis
                        </div>
                        {performanceData?.streams?.heartrate && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Real Data
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HeartRateChart 
                        activity={activity}
                        streams={performanceData?.streams}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {(performanceData?.streams?.cadence?.data || performanceData?.streams?.watts?.data) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {performanceData?.streams?.cadence?.data && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <BarChart3 className="mr-2 h-5 w-5 text-purple-600" />
                            Cadence Analysis
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Real Data
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CadenceChart activity={activity} streams={performanceData?.streams} />
                      </CardContent>
                    </Card>
                  )}

                  {performanceData?.streams?.watts?.data && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Zap className="mr-2 h-5 w-5 text-yellow-600" />
                            Power Analysis
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Real Data
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PowerChart 
                          activity={activity} 
                          streams={performanceData?.streams}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}


// Heart Rate Chart Component
function HeartRateChart({ activity, streams }: { activity: any, streams?: any }) {
  const avgHR = activity.averageHeartrate;
  const maxHR = activity.maxHeartrate || avgHR * 1.15;
  

  
  let zones = [
    { zone: 'Zone 1', range: '50-60%', min: maxHR * 0.5, max: maxHR * 0.6, color: '#22c55e', time: 0 },
    { zone: 'Zone 2', range: '60-70%', min: maxHR * 0.6, max: maxHR * 0.7, color: '#3b82f6', time: 0 },
    { zone: 'Zone 3', range: '70-80%', min: maxHR * 0.7, max: maxHR * 0.8, color: '#f59e0b', time: 0 },
    { zone: 'Zone 4', range: '80-90%', min: maxHR * 0.8, max: maxHR * 0.9, color: '#ef4444', time: 0 },
    { zone: 'Zone 5', range: '90%+', min: maxHR * 0.9, max: maxHR, color: '#7c3aed', time: 0 }
  ];

  // Use real heart rate data if available
  if (streams?.heartrate?.data && streams?.time?.data) {
    const hrData = streams.heartrate.data;
    const timeData = streams.time.data;
    const totalTime = activity.movingTime;
    
    // Calculate actual time in each zone
    const zoneTimes = [0, 0, 0, 0, 0];
    let previousTime = 0;
    
    hrData.forEach((hr: number, index: number) => {
      if (hr > 0) {
        const currentTime = timeData[index] || 0;
        const timeDiff = index === 0 ? 0 : currentTime - previousTime;
        
        // Determine which zone this HR falls into
        if (hr >= zones[4].min) zoneTimes[4] += timeDiff;
        else if (hr >= zones[3].min) zoneTimes[3] += timeDiff;
        else if (hr >= zones[2].min) zoneTimes[2] += timeDiff;
        else if (hr >= zones[1].min) zoneTimes[1] += timeDiff;
        else zoneTimes[0] += timeDiff;
        
        previousTime = currentTime;
      }
    });
    
    // Update zones with actual data
    zones = zones.map((zone, index) => ({
      ...zone,
      time: zoneTimes[index] / totalTime // Convert to percentage
    }));
  } else {
    // Fallback to estimated distribution based on average HR
    const avgHRPercentage = avgHR / maxHR;
    let zoneDistribution;
    if (avgHRPercentage < 0.65) {
      zoneDistribution = [0.15, 0.65, 0.15, 0.04, 0.01];
    } else if (avgHRPercentage < 0.75) {
      zoneDistribution = [0.05, 0.35, 0.45, 0.12, 0.03];
    } else {
      zoneDistribution = [0.02, 0.15, 0.35, 0.35, 0.13];
    }
    
    zones = zones.map((zone, index) => ({
      ...zone,
      time: zoneDistribution[index]
    }));
  }

  const timeInZones = zones.map(zone => ({
    ...zone,
    timeMinutes: Math.round((zone.time * activity.movingTime) / 60),
    percentage: Math.round(zone.time * 100)
  }));

  // Create chart data with proper structure
  const chartData = timeInZones.map(zone => ({
    zone: zone.zone,
    time: zone.timeMinutes,
    color: zone.color
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Average HR:</span>
          <span className="ml-2 text-red-600 font-bold">{Math.round(avgHR)} bpm</span>
        </div>
        <div>
          <span className="font-medium">Max HR:</span>
          <span className="ml-2 text-red-600 font-bold">{Math.round(maxHR)} bpm</span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zone" />
            <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: any) => [`${value} min`, 'Time in Zone']} />
            <Bar dataKey="time" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {timeInZones.map((zone, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }}></div>
              <span>{zone.zone} ({zone.range})</span>
            </div>
            <span className="font-medium">{zone.timeMinutes}min ({zone.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cadence Chart Component - Uses real streams data only
function CadenceChart({ activity, streams }: { activity: any, streams?: any }) {
  const avgCadence = activity.averageCadence || 0;
  const maxCadence = activity.maxCadence || avgCadence * 1.1;
  
  // Build chart data from real streams
  const cadenceData: { time: string; cadence: number; target: number }[] = [];
  
  if (streams?.cadence?.data && streams?.time?.data) {
    const cadenceStream = streams.cadence.data;
    const timeStream = streams.time.data;
    const totalTime = activity.movingTime || timeStream[timeStream.length - 1];
    
    // Sample every ~5% of the activity for a cleaner chart
    const sampleInterval = Math.max(1, Math.floor(cadenceStream.length / 20));
    
    for (let i = 0; i < cadenceStream.length; i += sampleInterval) {
      const timeSeconds = timeStream[i] || 0;
      const timeMinutes = Math.round(timeSeconds / 60);
      
      cadenceData.push({
        time: `${timeMinutes}min`,
        cadence: Math.round(cadenceStream[i] * 2), // Strava stores cadence as half (steps per leg)
        target: 180
      });
    }
  }

  if (cadenceData.length === 0) {
    return <p className="text-gray-500 text-sm">No cadence data available</p>;
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={cadenceData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip />
          <Line type="monotone" dataKey="cadence" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="target" stroke="#22c55e" strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Average:</span>
          <span className="ml-2 text-purple-600 font-bold">{Math.round(avgCadence)} spm</span>
        </div>
        <div>
          <span className="font-medium">Max:</span>
          <span className="ml-2 text-purple-600 font-bold">{Math.round(maxCadence)} spm</span>
        </div>
      </div>
      
      <div className="p-3 bg-purple-50 rounded-lg">
        <p className="text-xs text-purple-800">
          Target cadence is 170-180 spm. Your average of {Math.round(avgCadence)} spm is {
            avgCadence < 170 ? "below optimal - focus on quicker steps" :
            avgCadence <= 180 ? "in excellent range" :
            "above optimal - consider longer strides"
          }.
        </p>
      </div>
    </div>
  );
}

// Power Chart Component - Uses real streams data only
function PowerChart({ activity, streams }: { activity: any, streams?: any }) {
  const avgWatts = activity.averageWatts || 0;
  const maxWatts = activity.maxWatts || avgWatts * 1.4;
  
  // Require real power data
  if (!streams?.watts?.data || !streams?.time?.data) {
    return <p className="text-gray-500 text-sm">No power data available</p>;
  }
  
  // Generate power zones based on FTP estimation
  const estimatedFTP = avgWatts * 0.85;
  
  let powerZones = [
    { zone: 'Zone 1', range: '<55% FTP', min: 0, max: estimatedFTP * 0.55, time: 0, color: '#22c55e' },
    { zone: 'Zone 2', range: '55-75% FTP', min: estimatedFTP * 0.55, max: estimatedFTP * 0.75, time: 0, color: '#3b82f6' },
    { zone: 'Zone 3', range: '75-90% FTP', min: estimatedFTP * 0.75, max: estimatedFTP * 0.90, time: 0, color: '#f59e0b' },
    { zone: 'Zone 4', range: '90-105% FTP', min: estimatedFTP * 0.90, max: estimatedFTP * 1.05, time: 0, color: '#ef4444' },
    { zone: 'Zone 5', range: '>105% FTP', min: estimatedFTP * 1.05, max: maxWatts, time: 0, color: '#7c3aed' }
  ];

  const powerData = streams.watts.data;
  const timeData = streams.time.data;
  const totalTime = activity.movingTime || timeData[timeData.length - 1];
  
  // Calculate actual time in each zone
  const zoneTimes = [0, 0, 0, 0, 0];
  let previousTime = 0;
  
  powerData.forEach((watts: number, index: number) => {
    if (watts > 0) {
      const currentTime = timeData[index] || 0;
      const timeDiff = index === 0 ? 0 : currentTime - previousTime;
      
      // Determine which zone this power falls into
      if (watts >= powerZones[4].min) zoneTimes[4] += timeDiff;
      else if (watts >= powerZones[3].min) zoneTimes[3] += timeDiff;
      else if (watts >= powerZones[2].min) zoneTimes[2] += timeDiff;
      else if (watts >= powerZones[1].min) zoneTimes[1] += timeDiff;
      else zoneTimes[0] += timeDiff;
      
      previousTime = currentTime;
    }
  });
  
  // Update zones with actual data
  powerZones = powerZones.map((zone, index) => ({
    ...zone,
    time: zoneTimes[index] / totalTime
  }));

  const timeInZones = powerZones.map(zone => ({
    ...zone,
    timeMinutes: Math.round((zone.time * activity.movingTime) / 60),
    percentage: Math.round(zone.time * 100)
  }));

  // Create chart data with proper structure
  const chartData = timeInZones.map(zone => ({
    zone: zone.zone,
    time: zone.timeMinutes,
    color: zone.color
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Average:</span>
          <span className="ml-2 text-yellow-600 font-bold">{Math.round(avgWatts)}W</span>
        </div>
        <div>
          <span className="font-medium">Max:</span>
          <span className="ml-2 text-yellow-600 font-bold">{Math.round(maxWatts)}W</span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="zone" />
            <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: any) => [`${value} min`, 'Time in Zone']} />
            <Bar dataKey="time" fill="#eab308" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {timeInZones.map((zone, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }}></div>
              <span>{zone.zone} ({zone.range})</span>
            </div>
            <span className="font-medium">{zone.timeMinutes}min ({zone.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}