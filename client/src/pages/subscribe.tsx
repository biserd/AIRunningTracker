import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useCheckout } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Star, Zap, Check, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";

const PRICE_IDS = {
  pro: {
    monthly: "price_1Sbr5VDfI9wxczZNhkB8n9Zk",
    annual: "price_1Sbr5WDfI9wxczZN72UwiOAX"
  },
  premium: {
    monthly: "price_1Sbr5WDfI9wxczZNEbTKSR12",
    annual: "price_1Sbr5WDfI9wxczZNeEmIzlKQ"
  }
};

export default function SubscribePage() {
  const { user, isAuthenticated } = useAuth();
  const { plan, isPremium, isPro } = useSubscription();
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

  // If user already has Premium, show success state
  if (isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <PublicHeader />
        <div className="flex items-center justify-center py-20">
          <Card className="w-full max-w-lg mx-6">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-purple-100 p-4 rounded-full">
                  <Crown className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-charcoal mb-4">
                You Have Premium Access!
              </h1>
              
              <p className="text-lg text-gray-600 mb-6">
                You already have full access to all RunAnalytics features.
              </p>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
                <p className="text-purple-800 font-medium mb-3">Your Premium benefits:</p>
                <ul className="space-y-2 text-left text-sm text-purple-700">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Unlimited AI insights</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> AI Running Coach Chat</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Advanced training plans</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Race predictions</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Form stability analysis</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Priority support</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href="/dashboard">
                  <Button className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/billing">
                  <Button variant="outline" data-testid="button-billing">
                    Manage Subscription
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user has Pro, show upgrade to Premium option
  if (isPro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <PublicHeader />
        <div className="flex items-center justify-center py-20">
          <Card className="w-full max-w-lg mx-6">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-orange-100 p-4 rounded-full">
                  <Star className="h-12 w-12 text-strava-orange" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-charcoal mb-4">
                You Have Pro Access!
              </h1>
              
              <p className="text-lg text-gray-600 mb-6">
                Want even more? Upgrade to Premium for AI Coach Chat and priority support.
              </p>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Crown className="h-5 w-5 text-purple-600" />
                  <span className="font-bold text-purple-800">Premium</span>
                </div>
                <div className="text-2xl font-bold text-purple-700 mb-2">
                  ${billingCycle === 'monthly' ? '7.99' : '79.99'}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </div>
                <ul className="space-y-2 text-left text-sm text-purple-700 mb-4">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> AI Running Coach Chat</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Form stability analysis</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Priority support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Early access to features</li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleSubscribe('premium')}
                  disabled={checkout.isPending}
                  data-testid="button-upgrade-premium"
                >
                  {checkout.isPending ? 'Processing...' : 'Upgrade to Premium'}
                </Button>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href="/dashboard">
                  <Button variant="outline" data-testid="button-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default: Show subscription options for Free users or unauthenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <PublicHeader />
      
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-charcoal mb-4 text-center">
            Upgrade Your <span className="text-strava-orange">Running</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl mx-auto">
            Unlock AI-powered insights, personalized training plans, and more.
          </p>

          <div className="flex justify-center mb-10">
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

          <div className="grid md:grid-cols-2 gap-8">
            {/* Pro Tier */}
            <Card className="border-2 border-strava-orange relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-strava-orange text-white px-4 py-1 rounded-full text-sm font-bold">
                  Popular
                </span>
              </div>
              <CardHeader className="text-center pb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-2">
                  <Star className="h-6 w-6 text-strava-orange" />
                </div>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-bold text-strava-orange">
                    ${billingCycle === 'monthly' ? '3.99' : '39.99'}
                  </span>
                  <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-green-600 text-sm mt-1">Save $7.89/year</p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Unlimited AI insights</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Unlimited activity history</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> AI training plans</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Race predictions</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Injury risk analysis</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Fitness/Fatigue charts</li>
                </ul>
                <Button 
                  className="w-full bg-strava-orange hover:bg-strava-orange/90"
                  onClick={() => handleSubscribe('pro')}
                  disabled={checkout.isPending}
                  data-testid="button-subscribe-pro"
                >
                  {checkout.isPending ? 'Processing...' : 'Get Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Premium Tier */}
            <Card className="border-2 border-purple-400">
              <CardHeader className="text-center pb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                  <Crown className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Premium</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-bold text-purple-600">
                    ${billingCycle === 'monthly' ? '7.99' : '79.99'}
                  </span>
                  <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-green-600 text-sm mt-1">Save $15.89/year</p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Everything in Pro</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-purple-500" /> AI Running Coach Chat</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-purple-500" /> Form stability analysis</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-purple-500" /> Priority support</li>
                  <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-purple-500" /> Early access to features</li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleSubscribe('premium')}
                  disabled={checkout.isPending}
                  data-testid="button-subscribe-premium"
                >
                  {checkout.isPending ? 'Processing...' : 'Get Premium'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-10">
            <p className="text-gray-500 text-sm mb-4">
              All plans include a 7-day money-back guarantee
            </p>
            <div className="flex gap-3 justify-center">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="outline" data-testid="button-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/">
                  <Button variant="outline" data-testid="button-home">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              )}
              <Link href="/pricing">
                <Button variant="ghost" data-testid="button-compare">
                  Compare All Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
