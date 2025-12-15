import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, X, Crown, Calendar, Route, Clock, Heart, Zap, ChevronRight, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Link } from "wouter";

const KM_TO_MILES = 0.621371;

interface ComparableRun {
  activityId: number;
  name: string;
  startDate: string;
  distance: number;
  movingTime: number;
  averageSpeed: number;
  averageHeartrate: number | null;
  totalElevationGain: number;
}

interface WhatChangedItem {
  metric: string;
  change: string;
  direction: 'better' | 'worse' | 'neutral';
}

interface WhatChanged {
  vsLastSameRoute: WhatChangedItem[] | null;
  vsComparableMedian: WhatChangedItem[];
}

interface ComparisonData {
  hasComparison: boolean;
  isPremium: boolean;
  comparableCount?: number;
  comparableRuns?: ComparableRun[];
  baseline?: {
    pace: number;
    hr: number | null;
    drift: number | null;
    pacingStability: number | null;
  };
  deltas?: {
    paceVsBaseline: number;
    hrVsBaseline: number | null;
    driftVsBaseline: number | null;
    pacingVsBaseline: number | null;
  };
  whatChanged?: WhatChanged;
  routeMatch?: {
    routeId?: number;
    runCount: number;
    hasHistory?: boolean;
    lastRunOnRoute?: {
      activityId: number;
      name: string;
      startDate: string;
      averageSpeed: number;
      averageHeartrate: number | null;
    };
    routeHistory?: Array<{
      activityId: number;
      startDate: string;
      averageSpeed: number;
      averageHeartrate: number | null;
    }>;
  };
  route?: {
    id: number;
    name: string;
    runCount: number;
    avgDistance: number;
    avgElevationGain: number;
  };
  upgradeMessage?: string;
  message?: string;
}

interface CompareDrawerProps {
  activityId: number;
  onClose: () => void;
  embedded?: boolean;
}

function formatPace(metersPerSecond: number, unitPreference: string = 'km'): string {
  if (!metersPerSecond || metersPerSecond <= 0) return "N/A";
  const distanceUnit = unitPreference === 'miles' ? 1609.34 : 1000;
  const secondsPerUnit = distanceUnit / metersPerSecond;
  const mins = Math.floor(secondsPerUnit / 60);
  const secs = Math.round(secondsPerUnit % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number, unitPreference: string = 'km'): string {
  if (unitPreference === 'miles') {
    return `${(meters / 1609.34).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function getPaceUnit(unitPreference: string = 'km'): string {
  return unitPreference === 'miles' ? '/mi' : '/km';
}

function DeltaIndicator({ value, inverted = false, unit = "%" }: { value: number; inverted?: boolean; unit?: string }) {
  const roundedValue = Math.round(value * 10) / 10;
  const isPositive = inverted ? roundedValue < 0 : roundedValue > 0;
  const isNegative = inverted ? roundedValue > 0 : roundedValue < 0;
  
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const color = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-gray-500";
  const bgColor = isPositive ? "bg-emerald-50" : isNegative ? "bg-red-50" : "bg-gray-50";
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${color} ${bgColor}`}>
      <Icon className="w-3 h-3" />
      {roundedValue > 0 ? "+" : ""}{roundedValue}{unit}
    </span>
  );
}

function RouteHistorySparkline({ history, unitPreference = 'km' }: { history: Array<{ startDate: string; averageSpeed: number }>; unitPreference?: string }) {
  if (history.length < 2) return null;
  
  const distanceUnit = unitPreference === 'miles' ? 1609.34 : 1000;
  const paceLabel = unitPreference === 'miles' ? '/mi' : '/km';
  
  const data = history.slice().reverse().map((h, i) => ({
    idx: i,
    pace: h.averageSpeed > 0 ? distanceUnit / h.averageSpeed : 0,
    date: new Date(h.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));
  
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <Tooltip 
            formatter={(value: number) => {
              const mins = Math.floor(value / 60);
              const secs = Math.round(value % 60);
              return [`${mins}:${secs.toString().padStart(2, '0')}${paceLabel}`, "Pace"];
            }}
            labelFormatter={(idx) => data[idx as number]?.date}
          />
          <Line 
            type="monotone" 
            dataKey="pace" 
            stroke="#6366f1" 
            strokeWidth={2}
            dot={{ fill: "#6366f1", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PremiumUpgradePrompt({ message }: { message: string }) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Crown className="w-5 h-5 text-amber-500 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-gray-700 mb-3">{message}</p>
          <Link href="/pricing">
            <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              Upgrade to Premium
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CompareDrawer({ activityId, onClose, embedded = false }: CompareDrawerProps) {
  const { data: userData } = useQuery<{ unitPreference?: string }>({
    queryKey: ['/api/user'],
  });
  
  const unitPref = userData?.unitPreference || 'km';
  
  const { data: comparison, isLoading, error } = useQuery<ComparisonData>({
    queryKey: ['/api/activities', activityId, 'comparison'],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/comparison`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch comparison');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50" data-testid="drawer-compare">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-gray-600">Analyzing comparable runs...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !comparison?.hasComparison) {
    return (
      <Card className={embedded ? "border-0 shadow-none bg-transparent" : "border-2 border-gray-200 bg-gray-50"} data-testid="drawer-compare">
        {!embedded && (
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Run Comparison</CardTitle>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors" data-testid="button-close-compare">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </CardHeader>
        )}
        <CardContent className={embedded ? "pt-0 px-0" : "pt-0"}>
          <p className="text-sm text-gray-600">
            {comparison?.message || "Not enough comparable runs found. Keep running to build your comparison data!"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { isPremium, deltas, whatChanged, routeMatch, route, comparableRuns, baseline, upgradeMessage, comparableCount } = comparison;

  return (
    <Card className={embedded ? "border-0 shadow-none bg-transparent" : "border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50"} data-testid="drawer-compare">
      {!embedded && (
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-4 h-4" />
            Run Comparison
            {isPremium && (
              <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2 py-0.5 rounded-full">Premium</span>
            )}
          </CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full transition-colors" data-testid="button-close-compare">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </CardHeader>
      )}
      <CardContent className={embedded ? "pt-0 px-0 space-y-5" : "pt-0 space-y-5"}>
        
        {/* Description - more subtle */}
        <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-amber-200 pl-3 bg-amber-50/50 py-2 rounded-r-lg">
          We compare this run against {comparableCount || comparableRuns?.length || 0} similar efforts (within 20% distance) to measure your progress.
        </p>
        
        {/* Route Info (Premium only for full details) */}
        {isPremium && route && (
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">{route.name || "Your Route"}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{route.runCount} runs</span>
            </div>
            {routeMatch?.routeHistory && routeMatch.routeHistory.length > 1 && (
              <>
                <p className="text-xs text-gray-500 mb-2">Pace trend over your runs on this route</p>
                <RouteHistorySparkline history={routeMatch.routeHistory} unitPreference={unitPref} />
              </>
            )}
          </div>
        )}

        {/* Delta Metrics - cleaner grid */}
        {deltas && (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance vs Baseline</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center" data-testid="compare-pace">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-gray-600">Pace</span>
                </div>
                <DeltaIndicator value={deltas.paceVsBaseline} inverted={true} />
              </div>
              
              {deltas.hrVsBaseline !== null && (
                <div className="text-center" data-testid="compare-hr">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-gray-600">Heart Rate</span>
                  </div>
                  <DeltaIndicator value={deltas.hrVsBaseline} />
                </div>
              )}
              
              {isPremium && deltas.driftVsBaseline !== null && (
                <div className="text-center" data-testid="compare-drift">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-gray-600">Drift</span>
                  </div>
                  <DeltaIndicator value={deltas.driftVsBaseline} />
                </div>
              )}
              
              {isPremium && deltas.pacingVsBaseline !== null && (
                <div className="text-center" data-testid="compare-pacing">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">Pacing</span>
                  </div>
                  <DeltaIndicator value={deltas.pacingVsBaseline} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* What Changed (Premium only) - cleaner pills */}
        {isPremium && whatChanged && (whatChanged.vsLastSameRoute?.length || whatChanged.vsComparableMedian?.length) && (
          <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-xl p-4 border border-indigo-100" data-testid="what-changed">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              What Changed
            </h4>
            
            {whatChanged.vsLastSameRoute && whatChanged.vsLastSameRoute.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">vs Last Run on This Route:</p>
                <div className="flex flex-wrap gap-2">
                  {whatChanged.vsLastSameRoute.map((item, i) => (
                    <span 
                      key={i} 
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                        item.direction === 'better' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        item.direction === 'worse' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {item.metric}: {item.change}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {whatChanged.vsComparableMedian && whatChanged.vsComparableMedian.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">vs Similar Runs Baseline:</p>
                <div className="flex flex-wrap gap-2">
                  {whatChanged.vsComparableMedian.map((item, i) => (
                    <span 
                      key={i} 
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                        item.direction === 'better' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        item.direction === 'worse' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {item.metric}: {item.change}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comparable Runs List (Premium only) - table-like layout */}
        {isPremium && comparableRuns && comparableRuns.length > 0 && (
          <div data-testid="comparable-runs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Similar Runs</h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{comparableRuns.length} found</span>
            </div>
            
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200 mb-1">
              <div className="col-span-5">Run</div>
              <div className="col-span-3 text-right">Pace</div>
              <div className="col-span-2 text-right">HR</div>
              <div className="col-span-2 text-right">Match</div>
            </div>
            
            {/* Table rows */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {comparableRuns.slice(0, 8).map((run, index) => {
                const similarityScore = Math.max(70, 100 - (index * 5));
                return (
                  <Link key={run.activityId} href={`/activity/${run.activityId}`}>
                    <div className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{run.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(run.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="col-span-3 text-right self-center">
                        <span className="text-sm font-medium text-gray-800">{formatPace(run.averageSpeed, unitPref)}</span>
                        <span className="text-xs text-gray-400">{getPaceUnit(unitPref)}</span>
                      </div>
                      <div className="col-span-2 text-right self-center">
                        {run.averageHeartrate ? (
                          <span className="text-sm text-gray-600">{Math.round(run.averageHeartrate)}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right self-center">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          similarityScore >= 95 ? 'bg-emerald-100 text-emerald-700' :
                          similarityScore >= 85 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {similarityScore}%
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Non-premium summary */}
        {!isPremium && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              Compared to {comparableCount || routeMatch?.runCount || 0} similar runs
            </p>
          </div>
        )}

        {/* Premium Upgrade Prompt */}
        {!isPremium && upgradeMessage && (
          <PremiumUpgradePrompt message={upgradeMessage} />
        )}

        {/* Baseline Info (Premium only) */}
        {isPremium && baseline && baseline.pace > 0 && (
          <p className="text-xs text-gray-500 text-center">
            Baseline: {formatPace(baseline.pace)}/km avg pace
            {baseline.hr && ` • ${Math.round(baseline.hr)} bpm avg HR`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
