import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Timer, TrendingUp, Heart, ArrowUp, ArrowDown, Calendar, Clock, Shield } from "lucide-react";

interface RecoveryData {
  daysSinceLastRun: number;
  freshnessScore: number;
  riskLevel: string;
  riskReduced: boolean;
  originalRiskLevel: string;
  readyToRun: boolean;
  recommendedNextStep: string;
  statusMessage: string;
  recoveryMessage: string;
}

interface QuickStatsProps {
  stats: {
    // Period-specific totals
    monthlyTotalDistance: string;
    monthlyAvgPace: string;
    monthlyTrainingLoad: number;
    monthlyTotalActivities: number;
    weeklyTotalDistance: string;
    weeklyAvgPace: string;
    weeklyTrainingLoad: number;
    weeklyTotalActivities: number;
    
    recovery: string;
    unitPreference?: string;
    
    // Monthly changes
    monthlyDistanceChange?: number | null;
    monthlyPaceChange?: number | null;
    monthlyActivitiesChange?: number | null;
    monthlyTrainingLoadChange?: number | null;
    // Weekly changes
    weeklyDistanceChange?: number | null;
    weeklyPaceChange?: number | null;
    weeklyActivitiesChange?: number | null;
    weeklyTrainingLoadChange?: number | null;
    
    // Backward compatibility
    totalDistance: string;
    avgPace: string;
    trainingLoad: number;
    totalActivities?: number;
    distanceChange?: number | null;
    paceChange?: number | null;
    activitiesChange?: number | null;
    trainingLoadChange?: number | null;
  };
  recoveryData?: RecoveryData | null;
}

export default function QuickStats({ stats, recoveryData }: QuickStatsProps) {
  const [comparisonPeriod, setComparisonPeriod] = useState<'weekly' | 'monthly'>('monthly');

  // Helper functions to get period-specific values
  const getCurrentDistance = () => comparisonPeriod === 'weekly' ? stats.weeklyTotalDistance : stats.monthlyTotalDistance;
  const getCurrentPace = () => comparisonPeriod === 'weekly' ? stats.weeklyAvgPace : stats.monthlyAvgPace;
  const getCurrentTrainingLoad = () => comparisonPeriod === 'weekly' ? stats.weeklyTrainingLoad : stats.monthlyTrainingLoad;
  const getCurrentActivities = () => comparisonPeriod === 'weekly' ? stats.weeklyTotalActivities : stats.monthlyTotalActivities;
  const getPeriodLabel = () => comparisonPeriod === 'weekly' ? 'this week' : 'this month';
  const getTrainingLoadLabel = () => comparisonPeriod === 'weekly' ? 'TSS this week' : 'TSS this month';

  const formatPercentageChange = (
    weeklyChange: number | undefined | null, 
    monthlyChange: number | undefined | null, 
    positiveIsGood: boolean = true
  ) => {
    const change = comparisonPeriod === 'weekly' ? weeklyChange : monthlyChange;
    const period = comparisonPeriod === 'weekly' ? 'last week' : 'last month';
    
    if (change === undefined || change === null) {
      return (
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-500">No previous data</span>
        </div>
      );
    }
    
    if (change === 0) return null;
    
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

  return (
    <div className="mb-8">
      {/* Comparison Period Toggle */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-charcoal">Quick Stats</h2>
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
                <p className="text-3xl font-bold text-charcoal">{getCurrentDistance()}</p>
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
                <p className="text-3xl font-bold text-charcoal">{getCurrentPace()}</p>
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
                <p className="text-sm font-medium text-gray-600">Training Load</p>
                <p className="text-3xl font-bold text-charcoal">{getCurrentTrainingLoad()}</p>
                <p className="text-sm text-gray-500">{getTrainingLoadLabel()}</p>
              </div>
              <div className="w-12 h-12 bg-achievement-green/10 rounded-full flex items-center justify-center">
                <TrendingUp className="text-achievement-green" size={20} />
              </div>
            </div>
            {formatPercentageChange(stats.weeklyTrainingLoadChange, stats.monthlyTrainingLoadChange, true)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recovery Status</p>
                {recoveryData ? (
                  <>
                    <p className="text-3xl font-bold text-charcoal">{recoveryData.freshnessScore}%</p>
                    <p className="text-sm text-gray-500">
                      {recoveryData.daysSinceLastRun === 0 
                        ? "Ran today" 
                        : recoveryData.daysSinceLastRun === 1 
                          ? "1 day rest" 
                          : `${recoveryData.daysSinceLastRun} days rest`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-charcoal">{stats.recovery}</p>
                    <p className="text-sm text-gray-500">{getCurrentActivities()} runs {getPeriodLabel()}</p>
                  </>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                recoveryData?.readyToRun 
                  ? 'bg-achievement-green/10' 
                  : recoveryData?.riskLevel === 'critical' || recoveryData?.riskLevel === 'high'
                    ? 'bg-red-100'
                    : 'bg-yellow-100'
              }`}>
                <Heart className={`${
                  recoveryData?.readyToRun 
                    ? 'text-achievement-green' 
                    : recoveryData?.riskLevel === 'critical' || recoveryData?.riskLevel === 'high'
                      ? 'text-red-500'
                      : 'text-yellow-600'
                }`} size={20} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              {recoveryData ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`font-medium ${
                      recoveryData.readyToRun ? 'text-achievement-green' : 
                      recoveryData.riskLevel === 'critical' || recoveryData.riskLevel === 'high' ? 'text-red-500' : 'text-yellow-600'
                    }`}>
                      {recoveryData.statusMessage}
                    </span>
                  </div>
                  {recoveryData.riskReduced && (
                    <div className="flex items-center gap-1 text-xs text-achievement-green">
                      <Shield size={12} />
                      <span>Risk reduced by rest</span>
                    </div>
                  )}
                </>
              ) : (
                <span className={`font-medium text-sm ${
                  stats.recovery === 'Good' ? 'text-achievement-green' : 
                  stats.recovery === 'Moderate' ? 'text-yellow-600' : 'text-red-500'
                }`}>
                  {stats.recovery === 'Good' ? 'Ready to train' : 
                   stats.recovery === 'Moderate' ? 'Consider rest' : 'Take a break'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
