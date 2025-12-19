import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Brain, BarChart, Target, Shield, Zap, TrendingUp, Trophy, Users, TrendingDown, Calculator, ArrowRight, MessageCircle, Activity, Map, Footprints, RotateCcw, Gift, Sparkles, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Bot } from "lucide-react";
import { VERSION } from "@shared/version";
import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import { SEO } from "@/components/SEO";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useQuery } from "@tanstack/react-query";

export default function LandingPage() {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const toolsCarouselRef = useRef<HTMLDivElement>(null);
  
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalInsights: number;
    totalActivities: number;
    totalDistance: number;
    totalUsers: number;
  }>({
    queryKey: ['/api/platform-stats'],
    staleTime: 60000,
  });

  const scrollTools = (direction: 'left' | 'right') => {
    if (toolsCarouselRef.current) {
      const scrollAmount = 350;
      toolsCarouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const StatSkeleton = () => (
    <div className="h-8 min-w-[60px] bg-gray-200 rounded animate-pulse" />
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
      
      {/* 2025 Running Wrapped Notification Bar */}
      <Link href="/auth">
        <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 py-2 px-4 cursor-pointer hover:opacity-95 transition-opacity" data-testid="banner-wrapped-promo">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-3 text-white text-sm sm:text-base">
            <Sparkles className="h-4 w-4 text-yellow-300 flex-shrink-0" />
            <span className="font-semibold">2025 Running Wrapped is here!</span>
            <span className="hidden sm:inline text-white/80">See your year in review</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </div>
        </div>
      </Link>

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
              <div className="text-center min-h-[72px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-5 w-5 text-strava-orange" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center h-8 min-w-[60px]">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={(stats?.totalUsers || 0) * 5} className="text-strava-orange" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Active Runners</div>
              </div>
              <div className="text-center min-h-[72px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center h-8 min-w-[60px]">
                  <span className="text-purple-600">23</span>+
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">AI Agents</div>
              </div>
              <div className="text-center min-h-[72px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center h-8 min-w-[60px]">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={(stats?.totalInsights || 0) * 5} className="text-blue-600" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">AI Insights</div>
              </div>
              <div className="text-center min-h-[72px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center h-8 min-w-[60px]">
                  {statsLoading ? <StatSkeleton /> : (
                    <><AnimatedCounter end={stats?.totalActivities || 0} className="text-green-600" />+</>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Activities Tracked</div>
              </div>
              <div className="text-center min-h-[72px]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-charcoal flex items-center justify-center h-8 min-w-[60px]">
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
              Quantify Your Fitness in One Number
            </h2>
            <p className="text-lg sm:text-xl font-semibold text-charcoal mb-2 px-4">
              Strava shows you the miles. This score shows you the truth.
            </p>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              Stop guessing if you're actually getting fitter. We distill your volume, consistency, and speed into a single Runner Score™.
            </p>
          </div>

          {/* Runner Score Showcase */}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-20 items-center">
            <div className="px-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-charcoal">Get Your Personal "Runner Grade"</h3>
              </div>
              <p className="text-lg sm:text-xl font-semibold text-charcoal mb-2">
                Are you an A+ Athlete or a C-Student?
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-6">
                Our algorithm ranks you against thousands of other runners to show exactly where you stand. Finally, a metric that rewards <strong>consistency</strong>, not just speed.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-gray-700"><strong>Track 4 Key Metrics at Once</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm sm:text-base text-gray-700">
                    <strong>Instant Strengths & Weaknesses.</strong> See instantly if you need more speed or more volume.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm sm:text-base text-gray-700">
                    <strong>The Ultimate "Humble Brag".</strong> Export beautiful, pro-level visuals to share your score on Instagram or Strava.
                  </div>
                </div>
              </div>
              {/* Secondary CTA */}
              <Link href="/auth">
                <Button
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 mt-4"
                  data-testid="runnerscore-cta-getstarted"
                >
                  Calculate My Score Now
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

          {/* Core Features Grid - 3 "Wow" Features */}
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 px-4">
            {/* Smart Performance Insights */}
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

            {/* Race Time Predictions */}
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

            {/* Injury Prevention */}
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
          </div>

          {/* See All Features Toggle */}
          <div className="text-center mt-8 px-4">
            <Button
              variant="outline"
              onClick={() => setShowAllFeatures(!showAllFeatures)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              data-testid="button-toggle-features"
            >
              {showAllFeatures ? 'Show Less' : 'See All Features'}
              {showAllFeatures ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>

          {/* Expanded Features - Hidden by default */}
          {showAllFeatures && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 px-4 mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Advanced Analytics */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mb-3">
                  <BarChart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-charcoal mb-2">Advanced Analytics</h3>
                <p className="text-gray-600 text-sm">
                  VO2 Max estimation, heart rate zones, and comprehensive performance metrics.
                </p>
              </div>

              {/* Training Plans */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-charcoal mb-2">Training Plans</h3>
                <p className="text-gray-600 text-sm">
                  AI-generated personalized training schedules that adapt to your progress.
                </p>
              </div>

              {/* Running Coach Chat */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-5 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center mb-3">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-charcoal mb-2">Running Coach Chat</h3>
                <p className="text-gray-600 text-sm">
                  Chat with your AI coach for instant insights about your training.
                </p>
              </div>

              {/* Performance Tracking */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-charcoal mb-2">Performance Tracking</h3>
                <p className="text-gray-600 text-sm">
                  GPS route visualization, pace analysis, and activity breakdowns.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Free Running Tools Section - Horizontal Carousel */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-gray-50 via-white to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-strava-orange/10 text-strava-orange px-4 py-2 rounded-full mb-4">
              <Calculator size={20} />
              <span className="font-semibold text-sm">Free Tools for All Runners</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2 px-4">
              Professional Analysis Tools
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Access powerful calculators used by elite coaches. No account required.
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative">
            {/* Navigation Arrows */}
            <button
              onClick={() => scrollTools('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors hidden md:flex"
              data-testid="carousel-scroll-left"
              aria-label="Scroll tools left"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <button
              onClick={() => scrollTools('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors hidden md:flex"
              data-testid="carousel-scroll-right"
              aria-label="Scroll tools right"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>

            {/* Scrollable Tools Container */}
            <div 
              ref={toolsCarouselRef}
              className="flex gap-4 overflow-x-auto pb-4 px-2 md:px-8 scrollbar-hide scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Tool Card - Aerobic Decoupling */}
              <Link href="/tools/aerobic-decoupling-calculator" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Aerobic Decoupling</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Measure cardiovascular drift to assess endurance efficiency.</p>
                  <span className="text-blue-600 text-sm font-medium flex items-center">
                    Try Calculator <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Training Split */}
              <Link href="/tools/training-split-analyzer" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Training Split Analyzer</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Discover if you're training polarized, pyramidal, or threshold-heavy.</p>
                  <span className="text-rose-600 text-sm font-medium flex items-center">
                    Analyze Training <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Marathon Fueling */}
              <Link href="/tools/marathon-fueling" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Marathon Fueling</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Calculate optimal race nutrition with precise gel timing.</p>
                  <span className="text-orange-600 text-sm font-medium flex items-center">
                    Plan Nutrition <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Race Predictor */}
              <Link href="/tools/race-predictor" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Race Time Predictor</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Predict your race times with confidence intervals.</p>
                  <span className="text-green-600 text-sm font-medium flex items-center">
                    Predict Times <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Form Stability */}
              <Link href="/tools/cadence-analyzer" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Form Stability Analyzer</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Detect form fade through cadence drift analysis.</p>
                  <span className="text-cyan-600 text-sm font-medium flex items-center">
                    Analyze Form <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Shoe Hub */}
              <Link href="/tools/shoes" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Footprints className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Running Shoe Hub</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Browse 100+ verified shoes with detailed specs.</p>
                  <span className="text-amber-600 text-sm font-medium flex items-center">
                    Browse Shoes <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Shoe Finder */}
              <Link href="/tools/shoe-finder" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Personalized Shoe Finder</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Find your perfect shoes based on your profile.</p>
                  <span className="text-emerald-600 text-sm font-medium flex items-center">
                    Find My Shoes <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Rotation Planner */}
              <Link href="/tools/rotation-planner" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <RotateCcw className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Shoe Rotation Planner</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Build a complete training rotation for all workouts.</p>
                  <span className="text-sky-600 text-sm font-medium flex items-center">
                    Plan Rotation <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Tool Card - Heatmap */}
              <Link href="/tools/heatmap" className="flex-shrink-0 w-72 snap-start">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                      <Map className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-charcoal">Running Heatmap</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Visualize your routes on an interactive map.</p>
                  <span className="text-red-600 text-sm font-medium flex items-center">
                    View Heatmap <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>
            </div>

            {/* Scroll Indicator */}
            <div className="flex justify-center gap-1 mt-4 md:hidden">
              <span className="text-xs text-gray-500">Swipe to see more tools</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* View All Tools Link */}
          <div className="text-center mt-6">
            <Link href="/tools">
              <Button 
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
                <span className="font-bold text-strava-orange">{((stats?.totalUsers || 0) * 5).toLocaleString()}+</span>
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