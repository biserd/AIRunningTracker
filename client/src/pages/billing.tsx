import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Crown, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";

export default function BillingPage() {
  const { user } = useAuth();
  const { subscription, isLoading: subscriptionLoading } = useSubscription();
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("/api/cancel-subscription", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the current billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to access billing information.</p>
            <Link href="/auth">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
            <p>Loading billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'canceled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'past_due':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>;
      case 'free':
        return <Badge variant="secondary">Free Plan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
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

        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {subscription?.plan === 'pro' ? (
                    <Crown className="h-6 w-6 text-strava-orange" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gray-200" />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">
                      {subscription?.plan === 'pro' ? 'RunAnalytics Pro' : 'RunAnalytics Free'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(subscription?.status || 'free')}
                      {getStatusBadge(subscription?.status || 'free')}
                    </div>
                  </div>
                </div>

                {subscription?.plan === 'pro' && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {subscription.cancelAtPeriodEnd 
                          ? `Ends on ${formatDate(subscription.currentPeriodEnd!)}`
                          : `Renews on ${formatDate(subscription.currentPeriodEnd!)}`
                        }
                      </span>
                    </div>
                    <div className="text-2xl font-bold">$9.99/month</div>
                  </div>
                )}

                {subscription?.plan === 'free' && (
                  <div className="text-2xl font-bold">$0/month</div>
                )}
              </div>

              <div className="text-right">
                {subscription?.plan === 'free' ? (
                  <Link href="/subscribe">
                    <Button className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-upgrade-billing">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                ) : subscription?.status === 'active' && !subscription?.cancelAtPeriodEnd ? (
                  <Button 
                    variant="outline" 
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-subscription"
                  >
                    {cancelMutation.isPending ? "Canceling..." : "Cancel Subscription"}
                  </Button>
                ) : subscription?.cancelAtPeriodEnd ? (
                  <div className="text-sm text-gray-600">
                    <p>Subscription will end on</p>
                    <p className="font-semibold">{formatDate(subscription.currentPeriodEnd!)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {subscription?.cancelAtPeriodEnd && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Subscription Ending</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your Pro subscription will end on {formatDate(subscription.currentPeriodEnd!)}. 
                      You'll still have access to Pro features until then.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Current Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle>Your Plan Includes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscription?.plan === 'pro' ? (
                  <>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Advanced AI insights & recommendations
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Personalized training plans
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Race time predictions
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Injury risk analysis
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Unlimited data history
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Priority customer support
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Basic performance analytics
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Strava integration
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Runner Score calculation
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Basic AI insights
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Last 30 days of data
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Support */}
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
                    Not satisfied? Cancel within 30 days for a full refund, no questions asked.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Billing FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">When will I be charged?</h4>
                <p className="text-sm text-gray-600">
                  Pro subscriptions are billed monthly on the same day you originally subscribed. 
                  You can see your next billing date above.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Can I change my plan?</h4>
                <p className="text-sm text-gray-600">
                  You can upgrade to Pro anytime or cancel your Pro subscription. 
                  Changes take effect at your next billing cycle.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">What happens when I cancel?</h4>
                <p className="text-sm text-gray-600">
                  You'll continue to have Pro access until the end of your current billing period. 
                  After that, your account will switch to the free plan.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Is my payment information secure?</h4>
                <p className="text-sm text-gray-600">
                  Yes! All payments are processed securely through Stripe, a leading payment processor. 
                  We never store your credit card information on our servers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}