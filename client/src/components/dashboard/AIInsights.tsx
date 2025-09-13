import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

interface InsightData {
  title: string;
  content: string;
}

interface AIInsightsProps {
  insights: {
    performance?: InsightData;
    pattern?: InsightData;
    recovery?: InsightData;
    motivation?: InsightData;
    technique?: InsightData;
  };
}

export default function AIInsights({ insights }: AIInsightsProps) {
  const hasInsights = insights.performance || insights.pattern || insights.recovery || insights.motivation || insights.technique;

  if (!hasInsights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-performance-blue rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={16} />
            </div>
            <CardTitle className="text-xl font-semibold text-charcoal">AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No insights yet</h3>
            <p className="text-gray-500 text-sm">Generate AI insights to see performance analysis here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-performance-blue rounded-lg flex items-center justify-center">
            <Brain className="text-white" size={16} />
          </div>
          <CardTitle className="text-xl font-semibold text-charcoal">AI Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.performance && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-l-4 border-performance-blue">
              <h4 className="font-semibold text-charcoal mb-2">{insights.performance.title}</h4>
              <p className="text-sm text-gray-700">{insights.performance.content}</p>
            </div>
          )}

          {insights.pattern && (
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-strava-orange">
              <h4 className="font-semibold text-charcoal mb-2">{insights.pattern.title}</h4>
              <p className="text-sm text-gray-700">{insights.pattern.content}</p>
            </div>
          )}

          {insights.recovery && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-achievement-green">
              <h4 className="font-semibold text-charcoal mb-2">{insights.recovery.title}</h4>
              <p className="text-sm text-gray-700">{insights.recovery.content}</p>
            </div>
          )}

          {insights.motivation && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-l-4 border-yellow-500">
              <h4 className="font-semibold text-charcoal mb-2">{insights.motivation.title}</h4>
              <p className="text-sm text-gray-700">{insights.motivation.content}</p>
            </div>
          )}

          {insights.technique && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-l-4 border-indigo-500">
              <h4 className="font-semibold text-charcoal mb-2">{insights.technique.title}</h4>
              <p className="text-sm text-gray-700">{insights.technique.content}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
