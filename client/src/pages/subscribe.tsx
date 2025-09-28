import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Crown, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if Stripe and elements are loaded and ready
    if (!stripe || !elements) {
      toast({
        title: "Payment Error",
        description: "Payment system is not ready. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    // Double-check that the PaymentElement is mounted
    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      toast({
        title: "Payment Error", 
        description: "Payment form is not ready. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?subscription=success`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Welcome to RunAnalytics Pro!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  const handleElementsReady = () => {
    setIsElementsReady(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        onReady={handleElementsReady}
        options={{
          layout: "tabs"
        }}
      />
      <Button 
        type="submit" 
        className="w-full bg-strava-orange hover:bg-strava-orange/90" 
        disabled={!stripe || !isElementsReady || isLoading}
        data-testid="button-subscribe"
      >
        {isLoading ? "Processing..." : !isElementsReady ? "Loading..." : "Subscribe to Pro"}
      </Button>
    </form>
  );
};

export default function SubscribePage() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [promotionCode, setPromotionCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Create subscription with optional promotion code
    const createSubscription = () => {
      const requestData: any = {
        priceId: "price_1SC8NIRwvWaTf8xf67fw70NB" // Test price for RunAnalytics Pro - $9.99/month
      };

      if (promotionCode) {
        requestData.promotionCode = promotionCode;
      }

      apiRequest("/api/create-subscription", "POST", requestData)
        .then((data) => {
          if (data.freeSubscription) {
            // Handle 100% discount - no payment required
            toast({
              title: "Subscription Activated!",
              description: "Your subscription is now active with the promotion code discount.",
            });
            window.location.href = "/dashboard";
            return;
          }
          
          setClientSecret(data.clientSecret);
          if (data.discount) {
            setDiscountApplied(data.discount);
            toast({
              title: "Promotion Code Applied!",
              description: `${data.discount.name} - ${data.discount.percent_off ? data.discount.percent_off + '% off' : '$' + (data.discount.amount_off / 100) + ' off'}`,
            });
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to create subscription:', error);
          toast({
            title: "Subscription Error",
            description: error.message || "Failed to create subscription. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
        });
    };

    createSubscription();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to subscribe to RunAnalytics Pro.</p>
            <Link href="/auth">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-strava-orange border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Setting up your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="mr-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 text-strava-orange mr-2" />
                  RunAnalytics Pro
                </CardTitle>
                <Badge className="bg-strava-orange">
                  Most Popular
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-charcoal mb-2">$9.99</div>
              <p className="text-gray-600 mb-6">per month, billed monthly</p>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-charcoal">What's included:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="text-green-500 mr-2 h-4 w-4" />
                    Advanced AI insights & recommendations
                  </li>
                  <li className="flex items-center">
                    <Check className="text-green-500 mr-2 h-4 w-4" />
                    Personalized training plans
                  </li>
                  <li className="flex items-center">
                    <Check className="text-green-500 mr-2 h-4 w-4" />
                    Race time predictions
                  </li>
                  <li className="flex items-center">
                    <Check className="text-green-500 mr-2 h-4 w-4" />
                    Injury risk analysis
                  </li>
                  <li className="flex items-center">
                    <Check className="text-green-500 mr-2 h-4 w-4" />
                    Unlimited data history
                  </li>
                  <li className="flex items-center">
                    <Check className="text-green-500 mr-2 h-4 w-4" />
                    Priority customer support
                  </li>
                </ul>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  💰 <strong>30-day money-back guarantee</strong><br />
                  Cancel anytime, no questions asked.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Promotion Code Section */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center mb-3">
                  <Tag className="h-4 w-4 text-gray-600 mr-2" />
                  <Label htmlFor="promotion-code" className="font-medium">Have a promotion code?</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="promotion-code"
                    placeholder="Enter promotion code (e.g., TESTFREE1)"
                    value={promotionCode}
                    onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                    data-testid="input-promotion-code"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsLoading(true);
                      setClientSecret("");
                      const createSubscription = () => {
                        const requestData: any = {
                          priceId: "price_1SC8NIRwvWaTf8xf67fw70NB"
                        };

                        if (promotionCode) {
                          requestData.promotionCode = promotionCode;
                        }

                        apiRequest("/api/create-subscription", "POST", requestData)
                          .then((data) => {
                            if (data.freeSubscription) {
                              // Handle 100% discount - no payment required
                              toast({
                                title: "Subscription Activated!",
                                description: "Your subscription is now active with the promotion code discount.",
                              });
                              window.location.href = "/dashboard";
                              return;
                            }
                            
                            setClientSecret(data.clientSecret);
                            if (data.discount) {
                              setDiscountApplied(data.discount);
                              toast({
                                title: "Promotion Code Applied!",
                                description: `${data.discount.name} - ${data.discount.percent_off ? data.discount.percent_off + '% off' : '$' + (data.discount.amount_off / 100) + ' off'}`,
                              });
                            } else if (promotionCode) {
                              toast({
                                title: "Invalid Promotion Code",
                                description: "The promotion code you entered is not valid or has expired.",
                                variant: "destructive",
                              });
                            }
                            setIsLoading(false);
                          })
                          .catch((error) => {
                            console.error('Failed to create subscription:', error);
                            toast({
                              title: "Subscription Error",
                              description: error.message || "Failed to create subscription. Please try again.",
                              variant: "destructive",
                            });
                            setIsLoading(false);
                          });
                      };
                      createSubscription();
                    }}
                    disabled={!promotionCode || isLoading}
                    data-testid="button-apply-code"
                  >
                    Apply
                  </Button>
                </div>
                {discountApplied && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-md">
                    <div className="flex items-center text-green-800">
                      <Check className="h-4 w-4 mr-2" />
                      <span className="font-medium">Discount Applied!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {discountApplied.name} - {discountApplied.percent_off ? `${discountApplied.percent_off}% off` : `$${(discountApplied.amount_off / 100)} off`}
                    </p>
                  </div>
                )}
              </div>

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm />
              </Elements>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Secure payment powered by Stripe<br />
                  Your subscription will begin immediately after payment
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
                <p className="text-sm text-gray-600">
                  Yes! You can cancel your subscription at any time from your account settings. 
                  You'll continue to have access until the end of your billing period.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
                <p className="text-sm text-gray-600">
                  We accept all major credit cards (Visa, MasterCard, American Express) 
                  and debit cards through our secure payment processor, Stripe.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Is my data secure?</h4>
                <p className="text-sm text-gray-600">
                  Absolutely. We use industry-standard encryption and security measures 
                  to protect your data. Your payment information is processed securely by Stripe.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Do you offer discounts?</h4>
                <p className="text-sm text-gray-600">
                  We occasionally offer promotional pricing for new users. 
                  Follow us on social media or subscribe to our newsletter for updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}