import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FitnessTrendsProps {
  chartData: Array<{
    week: string;
    pace: number;
    distance: number;
  }>;
}

export default function FitnessTrends({ chartData = [] }: FitnessTrendsProps) {
  // Calculate fitness metrics from real data
  const avgPace = chartData.length > 0 ? 
    chartData.reduce((sum, week) => sum + week.pace, 0) / chartData.length : 0;
  
  const totalDistance = chartData.length > 0 ? 
    chartData.reduce((sum, week) => sum + week.distance, 0) : 0;
  
  const paceImprovement = chartData.length >= 2 ? 
    ((chartData[0].pace - chartData[chartData.length - 1].pace) / chartData[0].pace) * 100 : 0;

  const fitnessMetrics = [
    { 
      label: 'Average Pace', 
      value: avgPace > 0 ? `${avgPace.toFixed(1)} min/km` : 'N/A', 
      progress: avgPace > 0 ? Math.min(100, (6 - avgPace) * 20) : 0, 
      color: 'bg-performance-blue' 
    },
    { 
      label: 'Weekly Volume', 
      value: `${totalDistance.toFixed(1)} km`, 
      progress: Math.min(100, (totalDistance / 50) * 100), 
      color: 'bg-strava-orange' 
    },
    { 
      label: 'Pace Improvement', 
      value: paceImprovement > 0 ? `+${paceImprovement.toFixed(1)}%` : 'Stable', 
      progress: Math.max(0, Math.min(100, paceImprovement * 10)), 
      color: 'bg-achievement-green' 
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal">Fitness Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fitnessMetrics.map((metric, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                <span className="text-sm font-bold text-charcoal">{metric.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${metric.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${metric.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
