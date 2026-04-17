import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import AppHeader from "@/components/AppHeader";
import { Check, Crown, Quote, Trophy, MapPin, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useCheckout } from "@/hooks/useSubscription";
import { useState } from "react";
import { SEO } from "@/components/SEO";
import { AddEmailModal } from "@/components/AddEmailModal";

const PRICE_IDS = {
  premium: {
    monthly: "price_1Sbr5WDfI9wxczZNEbTKSR12",
    annual: "price_1Sbr5WDfI9wxczZNeEmIzlKQ"
  }
};

interface FeatureSection {
  section: string;
  isNew?: boolean;
  items: string[];
}

const premiumFeatures: FeatureSection[] = [
  {
    section: "Core",
    items: [
      "Strava integration & unlimited activity history",
      "Runner Score calculation",
      "Free calculator tools",
      "Route map with key moments",
    ],
  },
  {
    section: "Activity Analysis",
    isNew: true,
    items: [
      "Full AI Coach verdict (grade + in-depth summary)",
      "Performance metrics (drift, pacing, baseline)",
      "Interactive run timeline",
      "Detailed splits analysis",
      "Heart rate, cadence & power charts",
      "Activity comparison tool",
      "Ask AI Coach about this run",
    ],
  },
  {
    section: "Training & Coaching",
    items: [
      "AI-generated training plans",
      "Race predictions",
      "Injury risk analysis",
      "Fitness / fatigue / form charts",
      "AI Coach Chat (across your training)",
      "AI Agent Coach — proactive post-run recaps",
    ],
  },
  {
    section: "Benchmarking & Comparisons",
    items: [
      "Personal benchmarks (similar-run matching)",
      "Same route trends (performance over time)",
      "Compare runs (overlay 2 runs, split-by-split diffs)",
      "Form stability analysis (cadence/power stability over time)",
    ],
  },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { isPremium } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [, navigate] = useLocation();
  const checkout = useCheckout(() => setShowEmailModal(true));

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    const priceId = PRICE_IDS.premium[billingCycle];
    checkout.mutate(priceId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <SEO
        title="Pricing | RunAnalytics"
        description="Start your 14-day free trial of RunAnalytics Premium. AI coaching, race predictions, training plans, and deep performance analytics. Cancel anytime."
      />
      {isAuthenticated ? <AppHeader /> : <PublicHeader />}

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-4 text-center">
            Simple, <span className="text-strava-orange">Transparent</span> Pricing
          </h1>

          <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl mx-auto">
            One plan. Everything included. Try it free for 14 days.
          </p>

          <div className="flex flex-col items-center mb-12">
            <div className="bg-white rounded-full p-1 shadow-md inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-strava-orange text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="billing-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-strava-orange text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="billing-annual"
              >
                Annual
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  billingCycle === 'annual'
                    ? 'bg-white/20 text-white'
                    : 'bg-green-100 text-green-700'
                }`}>
                  Save 17%
                </span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Cancel anytime · 30-day money-back guarantee
            </p>
          </div>

          {/* Single Premium card */}
          <div className="max-w-md mx-auto mb-16">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-xl text-white relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-strava-orange text-white px-4 py-1 rounded-full text-sm font-bold">
                  14-Day Free Trial
                </span>
              </div>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-strava-orange rounded-full mb-4">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Premium</h2>
                {billingCycle === 'monthly' ? (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-strava-orange">$7.99</span>
                      <span className="text-gray-400">/mo</span>
                    </div>
                    <p className="text-gray-400 mt-2">after your free trial</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-strava-orange">$79.99</span>
                      <span className="text-gray-400">/yr</span>
                    </div>
                    <p className="text-green-400 text-sm mt-1 font-medium">
                      ≈ $6.67/mo — Save 17%
                    </p>
                    <p className="text-gray-400 mt-1">after your free trial</p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>Full performance metrics & analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>AI training plans & race predictions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>AI Coach Chat & post-run recaps</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>Compare runs & form stability analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>Unlimited insights & activity history</span>
                </li>
              </ul>

              {isPremium ? (
                <Button className="w-full bg-strava-orange text-white hover:bg-strava-orange/90" disabled data-testid="current-plan-premium">
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full bg-strava-orange text-white hover:bg-strava-orange/90"
                  onClick={handleSubscribe}
                  disabled={checkout.isPending}
                  data-testid="subscribe-premium"
                >
                  {checkout.isPending ? 'Processing...' : 'Start Free Trial'}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-12" data-testid="credibility-badges">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm">
              <Trophy className="h-4 w-4 text-strava-orange" />
              <span className="text-sm text-gray-700 font-medium">Built by a marathoner</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm">
              <MapPin className="h-4 w-4 text-strava-orange" />
              <span className="text-sm text-gray-700 font-medium">Used for NYC Marathon training</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm">
              <TrendingUp className="h-4 w-4 text-strava-orange" />
              <span className="text-sm text-gray-700 font-medium">500+ PRs achieved</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16" data-testid="testimonials">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <Quote className="h-8 w-8 text-strava-orange/30 mb-3" />
              <p className="text-gray-700 mb-4 italic">
                "The race predictor was spot-on for my Boston qualifying time. I ran within 30 seconds of what it predicted."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-strava-orange to-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div>
                  <p className="font-semibold text-charcoal text-sm">Sarah M.</p>
                  <p className="text-xs text-gray-500">Boston Marathon qualifier · 3:28 finish</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <Quote className="h-8 w-8 text-strava-orange/30 mb-3" />
              <p className="text-gray-700 mb-4 italic">
                "I've been running for 3 years but never understood my data. The AI coach finally helped me train smarter, not harder."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div>
                  <p className="font-semibold text-charcoal text-sm">Mike T.</p>
                  <p className="text-xs text-gray-500">Recreational runner · Half marathon PB</p>
                </div>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gray-50 border-b">
              <h3 className="text-2xl font-bold text-center text-charcoal">Everything included in Premium</h3>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                {premiumFeatures.map((group) => (
                  <div key={group.section}>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-bold text-charcoal text-base">{group.section}</h4>
                      {group.isNew && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                          NEW
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-2">
              Questions? <Link href="/contact" className="text-strava-orange hover:underline">Contact us</Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <AddEmailModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={() => {
          setShowEmailModal(false);
          const priceId = PRICE_IDS.premium[billingCycle];
          checkout.mutate(priceId);
        }}
      />
    </div>
  );
}
