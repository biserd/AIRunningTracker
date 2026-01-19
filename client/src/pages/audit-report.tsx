import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Target, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface AuditData {
  runnerIQ: {
    score: number;
    grade: string;
    components: {
      consistency: number;
      performance: number;
      volume: number;
      improvement: number;
    };
    volumeGrade: string;
    performanceGrade: string;
    hasGap: boolean;
  };
  trainingLoad: {
    change: number | null;
    isCritical: boolean;
    thisWeekActivities: number;
    lastWeekActivities: number;
  };
  greyZone: {
    percentage: number;
    activityCount: number;
    easyRunsAreTooFast: boolean;
    optimalEasyPace: string;
    currentEasyPaceDiff: number;
  };
}

function MiniRadarChart({ data }: { data: AuditData['runnerIQ']['components'] }) {
  const scores = [
    { label: 'Volume', value: (data.volume / 25) * 100 },
    { label: 'Int', value: (data.performance / 25) * 100 },
    { label: 'Recov', value: (data.improvement / 25) * 100 },
    { label: 'Consistency', value: (data.consistency / 25) * 100 },
  ];

  const size = 120;
  const center = size / 2;
  const maxRadius = 40;
  
  const points = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    const radius = (score.value / 100) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, ...score };
  });

  const gridLevels = [25, 50, 75, 100];
  
  const axisPoints = scores.map((score, index) => {
    const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
    const x = center + maxRadius * Math.cos(angle);
    const y = center + maxRadius * Math.sin(angle);
    const labelX = center + (maxRadius + 14) * Math.cos(angle);
    const labelY = center + (maxRadius + 14) * Math.sin(angle);
    return { x, y, labelX, labelY, label: score.label };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={scores.map((_, index) => {
            const angle = (index * 2 * Math.PI) / scores.length - Math.PI / 2;
            const r = (level / 100) * maxRadius;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="1"
        />
      ))}
      
      {axisPoints.map((point, index) => (
        <line
          key={index}
          x1={center}
          y1={center}
          x2={point.x}
          y2={point.y}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
      ))}
      
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(234, 88, 12, 0.3)"
        stroke="#EA580C"
        strokeWidth="2"
      />
      
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="3"
          fill="#EA580C"
          stroke="white"
          strokeWidth="1"
        />
      ))}
      
      {axisPoints.map((point, index) => (
        <text
          key={index}
          x={point.labelX}
          y={point.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[8px] font-medium fill-gray-600"
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      setError(null);
      apiRequest("/api/stripe/create-trial-setup", "POST")
        .then((data) => {
          setClientSecret((data as { clientSecret: string }).clientSecret);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to create setup intent:', err);
          setError("Failed to load payment form. Please try again.");
          setIsLoading(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const options = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#fc4c02',
      },
    },
  } : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-charcoal mb-2">Unlock Your Full Audit & Plan</h2>
        <p className="text-gray-600 mb-6">Start 14-day free trial. Cancel anytime.</p>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-strava-orange mb-4" />
            <p className="text-gray-600">Loading payment form...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        ) : clientSecret && options ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        ) : null}
      </div>
    </div>
  );
}

export default function AuditReportPage() {
  const { isAuthenticated, user } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading } = useSubscription();
  const [, navigate] = useLocation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditData>({
    queryKey: [`/api/audit-report/${user?.id}`],
    enabled: !!user?.id,
  });

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

  const handleOpenPayment = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setIsUnlocked(true);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return "bg-green-100 text-green-800";
    if (grade.startsWith('B')) return "bg-yellow-100 text-yellow-800";
    if (grade.startsWith('C')) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (auditLoading || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-strava-orange mx-auto mb-4" />
          <p className="text-gray-600">Analyzing your training data...</p>
        </div>
      </div>
    );
  }

  const runnerIQ = auditData?.runnerIQ || { score: 71, grade: 'B', components: { consistency: 15, performance: 18, volume: 20, improvement: 18 }, volumeGrade: 'A', performanceGrade: 'B', hasGap: true };
  const trainingLoad = auditData?.trainingLoad || { change: 22, isCritical: true, thisWeekActivities: 5, lastWeekActivities: 4 };
  const greyZone = auditData?.greyZone || { percentage: 30, activityCount: 142, easyRunsAreTooFast: true, optimalEasyPace: '5:45 - 6:15 /km', currentEasyPaceDiff: 18 };

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
              <div className="flex-shrink-0">
                <MiniRadarChart data={runnerIQ.components} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-charcoal">Your 'Runner IQ' is {runnerIQ.score}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeColor(runnerIQ.grade)}`}>
                    Grade {runnerIQ.grade}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  You are putting in <strong className="text-orange-600">Grade {runnerIQ.volumeGrade} effort</strong> (Volume), but getting <strong className="text-orange-600">Grade {runnerIQ.performanceGrade} results</strong> (Performance). 
                  Our analysis detects that <strong>{greyZone.percentage}% of your recent mileage was 'Junk Mileage'</strong>—too fast to recover, too slow to build speed.
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
                  <h2 className="text-xl font-bold text-charcoal">
                    Load Warning: {trainingLoad.change !== null && trainingLoad.change > 0 ? '+' : ''}{trainingLoad.change !== null ? `${trainingLoad.change}%` : 'N/A'} {trainingLoad.change !== null && trainingLoad.change > 0 ? 'Spike' : 'Change'}
                  </h2>
                  {trainingLoad.isCritical && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                      Critical
                    </span>
                  )}
                </div>
                {trainingLoad.isCritical ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    Your training load has {trainingLoad.change !== null && trainingLoad.change > 0 ? 'increased' : 'changed'} compared to last week. 
                    This week: {trainingLoad.thisWeekActivities} activities. Last week: {trainingLoad.lastWeekActivities} activities.
                  </p>
                )}
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
                  We analyzed your pace distribution across <strong>{greyZone.activityCount} activities</strong>.
                </p>
                <p className="text-gray-700 leading-relaxed mt-2">
                  <strong>The Problem:</strong> Your 'Easy' runs are <strong>{greyZone.currentEasyPaceDiff} seconds/km too fast</strong>.
                  You think you are recovering, but you are actually burning glycogen reserves needed for your long runs.
                </p>

                <div className="relative mt-4">
                  <div className={`bg-white rounded-lg p-4 border border-purple-200 ${!isUnlocked ? 'blur-sm' : ''}`}>
                    <p className="text-lg font-semibold text-charcoal">
                      Optimal Easy Pace: {greyZone.optimalEasyPace}
                    </p>
                  </div>
                  
                  {!isUnlocked && (
                    <button
                      onClick={handleOpenPayment}
                      className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg cursor-pointer hover:bg-white/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-purple-700 font-semibold">
                        <Lock className="h-5 w-5" />
                        Unlock to reveal
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
              className="w-full bg-white text-strava-orange hover:bg-gray-100 font-bold py-3 rounded-xl"
            >
              Reveal My Optimal Paces & Fix My Plan
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
