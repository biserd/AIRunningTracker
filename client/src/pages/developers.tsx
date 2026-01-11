import { Link } from "wouter";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Key, Zap, Shield, Book, Activity, Brain, Target, TrendingUp } from "lucide-react";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-light-grey flex flex-col">
      <Helmet>
        <title>Developer API - RunAnalytics</title>
        <meta name="description" content="Build integrations with RunAnalytics API. Access running activities, AI insights, training plans, and goals programmatically with secure API keys." />
        <meta property="og:title" content="Developer API - RunAnalytics" />
        <meta property="og:description" content="Access your running data programmatically with the RunAnalytics API" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://aitracker.run/developers" />
      </Helmet>
      
      <AppHeader />
      
      <main className="flex-1">
        <section className="py-16 md:py-24 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-strava-orange/20 text-strava-orange px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Code className="h-4 w-4" />
              Developer API
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Build with RunAnalytics
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Access your running data, AI insights, and training plans through our RESTful API. 
              Build custom integrations, dashboards, and applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/developers/api">
                <Button size="lg" className="bg-strava-orange hover:bg-strava-orange-dark" data-testid="button-view-docs">
                  <Book className="h-5 w-5 mr-2" />
                  View API Documentation
                </Button>
              </Link>
              <Link href="/settings">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="button-get-api-key">
                  <Key className="h-5 w-5 mr-2" />
                  Get Your API Key
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">What You Can Build</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-2 hover:border-strava-orange transition-colors">
                <CardHeader>
                  <Activity className="h-10 w-10 text-strava-orange mb-2" />
                  <CardTitle>Activities</CardTitle>
                  <CardDescription>
                    Access running activities with pace, distance, heart rate, and more
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-2 hover:border-strava-orange transition-colors">
                <CardHeader>
                  <Brain className="h-10 w-10 text-strava-orange mb-2" />
                  <CardTitle>Key Insights</CardTitle>
                  <CardDescription>
                    Get AI-generated performance analysis and recommendations
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-2 hover:border-strava-orange transition-colors">
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-strava-orange mb-2" />
                  <CardTitle>Training Plans</CardTitle>
                  <CardDescription>
                    Retrieve personalized training plans and workout schedules
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-2 hover:border-strava-orange transition-colors">
                <CardHeader>
                  <Target className="h-10 w-10 text-strava-orange mb-2" />
                  <CardTitle>Goals</CardTitle>
                  <CardDescription>
                    Track goals, progress, and completion status
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">API Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Authentication</h3>
                <p className="text-gray-600">
                  API keys are securely hashed and support granular scope permissions
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Fast & Reliable</h3>
                <p className="text-gray-600">
                  RESTful JSON API with pagination and efficient data retrieval
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                  <Code className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Easy Integration</h3>
                <p className="text-gray-600">
                  Simple REST endpoints with clear documentation and examples
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-8">Quick Start</h2>
            <Card className="bg-gray-900 text-white">
              <CardHeader>
                <CardTitle className="text-green-400">Example: Fetch Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto text-sm">
                  <code>{`curl -X GET "https://aitracker.run/api/v1/activities" \\
  -H "Authorization: Bearer ra_your_api_key_here" \\
  -H "Content-Type: application/json"

# Response
{
  "activities": [
    {
      "id": 12345,
      "name": "Morning Run",
      "type": "Run",
      "distance": 5000,
      "moving_time": 1800,
      "average_heartrate": 145,
      "average_speed": 2.78,
      "start_date": "2025-12-07T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}`}</code>
                </pre>
              </CardContent>
            </Card>
            <div className="text-center mt-8">
              <Link href="/developers/api">
                <Button size="lg" data-testid="button-full-docs">
                  View Full Documentation
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-r from-strava-orange to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Create an API key from your Settings page and start building today.
            </p>
            <Link href="/settings">
              <Button size="lg" variant="secondary" data-testid="button-create-key-cta">
                <Key className="h-5 w-5 mr-2" />
                Create Your API Key
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
