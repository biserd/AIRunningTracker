import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, Brain, BarChart, Target, Shield, Zap, TrendingUp, Trophy } from "lucide-react";
import { VERSION } from "@shared/version";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
            <Link href="/auth">
              <Button variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-6">
            AI-Powered Running
            <span className="text-strava-orange"> Analytics</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get your personal Runner Score, AI-powered insights, race predictions, and comprehensive performance analytics. 
            Connect your Strava account and unlock your running potential.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth">
              <Button
                size="lg"
                className="bg-strava-orange text-white hover:bg-strava-orange/90"
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth">
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 text-charcoal hover:bg-gray-50"
              >
                Sign In
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            Free to use • Connect with Strava • No credit card required
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-charcoal mb-4">
              Complete Running Analytics Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From your personal Runner Score to AI-powered insights, we provide everything you need to optimize your running performance.
            </p>
          </div>

          {/* Runner Score Showcase */}
          <div className="grid lg:grid-cols-2 gap-12 mb-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-charcoal">Runner Score</h3>
              </div>
              <p className="text-lg text-gray-600 mb-6">
                Get your comprehensive running rating from 0-100 based on consistency, performance, volume, and improvement. 
                Share your achievements with beautiful radar charts that showcase your strengths.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Four-component performance analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Visual radar chart representation</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Shareable achievement badges</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Grade system (A+ to F)</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
              {/* Sample Runner Score Visual */}
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-blue-600">87</div>
                <div className="flex items-center justify-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">Grade A-</Badge>
                  <span className="text-gray-600">92nd percentile</span>
                </div>
                {/* Simple radar chart representation */}
                <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
                  <defs>
                    <polygon id="radar" points="100,20 150,75 120,150 80,150 50,75" fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" strokeWidth="2"/>
                  </defs>
                  {/* Grid */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="60" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="40" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="20" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
                  {/* Axes */}
                  <line x1="100" y1="20" x2="100" y2="180" stroke="#E5E7EB" strokeWidth="1"/>
                  <line x1="20" y1="100" x2="180" y2="100" stroke="#E5E7EB" strokeWidth="1"/>
                  <line x1="44" y1="44" x2="156" y2="156" stroke="#E5E7EB" strokeWidth="1"/>
                  <line x1="156" y1="44" x2="44" y2="156" stroke="#E5E7EB" strokeWidth="1"/>
                  {/* Data */}
                  <use href="#radar"/>
                  <circle cx="100" cy="20" r="3" fill="#3B82F6"/>
                  <circle cx="150" cy="75" r="3" fill="#10B981"/>
                  <circle cx="120" cy="150" r="3" fill="#8B5CF6"/>
                  <circle cx="50" cy="75" r="3" fill="#EAB308"/>
                </svg>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Consistency 92%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Performance 88%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Volume 85%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Improvement 78%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">AI Performance Insights</h3>
              <p className="text-gray-600 mb-4">
                Get personalized insights about your performance patterns, recovery needs, and training recommendations.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="font-medium text-purple-700">Sample Insight:</div>
                <div className="text-gray-600">"Your pace has improved 12% over the last month. Consider adding interval training to break through your current plateau."</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Race Time Predictions</h3>
              <p className="text-gray-600 mb-4">
                AI-powered predictions for 5K, 10K, half marathon, and marathon distances based on your training data.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">5K:</span>
                  <span className="text-blue-600">22:45</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">10K:</span>
                  <span className="text-blue-600">47:20</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Half Marathon:</span>
                  <span className="text-blue-600">1:45:30</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <BarChart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Advanced Analytics</h3>
              <p className="text-gray-600 mb-4">
                VO2 Max estimation, running efficiency analysis, heart rate zones, and comprehensive performance metrics.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">VO2 Max:</span>
                  <span className="text-green-600">52.1 ml/kg/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Efficiency:</span>
                  <span className="text-green-600">168 SPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Training Load:</span>
                  <span className="text-green-600">Optimal</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Training Plans</h3>
              <p className="text-gray-600 mb-4">
                AI-generated personalized training schedules that adapt to your progress and goals.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="font-medium text-orange-700 mb-1">This Week:</div>
                <div className="space-y-1 text-gray-600">
                  <div>• 3x Easy runs (5-6 miles)</div>
                  <div>• 1x Tempo run (4 miles)</div>
                  <div>• 1x Long run (12 miles)</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Injury Prevention</h3>
              <p className="text-gray-600 mb-4">
                Smart analysis identifies training patterns that may lead to injury and provides prevention strategies.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-700">Risk Level: Low</span>
                </div>
                <div className="text-gray-600 text-xs">Your training load is well-balanced with adequate recovery time.</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Performance Tracking</h3>
              <p className="text-gray-600 mb-4">
                Real-time GPS route visualization, pace analysis, and comprehensive activity breakdowns.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="space-y-1 text-gray-600">
                  <div>• Interactive route maps</div>
                  <div>• Pace zone analysis</div>
                  <div>• Heart rate monitoring</div>
                  <div>• Weekly/monthly trends</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-50 to-orange-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-charcoal">
            Ready to Transform Your Running?
          </h2>
          <p className="text-xl mb-8 text-gray-700">
            Start analyzing your performance today with AI-powered insights and your personal Runner Score.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button
                size="lg"
                className="bg-strava-orange text-white hover:bg-strava-orange/90"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/auth">
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 text-charcoal hover:bg-white"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}