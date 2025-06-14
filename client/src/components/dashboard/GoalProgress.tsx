import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoalProgress() {
  const goals = [
    {
      title: 'Monthly Distance',
      current: '127.5',
      target: '150',
      unit: 'km',
      progress: 85,
      timeLeft: '9 days remaining',
      status: '85% completed'
    },
    {
      title: 'Sub-20 5K Goal',
      current: '20:45',
      target: '20:00',
      unit: 'PB',
      progress: 72,
      timeLeft: '45s improvement needed',
      status: 'On track'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-charcoal">Goal Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.map((goal, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{goal.title}</span>
                <span className="text-sm font-bold text-charcoal">
                  {goal.current} / {goal.target} {goal.unit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                <div 
                  className="bg-gradient-to-r from-strava-orange to-performance-blue h-3 rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{goal.status} - {goal.timeLeft}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
