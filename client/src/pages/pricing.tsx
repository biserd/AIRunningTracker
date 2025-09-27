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
            Simple <span className="text-strava-orange">Pricing</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-16 text-center max-w-3xl mx-auto">
            Start free and upgrade when you're ready for advanced features. No hidden fees, cancel anytime.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-charcoal mb-2">Free</h2>
                <div className="text-4xl font-bold text-charcoal mb-2">$0</div>
                <p className="text-gray-600">Perfect for getting started</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3" size={20} />
                  <span>Basic performance analytics</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3" size={20} />
                  <span>Strava integration</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3" size={20} />
                  <span>Runner Score calculation</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3" size={20} />
                  <span>Basic AI insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-green-500 mr-3" size={20} />
                  <span>Last 30 days of data</span>
                </li>
              </ul>
              
              <Link href="/auth">
                <Button className="w-full" variant="outline">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-charcoal rounded-2xl p-8 text-white relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-strava-orange text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Coming Soon
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Pro</h2>
                <div className="text-4xl font-bold mb-2">$9.99</div>
                <p className="text-gray-300">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Advanced AI insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Personalized training plans</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Race time predictions</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Injury risk analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Unlimited data history</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-strava-orange mr-3" size={20} />
                  <span>Priority support</span>
                </li>
              </ul>
              
              <Link href="/subscribe">
                <Button className="w-full bg-strava-orange hover:bg-strava-orange/90" data-testid="button-upgrade-pro">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="text-gray-600 mb-4">
              Questions about pricing? <Link href="/contact" className="text-strava-orange hover:underline">Contact us</Link>
            </p>
            <p className="text-sm text-gray-500">
              All plans include basic customer support • 30-day money-back guarantee for Pro plan
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}