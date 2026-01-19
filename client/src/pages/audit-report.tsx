import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Target, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function RadarChartIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" strokeLinejoin="round" />
      <polygon points="12,6 18,9.5 18,14.5 12,18 6,14.5 6,9.5" strokeLinejoin="round" opacity="0.6" />
      <polygon points="12,10 14,11 14,13 12,14 10,13 10,11" strokeLinejoin="round" opacity="0.3" />
      <line x1="12" y1="2" x2="12" y2="22" opacity="0.2" />
      <line x1="2" y1="8.5" x2="22" y2="15.5" opacity="0.2" />
      <line x1="22" y1="8.5" x2="2" y2="15.5" opacity="0.2" />
    </svg>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientSecret: string | null;
}

function PaymentForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/audit-report?success=true",
      },
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "An error occurred");
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-strava-orange hover:bg-orange-600 text-white py-3"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Processing...
          </div>
        ) : (
          "Start Free Trial & Unlock"
        )}
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
      >
        Cancel
      </button>
    </form>
  );
}

function PaymentModal({ isOpen, onClose, onSuccess, clientSecret }: PaymentModalProps) {
  if (!isOpen || !clientSecret) return null;

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#fc4c02',
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-charcoal mb-2">Unlock Your Full Audit & Plan</h2>
        <p className="text-gray-600 mb-6">Start 14-day free trial. Cancel anytime.</p>
        
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
}

export default function AuditReportPage() {
  const { isAuthenticated, user } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading } = useSubscription();
  const [, navigate] = useLocation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  useEffect(() => {
    if (!subLoading && hasActiveSubscription) {
      setIsUnlocked(true);
    }
  }, [hasActiveSubscription, subLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setIsUnlocked(true);
      window.history.replaceState({}, '', '/audit-report');
    }
  }, []);

  const handleOpenPayment = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setIsCreatingIntent(true);
    try {
      const data = await apiRequest("/api/stripe/create-trial-setup", "POST");
      setClientSecret((data as { clientSecret: string }).clientSecret);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Failed to create setup intent:', error);
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setIsUnlocked(true);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pb-28">
      <SEO 
        title="Your Training Audit | AITracker.run"
        description="We found gaps in your training. Get personalized insights to train smarter."
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Audit Complete
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">
            We found a gap in your training.
          </h1>
          <p className="text-xl text-gray-600">
            Your Effort is High, but your Efficiency is Low.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex-shrink-0 bg-orange-100 rounded-xl flex items-center justify-center">
                <RadarChartIcon className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-charcoal">Your 'Runner IQ' is 71</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800">
                    Grade B
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  You are putting in <strong>Grade A effort</strong> (Volume), but getting <strong>Grade B results</strong> (Performance). 
                  Our analysis detects that <strong>30% of your recent mileage was 'Junk Mileage'</strong>—too fast to recover, too slow to build speed.
                </p>
                <p className="text-sm text-orange-700 mt-3 font-medium">
                  • You are working harder than you need to.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex-shrink-0 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-charcoal">Load Warning: +22% Spike</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                    Critical
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed mb-2">
                  <strong>Critical Imbalance Detected.</strong>
                </p>
                <p className="text-gray-700 leading-relaxed">
                  In the last 10 days, your fatigue accumulation has outpaced your fitness gains by a <strong>factor of 2:1</strong>.
                </p>
                <p className="text-gray-700 leading-relaxed mt-2">
                  <strong>Translation:</strong> You are not getting fitter right now; you are just breaking your body down.
                </p>
                <p className="text-sm text-red-700 mt-3 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  You need a specific recovery protocol immediately to avoid a setback.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex-shrink-0 bg-purple-100 rounded-xl flex items-center justify-center">
                <Target className="h-7 w-7 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-charcoal">The 'Grey Zone' Trap</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                    Insight
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  We analyzed your pace distribution across <strong>142 activities</strong>.
                </p>
                <p className="text-gray-700 leading-relaxed mt-2">
                  <strong>The Problem:</strong> Your 'Easy' runs are <strong>18 seconds/km too fast</strong>.
                  You think you are recovering, but you are actually burning glycogen reserves needed for your long runs.
                </p>

                <div className="relative mt-4">
                  <div className={`bg-white rounded-lg p-4 border border-purple-200 ${!isUnlocked ? 'blur-sm' : ''}`}>
                    <p className="text-lg font-semibold text-charcoal">
                      Optimal Easy Pace: 5:45 - 6:15 /km
                    </p>
                  </div>
                  
                  {!isUnlocked && (
                    <button
                      onClick={handleOpenPayment}
                      disabled={isCreatingIntent}
                      className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg cursor-pointer hover:bg-white/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-purple-700 font-semibold">
                        <Lock className="h-5 w-5" />
                        {isCreatingIntent ? "Loading..." : "Unlock to reveal"}
                      </div>
                    </button>
                  )}
                </div>

                <p className="text-sm text-purple-700 mt-3">
                  We have calculated your actual optimal easy pace based on your physiological profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-strava-orange px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-3">
            <h3 className="text-white font-bold text-lg">
              Stop guessing. Start training efficiently.
            </h3>
            <p className="text-white/80 text-sm">
              Get your personalized training plan optimized for your unique physiology.
            </p>
          </div>
          
          {isUnlocked ? (
            <Button
              onClick={handleGoToDashboard}
              className="w-full bg-white text-strava-orange hover:bg-gray-100 font-bold py-3 rounded-xl"
            >
              Go to Dashboard
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleOpenPayment}
              disabled={isCreatingIntent}
              className="w-full bg-white text-strava-orange hover:bg-gray-100 font-bold py-3 rounded-xl"
            >
              {isCreatingIntent ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-strava-orange" />
                  Loading...
                </div>
              ) : (
                <>
                  Reveal My Optimal Paces & Fix My Plan
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        clientSecret={clientSecret}
      />
    </div>
  );
}
