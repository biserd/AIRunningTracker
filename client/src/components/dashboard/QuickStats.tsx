import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Timer, ArrowUp, ArrowDown, Calendar, Clock } from "lucide-react";

interface QuickStatsProps {
  stats: {
    // Period-specific totals
    monthlyTotalDistance: string;
    monthlyAvgPace: string;
    monthlyTotalMinutes: number;
    monthlyTotalActivities: number;
    monthlyPreviousActivities?: number;
    weeklyTotalDistance: string;
    weeklyAvgPace: string;
    weeklyTotalMinutes: number;
    weeklyTotalActivities: number;
    weeklyPreviousActivities?: number;
    asOf?: string;
    
    recovery: string;
    unitPreference?: string;
    
    // Monthly changes
    monthlyDistanceChange?: number | null;
    monthlyPaceChange?: number | null;
    monthlyActivitiesChange?: number | null;
    monthlyRunningTimeChange?: number | null;
    // Weekly changes
    weeklyDistanceChange?: number | null;
    weeklyPaceChange?: number | null;
    weeklyActivitiesChange?: number | null;
    weeklyRunningTimeChange?: number | null;
    
    // Backward compatibility
    totalDistance: string;
    avgPace: string;
    runningTimeMinutes?: number;
    totalActivities?: number;
    distanceChange?: number | null;
    paceChange?: number | null;
    activitiesChange?: number | null;
    runningTimeChange?: number | null;
  };
}

export default function QuickStats({ stats }: QuickStatsProps) {
  const [comparisonPeriod, setComparisonPeriod] = useState<'weekly' | 'monthly'>('monthly');

  // Helper functions to get period-specific values
  const getCurrentDistance = () => comparisonPeriod === 'weekly' ? stats.weeklyTotalDistance : stats.monthlyTotalDistance;
  const getCurrentPace = () => comparisonPeriod === 'weekly' ? stats.weeklyAvgPace : stats.monthlyAvgPace;
  const getCurrentRunningTime = () => comparisonPeriod === 'weekly' ? stats.weeklyTotalMinutes : stats.monthlyTotalMinutes;
  const getCurrentActivities = () => comparisonPeriod === 'weekly' ? stats.weeklyTotalActivities : stats.monthlyTotalActivities;
  const getPreviousActivities = () => comparisonPeriod === 'weekly' ? stats.weeklyPreviousActivities : stats.monthlyPreviousActivities;
  const getPeriodLabel = () => comparisonPeriod === 'weekly' ? 'this week' : 'this month';
  const hasNoRunsInPeriod = getCurrentActivities() === 0;
  const emptyPeriodLabel = comparisonPeriod === 'weekly'
    ? 'No runs yet this week'
    : `No ${new Date(stats.asOf || Date.now()).toLocaleDateString(undefined, { month: 'long' })} runs yet`;
  const formatRunningTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  const formatPercentageChange = (
    weeklyChange: number | undefined | null, 
    monthlyChange: number | undefined | null, 
    positiveIsGood: boolean = true
  ) => {
    const change = comparisonPeriod === 'weekly' ? weeklyChange : monthlyChange;
    const period = comparisonPeriod === 'weekly' ? 'last week' : 'same period last month';
    
    if (change === undefined || change === null) {
      return (
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-500">No previous data</span>
        </div>
      );
    }
    
    if (change === 0) return null;

    if (Math.abs(change) >= 200) {
      return (
        <div className="mt-4 text-sm text-gray-500" data-testid="small-base-comparison">
          {change > 0 ? "Higher" : "Lower"} than {period}
          <span className="block text-xs">Previous period had limited data</span>
        </div>
      );
    }
    
    const isPositive = change > 0;
    const isGoodChange = positiveIsGood ? isPositive : !isPositive;
    
    return (
      <div className="mt-4 flex items-center text-sm">
        {isGoodChange ? (
          <ArrowUp className="text-achievement-green mr-1" size={16} />
        ) : (
          <ArrowDown className="text-red-500 mr-1" size={16} />
        )}
        <span className={`font-medium ${isGoodChange ? 'text-achievement-green' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{change}%
        </span>
        <span className="text-gray-500 ml-1">vs {period}</span>
      </div>
    );
  };

  const formatRunComparison = () => {
    const previous = getPreviousActivities();
    if (previous === undefined || previous === 0) {
      return (
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-500">No comparable runs in the previous period</span>
        </div>
      );
    }
    const current = getCurrentActivities();
    const comparisonLabel = comparisonPeriod === 'weekly' ? 'last week' : 'by this date last month';
    return (
      <div className="mt-4 text-sm text-gray-500">
        <span className="font-medium text-charcoal">{current}</span> vs {previous} {comparisonLabel}
      </div>
    );
  };

  return (
    <div className="mb-8">
      {/* Comparison Period Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-charcoal">{comparisonPeriod === "weekly" ? "This week" : "This month"}</h2>
          <p className="text-xs text-gray-500">
            {stats.asOf
              ? `Updated ${new Date(stats.asOf).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              : 'Current calendar totals'}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1" data-testid="comparison-toggle">
          <Button
            variant={comparisonPeriod === 'weekly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setComparisonPeriod('weekly')}
            className={`text-xs ${comparisonPeriod === 'weekly' ? 'bg-strava-orange text-white' : 'text-gray-600'}`}
            data-testid="button-weekly-comparison"
          >
            <Clock className="mr-1" size={14} />
            Weekly
          </Button>
          <Button
            variant={comparisonPeriod === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setComparisonPeriod('monthly')}
            className={`text-xs ${comparisonPeriod === 'monthly' ? 'bg-strava-orange text-white' : 'text-gray-600'}`}
            data-testid="button-monthly-comparison"
          >
            <Calendar className="mr-1" size={14} />
            Monthly
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Distance</p>
                <p className={`${hasNoRunsInPeriod ? 'text-xl' : 'text-3xl'} font-bold text-charcoal`}>
                  {hasNoRunsInPeriod ? emptyPeriodLabel : getCurrentDistance()}
                </p>
                <p className="text-sm text-gray-500">{stats.unitPreference === "miles" ? "mi" : "km"} {getPeriodLabel()}</p>
              </div>
              <div className="w-12 h-12 bg-strava-orange/10 rounded-full flex items-center justify-center">
                <Route className="text-strava-orange" size={20} />
              </div>
            </div>
            {formatPercentageChange(stats.weeklyDistanceChange, stats.monthlyDistanceChange, true)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Pace</p>
                <p className="text-3xl font-bold text-charcoal">{hasNoRunsInPeriod ? '—' : getCurrentPace()}</p>
                <p className="text-sm text-gray-500">min/{stats.unitPreference === "miles" ? "mi" : "km"} {getPeriodLabel()}</p>
              </div>
              <div className="w-12 h-12 bg-performance-blue/10 rounded-full flex items-center justify-center">
                <Timer className="text-performance-blue" size={20} />
              </div>
            </div>
            {formatPercentageChange(stats.weeklyPaceChange, stats.monthlyPaceChange, false)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running Time</p>
                <p className="text-3xl font-bold text-charcoal">
                  {hasNoRunsInPeriod ? '—' : formatRunningTime(getCurrentRunningTime())}
                </p>
                <p className="text-sm text-gray-500">Recorded {getPeriodLabel()}</p>
              </div>
              <div className="w-12 h-12 bg-achievement-green/10 rounded-full flex items-center justify-center">
                <Clock className="text-achievement-green" size={20} />
              </div>
            </div>
            {formatPercentageChange(stats.weeklyRunningTimeChange, stats.monthlyRunningTimeChange, true)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Runs</p>
                <p className="text-3xl font-bold text-charcoal">{getCurrentActivities()}</p>
                <p className="text-sm text-gray-500">Recorded {getPeriodLabel()}</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100">
                <Calendar className="text-purple-600" size={20} />
              </div>
            </div>
            {formatRunComparison()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
