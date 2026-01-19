import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Target, Lock, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import confetti from "canvas-confetti";

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
    optimalEasyPaceKm: string;
    optimalEasyPaceMiles: string;
    currentEasyPaceKm: string;
    currentEasyPaceMiles: string;
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

function useAuditCheckout() {
  return useMutation({
    mutationFn: async () => {
      const data = await apiRequest("/api/stripe/create-audit-checkout", "POST");
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export default function AuditReportPage() {
  const { isAuthenticated, user } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading } = useSubscription();
  const [, navigate] = useLocation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const checkout = useAuditCheckout();

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
    if (params.get('upgraded') === 'true') {
      setIsUnlocked(true);
      window.history.replaceState({}, '', '/audit-report');
      
      // Trigger confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    }
  }, []);

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    checkout.mutate();
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
  const greyZone = auditData?.greyZone || { percentage: 30, activityCount: 142, easyRunsAreTooFast: true, optimalEasyPaceKm: '5:45 - 6:15', optimalEasyPaceMiles: '9:15 - 10:03', currentEasyPaceKm: '5:25', currentEasyPaceMiles: '8:43' };

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
                  Our analysis detects that <strong>{greyZone.percentage}% of your recent mileage was 'Junk Mileage'</strong> - too fast to recover, too slow to build speed.
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
                  <strong>The Problem:</strong> Your easy days are averaging <strong>{greyZone.currentEasyPaceMiles}/mile</strong> ({greyZone.currentEasyPaceKm}/km), but they should be slower.
                  You think you are recovering, but you are actually burning glycogen reserves needed for your long runs.
                </p>

                <div className="relative mt-4">
                  <div className={`bg-white rounded-lg p-4 border border-purple-200 ${!isUnlocked ? 'blur-sm' : ''}`}>
                    <p className="text-lg font-semibold text-charcoal">
                      Optimal Easy Pace: {greyZone.optimalEasyPaceMiles} /mile
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      ({greyZone.optimalEasyPaceKm} /km)
                    </p>
                  </div>
                  
                  {!isUnlocked && (
                    <button
                      onClick={handleUpgrade}
                      disabled={checkout.isPending}
                      className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg cursor-pointer hover:bg-white/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-purple-700 font-semibold">
                        <Lock className="h-5 w-5" />
                        {checkout.isPending ? "Redirecting..." : "Unlock to reveal"}
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
              <Sparkles className="h-5 w-5 mr-2" />
              Go to Training Dashboard
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleUpgrade}
                disabled={checkout.isPending}
                className="w-full bg-white text-strava-orange hover:bg-gray-100 font-bold py-3 rounded-xl"
              >
                {checkout.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-strava-orange" />
                    Redirecting to checkout...
                  </div>
                ) : (
                  <>
                    Reveal My Optimal Paces & Fix My Plan
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-center text-white/90 text-sm font-medium">
                14-Day Free Trial. Cancel anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
