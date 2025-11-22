import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <PublicHeader />

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
            <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-2xl w-full border-4 border-strava-orange">
              <div className="text-center mb-10">
                <div className="inline-block bg-strava-orange text-white px-6 py-2 rounded-full text-base font-bold mb-6 shadow-lg">
                  All Features Included - 100% Free
                </div>
                <h2 className="text-4xl font-bold mb-4 text-charcoal">RunAnalytics</h2>
                <div className="flex items-baseline justify-center gap-2 mb-3">
                  <span className="text-7xl font-extrabold text-strava-orange">$0</span>
                  <span className="text-2xl text-gray-600">/forever</span>
                </div>
                <p className="text-lg text-gray-700 font-medium">For all runners, everywhere</p>
              </div>
              
              <ul className="space-y-4 mb-10">
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Complete performance analytics</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Strava integration</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Runner Score calculation</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Advanced AI insights</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Personalized training plans</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Race time predictions</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Injury risk analysis</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Unlimited data history</span>
                </li>
                <li className="flex items-center text-charcoal">
                  <div className="bg-green-100 rounded-full p-1 mr-4">
                    <Check className="text-green-600 flex-shrink-0" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-lg font-medium">Full customer support</span>
                </li>
              </ul>
              
              <Link href="/auth">
                <Button className="w-full bg-strava-orange hover:bg-strava-orange/90 text-white font-bold text-xl h-14 shadow-lg">
                  Get Started Free →
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