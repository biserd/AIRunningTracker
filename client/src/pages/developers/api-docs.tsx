import { Helmet } from "react-helmet";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Smartphone, Lock, RefreshCw, User, Activity, Brain, Target } from "lucide-react";

export default function APIDocs() {
  return (
    <div className="min-h-screen bg-light-grey flex flex-col">
      <Helmet>
        <title>Mobile API Documentation | RunAnalytics</title>
        <meta name="description" content="API documentation for the RunAnalytics iOS and Android mobile applications. Learn about authentication, endpoints, and data access." />
      </Helmet>

      <AppHeader />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        <Link href="/developers" className="inline-flex items-center gap-2 text-strava-orange hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Developers
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mobile API Documentation</h1>
          <p className="text-gray-600">
            Authentication and API endpoints for the RunAnalytics mobile application.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Authentication Flow
              </CardTitle>
              <CardDescription>
                Secure JWT-based authentication for iOS and Android apps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">
                Mobile apps use a refresh token system for better security. Short-lived access tokens (15 minutes) 
                are used for API calls, while long-lived refresh tokens (30 days) are stored securely on the device.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500">POST</Badge>
                    <code className="text-sm font-mono">/api/mobile/login</code>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">Authenticate with email and password</p>
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`// Request
{
  "email": "user@example.com",
  "password": "yourpassword",
  "deviceName": "iPhone 15 Pro",  // optional
  "deviceId": "unique-device-id"  // optional
}

// Response
{
  "accessToken": "eyJhbG...",      // Use for API calls (15 min)
  "refreshToken": "rt_abc123...",  // Store securely (30 days)
  "expiresIn": 900,
  "user": { "id": 1, "email": "...", "firstName": "...", ... }
}`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500">POST</Badge>
                    <code className="text-sm font-mono">/api/mobile/refresh</code>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">Get a new access token when the current one expires</p>
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`// Request
{
  "refreshToken": "rt_abc123..."
}

// Response
{
  "accessToken": "eyJhbG...",  // New access token
  "expiresIn": 900,
  "user": { ... }
}`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500">POST</Badge>
                    <code className="text-sm font-mono">/api/mobile/logout</code>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">Revoke a refresh token (logout from current device)</p>
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`// Request
{
  "refreshToken": "rt_abc123..."
}

// Response
{
  "success": true,
  "message": "Logged out successfully"
}`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500">POST</Badge>
                    <code className="text-sm font-mono">/api/mobile/logout-all</code>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">Logout from all devices (requires Authorization header)</p>
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`// Headers
Authorization: Bearer <accessToken>

// Response
{
  "success": true,
  "message": "Logged out from all devices"
}`}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500">GET</Badge>
                    <code className="text-sm font-mono">/api/mobile/sessions</code>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">List all active sessions (requires Authorization header)</p>
                  <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{`// Headers
Authorization: Bearer <accessToken>

// Response
{
  "sessions": [
    {
      "id": 1,
      "deviceName": "iPhone 15 Pro",
      "deviceId": "abc123",
      "lastUsedAt": "2025-12-07T10:00:00Z",
      "createdAt": "2025-12-01T08:00:00Z"
    }
  ]
}`}</code>
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Security Tips:</strong> Store refresh tokens in iOS Keychain or Android Keystore. 
                  Never store tokens in plain text, UserDefaults, or SharedPreferences.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Making Authenticated Requests
              </CardTitle>
              <CardDescription>
                Include the access token in all API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                After logging in, include the access token in the Authorization header for all API requests:
              </p>
              <div className="bg-gray-900 text-white rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm">
                  <code>{`GET /api/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}</code>
                </pre>
              </div>
              <p className="text-sm text-gray-600">
                When you receive a <code className="bg-gray-100 px-1 rounded">401 Unauthorized</code> response, 
                use the refresh token to get a new access token, then retry the request.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Endpoints</CardTitle>
              <CardDescription>
                All endpoints require the Authorization header with a valid access token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-strava-orange" />
                    <h4 className="font-semibold">User Profile</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                      <code>/api/me</code>
                      <span className="text-gray-500">- Get current user profile and settings</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-strava-orange" />
                    <h4 className="font-semibold">Activities</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                      <code>/api/activities</code>
                      <span className="text-gray-500">- List user's activities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                      <code>/api/dashboard/:userId</code>
                      <span className="text-gray-500">- Get dashboard data with stats</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-strava-orange" />
                    <h4 className="font-semibold">AI Insights</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                      <code>/api/insights/:userId</code>
                      <span className="text-gray-500">- Get AI-generated insights</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-600">POST</Badge>
                      <code>/api/insights/generate</code>
                      <span className="text-gray-500">- Generate new AI insights</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-strava-orange" />
                    <h4 className="font-semibold">Goals</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">GET</Badge>
                      <code>/api/goals/:userId</code>
                      <span className="text-gray-500">- List user's goals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-600">POST</Badge>
                      <code>/api/goals</code>
                      <span className="text-gray-500">- Create a new goal</span>
                    </div>
                  </div>
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
                      <td className="px-4 py-2"><Badge variant="outline">400</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Bad Request - Invalid request body or parameters</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">401</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Unauthorized - Invalid or expired access token</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">403</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Forbidden - You don't have permission to access this resource</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">404</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Not Found - The requested resource doesn't exist</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2"><Badge variant="outline">500</Badge></td>
                      <td className="px-4 py-2 text-gray-600">Server Error - Something went wrong on our end</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>API request limits to ensure fair usage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                API requests are rate limited to ensure fair usage and protect our servers. 
                Current limits:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>100 requests per minute per user</li>
                <li>1000 requests per hour per user</li>
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                If you exceed these limits, you'll receive a <code className="bg-gray-100 px-1 rounded">429 Too Many Requests</code> response.
                Wait a moment before retrying.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
