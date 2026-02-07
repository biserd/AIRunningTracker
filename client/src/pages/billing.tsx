import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useManageSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link, Redirect, useSearch } from "wouter";
import { ArrowLeft, CreditCard, Crown, Zap, Check, ExternalLink, Loader2, Calendar, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import AppHeader from "@/components/AppHeader";

export default function BillingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { subscription, plan, status, isPremium, isLoading } = useSubscription();
  const manageSubscription = useManageSubscription();
  const { toast } = useToast();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  useEffect(() => {
    if (params.get('success') === 'true') {
      toast({
        title: "Subscription Activated!",
        description: "Thank you for subscribing. Your account has been upgraded.",
      });
    }
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-strava-orange mx-auto mb-4" />
            <p>Loading billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/auth" />;
  }

  const getPlanIcon = () => {
    if (isPremium) return <Crown className="h-6 w-6 text-strava-orange" />;
    return <Zap className="h-6 w-6 text-gray-500" />;
  };

  const getPlanName = () => {
    if (isPremium) return 'Premium';
    return 'Free';
  };

  const getPlanColor = () => {
    if (isPremium) return 'text-strava-orange';
    return 'text-gray-600';
  };

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      past_due: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      unpaid: 'bg-red-100 text-red-800',
      free: 'bg-gray-100 text-gray-600',
    };

    const statusLabels: Record<string, string> = {
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Past Due',
      canceled: 'Canceled',
      unpaid: 'Unpaid',
      free: 'Free Plan',
    };

    return (
      <Badge className={statusColors[status] || statusColors.free}>
        {statusLabels[status] || 'Free Plan'}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title="Billing & Subscription | RunAnalytics"
        description="Manage your RunAnalytics subscription, view billing history, and update payment methods."
      />
      <AppHeader />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mr-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your RunAnalytics subscription and billing information.</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getPlanIcon()}
                    <h3 className={`text-2xl font-bold ${getPlanColor()}`}>
                      RunAnalytics {getPlanName()}
                    </h3>
                    {getStatusBadge()}
                  </div>
                  
                  {subscription?.subscriptionEndsAt && (
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {status === 'canceled' ? 'Access until: ' : 'Renews on: '}
                        {new Date(subscription.subscriptionEndsAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {subscription?.trialEndsAt && status === 'trialing' && (
                    <p className="text-sm text-blue-600 mt-1">
                      Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  {subscription?.stripeSubscriptionId ? (
                    <Button 
                      onClick={() => manageSubscription.mutate()}
                      disabled={manageSubscription.isPending}
                      variant="outline"
                      data-testid="manage-subscription"
                    >
                      {manageSubscription.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Manage Subscription
                    </Button>
                  ) : !isPremium && (
                    <Link href="/pricing">
                      <Button className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-upgrade-billing">
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {plan === 'free' && (
            <Card className="border-2 border-strava-orange">
              <CardHeader>
                <CardTitle className="text-strava-orange">Upgrade to Premium</CardTitle>
                <CardDescription>Unlock all features and personalized insights</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-3 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited Performance Insights
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Coach-Generated Training Plans
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Race Time Predictions
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    AI Coach Chat & Agent Coach
                  </li>
                </ul>
                
                <Link href="/pricing">
                  <Button className="w-full bg-strava-orange hover:bg-strava-orange/90" data-testid="view-plans">
                    View Plans
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Plan Includes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    Strava Integration
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    Basic Performance Analytics
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    Runner Score Calculation
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    Free Calculator Tools
                  </li>
                  
                  {isPremium && (
                    <>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-strava-orange" />
                        <span className="text-strava-orange font-medium">Unlimited Key Insights</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-strava-orange" />
                        <span className="text-strava-orange font-medium">Coach Training Plans</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-strava-orange" />
                        <span className="text-strava-orange font-medium">Race Predictions</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-strava-orange" />
                        <span className="text-strava-orange font-medium">AI Coach Chat</span>
                      </li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Questions about billing?</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Our support team is here to help with any billing questions or concerns.
                    </p>
                    <Link href="/contact">
                      <Button variant="outline" size="sm">
                        Contact Support
                      </Button>
                    </Link>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Money-back guarantee</h4>
                    <p className="text-sm text-gray-600">
                      Not satisfied? Cancel within 7 days for a full refund, no questions asked.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Billing FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">When will I be charged?</h4>
                  <p className="text-sm text-gray-600">
                    Subscriptions are billed on the same day you originally subscribed. 
                    Annual plans are billed once per year.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Can I change my plan?</h4>
                  <p className="text-sm text-gray-600">
                    You can cancel your subscription anytime through 
                    the Manage Subscription button above.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What happens when I cancel?</h4>
                  <p className="text-sm text-gray-600">
                    You'll continue to have access until the end of your current billing period. 
                    After that, your account will switch to the free plan.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Is my payment information secure?</h4>
                  <p className="text-sm text-gray-600">
                    Yes! All payments are processed securely through Stripe. 
                    We never store your credit card information on our servers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500">
            <p>Need help? <Link href="/contact" className="text-strava-orange hover:underline">Contact Support</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
