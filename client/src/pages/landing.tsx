import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, Brain, BarChart, Target, Shield, Zap, TrendingUp, Trophy, Users } from "lucide-react";
import { VERSION } from "@shared/version";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "RunAnalytics",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "1250"
        },
        "description": "AI-powered running analytics platform with Runner Score, race predictions, and personalized training insights"
      },
      {
        "@type": "Organization",
        "name": "RunAnalytics",
        "url": "https://runanalytics.ai",
        "logo": "https://runanalytics.ai/logo.png",
        "description": "AI-powered running analytics and coaching platform",
        "sameAs": [
          "https://twitter.com/runanalytics",
          "https://facebook.com/runanalytics"
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <SEO
        title="RunAnalytics - AI-Powered Running Analytics & Performance Insights"
        description="Get your personal Runner Score (0-100), AI-powered insights, race predictions, and comprehensive performance analytics. Free with Strava integration. Transform your running today."
        keywords="running analytics, AI running coach, Strava analytics, runner score, race predictions, VO2 max, running performance, training insights, running app, marathon training"
        structuredData={structuredData}
      />
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
            <Link href="/auth">
              <Button 
                className="bg-strava-orange text-white hover:bg-strava-orange/90 h-11 px-4 sm:px-6 text-sm sm:text-base font-semibold min-w-[100px]"
                data-testid="header-cta-getstarted"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal mb-4 sm:mb-6 leading-tight">
            AI-Powered Running
            <span className="text-strava-orange"> Analytics</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Get your personal Runner Score, AI-powered insights, race predictions, and comprehensive performance analytics. 
            Connect your Strava account and unlock your running potential.
          </p>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8 text-gray-700">
            <Users className="h-5 w-5 text-strava-orange" />
            <span className="text-sm sm:text-base font-medium">
              Join 10,000+ runners improving their performance
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-strava-orange text-white hover:bg-strava-orange/90 h-14 sm:h-12 px-8 sm:px-10 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
                data-testid="hero-cta-getstarted"
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-2 border-gray-300 text-charcoal hover:bg-gray-50 h-14 sm:h-12 px-8 sm:px-10 text-base sm:text-lg font-semibold"
                data-testid="hero-cta-signin"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Connect with Strava</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3 sm:mb-4 px-4">
              Complete Running Analytics Suite
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              From your personal Runner Score to AI-powered insights, we provide everything you need to optimize your running performance.
            </p>
          </div>

          {/* Runner Score Showcase */}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-20 items-center">
            <div className="px-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-charcoal">Runner Score</h3>
              </div>
              <p className="text-base sm:text-lg text-gray-600 mb-6">
                Get your comprehensive running rating from 0-100 based on consistency, performance, volume, and improvement. 
                Share your achievements with beautiful radar charts that showcase your strengths.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-700">Four-component performance analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-700">Visual radar chart representation</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-700">Shareable achievement badges</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-700">Grade system (A+ to F)</span>
                </div>
              </div>
              {/* Secondary CTA */}
              <Link href="/auth">
                <Button
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 h-12 px-8 text-base font-semibold shadow-md mt-4"
                  data-testid="runnerscore-cta-getstarted"
                >
                  Get Your Runner Score
                </Button>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 sm:p-8 rounded-2xl mx-4 lg:mx-0">
              {/* Sample Runner Score Visual */}
              <div className="text-center space-y-4">
                <div className="text-5xl sm:text-6xl font-bold text-blue-600">87</div>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">AI Performance Insights</h3>
              <p className="text-gray-600 mb-4">
                Get personalized insights about your performance patterns, recovery needs, and training recommendations.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="font-medium text-purple-700">Sample Insight:</div>
                <div className="text-gray-600">"Your pace has improved 12% over the last month. Consider adding interval training to break through your current plateau."</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Race Time Predictions</h3>
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
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Advanced Analytics</h3>
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
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Training Plans</h3>
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
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Injury Prevention</h3>
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
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Performance Tracking</h3>
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
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-r from-blue-50 to-orange-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-charcoal px-4">
            Ready to Transform Your Running?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-700 px-4">
            Start analyzing your performance today with AI-powered insights and your personal Runner Score.
          </p>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8 text-gray-700 px-4">
            <Users className="h-5 w-5 text-strava-orange" />
            <span className="text-sm sm:text-base font-medium">
              Trusted by 10,000+ runners worldwide
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-strava-orange text-white hover:bg-strava-orange/90 h-14 sm:h-12 px-8 sm:px-10 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
                data-testid="bottom-cta-getstarted"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-2 border-gray-300 text-charcoal hover:bg-white h-14 sm:h-12 px-8 sm:px-10 text-base sm:text-lg font-semibold"
                data-testid="bottom-cta-signin"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 mt-6 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>100% Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Setup in 2 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}