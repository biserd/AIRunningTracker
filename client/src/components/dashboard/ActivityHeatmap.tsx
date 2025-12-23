import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Activity, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { StravaPoweredBy } from "@/components/StravaConnect";

interface HeatmapDay {
  date: string;
  totalDistanceKm: number;
  activities: Array<{ id: number; name: string; distanceKm: number }>;
}

interface HeatmapData {
  days: HeatmapDay[];
  maxDistance: number;
  rangeStart: string;
  rangeEnd: string;
  unitPreference: string;
}

function getColorClass(distanceKm: number, maxDistance: number): string {
  if (distanceKm === 0) return "bg-gray-100 dark:bg-gray-800";
  
  const ratio = distanceKm / Math.max(maxDistance, 1);
  
  if (ratio < 0.25) return "bg-green-200 dark:bg-green-900";
  if (ratio < 0.5) return "bg-green-400 dark:bg-green-700";
  if (ratio < 0.75) return "bg-green-500 dark:bg-green-600";
  return "bg-green-600 dark:bg-green-500";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function DayCell({ day, maxDistance, unitPreference }: { day: HeatmapDay; maxDistance: number; unitPreference: string }) {
  const hasActivities = day.activities.length > 0;
  const colorClass = getColorClass(day.totalDistanceKm, maxDistance);
  const displayDistance = unitPreference === 'miles' 
    ? (day.totalDistanceKm * 0.621371).toFixed(1) 
    : day.totalDistanceKm.toFixed(1);
  const unit = unitPreference === 'miles' ? 'mi' : 'km';

  if (!hasActivities) {
    return (
      <div 
        className={`w-3 h-3 rounded-sm ${colorClass} cursor-default`}
        title={`${formatDate(day.date)}: Rest day`}
        data-testid={`heatmap-cell-${day.date}`}
      />
    );
  }

  return (
    <HoverCard openDelay={100} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div 
          className={`w-3 h-3 rounded-sm ${colorClass} cursor-pointer hover:ring-2 hover:ring-strava-orange hover:ring-offset-1 transition-all`}
          data-testid={`heatmap-cell-${day.date}`}
        />
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3" side="top">
        <div className="space-y-2">
          <div className="font-semibold text-sm">{formatDate(day.date)}</div>
          <div className="text-xs text-gray-500">
            Total: {displayDistance} {unit}
          </div>
          <div className="space-y-1 mt-2">
            {day.activities.map((activity) => {
              const activityDistance = unitPreference === 'miles'
                ? (activity.distanceKm * 0.621371).toFixed(1)
                : activity.distanceKm.toFixed(1);
              return (
                <Link key={activity.id} href={`/activity/${activity.id}`}>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.name}</p>
                      <p className="text-xs text-gray-500">{activityDistance} {unit}</p>
                    </div>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-strava-orange flex-shrink-0 ml-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function ActivityHeatmap() {
  const [range, setRange] = useState<"3m" | "6m">("3m");

  const { data, isLoading, error } = useQuery<HeatmapData>({
    queryKey: ['/api/activities/heatmap', range],
    queryFn: () => fetch(`/api/activities/heatmap?range=${range}`, { credentials: 'include' }).then(res => res.json()),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal">Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex gap-1">
                {[...Array(13)].map((_, j) => (
                  <div key={j} className="w-3 h-3 bg-gray-200 rounded-sm" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal">Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Unable to load activity data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.days || data.days.length === 0 || data.maxDistance === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal">Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
            <p className="text-gray-500">Connect to Strava and sync your activities to see them here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];
  
  const firstDay = new Date(data.days[0].date);
  const startDayOfWeek = firstDay.getDay();
  
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: '', totalDistanceKm: -1, activities: [] });
  }
  
  for (const day of data.days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', totalDistanceKm: -1, activities: [] });
    }
    weeks.push(currentWeek);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const unit = data.unitPreference === 'miles' ? 'mi' : 'km';
  
  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = '';
    
    weeks.forEach((week, weekIndex) => {
      for (const day of week) {
        if (day.date) {
          const date = new Date(day.date);
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          if (month !== lastMonth) {
            labels.push({ month, weekIndex });
            lastMonth = month;
          }
          break;
        }
      }
    });
    
    return labels;
  };
  
  const monthLabels = getMonthLabels();
  const cellSize = 12;
  const cellGap = 4;
  const weekWidth = cellSize + cellGap;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-charcoal">Activity Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={range === "3m" ? "default" : "outline"}
              size="sm"
              onClick={() => setRange("3m")}
              className={range === "3m" ? "bg-strava-orange hover:bg-strava-orange/90" : ""}
              data-testid="button-range-3m"
            >
              3 Months
            </Button>
            <Button
              variant={range === "6m" ? "default" : "outline"}
              size="sm"
              onClick={() => setRange("6m")}
              className={range === "6m" ? "bg-strava-orange hover:bg-strava-orange/90" : ""}
              data-testid="button-range-6m"
            >
              6 Months
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            <div className="relative h-5 ml-8">
              {monthLabels.map((label, i) => (
                <span 
                  key={i} 
                  className="absolute text-xs text-gray-500"
                  style={{ left: `${label.weekIndex * weekWidth}px` }}
                >
                  {label.month}
                </span>
              ))}
            </div>
            
            <div className="flex">
              <div className="flex flex-col justify-between text-xs text-gray-500 pr-2" style={{ height: `${7 * weekWidth - cellGap}px` }}>
                {dayLabels.filter((_, i) => i % 2 === 1).map((day) => (
                  <span key={day} className="h-3 flex items-center">{day}</span>
                ))}
              </div>
              
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => (
                      day.totalDistanceKm === -1 ? (
                        <div key={dayIndex} className="w-3 h-3" />
                      ) : (
                        <DayCell
                          key={day.date || dayIndex}
                          day={day}
                          maxDistance={data.maxDistance}
                          unitPreference={data.unitPreference}
                        />
                      )
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
                  <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
                  <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
                  <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
                  <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
                </div>
                <span>More</span>
                <span className="ml-2 text-gray-400">({unit})</span>
              </div>
              <StravaPoweredBy variant="orange" size="sm" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
