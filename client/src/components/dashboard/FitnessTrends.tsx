import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FitnessTrendsProps {
  chartData: Array<{
    week: string;
    pace: number;
    distance: number;
  }>;
  unitPreference?: string;
}

export default function FitnessTrends({ chartData = [], unitPreference }: FitnessTrendsProps) {
  // Calculate fitness metrics from real data
  const avgPace = chartData.length > 0 ? 
    chartData.reduce((sum, activity) => sum + activity.pace, 0) / chartData.length : 0;
  
  // Since chartData contains individual activities (not actual weekly aggregations),
  // we need to calculate a more meaningful weekly volume
  const totalDistance = chartData.length > 0 ? 
    chartData.reduce((sum, activity) => sum + activity.distance, 0) : 0;
  
  // Calculate average distance per run, which is more meaningful than summing all activities
  const avgDistancePerRun = chartData.length > 0 ? totalDistance / chartData.length : 0;
  
  // Use average distance per run as a better metric than misleading "weekly volume"
  const weeklyVolume = avgDistancePerRun;
  
  const paceImprovement = chartData.length >= 2 ? 
    ((chartData[0].pace - chartData[chartData.length - 1].pace) / chartData[0].pace) * 100 : 0;

  const fitnessMetrics = [
    { 
      label: 'Average Pace', 
      value: avgPace > 0 ? `${avgPace.toFixed(1)} min/${unitPreference === "miles" ? "mi" : "km"}` : 'N/A', 
      progress: avgPace > 0 ? Math.min(100, (6 - avgPace) * 20) : 0, 
      color: 'bg-performance-blue' 
    },
    { 
      label: 'Avg Distance/Run', 
      value: `${weeklyVolume.toFixed(1)} ${unitPreference === "miles" ? "mi" : "km"}`, 
      progress: Math.min(100, (weeklyVolume / 10) * 100), // Adjusted target for average run distance
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
