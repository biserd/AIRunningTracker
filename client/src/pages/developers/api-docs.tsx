import { Helmet } from "react-helmet";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Smartphone, User, Activity, Brain, Target, Shield, RefreshCw, LogOut } from "lucide-react";

export default function APIDocs() {
  return (
    <div className="min-h-screen bg-light-grey flex flex-col">
      <Helmet>
        <title>Mobile API Documentation | RunAnalytics</title>
        <meta name="description" content="Documentation for the RunAnalytics mobile API. Learn how to authenticate iOS and Android apps using JWT tokens." />
      </Helmet>
      
      <AppHeader />
      
      <main className="flex-1 max-w-5xl mx-auto px-6 py-8">
        <Link href="/developers">
          <a className="flex items-center gap-2 text-gray-600 hover:text-strava-orange mb-6" data-testid="link-back-developers">
            <ArrowLeft className="h-4 w-4" />
            Back to Developer Hub
          </a>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mobile API Documentation</h1>
          <p className="text-gray-600">
            Integrate RunAnalytics into your iOS and Android applications
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication Overview
              </CardTitle>
              <CardDescription>
                Secure JWT-based authentication for mobile applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                RunAnalytics uses JWT (JSON Web Tokens) for mobile authentication. The flow consists of:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li><strong>Access Token</strong> - Short-lived (15 minutes) for API requests</li>
                <li><strong>Refresh Token</strong> - Long-lived (30 days) for renewing access tokens</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Security Tips:</strong> Store refresh tokens in iOS Keychain or Android Keystore. Never store tokens in plain text or UserDefaults/SharedPreferences.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-white rounded-lg p-4">
                <code className="text-sm">https://aitracker.run/api</code>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                1. Login
              </CardTitle>
              <CardDescription>
                Authenticate with email and password to get tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500 text-white">POST</Badge>
                <code className="text-sm font-mono">/api/mobile/login</code>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Request Body</h4>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`{
  "email": "user@example.com",
  "password": "yourpassword",
  "deviceName": "iPhone 15 Pro",  // optional
  "deviceId": "unique-device-id"  // optional
}`}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Response (200 OK)</h4>
                <ScrollArea className="h-[200px]">
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_a1b2c3d4e5f6...",
  "expiresIn": 900,
  "refreshExpiresAt": "2026-01-06T15:30:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "stravaConnected": true
  }
}`}</code>
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                2. Refresh Token
              </CardTitle>
              <CardDescription>
                Get a new access token when the current one expires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500 text-white">POST</Badge>
                <code className="text-sm font-mono">/api/mobile/refresh</code>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Request Body</h4>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`{
  "refreshToken": "rt_a1b2c3d4e5f6..."
}`}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Response (200 OK)</h4>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": { ... }
}`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                3. Get User Profile
              </CardTitle>
              <CardDescription>
                Retrieve the authenticated user's profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500 text-white">GET</Badge>
                <code className="text-sm font-mono">/api/me</code>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Headers</h4>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`Authorization: Bearer <accessToken>`}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Response (200 OK)</h4>
                <ScrollArea className="h-[200px]">
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "stravaConnected": true,
  "stravaAthleteId": "12345678",
  "unitPreference": "km",
  "createdAt": "2025-01-01T00:00:00.000Z"
}`}</code>
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <div className="border-t pt-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">API Reference</h2>
            <p className="text-gray-600 mb-6">All endpoints require the Authorization header with a valid access token unless otherwise noted.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User & Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/dashboard/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get comprehensive dashboard data including recent activities, stats, and summaries.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "stats": {
    "totalDistance": 856.4,
    "totalRuns": 142,
    "avgPace": "5:32",
    "totalTime": 4526400
  },
  "recentActivities": [
    {
      "id": 12345,
      "name": "Morning Run",
      "distance": 8.2,
      "movingTime": 2520,
      "startDate": "2025-12-07T07:00:00Z"
    }
  ],
  "weeklyMileage": 45.2
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/mobile/sessions</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">List all active mobile sessions for the authenticated user.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "sessions": [
    {
      "id": 1,
      "deviceName": "iPhone 15 Pro",
      "deviceId": "abc123",
      "lastUsed": "2025-12-07T10:30:00Z",
      "createdAt": "2025-11-01T08:00:00Z"
    },
    {
      "id": 2,
      "deviceName": "iPad Air",
      "deviceId": "def456",
      "lastUsed": "2025-12-05T15:20:00Z",
      "createdAt": "2025-10-15T12:00:00Z"
    }
  ]
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/activities</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">List all activities for the authenticated user. Supports pagination.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Query Parameters (optional)
?limit=20&offset=0

// Response (200 OK)
{
  "activities": [
    {
      "id": 12345,
      "stravaId": "9876543210",
      "name": "Morning Run",
      "type": "Run",
      "distance": 8200,
      "movingTime": 2520,
      "elapsedTime": 2650,
      "startDate": "2025-12-07T07:00:00Z",
      "averageSpeed": 3.25,
      "maxSpeed": 4.1,
      "averageHeartrate": 152,
      "maxHeartrate": 178,
      "totalElevationGain": 85,
      "averageCadence": 176
    }
  ],
  "total": 142,
  "hasMore": true
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/activities/:activityId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get detailed information for a single activity.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "id": 12345,
  "stravaId": "9876543210",
  "name": "Morning Run",
  "description": "Easy recovery run",
  "type": "Run",
  "distance": 8200,
  "movingTime": 2520,
  "elapsedTime": 2650,
  "startDate": "2025-12-07T07:00:00Z",
  "startLatlng": [40.7128, -74.0060],
  "endLatlng": [40.7580, -73.9855],
  "averageSpeed": 3.25,
  "maxSpeed": 4.1,
  "averageHeartrate": 152,
  "maxHeartrate": 178,
  "totalElevationGain": 85,
  "averageCadence": 176,
  "calories": 520,
  "polyline": "encoded_polyline_string..."
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/activities/:activityId/performance</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get performance metrics for a specific activity.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "activityId": 12345,
  "paceAnalysis": {
    "averagePace": "5:08",
    "splits": ["5:15", "5:05", "4:58", "5:12", "5:02"],
    "consistency": 0.92,
    "negativeSplit": true
  },
  "heartRateZones": {
    "zone1": 120,
    "zone2": 840,
    "zone3": 960,
    "zone4": 480,
    "zone5": 120
  },
  "cadenceAnalysis": {
    "average": 176,
    "optimal": true
  },
  "elevationImpact": {
    "gain": 85,
    "loss": 78,
    "gradeAdjustedPace": "5:02"
  }
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/insights/history/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get the history of AI-generated insights for a user.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "insights": [
    {
      "id": 1,
      "userId": 1,
      "type": "weekly_analysis",
      "content": {
        "summary": "Great week of training with 45km covered",
        "highlights": [
          "Improved pace consistency by 8%",
          "Heart rate efficiency improved"
        ],
        "recommendations": [
          "Consider adding hill repeats",
          "Include more recovery runs"
        ]
      },
      "createdAt": "2025-12-07T00:00:00Z"
    }
  ]
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500 text-white">POST</Badge>
                  <code className="text-sm font-mono">/api/insights/generate/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Generate new AI insights based on recent activity data. This may take 10-20 seconds.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Request Body (optional)
{
  "type": "weekly_analysis"  // or "training_feedback"
}

// Response (200 OK)
{
  "id": 2,
  "userId": 1,
  "type": "weekly_analysis",
  "content": {
    "summary": "Your training load is well-balanced this week",
    "performanceTrend": "improving",
    "insights": [
      {
        "category": "endurance",
        "message": "Your aerobic base is developing well",
        "score": 78
      },
      {
        "category": "speed",
        "message": "Consider adding tempo runs for speed work",
        "score": 65
      }
    ],
    "recommendations": [
      "Add one tempo run per week",
      "Maintain current long run distance"
    ]
  },
  "createdAt": "2025-12-07T12:00:00Z"
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/goals/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">List all goals for a user.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "goals": [
    {
      "id": 1,
      "userId": 1,
      "title": "Run 100km this month",
      "description": "Build base mileage",
      "targetValue": 100,
      "currentValue": 67.5,
      "unit": "km",
      "type": "distance",
      "status": "in_progress",
      "deadline": "2025-12-31T23:59:59Z",
      "createdAt": "2025-12-01T00:00:00Z"
    }
  ]
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500 text-white">POST</Badge>
                  <code className="text-sm font-mono">/api/goals</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Create a new goal.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Request Body
{
  "title": "Complete a half marathon",
  "description": "Train for spring race",
  "targetValue": 21.1,
  "unit": "km",
  "type": "race",
  "deadline": "2026-04-15T00:00:00Z"
}

// Response (201 Created)
{
  "id": 2,
  "userId": 1,
  "title": "Complete a half marathon",
  "description": "Train for spring race",
  "targetValue": 21.1,
  "currentValue": 0,
  "unit": "km",
  "type": "race",
  "status": "in_progress",
  "deadline": "2026-04-15T00:00:00Z",
  "createdAt": "2025-12-07T12:00:00Z"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-yellow-500 text-white">PATCH</Badge>
                  <code className="text-sm font-mono">/api/goals/:id/complete</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Mark a goal as completed.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "id": 1,
  "status": "completed",
  "completedAt": "2025-12-07T12:00:00Z",
  "message": "Congratulations on completing your goal!"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-500 text-white">DELETE</Badge>
                  <code className="text-sm font-mono">/api/goals/:id</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Delete a goal.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "success": true,
  "message": "Goal deleted successfully"
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Runner Score & Fitness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/runner-score/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get the current Runner Score (0-100) based on overall fitness.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "score": 72,
  "level": "Intermediate",
  "breakdown": {
    "endurance": 75,
    "speed": 68,
    "consistency": 80,
    "recovery": 65
  },
  "trend": "improving",
  "percentile": 68,
  "lastUpdated": "2025-12-07T00:00:00Z"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/runner-score/:userId/history</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get Runner Score history over time.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Query Parameters (optional)
?days=30

// Response (200 OK)
{
  "history": [
    { "date": "2025-12-07", "score": 72 },
    { "date": "2025-12-06", "score": 71 },
    { "date": "2025-12-05", "score": 70 },
    { "date": "2025-12-04", "score": 69 }
  ],
  "improvement": 3,
  "averageScore": 70.5
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/fitness/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get fitness metrics including CTL (Chronic Training Load), ATL (Acute Training Load), and TSB (Training Stress Balance).</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Query Parameters (optional)
?days=90

// Response (200 OK)
{
  "current": {
    "ctl": 65.2,
    "atl": 72.8,
    "tsb": -7.6,
    "formStatus": "Fatigued"
  },
  "history": [
    {
      "date": "2025-12-07",
      "ctl": 65.2,
      "atl": 72.8,
      "tsb": -7.6
    }
  ],
  "recommendation": "Consider a recovery day to improve form before racing"
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Plans & Predictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/ml/training-plan/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get the user's current AI-generated training plan.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "id": 1,
  "userId": 1,
  "goal": "Half Marathon PR",
  "targetRace": "2026-04-15",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Base Building",
      "totalDistance": 40,
      "workouts": [
        {
          "day": "Monday",
          "type": "easy_run",
          "distance": 6,
          "description": "Easy recovery pace"
        },
        {
          "day": "Wednesday",
          "type": "tempo",
          "distance": 8,
          "description": "20 min tempo at half marathon pace"
        }
      ]
    }
  ],
  "createdAt": "2025-12-01T00:00:00Z"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500 text-white">POST</Badge>
                  <code className="text-sm font-mono">/api/ml/training-plan/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Generate a new personalized training plan. Takes 15-30 seconds.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Request Body
{
  "goal": "Half Marathon PR",
  "targetRaceDate": "2026-04-15",
  "targetTime": "1:45:00",
  "daysPerWeek": 5,
  "longRunDay": "Sunday"
}

// Response (201 Created)
{
  "id": 2,
  "message": "Training plan generated successfully",
  "summary": {
    "totalWeeks": 16,
    "peakMileage": 55,
    "taperWeeks": 2
  }
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/ml/predictions/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get AI-powered race time predictions based on training data.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "predictions": {
    "5k": "22:15",
    "10k": "46:30",
    "halfMarathon": "1:42:45",
    "marathon": "3:35:00"
  },
  "confidence": 0.85,
  "basedOn": {
    "recentRaces": 2,
    "trainingRuns": 45,
    "vo2maxEstimate": 52.3
  },
  "lastUpdated": "2025-12-07T00:00:00Z"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/ml/injury-risk/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get injury risk analysis based on training patterns.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "riskLevel": "moderate",
  "riskScore": 45,
  "factors": [
    {
      "factor": "Mileage increase",
      "impact": "high",
      "detail": "15% increase in last 2 weeks"
    },
    {
      "factor": "Recovery time",
      "impact": "medium",
      "detail": "Below optimal rest between hard sessions"
    }
  ],
  "recommendations": [
    "Reduce weekly mileage by 10% next week",
    "Add an extra rest day"
  ]
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/performance/vo2max/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get estimated VO2 Max based on running data.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "vo2max": 52.3,
  "category": "Good",
  "percentileForAge": 75,
  "trend": "improving",
  "history": [
    { "date": "2025-12-01", "value": 51.8 },
    { "date": "2025-11-01", "value": 50.5 }
  ],
  "estimatedFrom": "heart_rate_and_pace"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/performance/hr-zones/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get personalized heart rate training zones.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "maxHR": 185,
  "restingHR": 52,
  "zones": {
    "zone1": { "name": "Recovery", "min": 104, "max": 122 },
    "zone2": { "name": "Aerobic", "min": 122, "max": 141 },
    "zone3": { "name": "Tempo", "min": 141, "max": 159 },
    "zone4": { "name": "Threshold", "min": 159, "max": 172 },
    "zone5": { "name": "VO2 Max", "min": 172, "max": 185 }
  },
  "method": "heart_rate_reserve"
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/performance/efficiency/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get running efficiency metrics.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "efficiencyIndex": 1.05,
  "category": "Good",
  "metrics": {
    "cadence": {
      "average": 176,
      "optimal": true
    },
    "groundContactTime": 235,
    "verticalOscillation": 8.2,
    "strideLength": 1.15
  },
  "improvements": [
    "Cadence is optimal for your pace",
    "Consider working on reducing vertical oscillation"
  ]
}`}</code></pre>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono">/api/performance/metrics/:userId</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Get all performance metrics in a single request.</p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm"><code>{`// Response (200 OK)
{
  "vo2max": {
    "value": 52.3,
    "category": "Good"
  },
  "runnerScore": {
    "score": 72,
    "level": "Intermediate"
  },
  "efficiency": {
    "index": 1.05,
    "category": "Good"
  },
  "fitness": {
    "ctl": 65.2,
    "atl": 72.8,
    "tsb": -7.6
  },
  "predictions": {
    "5k": "22:15",
    "10k": "46:30",
    "halfMarathon": "1:42:45"
  },
  "lastUpdated": "2025-12-07T00:00:00Z"
}`}</code></pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Logout
              </CardTitle>
              <CardDescription>
                Revoke refresh tokens when the user logs out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500 text-white">POST</Badge>
                    <code className="text-sm font-mono">/api/mobile/logout</code>
                    <span className="text-xs text-gray-500">- Single device</span>
                  </div>
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`{ "refreshToken": "rt_a1b2c3d4e5f6..." }`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500 text-white">POST</Badge>
                    <code className="text-sm font-mono">/api/mobile/logout-all</code>
                    <span className="text-xs text-gray-500">- All devices</span>
                  </div>
                  <p className="text-sm text-gray-600">Requires Authorization header. Revokes all refresh tokens for the user.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Responses</CardTitle>
              <CardDescription>Common error codes you may encounter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Status Code</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">401</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Unauthorized - Invalid or expired token</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">403</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Forbidden - Access denied to resource</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">404</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Not Found - Resource doesn't exist</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">429</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Too Many Requests - Rate limit exceeded</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">500</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Server Error - Something went wrong</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>iOS Integration Example</CardTitle>
              <CardDescription>Swift code for token management</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`import Foundation
import Security

class AuthManager {
    static let shared = AuthManager()
    
    private let accessTokenKey = "com.runanalytics.accessToken"
    private let refreshTokenKey = "com.runanalytics.refreshToken"
    
    func login(email: String, password: String) async throws -> User {
        let url = URL(string: "https://aitracker.run/api/mobile/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(LoginResponse.self, from: data)
        
        // Store tokens securely in Keychain
        saveToKeychain(key: accessTokenKey, value: response.accessToken)
        saveToKeychain(key: refreshTokenKey, value: response.refreshToken)
        
        return response.user
    }
    
    func refreshAccessToken() async throws -> String {
        guard let refreshToken = getFromKeychain(key: refreshTokenKey) else {
            throw AuthError.noRefreshToken
        }
        
        let url = URL(string: "https://aitracker.run/api/mobile/refresh")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["refreshToken": refreshToken]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(RefreshResponse.self, from: data)
        
        saveToKeychain(key: accessTokenKey, value: response.accessToken)
        return response.accessToken
    }
    
    private func saveToKeychain(key: String, value: String) {
        // Keychain implementation
    }
    
    private func getFromKeychain(key: String) -> String? {
        // Keychain implementation
        return nil
    }
}`}</code>
                  </pre>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
