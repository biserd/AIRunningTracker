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

          <Card>
            <CardHeader>
              <CardTitle>Available API Endpoints</CardTitle>
              <CardDescription>
                All endpoints require the Authorization header with a valid access token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono flex-1">/api/me</code>
                  <span className="text-sm text-gray-600">User profile</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono flex-1">/api/activities</code>
                  <span className="text-sm text-gray-600">List activities</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono flex-1">/api/insights/:userId</code>
                  <span className="text-sm text-gray-600">AI insights</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono flex-1">/api/goals/:userId</code>
                  <span className="text-sm text-gray-600">User goals</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono flex-1">/api/dashboard/:userId</code>
                  <span className="text-sm text-gray-600">Dashboard data</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-green-500 text-white">GET</Badge>
                  <code className="text-sm font-mono flex-1">/api/mobile/sessions</code>
                  <span className="text-sm text-gray-600">Active sessions</span>
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
