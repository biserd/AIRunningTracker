import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import AppHeader from "@/components/AppHeader";
import { Check, Crown, Trophy, MapPin, Sparkles, ArrowLeft, MessageCircle, ArrowRight } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { parseUpgradeIntent, capabilityLabel } from "@shared/upgradeIntent";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useCheckout } from "@/hooks/useSubscription";
import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { AddEmailModal } from "@/components/AddEmailModal";

interface StripePrice {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval?: string; interval_count?: number } | null;
  metadata: Record<string, string> | null;
}
interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, string> | null;
  prices: StripePrice[];
}

// Pick the live price ID for the Premium plan + selected billing cycle from
// the products payload returned by /api/stripe/products. We accept tags on
// either the price metadata or the product metadata, falling back to the
// recurring interval if the product is tagged but the prices aren't.
function pickPremiumPriceId(
  products: StripeProduct[] | undefined,
  billing: 'monthly' | 'annual',
): string | undefined {
  if (!products?.length) return undefined;
  const wantedInterval = billing === 'monthly' ? 'month' : 'year';
  for (const product of products) {
    const productIsPremium = product.metadata?.plan === 'premium';
    for (const price of product.prices) {
      const priceTag = price.metadata?.plan;
      const billingTag = price.metadata?.billing;
      const interval = price.recurring?.interval;

      if (priceTag === 'premium' && billingTag === billing) return price.id;
      if (priceTag === 'premium' && interval === wantedInterval) return price.id;
      if (productIsPremium && billingTag === billing) return price.id;
      if (productIsPremium && interval === wantedInterval) return price.id;
    }
  }
  return undefined;
}

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
      "Training-load warning signals",
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
  const searchString = useSearch();
  const { toast } = useToast();
  const checkout = useCheckout(() => setShowEmailModal(true));

  // Contextual upgrade intent (source, capability, activity, benefit,
  // return destination) carried by Premium gates. Preserved through
  // checkout so trial activation returns to the requested feature.
  const upgradeIntent = parseUpgradeIntent(searchString);
  const searchParams = new URLSearchParams(searchString.startsWith("?") ? searchString.slice(1) : searchString);
  const checkoutCanceled = searchParams.get("canceled") === "true";

  // Funnel: pricing page viewed (once per session per source), an arriving
  // upgrade intent counts as an offer click on the originating surface, and
  // a Stripe cancel_url return counts as checkout abandoned.
  useEffect(() => {
    const source = upgradeIntent?.source || "direct";
    trackFunnelEvent(
      "pricing_viewed",
      {
        source,
        capability: upgradeIntent?.capability ? String(upgradeIntent.capability) : undefined,
        activityId: upgradeIntent?.activityId,
      },
      { oncePerSession: true, dedupeParts: [source, upgradeIntent?.capability] },
    );
    if (upgradeIntent) {
      trackFunnelEvent(
        "offer_clicked",
        {
          source: upgradeIntent.source,
          capability: String(upgradeIntent.capability),
          activityId: upgradeIntent.activityId,
        },
        {
          oncePerSession: true,
          dedupeParts: [upgradeIntent.source, upgradeIntent.capability, upgradeIntent.activityId],
        },
      );
    }
    const params = new URLSearchParams(searchString.startsWith("?") ? searchString.slice(1) : searchString);
    if (params.get("canceled") === "true") {
      trackFunnelEvent(
        "checkout_abandoned",
        { source, capability: upgradeIntent?.capability ? String(upgradeIntent.capability) : undefined },
        { oncePerSession: true, dedupeParts: [source] },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch live Stripe products so we use whichever price IDs exist in the
  // current Stripe environment (test or live). Public endpoint, cached briefly.
  const { data: productsData, isLoading: isLoadingPrices } = useQuery<{ products: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
    staleTime: 5 * 60 * 1000,
  });
  const premiumPriceId = pickPremiumPriceId(productsData?.products, billingCycle);

  const selectBillingCycle = (cycle: 'monthly' | 'annual') => {
    setBillingCycle(cycle);
    trackFunnelEvent("billing_period_selected", {
      source: upgradeIntent?.source || "direct",
      billingPeriod: cycle,
      capability: upgradeIntent?.capability ? String(upgradeIntent.capability) : undefined,
    }, { dedupeParts: [cycle, Date.now()] });
  };

  const handleSubscribe = () => {
    trackFunnelEvent("checkout_started", {
      source: upgradeIntent?.source || "pricing",
      billingPeriod: billingCycle,
      capability: upgradeIntent?.capability ? String(upgradeIntent.capability) : undefined,
      activityId: upgradeIntent?.activityId,
    }, { dedupeParts: [billingCycle, Date.now()] });
    if (!isAuthenticated) {
      const pricingDestination = `/pricing${searchString.startsWith("?") ? searchString : searchString ? `?${searchString}` : ""}`;
      navigate(`/auth?redirect=${encodeURIComponent(pricingDestination)}`);
      return;
    }
    if (!premiumPriceId) {
      toast({
        title: "Plan not available",
        description: "Premium pricing is being updated. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    checkout.mutate({
      priceId: premiumPriceId,
      returnTo: upgradeIntent?.returnTo,
      source: upgradeIntent?.source || "pricing",
      capability: upgradeIntent?.capability ? String(upgradeIntent.capability) : undefined,
      activityId: upgradeIntent?.activityId,
      benefitKey: upgradeIntent?.benefitKey,
      pendingResourceId: upgradeIntent?.pendingResourceId,
      experimentVariant: upgradeIntent?.experimentVariant,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <SEO
        title="Pricing | RunAnalytics"
        description="Start your 14-day free trial of RunAnalytics Premium. AI coaching, race predictions, training plans, and deep performance analytics. Cancel anytime."
      />
      <PublicHeader />

      <section className="px-4 py-8 sm:px-6 sm:py-16">
        <div className="max-w-4xl mx-auto">
          {upgradeIntent && (
            <div
              className="max-w-2xl mx-auto mb-10 rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-5"
              data-testid="upgrade-intent-banner"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900" data-testid="upgrade-intent-capability">
                    Unlock {capabilityLabel(String(upgradeIntent.capability))}
                  </p>
                  {upgradeIntent.benefit && (
                    <p className="text-sm text-gray-700 mt-1" data-testid="upgrade-intent-benefit">
                      {upgradeIntent.benefit}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Start the trial and we'll return you to this exact feature after secure checkout.
                  </p>
                  {!isPremium && (
                    <div className="mt-4">
                      <Button
                        className="w-full sm:w-auto bg-strava-orange text-white hover:bg-strava-orange/90"
                        onClick={handleSubscribe}
                        disabled={checkout.isPending}
                        data-testid="upgrade-intent-subscribe"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {checkout.isPending ? 'Processing...' : 'Start 14 days free — $0 today'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        Card required · $0 today · {billingCycle === 'monthly' ? 'Then $7.99/month' : 'Then $79.99/year'} · Cancel anytime
                      </p>
                    </div>
                  )}
                </div>
                <Button asChild variant="ghost" size="sm" className="self-start text-gray-600 sm:flex-shrink-0" data-testid="upgrade-intent-back">
                  <Link href={upgradeIntent.returnTo}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {checkoutCanceled && (
            <div className="max-w-2xl mx-auto mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4" data-testid="checkout-canceled-message">
              <p className="font-semibold text-gray-900">Checkout canceled — nothing was charged.</p>
              <p className="text-sm text-gray-700 mt-1">
                Your selection is still here. You can continue when you're ready or go back to the feature you were exploring.
              </p>
            </div>
          )}
          <h1 className="text-5xl font-bold text-charcoal mb-4 text-center">
            Simple, <span className="text-strava-orange">Transparent</span> Pricing
          </h1>

          <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl mx-auto">
            One plan for run comparisons, adaptive training, and proactive coaching.
          </p>

          <div className="flex flex-col items-center mb-12">
            <div className="bg-white rounded-full p-1 shadow-md inline-flex">
              <button
                onClick={() => selectBillingCycle('monthly')}
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
                onClick={() => selectBillingCycle('annual')}
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
              Card required · $0 today · Cancel before the trial ends to avoid a charge
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
                  {checkout.isPending ? 'Processing...' : 'Start 14 days free — $0 today'}
                </Button>
              )}
              {!isPremium && (
                <p className="mt-3 text-center text-xs leading-5 text-gray-400">
                  Card required. Then {billingCycle === 'monthly' ? '$7.99/month' : '$79.99/year'} unless cancelled.
                </p>
              )}
            </div>
          </div>

          <Link href="/proactive-running-coach" data-testid="pricing-proactive-coach-link">
            <div className="mx-auto -mt-8 mb-14 flex max-w-2xl cursor-pointer flex-col gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-emerald-50 p-5 transition hover:border-sky-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Want the coach to come to you?</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Connect private Telegram coaching with Premium or during your trial. WhatsApp is coming next.</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 font-bold text-[#167ca9]">
                See how it works <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

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
              <Sparkles className="h-4 w-4 text-strava-orange" />
              <span className="text-sm text-gray-700 font-medium">14 days free · Cancel anytime</span>
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
          if (premiumPriceId) {
            checkout.mutate({
              priceId: premiumPriceId,
              returnTo: upgradeIntent?.returnTo,
              source: upgradeIntent?.source || "pricing",
              capability: upgradeIntent?.capability ? String(upgradeIntent.capability) : undefined,
              activityId: upgradeIntent?.activityId,
              benefitKey: upgradeIntent?.benefitKey,
              pendingResourceId: upgradeIntent?.pendingResourceId,
              experimentVariant: upgradeIntent?.experimentVariant,
            });
          }
        }}
      />
    </div>
  );
}
