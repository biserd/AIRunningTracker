import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Target, Lock, ArrowRight, CheckCircle, Sparkles, Zap, TrendingUp } from "lucide-react";
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
  racePotential: {
    predictions: {
      distance: string;
      currentTime: string;
      potentialTime: string;
      timeSaved: string;
    }[];
    gapPercent: number;
  } | null;
}

interface CalibrationData {
  goal: string | null;
  struggle: string | null;
  days: string | null;
  completedAt: string | null;
}

interface PersonalizedCopy {
  headline: string;
  hook: string;
  solution: string;
  runnerIQ: {
    title: string;
    body: string;
    takeaway: string;
  };
  loadWarning: {
    title: string;
    body: string;
    takeaway: string;
  };
  greyZone: {
    title: string;
    body: string;
    lockedLabel: string;
    lockedDescription: string;
  };
  cta: {
    headline: string;
    subtext: string;
    button: string;
  };
}

function getPersonalizedCopy(
  goal: string | null,
  struggle: string | null,
  days: string | null,
  auditData: AuditData
): PersonalizedCopy {
  const greyZonePct = auditData.greyZone.percentage;
  const runnerIQScore = auditData.runnerIQ.score;
  const daysLabel = days === "5+" ? "5+" : (days || "3");
  const volumeGrade = auditData.runnerIQ.volumeGrade;
  const perfGrade = auditData.runnerIQ.performanceGrade;
  const activityCount = auditData.greyZone.activityCount;
  const thisWeek = auditData.trainingLoad.thisWeekActivities;
  const lastWeek = auditData.trainingLoad.lastWeekActivities;
  const loadChange = auditData.trainingLoad.change;
  const isCritical = auditData.trainingLoad.isCritical;

  const goalLabels: Record<string, string> = {
    race: "race day",
    faster: "speed",
    endurance: "endurance",
    injury_free: "injury-free running",
  };
  const goalTarget = goalLabels[goal || ""] || "your goals";

  // --- Runner IQ copy by goal ---
  const runnerIQByGoal: Record<string, PersonalizedCopy['runnerIQ']> = {
    race: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `You are putting in Grade ${volumeGrade} effort, but getting Grade ${perfGrade} race-readiness. ${greyZonePct}% of your recent miles were spent in no-man's land: not easy enough to recover, not hard enough to build race fitness.`,
      takeaway: `Your training volume is there, but it is not translating to race performance.`,
    },
    faster: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `Grade ${volumeGrade} effort in, Grade ${perfGrade} speed out. ${greyZonePct}% of your miles are stuck in the "grey zone" where you are running too hard to recover but too slow to trigger speed adaptations.`,
      takeaway: `You have the engine. You just need the right gear shifts to unlock faster times.`,
    },
    endurance: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `You are logging Grade ${volumeGrade} volume, but your aerobic efficiency is only Grade ${perfGrade}. ${greyZonePct}% of your miles are too fast for base-building, which means your body never fully adapts before the next session.`,
      takeaway: `Slowing down on easy days is the fastest path to running longer.`,
    },
    injury_free: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `You are putting in Grade ${volumeGrade} effort, but your body is absorbing Grade ${perfGrade} levels of stress. ${greyZonePct}% of your miles create unnecessary mechanical load on your joints and tendons without improving fitness.`,
      takeaway: `Your body is absorbing more impact than it needs to. That is a recipe for injury.`,
    },
  };

  // --- Load Warning copy by struggle ---
  // When load is stable (not critical), reframe positively around consistency
  const isStable = !isCritical;
  const consistencyGrade = thisWeek >= 4 ? 'A' : thisWeek >= 3 ? 'B+' : thisWeek >= 2 ? 'B' : 'C';

  const loadWarningByStruggle: Record<string, PersonalizedCopy['loadWarning']> = {
    plateau: isCritical ? {
      title: `Load Spike Detected: +${Math.abs(loadChange ?? 0)}%`,
      body: `You are pushing harder to break through, but your body cannot absorb this spike. This week: ${thisWeek} sessions. Last week: ${lastWeek}. Sudden jumps like this lead to stagnation, not breakthroughs.`,
      takeaway: `Plateaus break with precision, not brute force. A structured plan ramps load safely.`,
    } : {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You run consistently (${thisWeek}x/week), and that discipline is a real strength. But your intensity distribution is off. ${greyZonePct}% of your runs are in the grey zone, so your body has no reason to adapt.`,
      takeaway: `You have the discipline. You just need the right plan to channel it.`,
    },
    burnout: isCritical ? {
      title: `Overload Warning: +${Math.abs(loadChange ?? 0)}%`,
      body: `Your fatigue is not in your head. This week: ${thisWeek} sessions vs. ${lastWeek} last week. Your body is accumulating more stress than it can recover from between runs.`,
      takeaway: `You need a recovery protocol before you can build fitness again.`,
    } : {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You are showing up (${thisWeek}x/week), which takes real commitment. But too many of those runs are draining you instead of building you up. ${greyZonePct}% of your effort is landing at the wrong intensity.`,
      takeaway: `The fix is not running less. It is running at the right intensities.`,
    },
    inconsistency: isStable && thisWeek >= 3 ? {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You ran ${thisWeek} times this week. That is solid. The challenge is making each session count when your schedule shifts. Right now, ${greyZonePct}% of the runs you do fit in are not structured for maximum return.`,
      takeaway: `A flexible ${daysLabel}-day plan adapts to your life and still delivers results.`,
    } : {
      title: `Training Gaps Detected`,
      body: `This week: ${thisWeek} sessions. Last week: ${lastWeek}. When your schedule is unpredictable, every run needs to count. A plan with built-in flexibility keeps you progressing even on busy weeks.`,
      takeaway: `A flexible ${daysLabel}-day plan adapts to your life and still delivers results.`,
    },
    guesswork: isCritical ? {
      title: `Load Warning: +${Math.abs(loadChange ?? 0)}%`,
      body: `Without clear targets, it is easy to overshoot. This week: ${thisWeek} sessions vs. ${lastWeek} last week. Your body does not know whether you are building fitness or just accumulating fatigue.`,
      takeaway: `You need a plan with clear daily targets so every run has a purpose.`,
    } : {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You are putting in the work (${thisWeek}x/week), and that matters. But without clear targets, ${greyZonePct}% of your effort is landing at the wrong intensity. You have the habit. Now you need the structure.`,
      takeaway: `A structured plan tells you exactly what to do each day so nothing is wasted.`,
    },
  };

  // --- Grey Zone copy by goal ---
  const greyZoneByGoal: Record<string, PersonalizedCopy['greyZone']> = {
    race: {
      title: `Your Race Fitness Gap`,
      body: `Across ${activityCount} activities, ${greyZonePct}% of your miles are in the Grey Zone. On race day, your body will default to these efforts. That means you are training yourself to run at a pace that is neither your goal pace nor recovery pace.`,
      lockedLabel: `Unlock Your Race Pace Zones`,
      lockedDescription: `See exactly what paces to hit on easy days, tempo days, and long runs to peak on race day.`,
    },
    faster: {
      title: `Why Your Speed Has Stalled`,
      body: `Across ${activityCount} activities, ${greyZonePct}% of your miles are in the Grey Zone. Speed comes from contrast: truly easy days that let you recover, and truly hard sessions that push your threshold. You are stuck in the middle.`,
      lockedLabel: `Unlock Your Speed Zones`,
      lockedDescription: `See your optimal easy pace, tempo pace, and interval targets based on your current fitness.`,
    },
    endurance: {
      title: `Your Aerobic Base Gap`,
      body: `Across ${activityCount} activities, ${greyZonePct}% of your miles are too fast for base-building. Endurance is built in the easy zone. Running faster than that on easy days actually slows your aerobic development.`,
      lockedLabel: `Unlock Your Easy Pace Target`,
      lockedDescription: `See the exact easy pace that builds your aerobic engine without the fatigue hangover.`,
    },
    injury_free: {
      title: `Your Injury Risk Profile`,
      body: `Across ${activityCount} activities, ${greyZonePct}% of your miles create more impact stress than necessary. Every grey zone mile puts extra load on your tendons, joints, and connective tissue without a fitness payoff.`,
      lockedLabel: `Unlock Your Safe Training Zones`,
      lockedDescription: `See the pace and heart rate ranges that build fitness while protecting your body.`,
    },
  };

  // --- CTA copy by goal ---
  const ctaByGoal: Record<string, PersonalizedCopy['cta']> = {
    race: {
      headline: `Get race-ready with a plan built for your body.`,
      subtext: `Personalized paces, structured weekly plan, and race-day strategy.`,
      button: `Unlock My Race Plan`,
    },
    faster: {
      headline: `Unlock the speed your training is missing.`,
      subtext: `Personalized pace zones, structured speed sessions, and recovery timing.`,
      button: `Unlock My Speed Plan`,
    },
    endurance: {
      headline: `Build the aerobic base to run longer than ever.`,
      subtext: `Personalized easy pace, progressive long runs, and endurance tracking.`,
      button: `Unlock My Endurance Plan`,
    },
    injury_free: {
      headline: `Train consistently without the injury setbacks.`,
      subtext: `Safe pace zones, load monitoring, and recovery-first planning.`,
      button: `Unlock My Safe Training Plan`,
    },
  };

  // --- Headline/hook by goal+struggle ---
  const headlineHookMap: Record<string, { headline: string; hook: string }> = {
    "race_plateau": {
      headline: "Break through your plateau and crush your next race.",
      hook: `You want to race, but your current training is holding you back. Our data shows ${greyZonePct}% of your runs are in the Grey Zone, causing you to plateau. With the right structure, you can break through.`,
    },
    "race_burnout": {
      headline: "Race faster without burning out before the start line.",
      hook: `You reported feeling tired and heavy-legged. Our analysis confirms why: ${greyZonePct}% of your miles are Junk Mileage. You are overloading your body instead of building race fitness.`,
    },
    "race_inconsistency": {
      headline: "A race plan that fits your real life.",
      hook: `Sticking to a schedule is tough. But ${greyZonePct}% of the runs you do manage are in the Grey Zone, not getting you closer to race day. You need a plan that works even when life gets busy.`,
    },
    "race_guesswork": {
      headline: "Stop guessing. Start training with a plan that peaks on race day.",
      hook: `You do not know if your training is on track, and the data confirms the concern. ${greyZonePct}% of your mileage is in the Grey Zone, meaning you are working hard but not building race-specific fitness.`,
    },
    "faster_plateau": {
      headline: "You're working hard. Here's why you're not getting faster.",
      hook: `With a Runner IQ of ${runnerIQScore}, your effort is there, but ${greyZonePct}% of your runs are stuck in the Grey Zone. Too fast to recover, too slow to build speed. That is why you have plateaued.`,
    },
    "faster_burnout": {
      headline: "Get faster without running yourself into the ground.",
      hook: `Feeling tired is not a badge of honor. It is a warning sign. ${greyZonePct}% of your miles are Junk Mileage, draining your energy without making you faster.`,
    },
    "faster_inconsistency": {
      headline: "Make every run count, even when life gets in the way.",
      hook: `You can not always control your schedule, but you can control what each run does for you. Right now, ${greyZonePct}% of your efforts are not building speed.`,
    },
    "faster_guesswork": {
      headline: "Stop wondering if your training is working. Know it.",
      hook: `Without clear targets, ${greyZonePct}% of your runs end up in the Grey Zone. You are putting in the work, but you need a plan that tells you exactly what pace to hit and why.`,
    },
    "endurance_plateau": {
      headline: "Push past the distance wall and keep building.",
      hook: `You have hit a ceiling on how far you can run. With ${greyZonePct}% Grey Zone mileage, your body is not adapting. It is just surviving. Time to train smarter.`,
    },
    "endurance_burnout": {
      headline: "Run longer without feeling destroyed the next day.",
      hook: `You want to go further, but fatigue keeps holding you back. ${greyZonePct}% of your miles are too fast for building aerobic endurance. They are burning you out instead.`,
    },
    "endurance_inconsistency": {
      headline: "Build endurance that sticks, even with an unpredictable schedule.",
      hook: `Endurance requires consistency, but life does not always cooperate. The good news: ${daysLabel} well-structured days per week can build more base than 6 random ones.`,
    },
    "endurance_guesswork": {
      headline: "Your easy runs are not easy enough. Here is the proof.",
      hook: `${greyZonePct}% of your miles are faster than they should be for building endurance. Without knowing your real easy pace, every easy run is secretly chipping away at your recovery.`,
    },
    "injury_free_plateau": {
      headline: "Build sustainable fitness without breaking down.",
      hook: `Running hard but not seeing results, and now you are worried about getting hurt. ${greyZonePct}% of your runs put unnecessary stress on your body without improving fitness.`,
    },
    "injury_free_burnout": {
      headline: "Stop the cycle of overtraining and injury.",
      hook: `You reported feeling tired. Our analysis confirms why: ${greyZonePct}% of your miles are Junk Mileage. You are overloading your joints without gaining fitness.`,
    },
    "injury_free_inconsistency": {
      headline: "A plan your body can trust, even when your schedule changes.",
      hook: `Inconsistent training creates spiky load patterns, which is one of the top predictors of running injuries. A ${daysLabel}-day plan with built-in flexibility keeps your body adapting safely.`,
    },
    "injury_free_guesswork": {
      headline: "Your body is telling you something. Let's listen to the data.",
      hook: `Without knowing your safe training zones, ${greyZonePct}% of your miles are creating more impact than necessary. A clear plan shows you exactly where to keep your effort to stay healthy.`,
    },
  };

  const key = `${goal || "race"}_${struggle || "guesswork"}`;
  const headlineHook = headlineHookMap[key] || {
    headline: `We found a gap in your training for ${goalTarget}.`,
    hook: `Your Runner IQ is ${runnerIQScore}, but ${greyZonePct}% of your mileage is in the Grey Zone. With the right adjustments, you can see real improvement.`,
  };

  const solutionMap: Record<string, string> = {
    race: `Here is your ${daysLabel}-day/week plan to peak exactly on race day.`,
    faster: `Here is your ${daysLabel}-day/week plan designed to unlock your next gear.`,
    endurance: `Here is your ${daysLabel}-day/week plan to systematically build your distance.`,
    injury_free: `Here is your ${daysLabel}-day/week plan built around injury prevention and safe progression.`,
  };

  return {
    ...headlineHook,
    solution: solutionMap[goal || "race"] || `Here is your personalized ${daysLabel}-day/week plan to train smarter.`,
    runnerIQ: runnerIQByGoal[goal || "race"] || runnerIQByGoal.race,
    loadWarning: loadWarningByStruggle[struggle || "guesswork"] || loadWarningByStruggle.guesswork,
    greyZone: greyZoneByGoal[goal || "race"] || greyZoneByGoal.race,
    cta: ctaByGoal[goal || "race"] || ctaByGoal.race,
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
  const [wizardDismissed, setWizardDismissed] = useState(false);
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
    queryKey: [`/api/audit-report/${user?.id}`],
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

  const shouldShowWizard = isStravaConnected && hasInsights && !hasCalibration && !calibrationLoading && !wizardDismissed;

  useEffect(() => {
    if (!subLoading && !authLoading && !calibrationLoading && (hasActiveSubscription || isReverseTrial)) {
      if (hasCalibration || wizardDismissed) {
        navigate('/dashboard');
      }
    }
  }, [hasActiveSubscription, isReverseTrial, subLoading, authLoading, calibrationLoading, hasCalibration, wizardDismissed, navigate]);

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
    setWizardDismissed(true);
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
          <p className="text-sm text-gray-500 mt-2">
            We'll analyze your activities and email you a weekly progress report. Unsubscribe anytime.
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

  if (shouldShowWizard) {
    return <CalibrationWizard onComplete={handleCalibrationComplete} />;
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

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <MiniRadarChart data={runnerIQ.components} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-charcoal">
                    {personalizedCopy?.runnerIQ.title || `Your 'Runner IQ' is ${runnerIQ.score}`}
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeColor(runnerIQ.grade)}`}>
                    Grade {runnerIQ.grade}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {personalizedCopy?.runnerIQ.body || (
                    <>You are putting in <strong className="text-orange-600">Grade {runnerIQ.volumeGrade} effort</strong> (Volume), but getting <strong className="text-orange-600">Grade {runnerIQ.performanceGrade} results</strong> (Performance). {greyZone.percentage}% of your recent mileage was in the Grey Zone.</>
                  )}
                </p>
                <p className="text-sm text-orange-700 mt-3 font-medium">
                  {personalizedCopy?.runnerIQ.takeaway || "You are working harder than you need to."}
                </p>
              </div>
            </div>
          </div>

          {auditData?.racePotential && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 flex-shrink-0 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-charcoal mb-1">
                    You are leaving speed on the table at every distance.
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Based on your VO2 Max and volume data, your current trajectory is underperforming your potential by ~{auditData.racePotential.gapPercent}%.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Distance</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Current Trajectory</th>
                      <th className="text-left py-3 px-4 font-bold text-charcoal">Your True Potential</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Time Unlocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.racePotential.predictions.map((p, i) => (
                      <tr key={p.distance} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="py-3 px-4 font-bold text-charcoal">{p.distance}</td>
                        <td className="py-3 px-4 text-gray-500">{p.currentTime}</td>
                        <td className="py-3 px-4 font-bold text-charcoal">{p.potentialTime}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                            <Zap className="h-3.5 w-3.5" />
                            {p.timeSaved}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-600">
                  <strong className="text-charcoal">The Insight:</strong>{' '}
                  {personalizedCopy ? (
                    calibrationData?.goal === 'race' ? (
                      <>You have the aerobic engine to run a <strong className="text-charcoal">{auditData.racePotential.predictions[3]?.potentialTime} Marathon</strong>, but your Grey Zone training habits are anchoring you at <strong>{auditData.racePotential.predictions[3]?.currentTime}</strong>. Fix your intensity distribution and unlock those times.</>
                    ) : calibrationData?.goal === 'faster' ? (
                      <>Your current training predicts a <strong>{auditData.racePotential.predictions[0]?.currentTime} 5K</strong>, but your true speed ceiling is <strong className="text-charcoal">{auditData.racePotential.predictions[0]?.potentialTime}</strong>. The gap is not fitness. It is how you distribute your effort across training days.</>
                    ) : calibrationData?.goal === 'endurance' ? (
                      <>Your half marathon potential is <strong className="text-charcoal">{auditData.racePotential.predictions[2]?.potentialTime}</strong>, but grey zone habits are costing you <strong>{auditData.racePotential.predictions[2]?.timeSaved}</strong>. Slower easy runs build a bigger aerobic base, which means longer distances feel easier.</>
                    ) : (
                      <>You are working hard enough for the faster time, but your efficiency is too low to sustain it. Fixing your intensity distribution reduces impact stress while making you faster.</>
                    )
                  ) : (
                    <>You are working hard enough for the faster times, but your efficiency is too low to sustain it. Fixing your grey zone habits unlocks speed at every distance.</>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className={`${trainingLoad.isCritical ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'} border rounded-2xl p-6`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 flex-shrink-0 ${trainingLoad.isCritical ? 'bg-red-100' : 'bg-teal-100'} rounded-xl flex items-center justify-center`}>
                {trainingLoad.isCritical ? (
                  <AlertTriangle className="h-7 w-7 text-red-600" />
                ) : (
                  <CheckCircle className="h-7 w-7 text-teal-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-charcoal">
                    {personalizedCopy?.loadWarning.title || `Load Warning: ${trainingLoad.change ?? 0}% Change`}
                  </h2>
                  {trainingLoad.isCritical && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {personalizedCopy?.loadWarning.body || `Your training load has changed compared to last week. This week: ${trainingLoad.thisWeekActivities} activities. Last week: ${trainingLoad.lastWeekActivities} activities.`}
                </p>
                <p className={`text-sm ${trainingLoad.isCritical ? 'text-red-700' : 'text-teal-700'} mt-3 font-medium`}>
                  {personalizedCopy?.loadWarning.takeaway || "A structured plan manages your load automatically."}
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
                  <h2 className="text-xl font-bold text-charcoal">
                    {personalizedCopy?.greyZone.title || "The 'Grey Zone' Trap"}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                    Insight
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {personalizedCopy?.greyZone.body || `We analyzed your pace distribution across ${greyZone.activityCount} activities. ${greyZone.percentage}% of your easy days are too fast.`}
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
                      {checkout.isPending ? "Redirecting..." : (personalizedCopy?.greyZone.lockedLabel || "Unlock to reveal")}
                    </div>
                  </button>
                </div>

                <p className="text-sm text-purple-700 mt-3">
                  {personalizedCopy?.greyZone.lockedDescription || "We have calculated your actual optimal easy pace based on your physiological profile."}
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
              {personalizedCopy?.cta.headline || "Stop guessing. Start training efficiently."}
            </h3>
            <p className="text-white/80 text-sm">
              {personalizedCopy?.cta.subtext || "Get your personalized training plan optimized for your unique physiology."}
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
                  {personalizedCopy?.cta.button || "Reveal My Optimal Paces & Fix My Plan"}
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
