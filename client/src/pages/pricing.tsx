import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import AppHeader from "@/components/AppHeader";
import { Check, X, Star, Zap, Crown, Quote, Trophy, MapPin, TrendingUp, Target, Activity } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useCheckout } from "@/hooks/useSubscription";
import { useState } from "react";
import { SEO } from "@/components/SEO";

const PRICE_IDS = {
  pro: {
    monthly: "price_1SbtceRwvWaTf8xfu0bS2gc3",
    annual: "price_1SbtceRwvWaTf8xfoPfgZI1z"
  },
  premium: {
    monthly: "price_1SbtcfRwvWaTf8xfSEO4iKnc",
    annual: "price_1SbtcfRwvWaTf8xfwcVnrRf8"
  }
};

interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  premium: boolean | string;
  isSection?: boolean;
  isNew?: boolean;
}

const features: PlanFeature[] = [
  // Core Section
  { name: "Core", free: "", pro: "", premium: "", isSection: true },
  { name: "Strava Integration", free: true, pro: true, premium: true },
  { name: "Activity History", free: "Unlimited", pro: "Unlimited", premium: "Unlimited" },
  { name: "Sync Volume", free: "Sync 100+ activities", pro: "Sync 100+ activities", premium: "Sync 100+ activities" },
  { name: "Runner Score", free: true, pro: true, premium: true },
  { name: "Free Calculator Tools", free: true, pro: true, premium: true },
  
  // Activity Detail Page Section
  { name: "Activity Analysis", free: "", pro: "", premium: "", isSection: true, isNew: true },
  { name: "Route Map with Key Moments", free: true, pro: true, premium: true },
  { name: "AI Coach Verdict (grade + summary)", free: "Basic", pro: "Full", premium: "Full" },
  { name: "Performance Metrics (Drift, Pacing, Baseline)", free: false, pro: true, premium: true },
  { name: "Interactive Run Timeline", free: false, pro: true, premium: true },
  { name: "Detailed Splits Analysis", free: false, pro: true, premium: true },
  { name: "Heart Rate, Cadence & Power Charts", free: false, pro: true, premium: true },
  { name: "Activity Comparison Tool", free: false, pro: false, premium: true },
  { name: "Ask AI Coach about this run", free: false, pro: false, premium: true },
  
  // Training & Coaching Section
  { name: "Training & Coaching", free: "", pro: "", premium: "", isSection: true },
  { name: "AI Training Plans", free: false, pro: true, premium: true },
  { name: "Race Predictions", free: false, pro: true, premium: true },
  { name: "Injury Risk Analysis", free: false, pro: true, premium: true },
  { name: "Fitness / Fatigue / Form Charts", free: false, pro: true, premium: true },
  { name: "AI Coach Chat (across your training)", free: false, pro: false, premium: true },
  { name: "AI Agent Coach (proactive post-run recaps)", free: false, pro: false, premium: true, isNew: true },
  
  // Benchmarking & Comparisons Section (Premium differentiator)
  { name: "Benchmarking & Comparisons", free: "", pro: "", premium: "", isSection: true },
  { name: "Personal Benchmarks (similar-run matching)", free: false, pro: "Preview", premium: true },
  { name: "Same Route Trends (performance over time)", free: false, pro: "Preview", premium: true },
  { name: "Compare Runs (overlay 2 runs, split-by-split diffs)", free: false, pro: false, premium: true },
  { name: "Form Stability Analysis (cadence/power stability over time)", free: false, pro: false, premium: true },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { plan, isPro, isPremium } = useSubscription();
  const checkout = useCheckout();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [, navigate] = useLocation();

  const handleSubscribe = (tier: 'pro' | 'premium') => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    const priceId = PRICE_IDS[tier][billingCycle];
    checkout.mutate(priceId);
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <Check className="h-5 w-5 text-green-500" />;
    }
    if (value === false) {
      return <X className="h-5 w-5 text-gray-300" />;
    }
    if (value === "Preview") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
          Preview
        </span>
      );
    }
    if (value === "Basic") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          Basic
        </span>
      );
    }
    if (value === "Full") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
          Full
        </span>
      );
    }
    if (value === "") {
      return null;
    }
    return <span className="text-sm font-medium text-gray-700">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <SEO 
        title="Pricing | RunAnalytics"
        description="Choose the perfect plan for your running journey. Free, Pro, and Premium tiers with AI insights, training plans, and advanced analytics."
      />
      {isAuthenticated ? <AppHeader /> : <PublicHeader />}

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-4 text-center">
            Simple, <span className="text-strava-orange">Transparent</span> Pricing
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 text-center max-w-3xl mx-auto">
            Choose the plan that fits your running goals. Upgrade anytime as you progress.
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

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
                  <Zap className="h-6 w-6 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal mb-2">Free</h2>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-charcoal">$0</span>
                  <span className="text-gray-500">/forever</span>
                </div>
                <p className="text-gray-600 mt-2">Get started with basics</p>
              </div>

              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Sync unlimited activities from Strava</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Route map with key moments</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Basic AI Coach verdict (grade + summary)</span>
                </li>
              </ul>

              {plan === 'free' ? (
                <Button className="w-full" variant="outline" disabled data-testid="current-plan-free">
                  Current Plan
                </Button>
              ) : (
                <Link href="/auth">
                  <Button className="w-full" variant="outline" data-testid="signup-free">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-strava-orange relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-strava-orange text-white px-4 py-1 rounded-full text-sm font-bold">
                  Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                  <Star className="h-6 w-6 text-strava-orange" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal mb-2">Pro</h2>
                {billingCycle === 'monthly' ? (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-strava-orange">$3.99</span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                    <p className="text-gray-600 mt-2">For serious runners</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-strava-orange">$39.99</span>
                      <span className="text-gray-500">/yr</span>
                    </div>
                    <p className="text-green-600 text-sm mt-1 font-medium">
                      ≈ $3.33/mo — Save 17%
                    </p>
                    <p className="text-gray-600 mt-1">For serious runners</p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>Full performance metrics (drift, pacing, baseline)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>Interactive timeline, splits, HR & power charts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-strava-orange mt-0.5 flex-shrink-0" />
                  <span>AI training plans & race predictions</span>
                </li>
              </ul>

              {isPro && plan === 'pro' ? (
                <Button className="w-full bg-strava-orange" disabled data-testid="current-plan-pro">
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-strava-orange hover:bg-strava-orange/90"
                  onClick={() => handleSubscribe('pro')}
                  disabled={checkout.isPending}
                  data-testid="subscribe-pro"
                >
                  {checkout.isPending ? 'Processing...' : 'Upgrade to Pro'}
                </Button>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-xl text-white relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                  Coach-Grade
                </span>
              </div>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-400 rounded-full mb-4">
                  <Crown className="h-6 w-6 text-gray-900" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Premium</h2>
                {billingCycle === 'monthly' ? (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-yellow-400">$7.99</span>
                      <span className="text-gray-400">/mo</span>
                    </div>
                    <p className="text-gray-400 mt-2">For elite performance</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-yellow-400">$79.99</span>
                      <span className="text-gray-400">/yr</span>
                    </div>
                    <p className="text-green-400 text-sm mt-1 font-medium">
                      ≈ $6.67/mo — Save 17%
                    </p>
                    <p className="text-gray-400 mt-1">For elite performance</p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>Ask AI Coach about any run</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>Compare runs side-by-side</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>Everything in Pro, plus form stability analysis</span>
                </li>
              </ul>

              {isPremium ? (
                <Button className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300" disabled data-testid="current-plan-premium">
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                  onClick={() => handleSubscribe('premium')}
                  disabled={checkout.isPending}
                  data-testid="subscribe-premium"
                >
                  {checkout.isPending ? 'Processing...' : 'Go Premium'}
                </Button>
              )}
            </div>
          </div>

          {/* Credibility Badges */}
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

          {/* Testimonials */}
          <div className="grid md:grid-cols-2 gap-6 mb-12" data-testid="testimonials">
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

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-16">
            <div className="p-6 bg-gray-50 border-b">
              <h3 className="text-2xl font-bold text-center text-charcoal">Feature Comparison</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold text-charcoal">Feature</th>
                    <th className="text-center p-4 font-semibold text-charcoal w-32">Free</th>
                    <th className="text-center p-4 font-semibold text-strava-orange w-32">Pro</th>
                    <th className="text-center p-4 font-semibold text-yellow-600 w-32">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => {
                    if (feature.isSection) {
                      return (
                        <tr key={feature.name} className="bg-gray-100 border-t-2 border-gray-200">
                          <td colSpan={4} className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-charcoal text-lg">{feature.name}</span>
                              {feature.isNew && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                                  NEW
                                </span>
                              )}
                              {feature.name === "Benchmarking & Comparisons" && (
                                <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                                  PREMIUM differentiator
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={feature.name} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="p-4 text-charcoal text-sm">{feature.name}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.free)}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.pro)}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.premium)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    </div>
  );
}
