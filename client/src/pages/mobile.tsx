import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Play, TrendingUp, Target, Settings, User } from "lucide-react";
import { Link } from "wouter";

export default function MobilePage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="mb-8">
            <Activity className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="app-title">
              RunAnalytics
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300" data-testid="app-subtitle">
              AI-Powered Running Analytics
            </p>
          </div>
          
          <Card className="mb-6">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Mobile Experience</CardTitle>
              <CardDescription>
                Get insights on your running performance anywhere
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Play className="h-3 w-3" />
                  <span>Real-time tracking</span>
                </Badge>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>AI insights</span>
                </Badge>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Target className="h-3 w-3" />
                  <span>Goal tracking</span>
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Link href="/auth">
              <Button className="w-full" size="lg" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
            <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-backend-status">
              Connected to: localhost:5000
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-welcome">
                Welcome, {user?.firstName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mobile Dashboard
              </p>
            </div>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="sm" data-testid="button-settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start" data-testid="button-dashboard">
                <TrendingUp className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/performance">
              <Button variant="outline" className="w-full justify-start" data-testid="button-performance">
                <Target className="h-4 w-4 mr-2" />
                Performance
              </Button>
            </Link>
            <Link href="/ml-insights">
              <Button variant="outline" className="w-full justify-start" data-testid="button-ai-insights">
                <Play className="h-4 w-4 mr-2" />
                AI Insights
              </Button>
            </Link>
            <Link href="/runner-score/1">
              <Button variant="outline" className="w-full justify-start" data-testid="button-runner-score">
                <User className="h-4 w-4 mr-2" />
                Runner Score
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Platform Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Backend Connection</span>
                <Badge variant="default" data-testid="badge-backend-status">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Strava Sync</span>
                <Badge variant={user?.stravaConnected ? "default" : "secondary"} data-testid="badge-strava-status">
                  {user?.stravaConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">AI Analysis</span>
                <Badge variant="default" data-testid="badge-ai-status">Ready</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile-Optimized Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mobile Features</CardTitle>
            <CardDescription>
              Optimized for mobile running analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Touch-optimized interface</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Responsive design</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Full access to web features</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span data-testid="text-server-url">Backend: http://localhost:5000</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}