import { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Key, Activity, Brain, TrendingUp, Target, ChevronRight } from "lucide-react";

const endpoints = [
  {
    id: "activities",
    icon: Activity,
    title: "Activities",
    description: "Access your running activities data",
    scope: "activities",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/activities",
        description: "List all activities",
        params: [
          { name: "page", type: "integer", default: "1", description: "Page number for pagination" },
          { name: "limit", type: "integer", default: "20", description: "Number of results per page (max 100)" },
          { name: "type", type: "string", optional: true, description: "Filter by activity type (Run, TrailRun, VirtualRun)" },
        ],
        response: `{
  "activities": [
    {
      "id": 12345,
      "stravaActivityId": "9876543210",
      "name": "Morning Run",
      "type": "Run",
      "distance": 5000,
      "moving_time": 1800,
      "elapsed_time": 1850,
      "total_elevation_gain": 45,
      "average_speed": 2.78,
      "max_speed": 3.5,
      "average_heartrate": 145,
      "max_heartrate": 175,
      "average_cadence": 170,
      "start_date": "2025-12-07T08:00:00Z",
      "start_date_local": "2025-12-07T09:00:00",
      "timezone": "Europe/London"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/activities/:id",
        description: "Get a single activity by ID",
        params: [
          { name: "id", type: "integer", description: "Activity ID" },
        ],
        response: `{
  "activity": {
    "id": 12345,
    "stravaActivityId": "9876543210",
    "name": "Morning Run",
    "type": "Run",
    "distance": 5000,
    "moving_time": 1800,
    "elapsed_time": 1850,
    "total_elevation_gain": 45,
    "average_speed": 2.78,
    "max_speed": 3.5,
    "average_heartrate": 145,
    "max_heartrate": 175,
    "average_cadence": 170,
    "start_date": "2025-12-07T08:00:00Z",
    "start_date_local": "2025-12-07T09:00:00",
    "timezone": "Europe/London",
    "summary_polyline": "encoded_polyline_string"
  }
}`,
      },
    ],
  },
  {
    id: "insights",
    icon: Brain,
    title: "AI Insights",
    description: "AI-generated performance analysis",
    scope: "insights",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/insights",
        description: "Get the latest AI insights for your running performance",
        params: [],
        response: `{
  "insights": {
    "id": 1,
    "userId": 123,
    "content": {
      "performanceTrend": "Your running performance has improved by 12%...",
      "recoveryStatus": "Your body is well-recovered...",
      "weeklyAnalysis": "This week you ran 45km across 5 runs...",
      "recommendations": [
        "Consider adding a tempo run...",
        "Your cadence could benefit from..."
      ]
    },
    "vo2Max": 52.5,
    "runnerScore": 78,
    "racePredictions": {
      "5K": "22:30",
      "10K": "47:15",
      "halfMarathon": "1:45:00",
      "marathon": "3:45:00"
    },
    "createdAt": "2025-12-07T10:00:00Z"
  }
}`,
      },
    ],
  },
  {
    id: "training-plans",
    icon: TrendingUp,
    title: "Training Plans",
    description: "Personalized training plans and schedules",
    scope: "training_plans",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/training-plans",
        description: "Get all training plans",
        params: [],
        response: `{
  "trainingPlans": [
    {
      "id": 1,
      "userId": 123,
      "name": "10K Personal Best",
      "goal": "Run 10K under 45 minutes",
      "duration": 8,
      "weeklyMileage": 40,
      "schedule": {
        "week1": ["Easy 5K", "Tempo 3K", "Rest", "Intervals", "Rest", "Long 12K", "Rest"],
        "week2": ["Easy 6K", "Tempo 4K", "Rest", "Intervals", "Rest", "Long 14K", "Rest"]
      },
      "createdAt": "2025-12-01T00:00:00Z"
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/v1/training-plans/:id",
        description: "Get a specific training plan",
        params: [
          { name: "id", type: "integer", description: "Training plan ID" },
        ],
        response: `{
  "trainingPlan": {
    "id": 1,
    "userId": 123,
    "name": "10K Personal Best",
    "goal": "Run 10K under 45 minutes",
    "duration": 8,
    "weeklyMileage": 40,
    "schedule": {
      "week1": ["Easy 5K", "Tempo 3K", "Rest", "Intervals", "Rest", "Long 12K", "Rest"]
    },
    "createdAt": "2025-12-01T00:00:00Z"
  }
}`,
      },
    ],
  },
  {
    id: "goals",
    icon: Target,
    title: "Goals",
    description: "Track goals and progress",
    scope: "goals",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/goals",
        description: "Get all goals",
        params: [
          { name: "status", type: "string", optional: true, description: "Filter by status (active, completed, all)" },
        ],
        response: `{
  "goals": [
    {
      "id": 1,
      "userId": 123,
      "title": "Run 100km this month",
      "type": "distance",
      "target": 100000,
      "current": 65000,
      "unit": "meters",
      "status": "active",
      "progress": 65,
      "deadline": "2025-12-31T23:59:59Z",
      "createdAt": "2025-12-01T00:00:00Z"
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/v1/goals/:id",
        description: "Get a specific goal",
        params: [
          { name: "id", type: "integer", description: "Goal ID" },
        ],
        response: `{
  "goal": {
    "id": 1,
    "userId": 123,
    "title": "Run 100km this month",
    "type": "distance",
    "target": 100000,
    "current": 65000,
    "unit": "meters",
    "status": "active",
    "progress": 65,
    "deadline": "2025-12-31T23:59:59Z",
    "createdAt": "2025-12-01T00:00:00Z"
  }
}`,
      },
    ],
  },
];

export default function ApiDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("activities");

  return (
    <div className="min-h-screen bg-light-grey flex flex-col">
      <Helmet>
        <title>API Documentation - RunAnalytics Developer API</title>
        <meta name="description" content="Complete API documentation for RunAnalytics. Learn how to authenticate, access endpoints for activities, AI insights, training plans, and goals." />
        <meta property="og:title" content="API Documentation - RunAnalytics" />
        <meta property="og:description" content="Complete developer documentation for the RunAnalytics API" />
        <link rel="canonical" href="https://aitracker.run/developers/api" />
      </Helmet>
      
      <AppHeader />
      
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        <Link href="/developers" className="inline-flex items-center text-strava-orange hover:underline mb-6" data-testid="link-back-developers">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Developers
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Documentation</h1>
          <p className="text-gray-600">
            Everything you need to integrate with the RunAnalytics API
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1 p-4 pt-0">
                  {endpoints.map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => setSelectedEndpoint(ep.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        selectedEndpoint === ep.id
                          ? "bg-strava-orange text-white"
                          : "hover:bg-gray-100"
                      }`}
                      data-testid={`nav-endpoint-${ep.id}`}
                    >
                      <ep.icon className="h-4 w-4" />
                      {ep.title}
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Authentication
                </CardTitle>
                <CardDescription>
                  All API requests require authentication via an API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Include your API key in the Authorization header as a Bearer token:
                </p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`Authorization: Bearer ra_your_api_key_here`}</code>
                  </pre>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> API keys grant access to your data. Keep them secure and never expose them in client-side code or public repositories.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Create and manage your API keys in your{" "}
                  <Link href="/settings" className="text-strava-orange hover:underline">
                    Settings page
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-white rounded-lg p-4">
                  <code className="text-sm">https://aitracker.run/api/v1</code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scopes</CardTitle>
                <CardDescription>
                  API keys can have different permission levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {endpoints.map((ep) => (
                    <div key={ep.scope} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Badge variant="outline" className="font-mono">{ep.scope}</Badge>
                      <span className="text-sm text-gray-600">{ep.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                  Mobile App Authentication
                </CardTitle>
                <CardDescription>
                  For iOS and Android applications using email/password login
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-gray-600">
                  Mobile apps use a different authentication flow with refresh tokens for better security and user experience.
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">1. Login</h4>
                    <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm">
                        <code>{`POST /api/mobile/login

{
  "email": "user@example.com",
  "password": "yourpassword",
  "deviceName": "iPhone 15 Pro",  // optional
  "deviceId": "unique-device-id"  // optional
}

// Response:
{
  "accessToken": "eyJhbG...",      // Use for API calls (15 min expiry)
  "refreshToken": "rt_abc123...",  // Store securely (30 day expiry)
  "expiresIn": 900,
  "user": { "id": 1, "email": "...", ... }
}`}</code>
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">2. Refresh Token</h4>
                    <p className="text-xs text-gray-500 mb-2">When access token expires, get a new one:</p>
                    <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm">
                        <code>{`POST /api/mobile/refresh

{
  "refreshToken": "rt_abc123..."
}

// Response:
{
  "accessToken": "eyJhbG...",  // New access token
  "expiresIn": 900,
  "user": { ... }
}`}</code>
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">3. Making API Calls</h4>
                    <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm">
                        <code>{`GET /api/me
Authorization: Bearer <accessToken>

// Returns user profile and settings`}</code>
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">4. Logout</h4>
                    <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm">
                        <code>{`POST /api/mobile/logout

{
  "refreshToken": "rt_abc123..."
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Security Tips:</strong> Store refresh tokens in iOS Keychain or Android Keystore. Never store tokens in plain text or UserDefaults/SharedPreferences.
                  </p>
                </div>

                <div className="text-sm text-gray-600">
                  <h4 className="font-semibold mb-2">Available Endpoints</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><code className="text-xs bg-gray-100 px-1 rounded">GET /api/me</code> - Get current user profile</li>
                    <li><code className="text-xs bg-gray-100 px-1 rounded">GET /api/activities</code> - List user activities</li>
                    <li><code className="text-xs bg-gray-100 px-1 rounded">GET /api/insights</code> - Get AI insights</li>
                    <li><code className="text-xs bg-gray-100 px-1 rounded">GET /api/goals/:userId</code> - List user goals</li>
                    <li><code className="text-xs bg-gray-100 px-1 rounded">GET /api/mobile/sessions</code> - List active sessions</li>
                    <li><code className="text-xs bg-gray-100 px-1 rounded">POST /api/mobile/logout-all</code> - Logout from all devices</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {endpoints
              .filter((ep) => ep.id === selectedEndpoint)
              .map((category) => (
                <div key={category.id} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <category.icon className="h-6 w-6 text-strava-orange" />
                        <div>
                          <CardTitle>{category.title}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        Scope: {category.scope}
                      </Badge>
                    </CardHeader>
                  </Card>

                  {category.endpoints.map((endpoint, idx) => (
                    <Card key={idx} id={`${category.id}-${idx}`}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`${
                              endpoint.method === "GET"
                                ? "bg-green-500"
                                : endpoint.method === "POST"
                                ? "bg-blue-500"
                                : endpoint.method === "DELETE"
                                ? "bg-red-500"
                                : "bg-gray-500"
                            } text-white`}
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="text-lg font-mono">{endpoint.path}</code>
                        </div>
                        <CardDescription>{endpoint.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {endpoint.params.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Parameters</h4>
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-4 py-2 font-medium">Name</th>
                                    <th className="text-left px-4 py-2 font-medium">Type</th>
                                    <th className="text-left px-4 py-2 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.params.map((param, pidx) => (
                                    <tr key={pidx} className="border-t">
                                      <td className="px-4 py-2">
                                        <code className="text-strava-orange">{param.name}</code>
                                        {"optional" in param && param.optional && (
                                          <span className="ml-2 text-xs text-gray-400">optional</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-gray-600">{param.type}</td>
                                      <td className="px-4 py-2 text-gray-600">
                                        {param.description}
                                        {"default" in param && (
                                          <span className="ml-2 text-xs text-gray-400">
                                            (default: {param.default})
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold mb-3">Example Response</h4>
                          <ScrollArea className="h-[300px]">
                            <div className="bg-gray-900 text-white rounded-lg p-4">
                              <pre className="text-sm whitespace-pre-wrap">
                                <code>{endpoint.response}</code>
                              </pre>
                            </div>
                          </ScrollArea>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}

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
                        <td className="px-4 py-2"><Badge variant="destructive">401</Badge></td>
                        <td className="px-4 py-2 text-gray-600">Invalid or missing API key</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2"><Badge variant="destructive">403</Badge></td>
                        <td className="px-4 py-2 text-gray-600">API key doesn't have required scope</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2"><Badge variant="destructive">404</Badge></td>
                        <td className="px-4 py-2 text-gray-600">Resource not found</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2"><Badge variant="destructive">429</Badge></td>
                        <td className="px-4 py-2 text-gray-600">Rate limit exceeded (100 requests/minute)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2"><Badge variant="destructive">500</Badge></td>
                        <td className="px-4 py-2 text-gray-600">Internal server error</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  API requests are rate limited to 100 requests per minute per API key. 
                  Rate limit information is included in the response headers:
                </p>
                <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702000000`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
