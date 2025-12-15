import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Activity, Clock, MapPin, Heart, TrendingUp, Zap, Flame, Thermometer, BarChart3, Timer, Trophy, Mountain, Pause, Flag, Users, BookOpen, BarChart2, ChevronDown, ChevronUp, Loader2, Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import RouteMap from "../components/RouteMap";
import DetailedSplitsAnalysis from "@/components/activity/DetailedSplitsAnalysis";
import CoachVerdict from "@/components/activity/CoachVerdict";
import TrainingConsistency from "@/components/activity/TrainingConsistency";
import KPIRibbon from "@/components/activity/KPIRibbon";
import RunTimeline from "@/components/activity/RunTimeline";
import NextSteps from "@/components/activity/NextSteps";
import InsightChips from "@/components/activity/InsightChips";
import BenchmarkDrawer from "@/components/activity/BenchmarkDrawer";
import EfficiencyDrawer from "@/components/activity/EfficiencyDrawer";
import CompareDrawer from "@/components/activity/CompareDrawer";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ViewOnStravaLink, StravaPoweredBy } from "@/components/StravaConnect";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/useSubscription";

type ViewMode = "story" | "deep_dive";

function TierBadge({ tier }: { tier: 'pro' | 'premium' }) {
  return tier === 'pro' ? (
    <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">PRO</span>
  ) : (
    <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">PREMIUM</span>
  );
}

function LockedFeaturePanel({ 
  tier, 
  title, 
  description 
}: { 
  tier: 'pro' | 'premium'; 
  title: string;
  description: string;
}) {
  const tierConfig = tier === 'pro' 
    ? { 
        label: 'Pro', 
        color: 'orange',
        bgGradient: 'from-orange-50 to-amber-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-500',
        buttonClass: 'bg-orange-500 hover:bg-orange-600',
        badgeClass: 'bg-orange-100 text-orange-600'
      }
    : { 
        label: 'Premium', 
        color: 'yellow',
        bgGradient: 'from-yellow-50 to-amber-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600',
        buttonClass: 'bg-yellow-500 hover:bg-yellow-600',
        badgeClass: 'bg-yellow-100 text-yellow-700'
      };

  return (
    <Card className={`border-2 ${tierConfig.borderColor} bg-gradient-to-br ${tierConfig.bgGradient}`} data-testid={`locked-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className={`w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-4`}>
          <Lock className={`h-8 w-8 ${tierConfig.iconColor}`} />
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${tierConfig.badgeClass} mb-3`}>
          {tierConfig.label.toUpperCase()} FEATURE
        </span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md">{description}</p>
        <Link href="/pricing">
          <Button className={`${tierConfig.buttonClass} text-white`} data-testid="button-upgrade">
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to {tierConfig.label}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function CappedKPIRibbon({
  distance,
  distanceUnit,
  duration,
  pace,
  paceUnit,
  avgHR,
  elevation,
  calories,
  power,
  cadence
}: {
  distance: string;
  distanceUnit: string;
  duration: string;
  pace: string;
  paceUnit: string;
  avgHR?: number | null;
  elevation?: number | null;
  calories?: number | null;
  power?: number | null;
  cadence?: number | null;
}) {
  const [showMore, setShowMore] = useState(false);

  const primaryStats = [
    { label: distance, sublabel: distanceUnit, icon: MapPin, color: "text-blue-600" },
    { label: duration, sublabel: "Time", icon: Clock, color: "text-green-600" },
    { label: pace, sublabel: paceUnit, icon: TrendingUp, color: "text-purple-600" },
    avgHR ? { label: `${Math.round(avgHR)}`, sublabel: "bpm", icon: Heart, color: "text-red-600" } : null,
    elevation ? { label: `${Math.round(elevation)}`, sublabel: "m ↑", icon: Mountain, color: "text-orange-600" } : null,
  ].filter(Boolean).slice(0, 5) as { label: string; sublabel: string; icon: any; color: string }[];

  const secondaryStats = [
    calories ? { label: `${Math.round(calories)}`, sublabel: "cal", icon: Flame, color: "text-amber-600" } : null,
    power ? { label: `${Math.round(power)}`, sublabel: "W", icon: Zap, color: "text-yellow-600" } : null,
    cadence ? { label: `${Math.round(cadence)}`, sublabel: "spm", icon: Activity, color: "text-indigo-600" } : null,
  ].filter(Boolean) as { label: string; sublabel: string; icon: any; color: string }[];

  return (
    <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-4" data-testid="kpi-ribbon">
      <div className="flex items-center gap-6 overflow-x-auto">
        {primaryStats.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div 
              key={index} 
              className="flex items-center gap-2 flex-shrink-0"
              data-testid={`kpi-${metric.sublabel.toLowerCase().replace(/[^a-z]/g, '')}`}
            >
              <Icon className={`h-4 w-4 ${metric.color} flex-shrink-0`} />
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-gray-900 text-sm">{metric.label}</span>
                <span className="text-xs text-gray-500">{metric.sublabel}</span>
              </div>
              {index < primaryStats.length - 1 && (
                <div className="w-px h-4 bg-gray-200 ml-4" />
              )}
            </div>
          );
        })}
        
        {secondaryStats.length > 0 && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0"
            data-testid="button-more-stats"
          >
            {showMore ? 'Less' : 'More stats'}
            {showMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {showMore && secondaryStats.length > 0 && (
        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100 overflow-x-auto">
          {secondaryStats.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div 
                key={index} 
                className="flex items-center gap-2 flex-shrink-0"
              >
                <Icon className={`h-4 w-4 ${metric.color} flex-shrink-0`} />
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-gray-900 text-sm">{metric.label}</span>
                  <span className="text-xs text-gray-500">{metric.sublabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ActivityPage() {
  const [match, params] = useRoute("/activity/:id");
  const activityId = params?.id;
  const [viewMode, setViewMode] = useState<ViewMode>("story");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isChartsOpen, setIsChartsOpen] = useState(false);
  const [activeChip, setActiveChip] = useState<"drift" | "pacing" | "quality" | "benchmark" | null>(null);
  const [deepDiveTab, setDeepDiveTab] = useState("overview");

  const { isFree, isPro, isPremium } = useSubscription();

  const { data: userData } = useQuery<{ activityViewMode?: string; unitPreference?: string }>({
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
    if (newMode && ['story', 'deep_dive'].includes(newMode)) {
      setViewMode(newMode as ViewMode);
      updatePreferenceMutation.mutate(newMode as ViewMode);
    }
  };

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['/api/activities', activityId],
    queryFn: () => fetch(`/api/activities/${activityId}`).then(res => res.json()),
    enabled: !!activityId
  });

  const needsPerformanceData = !isFree && (
    viewMode === 'story' || 
    (viewMode === 'deep_dive' && ['timeline', 'splits', 'heartrate', 'cadence', 'power'].includes(deepDiveTab))
  );
  
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/activities', activityId, 'performance'],
    queryFn: () => fetch(`/api/activities/${activityId}/performance`).then(res => res.json()),
    enabled: !!activityId && needsPerformanceData
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
    enabled: !!activityId && viewMode === 'story' && !isFree,
    retry: false
  });

  const { data: efficiencyData } = useQuery({
    queryKey: ['/api/activities', activityId, 'efficiency'],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/efficiency`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activityId && viewMode === 'story' && !isFree,
    retry: false
  });

  const { data: qualityData } = useQuery({
    queryKey: ['/api/activities', activityId, 'quality'],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/quality`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activityId && viewMode === 'story' && !isFree,
    retry: false
  });

  const [isHydrating, setIsHydrating] = useState(false);
  const hydrationTriggered = useRef(false);

  const activity = activityData?.activity;
  const needsHydration = activity && (
    activity.hydrationStatus === 'pending' || 
    (!activity.streamsData || activity.streamsData === 'null')
  );

  const hydrateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/hydrate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Hydration failed');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.message === "Activity already hydrated") {
        queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId, 'performance'] });
        setIsHydrating(false);
      }
    },
    onError: () => {
      setIsHydrating(false);
    }
  });

  useQuery({
    queryKey: ['/api/activities', activityId, 'hydration-poll'],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      
      if (data.activity?.hydrationStatus === 'complete' || 
          (data.activity?.streamsData && data.activity.streamsData !== 'null')) {
        queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId, 'performance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId, 'efficiency'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId, 'quality'] });
        setIsHydrating(false);
      }
      return data;
    },
    enabled: isHydrating,
    refetchInterval: isHydrating ? 2000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!activity || hydrationTriggered.current || !needsHydration || isFree) return;
    
    hydrationTriggered.current = true;
    setIsHydrating(true);
    hydrateMutation.mutate();
  }, [activity, needsHydration, isFree]);

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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
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
            
            {/* Prominent View Mode Toggle */}
            <div className="w-full md:w-auto">
              <div className="flex bg-gray-100 rounded-xl p-1" data-testid="toggle-view-mode">
                <button
                  onClick={() => handleViewModeChange('story')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex-1 md:flex-initial ${
                    viewMode === 'story'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                  data-testid="toggle-story"
                >
                  <BookOpen className="h-4 w-4" />
                  Story
                </button>
                <button
                  onClick={() => handleViewModeChange('deep_dive')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex-1 md:flex-initial ${
                    viewMode === 'deep_dive'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                  data-testid="toggle-deep-dive"
                >
                  <BarChart2 className="h-4 w-4" />
                  Deep Dive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Story Mode: Restructured Layout */}
        {viewMode === 'story' && (
          <>
            {/* 1. Capped Key Stats Strip */}
            <CappedKPIRibbon
              distance={activity.formattedDistance}
              distanceUnit={activity.distanceUnit}
              duration={activity.formattedDuration}
              pace={activity.formattedPace}
              paceUnit={activity.paceUnit}
              avgHR={activity.averageHeartrate}
              elevation={activity.totalElevationGain}
              calories={activity.calories}
              power={activity.averageWatts}
              cadence={activity.averageCadence}
            />

            {/* 2. Hero Coach Verdict - Full Width */}
            <div className="mb-6">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="AI Coach Verdict"
                  description="Get personalized AI-powered analysis of your run including grade, key takeaways, training consistency metrics, and actionable recommendations."
                />
              ) : (
                <CoachVerdict activityId={parseInt(activityId || '0')} />
              )}
            </div>

            {/* 3. Next 48 Hours + Goal Alignment Side by Side */}
            {!isFree && verdictData && (
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <NextSteps
                  nextSteps={verdictData.nextSteps || []}
                  consistencyLabel={verdictData.consistencyLabel}
                  effortScore={verdictData.effortScore}
                />
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50" data-testid="card-goal-alignment">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Goal Alignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Training Consistency</span>
                        <span className="font-medium text-blue-700 capitalize">{verdictData.consistencyLabel?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Effort vs Average</span>
                        <span className={`font-medium ${verdictData.comparison?.effortVsAvg > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {verdictData.comparison?.effortVsAvg > 0 ? '+' : ''}{verdictData.comparison?.effortVsAvg}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Distance vs Average</span>
                        <span className={`font-medium ${verdictData.comparison?.distanceVsAvg > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                          {verdictData.comparison?.distanceVsAvg > 0 ? '+' : ''}{verdictData.comparison?.distanceVsAvg}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-blue-200">
                      <Link href="/training-plans" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100" data-testid="button-view-training-plan">
                          <Flag className="h-3 w-3 mr-1" />
                          Training Plan
                        </Button>
                      </Link>
                      <Link href="/coach" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100" data-testid="button-ask-coach">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Ask Coach
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* 4. Run Timeline - Pro feature */}
            <div className="mb-6">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="Run Timeline"
                  description="Visualize your pace, heart rate, and elevation changes throughout your run. Identify key moments like drift onset, hill impacts, and performance patterns with AI-detected event markers."
                />
              ) : (
                <RunTimeline 
                  streams={performanceData?.streams}
                  unitPreference={activity.unitPreference}
                  activityDistance={activity.distance}
                  isHydrating={isHydrating}
                />
              )}
            </div>
            
            {/* 5. Insight Chips - Pro feature */}
            {!isFree && (
              <div className="relative">
                <InsightChips
                  onChipClick={(chip) => setActiveChip(activeChip === chip ? null : chip)}
                  activeChip={activeChip}
                  efficiencyData={efficiencyData}
                  qualityData={qualityData}
                  comparisonData={verdictData?.comparison}
                />
              </div>
            )}
            
            {/* Benchmark Drawer - Only for Pro+ users (verdictData only exists for non-Free users) */}
            {activeChip === 'benchmark' && verdictData?.comparison && !isFree && (
              <div className="mt-4 space-y-4">
                <BenchmarkDrawer 
                  onClose={() => setActiveChip(null)} 
                  comparison={verdictData.comparison} 
                />
                {isPremium ? (
                  <CompareDrawer
                    activityId={parseInt(activityId || '0')}
                    onClose={() => setActiveChip(null)}
                  />
                ) : (
                  <LockedFeaturePanel
                    tier="premium"
                    title="Activity Comparison"
                    description="Compare this run against your personal records, similar past activities, and track your progress over time."
                  />
                )}
              </div>
            )}
            
            {/* Efficiency Drawer - Only for Pro+ users (efficiencyData/qualityData only exist for non-Free users) */}
            {(activeChip === 'drift' || activeChip === 'pacing' || activeChip === 'quality') && !isFree && efficiencyData && qualityData && (
              <div className="mt-4">
                <EfficiencyDrawer 
                  onClose={() => setActiveChip(null)} 
                  efficiency={efficiencyData} 
                  quality={qualityData} 
                />
              </div>
            )}
            
            {/* 6. Route Preview - Collapsed by Default */}
            <Collapsible open={isMapOpen} onOpenChange={setIsMapOpen} className="mt-6">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors" data-testid="button-toggle-map">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-gray-900">Route Preview</span>
                      <p className="text-sm text-gray-500">View map and route details</p>
                    </div>
                  </div>
                  {isMapOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <RouteMap 
                    polyline={activity.polyline}
                    startLat={activity.startLatitude}
                    startLng={activity.startLongitude}
                    endLat={activity.endLatitude}
                    endLng={activity.endLongitude}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Deep Dive Mode: Tabbed Interface */}
        {viewMode === 'deep_dive' && (
          <Tabs value={deepDiveTab} onValueChange={setDeepDiveTab} className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-white p-2 rounded-lg shadow-sm mb-6">
              <TabsTrigger value="overview" className="flex-1 min-w-[80px]">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 min-w-[80px]">
                Timeline
                {isFree && <TierBadge tier="pro" />}
              </TabsTrigger>
              <TabsTrigger value="splits" className="flex-1 min-w-[80px]">
                Splits
                {isFree && <TierBadge tier="pro" />}
              </TabsTrigger>
              <TabsTrigger value="heartrate" className="flex-1 min-w-[80px]">
                Heart Rate
                {isFree && <TierBadge tier="pro" />}
              </TabsTrigger>
              <TabsTrigger value="cadence" className="flex-1 min-w-[80px]">
                Cadence
                {isFree && <TierBadge tier="pro" />}
              </TabsTrigger>
              <TabsTrigger value="power" className="flex-1 min-w-[80px]">
                Power
                {isFree && <TierBadge tier="pro" />}
              </TabsTrigger>
              <TabsTrigger value="route" className="flex-1 min-w-[80px]">Route</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h2>
                
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

                {(activity.calories || activity.averageCadence || activity.averageWatts || activity.sufferScore || activity.averageTemp) && (
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
                )}
              </div>

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
            </TabsContent>

            <TabsContent value="timeline">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="Run Timeline"
                  description="See your entire run unfold second-by-second with interactive pace, heart rate, and elevation charts. AI-detected event markers highlight key moments like drift onset, hill impacts, and performance patterns."
                />
              ) : (
                <RunTimeline 
                  streams={performanceData?.streams}
                  unitPreference={activity.unitPreference}
                  activityDistance={activity.distance}
                  isHydrating={isHydrating}
                />
              )}
            </TabsContent>

            <TabsContent value="splits">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="Detailed Splits Analysis"
                  description="Analyze every kilometer or mile split with pace consistency metrics, effort distribution, and identify where you gained or lost time during your run."
                />
              ) : (
                <DetailedSplitsAnalysis
                  activity={activity}
                  streams={performanceData?.streams}
                  laps={performanceData?.laps}
                  unitPreference={userData?.unitPreference}
                />
              )}
            </TabsContent>

            <TabsContent value="heartrate">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="Heart Rate Analysis"
                  description="Unlock detailed heart rate zone distribution, training load analysis, and real-time HR trends from your Strava data."
                />
              ) : (
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
            </TabsContent>

            <TabsContent value="cadence">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="Cadence Analysis"
                  description="Track your running cadence patterns, identify optimal turnover rates, and improve your running form with detailed step rate analytics."
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-purple-600" />
                        Cadence Analysis
                      </div>
                      {performanceData?.streams?.cadence?.data && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Real Data
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CadenceChart activity={activity} streams={performanceData?.streams} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="power">
              {isFree ? (
                <LockedFeaturePanel 
                  tier="pro"
                  title="Power Analysis"
                  description="Access advanced running power metrics, including power curve analysis, efficiency tracking, and wattage distribution throughout your runs."
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Zap className="mr-2 h-5 w-5 text-yellow-600" />
                        Power Analysis
                      </div>
                      {performanceData?.streams?.watts?.data && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Real Data
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PowerChart activity={activity} streams={performanceData?.streams} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="route">
              <div className="grid lg:grid-cols-2 gap-6">
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
            </TabsContent>
          </Tabs>
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
