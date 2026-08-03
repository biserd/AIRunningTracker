import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

interface ProgressChecklistProps {
  isStravaConnected: boolean;
  hasActivities: boolean;
  hasViewedScore: boolean;
  hasChatted?: boolean;
}

export default function ProgressChecklist({ isStravaConnected, hasActivities }: ProgressChecklistProps) {
  // Chat and feature discovery are optional. Once imported running data is
  // visible, the checklist has done its job and should leave the dashboard.
  if (isStravaConnected && hasActivities) return null;

  const items = [
    { label: "Account created", completed: true },
    { label: "Connect Strava", completed: isStravaConnected },
    { label: "Import your first run", completed: hasActivities },
  ];
  const completed = items.filter((item) => item.completed).length;

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white" data-testid="progress-checklist">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-strava-orange" />
          <CardTitle className="text-lg">Finish setting up</CardTitle>
        </div>
        <p className="text-sm text-gray-600">Connect your running data so the dashboard can give you a useful next step.</p>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-strava-orange transition-all" style={{ width: `${(completed / items.length) * 100}%` }} />
        </div>
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.completed ? CheckCircle2 : Circle;
            return (
              <div key={item.label} className={`flex items-center gap-3 rounded-lg p-2 ${item.completed ? "bg-green-50 text-green-700" : "bg-white text-gray-600"}`}>
                <Icon className={`h-5 w-5 shrink-0 ${item.completed ? "text-green-600" : "text-gray-400"}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            );
          })}
        </div>
        {!isStravaConnected && (
          <p className="mt-3 rounded-lg border border-orange-200 bg-orange-100/60 p-3 text-xs font-medium text-orange-800">
            Connect Strava to import your runs and build your first recommendation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
