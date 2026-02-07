import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Target, Lock, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import { StravaConnectButton } from "@/components/StravaConnect";
import CalibrationWizard from "@/components/CalibrationWizard";

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

interface CalibrationData {
  goal: string | null;
  struggle: string | null;
  days: string | null;
  completedAt: string | null;
}

function getPersonalizedCopy(
  goal: string | null,
  struggle: string | null,
  days: string | null,
  auditData: AuditData
) {
  const greyZonePct = auditData.greyZone.percentage;
  const runnerIQScore = auditData.runnerIQ.score;
  const daysLabel = days === "5+" ? "5+" : days;

  const goalLabels: Record<string, string> = {
    race: "race day",
    faster: "new PRs",
    endurance: "longer distances",
    injury_free: "injury-free running",
  };

  const goalTarget = goalLabels[goal || ""] || "your goals";

  if (goal === "race" && struggle === "plateau") {
    return {
      headline: "Break through your plateau and crush your next race.",
      hook: `You want to race, but your current training is holding you back. Our data shows ${greyZonePct}% of your runs are in the 'Grey Zone' — causing you to plateau. With the right structure, you can break through.`,
      solution: `Here is your ${daysLabel}-day/week plan to peak exactly on race day.`,
    };
  }

  if (goal === "race" && struggle === "burnout") {
    return {
      headline: "Race faster without burning out before the start line.",
      hook: `You reported feeling tired and heavy-legged. Our analysis confirms why: ${greyZonePct}% of your miles are 'Junk Mileage'. You're overloading your body instead of building race fitness.`,
      solution: `Here is your ${daysLabel}-day/week plan that builds race fitness while protecting your energy.`,
    };
  }

  if (goal === "race" && struggle === "inconsistency") {
    return {
      headline: "A race plan that fits your real life.",
      hook: `Sticking to a schedule is tough. But ${greyZonePct}% of the runs you do manage are in the Grey Zone — not getting you closer to race day. You need a plan that works even when life gets busy.`,
      solution: `Here is your flexible ${daysLabel}-day/week plan built around your schedule.`,
    };
  }

  if (goal === "race" && struggle === "guesswork") {
    return {
      headline: "Stop guessing. Start training with a plan that peaks on race day.",
      hook: `You don't know if your training is on track — and the data confirms the concern. ${greyZonePct}% of your mileage is in the Grey Zone, meaning you're working hard but not building race-specific fitness.`,
      solution: `Here is your ${daysLabel}-day/week structured plan with clear targets for every session.`,
    };
  }

  if (goal === "faster" && struggle === "plateau") {
    return {
      headline: "You're working hard. Here's why you're not getting faster.",
      hook: `With a Runner IQ of ${runnerIQScore}, your effort is there — but ${greyZonePct}% of your runs are stuck in the Grey Zone. Too fast to recover, too slow to build speed. That's why you've plateaued.`,
      solution: `Here is your ${daysLabel}-day/week plan designed to break through the speed ceiling.`,
    };
  }

  if (goal === "faster" && struggle === "burnout") {
    return {
      headline: "Get faster without running yourself into the ground.",
      hook: `Feeling tired isn't a badge of honor — it's a warning sign. ${greyZonePct}% of your miles are 'Junk Mileage', draining your energy without making you faster.`,
      solution: `Here is your ${daysLabel}-day/week plan that prioritizes quality over quantity.`,
    };
  }

  if (goal === "injury_free" && struggle === "burnout") {
    return {
      headline: "Stop the cycle of overtraining and injury.",
      hook: `You reported feeling tired. Our analysis confirms why: ${greyZonePct}% of your miles are 'Junk Mileage'. You are overloading your joints without gaining fitness.`,
      solution: `Here is a 'Safe-Build' ${daysLabel}-day/week plan that prioritizes recovery and sustainable volume.`,
    };
  }

  if (goal === "injury_free" && struggle === "plateau") {
    return {
      headline: "Build sustainable fitness without breaking down.",
      hook: `Running hard but not seeing results — and now you're worried about getting hurt. ${greyZonePct}% of your runs are in the Grey Zone, putting unnecessary stress on your body without improving fitness.`,
      solution: `Here is your ${daysLabel}-day/week plan built around injury prevention and gradual progression.`,
    };
  }

  if (goal === "endurance" && struggle === "burnout") {
    return {
      headline: "Run longer without feeling destroyed the next day.",
      hook: `You want to go further, but fatigue keeps holding you back. ${greyZonePct}% of your miles are too fast for building aerobic endurance — they're burning you out instead.`,
      solution: `Here is your ${daysLabel}-day/week plan to build endurance with sustainable effort levels.`,
    };
  }

  if (goal === "endurance" && struggle === "plateau") {
    return {
      headline: "Push past the distance wall and keep building.",
      hook: `You've hit a ceiling on how far you can run. With ${greyZonePct}% Grey Zone mileage, your body isn't adapting — it's just surviving. Time to train smarter.`,
      solution: `Here is your ${daysLabel}-day/week progressive plan to systematically increase your distance.`,
    };
  }

  return {
    headline: `We found a gap in your training for ${goalTarget}.`,
    hook: `Your Runner IQ is ${runnerIQScore}, but ${greyZonePct}% of your mileage is in the Grey Zone — too fast to recover, too slow to build fitness. With the right adjustments, you can see real improvement.`,
    solution: `Here is your personalized ${daysLabel}-day/week plan to train smarter, not harder.`,
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

interface SyncStatus {
  syncStatus: string;
  syncProgress: number;
  syncTotal: number;
  pendingJobs: number;
  processingJobs: number;
}

export default function AuditReportPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading, isReverseTrial } = useSubscription();
  const [, navigate] = useLocation();
  const [showWizard, setShowWizard] = useState(false);
  const checkout = useAuditCheckout();

  const isStravaConnected = !!(user as any)?.stravaAthleteId;

  const params = new URLSearchParams(window.location.search);
  const justConnected = params.get('connected') === 'true';

  const handleStravaConnect = () => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
    const redirectUri = `${window.location.origin}/strava/callback`;
    const scope = "read,activity:read_all,activity:write";
    const state = `${user?.id || ''}_audit`;
    
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=${state}`;
    window.location.href = stravaAuthUrl;
  };

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/strava/sync-status'],
    enabled: !!user?.id && isStravaConnected,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.syncStatus === 'running' || (data?.pendingJobs ?? 0) > 0 || (data?.processingJobs ?? 0) > 0) {
        return 2000;
      }
      return false;
    },
  });

  const isSyncing = syncStatus?.syncStatus === 'running' || 
    (syncStatus?.pendingJobs ?? 0) > 0 || 
    (syncStatus?.processingJobs ?? 0) > 0;

  const { data: calibrationData, isLoading: calibrationLoading } = useQuery<CalibrationData>({
    queryKey: ['/api/calibration'],
    enabled: !!user?.id && isStravaConnected,
  });

  const hasCalibration = !!(calibrationData?.completedAt);

  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery<AuditData>({
    queryKey: ['/api/audit-report', user?.id],
    enabled: !!user?.id && isStravaConnected,
    refetchInterval: isSyncing && justConnected ? 3000 : false,
  });

  useEffect(() => {
    if (syncStatus && !isSyncing && justConnected) {
      refetchAudit();
      window.history.replaceState({}, '', '/audit-report');
    }
  }, [isSyncing, syncStatus, justConnected, refetchAudit]);

  const activityCount = auditData?.greyZone?.activityCount || 0;
  const hasInsights = activityCount >= 5 && auditData?.runnerIQ?.score !== undefined && auditData.runnerIQ.score > 25;
  const syncDone = !isSyncing || !justConnected;

  useEffect(() => {
    if (isStravaConnected && syncDone && hasInsights && !hasCalibration && !calibrationLoading) {
      setShowWizard(true);
    }
  }, [isStravaConnected, syncDone, hasInsights, hasCalibration, calibrationLoading]);

  useEffect(() => {
    if (!subLoading && !authLoading && (hasActiveSubscription || isReverseTrial)) {
      navigate('/dashboard');
    }
  }, [hasActiveSubscription, isReverseTrial, subLoading, authLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    checkout.mutate();
  };

  const handleCalibrationComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['/api/calibration'] });
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return "bg-green-100 text-green-800";
    if (grade.startsWith('B')) return "bg-yellow-100 text-yellow-800";
    if (grade.startsWith('C')) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-strava-orange mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isStravaConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center">
        <SEO 
          title="Connect Strava | AITracker.run"
          description="Connect your Strava account to get personalized training insights."
        />
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-strava-orange" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-charcoal mb-4">
            Connect Your Strava
          </h1>
          <p className="text-gray-600 mb-8">
            We need access to your running data to analyze your training and provide personalized insights.
          </p>
          <StravaConnectButton 
            onClick={handleStravaConnect}
            variant="orange"
            size="lg"
          />
          <p className="text-sm text-gray-500 mt-4">
            We only read your activity data. We never post on your behalf.
          </p>
        </div>
      </div>
    );
  }

  const showSyncingScreen = !hasInsights && isSyncing && justConnected;
  
  if (showSyncingScreen) {
    const progress = syncStatus?.syncProgress || 0;
    const total = syncStatus?.syncTotal || 0;
    const pendingJobs = (syncStatus?.pendingJobs || 0) + (syncStatus?.processingJobs || 0);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center">
        <SEO 
          title="Syncing Your Data | AITracker.run"
          description="We're pulling your Strava activities to analyze your training."
        />
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-strava-orange" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal mb-4">
            Syncing Your Activities
          </h1>
          <p className="text-gray-600 mb-6">
            We're pulling your running data from Strava. This usually takes 10-30 seconds.
          </p>
          {total > 0 && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-strava-orange h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">
                {progress} of {total} activities processed
              </p>
            </div>
          )}
          {pendingJobs > 0 && (
            <p className="text-sm text-gray-500">
              {pendingJobs} task{pendingJobs !== 1 ? 's' : ''} remaining...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (showWizard && !hasCalibration) {
    return <CalibrationWizard onComplete={handleCalibrationComplete} />;
  }

  if (auditLoading || calibrationLoading) {
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

  const personalizedCopy = hasCalibration && auditData
    ? getPersonalizedCopy(calibrationData?.goal ?? null, calibrationData?.struggle ?? null, calibrationData?.days ?? null, auditData)
    : null;

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
            {personalizedCopy?.headline || "We found a gap in your training."}
          </h1>
          <p className="text-xl text-gray-600">
            {personalizedCopy?.hook || "Your Effort is High, but your Efficiency is Low."}
          </p>
        </div>

        {personalizedCopy?.solution && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 flex-shrink-0 bg-green-100 rounded-xl flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-900 mb-1">Your Personalized Plan</h3>
                <p className="text-green-800 leading-relaxed">{personalizedCopy.solution}</p>
              </div>
            </div>
          </div>
        )}

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
                  <div className="bg-white rounded-lg p-4 border border-purple-200 blur-sm">
                    <p className="text-lg font-semibold text-charcoal">
                      Optimal Easy Pace: {greyZone.optimalEasyPaceMiles} /mile
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      ({greyZone.optimalEasyPaceKm} /km)
                    </p>
                  </div>
                  
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
        </div>
      </div>
    </div>
  );
}
