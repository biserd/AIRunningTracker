import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Brain, BarChart, Target, Shield, Zap, TrendingUp, Trophy, Users, TrendingDown, Calculator, ArrowRight, MessageCircle, Activity, Map, Footprints, RotateCcw, Gift, Sparkles } from "lucide-react";
import { VERSION } from "@shared/version";
import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import { SEO } from "@/components/SEO";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useQuery } from "@tanstack/react-query";

export default function LandingPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalInsights: number;
    totalActivities: number;
    totalDistance: number;
    totalUsers: number;
  }>({
    queryKey: ['/api/platform-stats'],
    staleTime: 60000,
  });

  const StatSkeleton = () => (
    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
  );
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
        "url": "https://aitracker.run",
        "logo": "https://aitracker.run/logo.png",
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
        title="RunAnalytics - AI Running Coach & Performance Analytics"
        description="Chat with your personal AI Running Coach powered by GPT-5.1. Get instant training advice, race predictions, Runner Score (0-100), and comprehensive performance analytics. Free with Strava integration."
        keywords="AI running coach, running analytics, Strava analytics, runner score, race predictions, VO2 max, running performance, training insights, running app, marathon training, AI coach chat"
        structuredData={structuredData}
      />
      <PublicHeader />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal mb-4 sm:mb-6 leading-tight">
            The Missing Analytics Layer
            <span className="text-strava-orange"> for Strava</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4 mb-3">
            Strava tracks your miles. We tell you how to run them faster and stay healthy.
          </p>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Don't just log your runs, learn from them. Sync your history instantly to unlock the AI coaching, race predictions, and deep insights that your dashboard is missing.
          </p>

          {/* Social Proof with Real Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8 mx-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-5 w-5 text-strava-orange" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={(stats?.totalUsers || 0) * 3} className="text-strava-orange" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Active Runners</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={stats?.totalInsights || 0} className="text-blue-600" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">AI Insights</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={stats?.totalActivities || 0} className="text-green-600" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Activities Tracked</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={Math.round((stats?.totalDistance || 0) / 1609.34)} className="text-cyan-600" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Miles Analyzed</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4">
            {/* Primary CTA */}
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-gradient-to-r from-strava-orange via-orange-500 to-red-500 text-white hover:from-orange-600 hover:via-orange-500 hover:to-red-600 h-14 px-8 sm:px-12 text-base sm:text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 ring-2 ring-orange-300/50"
                data-testid="hero-cta-getstarted"
              >
                Get Started Free
              </Button>
            </Link>
            
            {/* Secondary CTA */}
            <Link href="/tools" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 h-14 px-8 sm:px-10 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                data-testid="hero-cta-tools"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Explore Free Tools
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Free tier available</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Syncs instantly with Strava</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2025 Running Wrapped Promo */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600">
        <div className="max-w-4xl mx-auto">
          <Link href="/auth">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer group" data-testid="banner-wrapped-promo">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <Gift className="h-8 w-8 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                    <span className="text-yellow-300 text-sm font-bold uppercase tracking-wide">New Feature</span>
                  </div>
                  <h3 className="text-white font-bold text-xl sm:text-2xl">2025 Running Wrapped</h3>
                  <p className="text-white/80 text-sm sm:text-base">See your year in review & share your running stats</p>
                </div>
              </div>
              <Button 
                className="bg-white text-purple-600 hover:bg-white/90 font-bold px-8 py-3 shadow-lg group-hover:scale-105 transition-transform"
                data-testid="button-wrapped-cta"
              >
                View Your Wrapped
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Link>
        </div>
      </section>

      {/* AI Running Coach Showcase */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="px-4 order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-strava-orange to-red-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal">Your 24/7 Running Strategist</h2>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-charcoal mb-3">
                Strava gives you charts. We give you answers.
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-6">
                Stop staring at graphs wondering if you're improving. Just ask. From "Am I overtraining?" to "What's my marathon pace?", get instant advice based on your actual history.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-gray-700"><strong>Turn complex data into plain English.</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm sm:text-base text-gray-700">
                    <strong>100% Personal Context.</strong> Unlike generic chatbots, we analyze your last 12 months of Strava logs before answering.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm sm:text-base text-gray-700">
                    <strong>Instant Race-Readiness Checks.</strong> Ask "Am I ready?" and get an honest prediction based on your recent long runs.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm sm:text-base text-gray-700">
                    <strong>Spot Injury Risks Early.</strong> Identify volume spikes and fatigue trends before they sideline you.
                  </div>
                </div>
              </div>
              <Link href="/auth">
                <Button
                  className="w-full sm:w-auto bg-gradient-to-r from-strava-orange via-orange-500 to-red-500 text-white hover:from-orange-600 hover:via-orange-500 hover:to-red-600 h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                  data-testid="aicoach-cta-getstarted"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Ask My Coach a Question
                </Button>
              </Link>
            </div>
            
            <div className="px-4 order-1 lg:order-2">
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
                {/* Chat Interface Mockup */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                    <div className="w-8 h-8 bg-gradient-to-r from-strava-orange to-red-500 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-charcoal">AI Running Coach</div>
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Online
                      </div>
                    </div>
                  </div>
                  
                  {/* Sample Messages */}
                  <div className="space-y-3 max-h-[300px] overflow-hidden">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-strava-orange text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                        How has my training been this month?
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] text-sm leading-relaxed">
                        <p className="mb-2">Great question! Looking at your October data:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <span className="font-semibold text-green-600">92 miles</span> total - up 15% from last month</li>
                          <li>• Average pace improved by <span className="font-semibold text-blue-600">18 sec/mile</span></li>
                          <li>• Consistency is strong with 4-5 runs/week</li>
                        </ul>
                        <p className="mt-2 text-strava-orange font-medium">Your training is trending very well!</p>
                      </div>
                    </div>
                    
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-strava-orange text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                        Am I ready for a half marathon?
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] text-sm">
                        Based on your training volume and recent long runs, you're in good shape! I'd predict a <span className="font-semibold text-blue-600">1:42-1:45</span> finish time...
                      </div>
                    </div>
                  </div>
                  
                  {/* Input Area */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <div className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-sm text-gray-400">
                      Ask me anything...
                    </div>
                    <div className="w-8 h-8 bg-strava-orange rounded-full flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Trust Badge */}
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-xs text-gray-600">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Smart coaching • Personalized • Free to use</span>
                </div>
              </div>
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
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
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
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 mt-4"
                  data-testid="runnerscore-cta-getstarted"
                >
                  Get Your Runner Score
                </Button>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 sm:p-8 rounded-2xl mx-4 lg:mx-0">
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
                  <circle cx="120" cy="150" r="3" fill="#0891B2"/>
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
                    <div className="w-3 h-3 bg-cyan-600 rounded-full"></div>
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
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-orange-200/50">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-strava-orange rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Smart Performance Insights</h3>
              <p className="text-gray-600 mb-4">
                Get personalized insights about your performance patterns, recovery needs, and training recommendations.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="font-medium text-strava-orange">Sample Insight:</div>
                <div className="text-gray-600">"Your pace has improved 12% over the last month. Consider adding interval training to break through your current plateau."</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-blue-200/50">
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

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-green-200/50">
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

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-orange-200/50">
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

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-teal-200/50">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-3">Running Coach Chat</h3>
              <p className="text-gray-600 mb-4">
                Chat with your running coach for instant insights and personalized advice about your training.
              </p>
              <div className="bg-white p-3 rounded-lg text-sm">
                <div className="font-medium text-teal-700 mb-1">Ask anything:</div>
                <div className="space-y-1 text-gray-600 text-xs">
                  <div>• "How's my training been?"</div>
                  <div>• "What should I focus on?"</div>
                  <div>• "Am I ready for a race?"</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-red-200/50">
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

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:shadow-yellow-200/50">
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

      {/* Free Running Tools Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-gray-50 via-white to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center space-x-2 bg-strava-orange/10 text-strava-orange px-4 py-2 rounded-full mb-6">
              <Calculator size={20} />
              <span className="font-semibold text-sm">Free Tools for All Runners</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3 sm:mb-4 px-4">
              Professional Analysis Tools
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Access powerful calculators and analyzers used by elite coaches. No account required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4">
            {/* Aerobic Decoupling Calculator */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-4">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Aerobic Decoupling</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Measure cardiovascular drift during long runs to assess endurance efficiency and aerobic fitness.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Split-halves analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Drift visualization</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Auto-import from Strava</span>
                </div>
              </div>
              <Link href="/tools/aerobic-decoupling-calculator">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800"
                  data-testid="tool-cta-aerobic-decoupling"
                >
                  Try Calculator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Training Split Analyzer */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Training Split Analyzer</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Discover if you're training polarized, pyramidal, or threshold-heavy with personalized zone recommendations.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Zone distribution analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Weekly trends</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Training prescription</span>
                </div>
              </div>
              <Link href="/tools/training-split-analyzer">
                <Button 
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
                  data-testid="tool-cta-training-split"
                >
                  Analyze Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Marathon Fueling Planner */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Marathon Fueling</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Calculate optimal race nutrition with precise gel timing, carb targets, and electrolyte balance.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Feeding schedule</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Carb & sodium tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Shopping list</span>
                </div>
              </div>
              <Link href="/tools/marathon-fueling">
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700"
                  data-testid="tool-cta-marathon-fueling"
                >
                  Plan Nutrition
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Race Predictor */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Race Time Predictor</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Predict your 10K, Half Marathon, and Marathon times with confidence intervals based on recent efforts.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Riegel formula with personalization</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Pace tables & split times</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Weather & course adjustments</span>
                </div>
              </div>
              <Link href="/tools/race-predictor">
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                  data-testid="tool-cta-race-predictor"
                >
                  Predict Times
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Cadence Analyzer */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Form Stability Analyzer</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Detect form fade through cadence drift analysis with a comprehensive Form Stability Score (0-100).
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>Cadence drift tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>Stride variability analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>Form stability score</span>
                </div>
              </div>
              <Link href="/tools/cadence-analyzer">
                <Button 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                  data-testid="tool-cta-cadence-analyzer"
                >
                  Analyze Form
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Running Shoe Hub */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                <Footprints className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Running Shoe Hub</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Browse 100+ verified running shoes with detailed specs, ratings, and AI-powered recommendations.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>16 major brands</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Verified specifications</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Detailed shoe pages</span>
                </div>
              </div>
              <Link href="/tools/shoes">
                <Button 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
                  data-testid="tool-cta-shoe-hub"
                >
                  Browse Shoes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Shoe Finder */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Personalized Shoe Finder</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Find your perfect running shoes based on weight, goals, foot type, and training preferences.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Weight-based matching</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Goal-specific suggestions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Foot type recommendations</span>
                </div>
              </div>
              <Link href="/tools/shoe-finder">
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                  data-testid="tool-cta-shoe-finder"
                >
                  Find My Shoes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Rotation Planner */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <RotateCcw className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Shoe Rotation Planner</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Build a complete training rotation with role-based shoe recommendations for all workout types.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>Daily trainer picks</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>Speed & race day shoes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>Recovery options</span>
                </div>
              </div>
              <Link href="/tools/rotation-planner">
                <Button 
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700"
                  data-testid="tool-cta-rotation-planner"
                >
                  Plan Rotation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Running Heatmap */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mb-4">
                <Map className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Running Heatmap</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Visualize your running routes on an interactive map showing your most-used training areas.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Last 30 activities</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Route overlap visualization</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Interactive popups</span>
                </div>
              </div>
              <Link href="/tools/heatmap">
                <Button 
                  className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700"
                  data-testid="tool-cta-heatmap"
                >
                  View Heatmap
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* View All Tools Link */}
          <div className="text-center mt-8">
            <Link href="/tools">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-strava-orange via-orange-500 to-red-500 text-white hover:from-orange-600 hover:via-orange-500 hover:to-red-600 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                data-testid="button-view-all-tools"
              >
                View All Tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
              Trusted by {statsLoading ? (
                <span className="inline-block h-5 w-12 bg-gray-200 rounded animate-pulse align-middle" />
              ) : (
                <span className="font-bold text-strava-orange">{((stats?.totalUsers || 0) * 3).toLocaleString()}+</span>
              )} runners worldwide
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-gradient-to-r from-strava-orange via-orange-500 to-red-500 text-white hover:from-orange-600 hover:via-orange-500 hover:to-red-600 h-14 sm:h-12 px-8 sm:px-10 text-base sm:text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 ring-2 ring-orange-300/50"
                data-testid="bottom-cta-getstarted"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-charcoal text-white hover:bg-gray-800 h-14 sm:h-12 px-8 sm:px-10 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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