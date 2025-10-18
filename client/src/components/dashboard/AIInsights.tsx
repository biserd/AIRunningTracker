import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Crown, Lock } from "lucide-react";
import { Link } from "wouter";
import { useFeatureAccess } from "@/hooks/useSubscription";

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
  const { canAccessAdvancedInsights } = useFeatureAccess();
  const hasInsights = insights.performance || insights.pattern || insights.recovery || insights.motivation || insights.technique;

  if (!hasInsights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-performance-blue rounded-lg flex items-center justify-center">
                <Brain className="text-white" size={16} />
              </div>
              <CardTitle className="text-xl font-semibold text-charcoal">AI Insights</CardTitle>
            </div>
            {!canAccessAdvancedInsights && (
              <Badge variant="secondary" className="bg-strava-orange/10 text-strava-orange">
                <Crown className="h-3 w-3 mr-1" />
                Pro Feature
              </Badge>
            )}
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

  // For free users, show limited insights with upgrade prompts
  if (!canAccessAdvancedInsights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-performance-blue rounded-lg flex items-center justify-center">
                <Brain className="text-white" size={16} />
              </div>
              <CardTitle className="text-xl font-semibold text-charcoal">AI Insights</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-strava-orange/10 text-strava-orange">
              <Crown className="h-3 w-3 mr-1" />
              Pro Feature
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Show basic performance insight if available */}
            {insights.performance && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-l-4 border-performance-blue">
                <h4 className="font-semibold text-charcoal mb-2">{insights.performance.title}</h4>
                <p className="text-sm text-gray-700">{insights.performance.content}</p>
              </div>
            )}

            {/* Show locked premium insights */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100/80 to-gray-200/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-2">Advanced Insights Locked</p>
                  <Link href="/subscribe">
                    <Button size="sm" className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-unlock-insights">
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Blurred advanced insights */}
              <div className="blur-sm pointer-events-none space-y-3">
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-strava-orange">
                  <h4 className="font-semibold text-charcoal mb-2">Training Pattern Analysis</h4>
                  <p className="text-sm text-gray-700">Advanced pattern recognition and training optimization insights...</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-achievement-green">
                  <h4 className="font-semibold text-charcoal mb-2">Recovery & Health Insights</h4>
                  <p className="text-sm text-gray-700">Personalized recovery recommendations and injury prevention tips...</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-l-4 border-indigo-500">
                  <h4 className="font-semibold text-charcoal mb-2">Technique Optimization</h4>
                  <p className="text-sm text-gray-700">AI-powered form analysis and running efficiency recommendations...</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // All users see all insights (everything is free now)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-performance-blue rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={16} />
            </div>
            <CardTitle className="text-xl font-semibold text-charcoal">AI Insights</CardTitle>
          </div>
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
