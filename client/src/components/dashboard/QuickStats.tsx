import { Card, CardContent } from "@/components/ui/card";
import { Route, Timer, TrendingUp, Heart, ArrowUp, ArrowDown } from "lucide-react";

interface QuickStatsProps {
  stats: {
    totalDistance: string;
    avgPace: string;
    trainingLoad: number;
    recovery: string;
    unitPreference?: string;
    distanceChange?: number | null;
    paceChange?: number | null;
    activitiesChange?: number | null;
    trainingLoadChange?: number | null;
  };
}

export default function QuickStats({ stats }: QuickStatsProps) {
  const formatPercentageChange = (change: number | undefined | null, positiveIsGood: boolean = true) => {
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
        <span className="text-gray-500 ml-1">vs last month</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Distance</p>
              <p className="text-3xl font-bold text-charcoal">{stats.totalDistance}</p>
              <p className="text-sm text-gray-500">{stats.unitPreference === "miles" ? "mi" : "km"} this month</p>
            </div>
            <div className="w-12 h-12 bg-strava-orange/10 rounded-full flex items-center justify-center">
              <Route className="text-strava-orange" size={20} />
            </div>
          </div>
          {formatPercentageChange(stats.distanceChange, true)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Pace</p>
              <p className="text-3xl font-bold text-charcoal">{stats.avgPace}</p>
              <p className="text-sm text-gray-500">min/{stats.unitPreference === "miles" ? "mi" : "km"}</p>
            </div>
            <div className="w-12 h-12 bg-performance-blue/10 rounded-full flex items-center justify-center">
              <Timer className="text-performance-blue" size={20} />
            </div>
          </div>
          {formatPercentageChange(stats.paceChange, false)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Training Load</p>
              <p className="text-3xl font-bold text-charcoal">{stats.trainingLoad}</p>
              <p className="text-sm text-gray-500">TSS this week</p>
            </div>
            <div className="w-12 h-12 bg-achievement-green/10 rounded-full flex items-center justify-center">
              <TrendingUp className="text-achievement-green" size={20} />
            </div>
          </div>
          {formatPercentageChange(stats.trainingLoadChange, true)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recovery</p>
              <p className="text-3xl font-bold text-charcoal">{stats.recovery}</p>
              <p className="text-sm text-gray-500">HRV status</p>
            </div>
            <div className="w-12 h-12 bg-achievement-green/10 rounded-full flex items-center justify-center">
              <Heart className="text-achievement-green" size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-achievement-green font-medium">Ready to train</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
