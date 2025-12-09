import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import AppHeader from "@/components/AppHeader";
import { Check, X, Star, Zap, Crown } from "lucide-react";
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
}

const features: PlanFeature[] = [
  { name: "Strava Integration", free: true, pro: true, premium: true },
  { name: "Basic Performance Analytics", free: true, pro: true, premium: true },
  { name: "Runner Score", free: true, pro: true, premium: true },
  { name: "Free Calculator Tools", free: true, pro: true, premium: true },
  { name: "Activity History", free: "30 days", pro: "Unlimited", premium: "Unlimited" },
  { name: "Sync 100 Strava Activities", free: false, pro: true, premium: true },
  { name: "AI Performance Insights", free: "3/month", pro: "Unlimited", premium: "Unlimited" },
  { name: "AI Training Plans", free: false, pro: true, premium: true },
  { name: "Race Predictions", free: false, pro: true, premium: true },
  { name: "Injury Risk Analysis", free: false, pro: true, premium: true },
  { name: "Fitness/Fatigue/Form Charts", free: false, pro: true, premium: true },
  { name: "AI Running Coach Chat", free: false, pro: false, premium: true },
  { name: "Form Stability Analysis", free: false, pro: false, premium: true },
  { name: "Priority Support", free: false, pro: false, premium: true },
  { name: "Early Access to Features", free: false, pro: false, premium: true },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { plan, isPro, isPremium } = useSubscription();
  const checkout = useCheckout();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
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

          <div className="flex justify-center mb-12">
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
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'annual' 
                    ? 'bg-strava-orange text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid="billing-annual"
              >
                Annual <span className="text-xs ml-1">(Save 17%)</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="text-center mb-8">
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
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                  <Star className="h-6 w-6 text-strava-orange" />
                </div>
                <h2 className="text-2xl font-bold text-charcoal mb-2">Pro</h2>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-strava-orange">
                    ${billingCycle === 'monthly' ? '3.99' : '39.99'}
                  </span>
                  <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-green-600 text-sm mt-1">Save $7.89/year</p>
                )}
                <p className="text-gray-600 mt-2">For serious runners</p>
              </div>

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
                  Best Value
                </span>
              </div>
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-400 rounded-full mb-4">
                  <Crown className="h-6 w-6 text-gray-900" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Premium</h2>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-yellow-400">
                    ${billingCycle === 'monthly' ? '7.99' : '79.99'}
                  </span>
                  <span className="text-gray-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-green-400 text-sm mt-1">Save $15.89/year</p>
                )}
                <p className="text-gray-400 mt-2">For elite performance</p>
              </div>

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

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
                  {features.map((feature, index) => (
                    <tr key={feature.name} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-4 text-charcoal">{feature.name}</td>
                      <td className="p-4 text-center">{renderFeatureValue(feature.free)}</td>
                      <td className="p-4 text-center">{renderFeatureValue(feature.pro)}</td>
                      <td className="p-4 text-center">{renderFeatureValue(feature.premium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Questions? <Link href="/contact" className="text-strava-orange hover:underline">Contact us</Link>
            </p>
            <p className="text-sm text-gray-500">
              All plans include a 7-day money-back guarantee. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
