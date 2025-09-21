import Footer from "@/components/Footer";
import { Activity, Brain, Target, TrendingUp, Calendar, Shield } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                  <Activity className="text-white" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
              </div>
            </Link>
            <Link href="/auth">
              <Button variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Content */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-8 text-center">
            Powerful <span className="text-strava-orange">Features</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-16 text-center max-w-3xl mx-auto">
            Discover how RunAnalytics transforms your running data into actionable insights with AI-powered analytics.
          </p>

          {/* AI Insights Section */}
          <div id="ai-insights" className="mb-20">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-strava-orange rounded-lg flex items-center justify-center mr-4">
                  <Brain className="text-white" size={24} />
                </div>
                <h2 className="text-3xl font-bold text-charcoal">AI-Powered Insights</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Get personalized performance analysis powered by advanced machine learning algorithms that understand your unique running patterns.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <TrendingUp className="text-strava-orange mx-auto mb-2" size={32} />
                  <h3 className="font-semibold mb-2">Performance Analysis</h3>
                  <p className="text-sm text-gray-600">Deep dive into your pace, heart rate, and efficiency trends</p>
                </div>
                <div className="text-center">
                  <Target className="text-strava-orange mx-auto mb-2" size={32} />
                  <h3 className="font-semibold mb-2">Race Predictions</h3>
                  <p className="text-sm text-gray-600">AI-powered predictions for your next race times</p>
                </div>
                <div className="text-center">
                  <Shield className="text-strava-orange mx-auto mb-2" size={32} />
                  <h3 className="font-semibold mb-2">Injury Prevention</h3>
                  <p className="text-sm text-gray-600">Early warning systems for potential injury risks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Training Plans Section */}
          <div id="training-plans" className="mb-20">
            <div className="bg-charcoal rounded-2xl p-8 text-white">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-strava-orange rounded-lg flex items-center justify-center mr-4">
                  <Calendar className="text-white" size={24} />
                </div>
                <h2 className="text-3xl font-bold">Personalized Training Plans</h2>
              </div>
              <p className="text-gray-300 mb-6">
                Get customized training plans that adapt to your progress, schedule, and goals using machine learning.
              </p>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Adaptive Plans</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Plans that adjust based on your performance</li>
                    <li>• Integration with your existing schedule</li>
                    <li>• Goal-specific training (5K, 10K, Marathon)</li>
                    <li>• Recovery and rest day optimization</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">Smart Recommendations</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Workout intensity suggestions</li>
                    <li>• Cross-training recommendations</li>
                    <li>• Nutrition and hydration tips</li>
                    <li>• Equipment and gear advice</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
              <Activity className="text-strava-orange mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-charcoal mb-2">Strava Integration</h3>
              <p className="text-gray-600">Seamlessly sync all your running data from Strava for comprehensive analysis.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
              <TrendingUp className="text-strava-orange mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-charcoal mb-2">Runner Score</h3>
              <p className="text-gray-600">Get your personalized Runner Score that tracks your overall fitness and improvement.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
              <Target className="text-strava-orange mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-charcoal mb-2">Goal Tracking</h3>
              <p className="text-gray-600">Set and track your running goals with intelligent progress monitoring.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}