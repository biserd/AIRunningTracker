import Footer from "@/components/Footer";
import { Activity, Check } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
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

      {/* Pricing Content */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-8 text-center">
            All Features <span className="text-strava-orange">Completely Free</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-16 text-center max-w-3xl mx-auto">
            RunAnalytics is now completely free for everyone. Get full access to all premium features, AI insights, and unlimited data history.
          </p>

          <div className="flex justify-center">
            {/* Free Plan with All Features */}
            <div className="bg-gradient-to-br from-strava-orange to-orange-600 rounded-2xl p-8 text-white shadow-2xl max-w-lg w-full">
              <div className="text-center mb-8">
                <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-semibold mb-4">
                  All Features Included
                </div>
                <h2 className="text-3xl font-bold mb-2">RunAnalytics</h2>
                <div className="text-5xl font-bold mb-2">$0</div>
                <p className="text-white/90">Forever free for all runners</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Complete performance analytics</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Strava integration</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Runner Score calculation</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Advanced AI insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Personalized training plans</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Race time predictions</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Injury risk analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Unlimited data history</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-white mr-3 flex-shrink-0" size={20} />
                  <span>Full customer support</span>
                </li>
              </ul>
              
              <Link href="/auth">
                <Button className="w-full bg-white text-strava-orange hover:bg-white/90 font-bold text-lg h-12">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center mt-16">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <p className="text-green-800">
                <strong className="text-lg">🎉 Great News!</strong><br/>
                All premium features are now completely free. No credit card required, no hidden fees, no limitations. 
                We believe every runner deserves access to powerful analytics and AI-powered insights.
              </p>
            </div>
            <p className="text-gray-600 mb-4">
              Questions? <Link href="/contact" className="text-strava-orange hover:underline">Contact us</Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}