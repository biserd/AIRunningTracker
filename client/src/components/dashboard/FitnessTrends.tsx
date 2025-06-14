import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FitnessTrends() {
  const fitnessMetrics = [
    { label: 'VO2 Max', value: '52.3', progress: 78, color: 'bg-performance-blue' },
    { label: 'Lactate Threshold', value: '4:52 /km', progress: 82, color: 'bg-strava-orange' },
    { label: 'Running Efficiency', value: '92%', progress: 92, color: 'bg-achievement-green' },
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
