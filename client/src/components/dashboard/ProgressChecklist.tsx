import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

interface ProgressChecklistProps {
  isStravaConnected: boolean;
  hasActivities: boolean;
  hasViewedScore: boolean;
  hasChatted?: boolean;
}

export default function ProgressChecklist({ 
  isStravaConnected, 
  hasActivities,
  hasViewedScore,
  hasChatted = false
}: ProgressChecklistProps) {
  const checklistItems = [
    { label: "Account created", completed: true, icon: CheckCircle2 },
    { label: "Connect Strava", completed: isStravaConnected, icon: isStravaConnected ? CheckCircle2 : Circle },
    { label: "View your first insights", completed: hasActivities, icon: hasActivities ? CheckCircle2 : Circle },
    { label: "Chat with AI Coach", completed: hasChatted, icon: hasChatted ? CheckCircle2 : Circle },
  ];

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progress = (completedCount / totalCount) * 100;

  // Don't show if everything is complete
  if (completedCount === totalCount) {
    return null;
  }

  return (
    <Card className="border-strava-orange/20 bg-gradient-to-br from-orange-50 to-white" data-testid="progress-checklist">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-strava-orange" />
          <CardTitle className="text-lg">Get Started Checklist</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Complete these steps to unlock the full power of RunAnalytics
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-strava-orange to-orange-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 text-right">
          {completedCount} of {totalCount} completed
        </div>

        {/* Checklist Items */}
        <div className="space-y-2" data-testid="checklist-items">
          {checklistItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index} 
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  item.completed 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-white text-gray-600'
                }`}
                data-testid={`checklist-item-${index}`}
              >
                <Icon 
                  className={`w-5 h-5 flex-shrink-0 ${
                    item.completed ? 'text-green-600' : 'text-gray-400'
                  }`} 
                />
                <span className={`text-sm font-medium ${
                  item.completed ? 'line-through' : ''
                }`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {!isStravaConnected && (
          <div className="mt-4 p-3 bg-strava-orange/10 rounded-lg border border-strava-orange/20">
            <p className="text-xs text-strava-orange font-medium">
              💡 Connect Strava to sync your activities and unlock AI-powered insights!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
