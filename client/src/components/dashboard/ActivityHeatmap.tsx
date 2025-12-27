import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { StravaPoweredBy } from "@/components/StravaConnect";
import { getQueryFn } from "@/lib/queryClient";

interface HeatmapDay {
  date: string;
  totalDistanceKm: number;
  activities: Array<{ id: number; name: string; distanceKm: number; grade?: string }>;
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
        className={`aspect-square rounded-sm ${colorClass} cursor-default`}
        title={`${formatDate(day.date)}: Rest day`}
        data-testid={`heatmap-cell-${day.date}`}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div 
          className={`aspect-square rounded-sm ${colorClass} cursor-pointer hover:ring-2 hover:ring-strava-orange hover:ring-offset-1 transition-all`}
          data-testid={`heatmap-cell-${day.date}`}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="top">
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
              
              const getGradeColor = (grade?: string) => {
                switch (grade) {
                  case 'A': return 'bg-green-500 text-white';
                  case 'B': return 'bg-blue-500 text-white';
                  case 'C': return 'bg-yellow-500 text-white';
                  case 'D': return 'bg-orange-500 text-white';
                  case 'F': return 'bg-red-500 text-white';
                  default: return 'bg-gray-300 text-gray-700';
                }
              };
              
              return (
                <Link key={activity.id} href={`/activity/${activity.id}`}>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.name}</p>
                      <p className="text-xs text-gray-500">{activityDistance} {unit}</p>
                    </div>
                    {activity.grade && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${getGradeColor(activity.grade)} flex-shrink-0 mx-2`}>
                        {activity.grade}
                      </div>
                    )}
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-strava-orange flex-shrink-0 ml-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ActivityHeatmap() {
  const { data, isLoading, error } = useQuery<HeatmapData>({
    queryKey: [`/api/activities/heatmap?range=6m`],
    queryFn: getQueryFn({ on401: "throw" }),
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
  const weekCount = weeks.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal">Activity Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div className="flex">
            <div className="w-8 shrink-0" />
            <div 
              className="flex-1 grid h-5"
              style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
            >
              {weeks.map((week, weekIndex) => {
                const label = monthLabels.find(l => l.weekIndex === weekIndex);
                return (
                  <div key={weekIndex} className="text-xs text-gray-500 truncate">
                    {label?.month || ''}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex">
            <div className="w-8 shrink-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
              {dayLabels.filter((_, i) => i % 2 === 1).map((day) => (
                <span key={day} className="flex items-center">{day}</span>
              ))}
            </div>
            
            <div 
              className="flex-1 grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
            >
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-rows-7 gap-[2px]">
                  {week.map((day, dayIndex) => (
                    day.totalDistanceKm === -1 ? (
                      <div key={dayIndex} className="aspect-square" />
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
            <div className="flex items-center gap-4">
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
              <Link href="/activities">
                <div className="text-xs text-strava-orange hover:text-strava-orange/80 font-medium cursor-pointer">
                  View all →
                </div>
              </Link>
            </div>
            <StravaPoweredBy variant="orange" size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
