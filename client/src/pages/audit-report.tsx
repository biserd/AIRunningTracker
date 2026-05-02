import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lock, ArrowRight, CheckCircle, Sparkles, Zap, TrendingUp, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import { StravaConnectButton } from "@/components/StravaConnect";
import CalibrationWizard from "@/components/CalibrationWizard";
import { AddEmailModal } from "@/components/AddEmailModal";

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
  insightCard: {
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
      body: `You are putting in Grade ${volumeGrade} effort, but getting Grade ${perfGrade} race-readiness. Too many of your recent miles are not targeted at a specific training adaptation — not easy enough to recover, not hard enough to build race fitness.`,
      takeaway: `Your training volume is there, but it is not translating to race performance.`,
    },
    faster: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `Grade ${volumeGrade} effort in, Grade ${perfGrade} speed out. Your runs are landing at an intensity that is too hard to fully recover from but too easy to trigger speed adaptations. That middle ground is where speed goes to disappear.`,
      takeaway: `You have the engine. You just need the right gear shifts to unlock faster times.`,
    },
    endurance: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `You are logging Grade ${volumeGrade} volume, but your aerobic efficiency is only Grade ${perfGrade}. Most of your easy miles are running faster than the pace where your aerobic engine actually develops, which means your body never fully adapts before the next session.`,
      takeaway: `Slowing down on easy days is the fastest path to running longer.`,
    },
    injury_free: {
      title: `Your 'Runner IQ' is ${runnerIQScore}`,
      body: `You are putting in Grade ${volumeGrade} effort, but your body is absorbing Grade ${perfGrade} levels of stress. Running at mismatched intensities creates unnecessary mechanical load on your joints and tendons without delivering fitness gains.`,
      takeaway: `Your body is absorbing more impact than it needs to. That is a recipe for injury.`,
    },
  };

  // --- Load Warning copy by struggle ---
  const isStable = !isCritical;
  const consistencyGrade = thisWeek >= 4 ? 'A' : thisWeek >= 3 ? 'B+' : thisWeek >= 2 ? 'B' : 'C';

  const loadWarningByStruggle: Record<string, PersonalizedCopy['loadWarning']> = {
    plateau: isCritical ? {
      title: `Load Spike Detected: +${Math.abs(loadChange ?? 0)}%`,
      body: `You are pushing harder to break through, but your body cannot absorb this spike. This week: ${thisWeek} sessions. Last week: ${lastWeek}. Sudden jumps like this lead to stagnation, not breakthroughs.`,
      takeaway: `Plateaus break with precision, not brute force. A structured plan ramps load safely.`,
    } : {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You run consistently (${thisWeek}x/week), and that discipline is a real strength. But your sessions are not structured to push adaptation. Without targeted effort levels, your body settles into the same fitness plateau.`,
      takeaway: `You have the discipline. You just need the right plan to channel it.`,
    },
    burnout: isCritical ? {
      title: `Overload Warning: +${Math.abs(loadChange ?? 0)}%`,
      body: `Your fatigue is not in your head. This week: ${thisWeek} sessions vs. ${lastWeek} last week. Your body is accumulating more stress than it can recover from between runs. That is the direct cause of feeling heavy-legged and drained.`,
      takeaway: `You need a recovery protocol before you can build fitness again.`,
    } : {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You are showing up (${thisWeek}x/week), which takes real commitment. But too many of those runs are draining you instead of building you up. Running at the wrong intensity accumulates fatigue without the fitness payoff to justify it.`,
      takeaway: `The fix is not running less. It is running at the right intensities.`,
    },
    inconsistency: isStable && thisWeek >= 3 ? {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You ran ${thisWeek} times this week. That is solid. The challenge is making each session count when your schedule shifts. Without a structured plan, the runs you do squeeze in do not build on each other.`,
      takeaway: `A flexible ${daysLabel}-day plan adapts to your life and still delivers results.`,
    } : {
      title: `Training Gaps Detected`,
      body: `This week: ${thisWeek} sessions. Last week: ${lastWeek}. Gaps in your training schedule prevent your body from building the adaptation you need. When runs are sporadic, each one starts from scratch.`,
      takeaway: `A flexible ${daysLabel}-day plan adapts to your life and still delivers results.`,
    },
    guesswork: isCritical ? {
      title: `Load Warning: +${Math.abs(loadChange ?? 0)}%`,
      body: `Without clear targets, it is easy to overshoot. This week: ${thisWeek} sessions vs. ${lastWeek} last week. Your body does not know whether you are building fitness or just accumulating fatigue.`,
      takeaway: `You need a plan with clear daily targets so every run has a purpose.`,
    } : {
      title: `Consistency Score: ${consistencyGrade}`,
      body: `You are putting in the work (${thisWeek}x/week), and that matters. But without clear targets for each run, your effort is scattered across intensities that do not target a specific adaptation. You have the habit. Now you need the structure.`,
      takeaway: `A structured plan tells you exactly what to do each day so nothing is wasted.`,
    },
  };

  // --- Insight card copy by struggle + goal ---
  // The insight card reflects what the runner told us is their primary issue.
  // plateau → intensity structure (they're working hard but stuck)
  // burnout → overtraining / recovery (they're doing too much at the wrong level)
  // inconsistency → volume gap (they need to run more consistently)
  // guesswork → training blind spots (they have no targets to aim at)
  type InsightCard = PersonalizedCopy['insightCard'];

  const insightCardByStruggle: Record<string, Record<string, InsightCard>> = {
    plateau: {
      race: {
        title: `Your Race Fitness Gap`,
        body: `Across ${activityCount} activities, too many of your runs land at an effort level that builds neither speed nor endurance. On race day your body defaults to what it practiced in training — and right now that is not race pace.`,
        lockedLabel: `Unlock Your Race Pace Zones`,
        lockedDescription: `See exactly what paces to hit on easy days, tempo days, and long runs to peak on race day.`,
      },
      faster: {
        title: `Why Your Speed Has Stalled`,
        body: `Across ${activityCount} activities, your effort is landing in a dead zone — too hard to fully recover, too easy to force speed adaptations. Speed comes from contrast: truly easy days and truly hard sessions. You are stuck in the middle.`,
        lockedLabel: `Unlock Your Speed Zones`,
        lockedDescription: `See your optimal easy pace, tempo pace, and interval targets based on your current fitness.`,
      },
      endurance: {
        title: `Your Aerobic Base Gap`,
        body: `Across ${activityCount} activities, most of your easy miles are running faster than the pace where aerobic efficiency actually develops. Your body is working but not adapting. Slower easy days unlock the base that makes long distances feel manageable.`,
        lockedLabel: `Unlock Your Easy Pace Target`,
        lockedDescription: `See the exact easy pace that builds your aerobic engine without the fatigue hangover.`,
      },
      injury_free: {
        title: `Your Injury Risk Profile`,
        body: `Across ${activityCount} activities, too many runs are creating more mechanical load than necessary. Running at an unstructured intensity puts repeated stress on tendons, joints, and connective tissue without delivering the fitness gains to justify it.`,
        lockedLabel: `Unlock Your Safe Training Zones`,
        lockedDescription: `See the pace and heart rate ranges that build fitness while protecting your body.`,
      },
    },
    burnout: {
      race: {
        title: `Your Overtraining Signal`,
        body: `Across ${activityCount} activities, your body is absorbing more cumulative fatigue than it can clear between sessions. You are training hard but arriving at race-specific workouts already depleted. That is why race fitness is not building.`,
        lockedLabel: `Unlock Your Recovery Blueprint`,
        lockedDescription: `See your optimal easy days and recovery windows so you arrive at every hard session fresh and ready to adapt.`,
      },
      faster: {
        title: `Why Speed Gains Feel Out of Reach`,
        body: `Across ${activityCount} activities, your body is carrying more cumulative fatigue than it can clear between runs. Speed adaptations only happen when you recover fully — hard sessions on tired legs reinforce slow habits, not fast ones.`,
        lockedLabel: `Unlock Your Recovery Protocol`,
        lockedDescription: `See the easy pace and recovery windows your body needs to actually get faster between sessions.`,
      },
      endurance: {
        title: `Why Recovery Feels Impossible`,
        body: `Across ${activityCount} activities, you are running at intensities that accumulate fatigue faster than your aerobic system can clear it. Endurance is built on top of recovery. Without it, you are just grinding without adaptation.`,
        lockedLabel: `Unlock Your Easy Pace Range`,
        lockedDescription: `See the exact effort range where your aerobic engine grows without leaving you wrecked the next day.`,
      },
      injury_free: {
        title: `Your Injury Risk Window`,
        body: `Across ${activityCount} activities, your cumulative load is outpacing your recovery capacity. This is the exact pattern that precedes most running injuries — not a single hard run, but a slow accumulation of uncleared fatigue.`,
        lockedLabel: `Unlock Your Load Safety Score`,
        lockedDescription: `See your current injury risk level and the weekly structure that keeps you training consistently without breaking down.`,
      },
    },
    inconsistency: {
      race: {
        title: `Your Volume Consistency Gap`,
        body: `Across ${activityCount} activities, your training pattern shows gaps that prevent race-specific fitness from compounding. Aerobic fitness builds week over week — missed weeks reset more progress than most runners realize.`,
        lockedLabel: `Unlock Your Race-Ready Schedule`,
        lockedDescription: `See a flexible ${daysLabel}-day plan that builds race fitness even when life gets in the way.`,
      },
      faster: {
        title: `The Habit Your Speed Needs`,
        body: `Across ${activityCount} activities, sporadic training means your speed gains reset before they have time to compound. Consistent stimulus — even at lower volume — outperforms occasional hard efforts every time.`,
        lockedLabel: `Unlock Your Speed-Building Schedule`,
        lockedDescription: `See a ${daysLabel}-day plan that fits your life and builds real speed through consistent, targeted sessions.`,
      },
      endurance: {
        title: `Your Base-Building Gap`,
        body: `Across ${activityCount} activities, irregular training prevents the progressive aerobic base-building that endurance requires. Your body adapts to the pattern of training, not just isolated sessions. Consistency is the engine.`,
        lockedLabel: `Unlock Your Endurance Plan`,
        lockedDescription: `See the progressive ${daysLabel}-day plan that builds your aerobic base steadily, even with an unpredictable schedule.`,
      },
      injury_free: {
        title: `Your Consistency Shield`,
        body: `Across ${activityCount} activities, uneven training patterns create spiky load cycles — periods of low stress followed by sudden high load. That contrast is one of the top predictors of running injury, even at modest mileage.`,
        lockedLabel: `Unlock Your Safe Training Plan`,
        lockedDescription: `See a consistent ${daysLabel}-day schedule that keeps load steady and gives your body the predictability it needs to stay healthy.`,
      },
    },
    guesswork: {
      race: {
        title: `Your Race Readiness Score`,
        body: `Across ${activityCount} activities, your training has no clear targets — and neither does your body. Race fitness requires specific paces on specific days. Without that structure, effort accumulates but race-specific adaptation does not.`,
        lockedLabel: `Unlock Your Race Pace Targets`,
        lockedDescription: `See the exact paces for every type of run — easy, tempo, long — mapped to your current fitness and race goal.`,
      },
      faster: {
        title: `Where Your Speed Is Hiding`,
        body: `Across ${activityCount} activities, your runs have no defined targets. Without a clear easy pace and a clear hard pace, your effort clusters at a moderate level that does not trigger speed adaptation. Structure is what unlocks the gap between what you run now and what you are capable of.`,
        lockedLabel: `Unlock Your Pace Targets`,
        lockedDescription: `See your exact easy, tempo, and interval paces based on your current fitness — so every run has a clear purpose.`,
      },
      endurance: {
        title: `Your Aerobic Efficiency Score`,
        body: `Across ${activityCount} activities, training without defined easy and hard efforts means your aerobic system gets a mixed signal. It cannot build a true base because it never gets enough time at the low intensity where that adaptation actually happens.`,
        lockedLabel: `Unlock Your Easy Pace Target`,
        lockedDescription: `See the exact easy pace where your aerobic engine develops — and why slowing down is the fastest route to running longer.`,
      },
      injury_free: {
        title: `Your Load Safety Score`,
        body: `Across ${activityCount} activities, training without defined targets means load accumulates unpredictably. Some days too much, some days too little — and that variance is what causes injury more than total mileage ever does.`,
        lockedLabel: `Unlock Your Safe Zones`,
        lockedDescription: `See the effort range and weekly structure that keeps your body adapting without accumulating the load spikes that lead to injury.`,
      },
    },
  };

  const insightCard: InsightCard = (
    insightCardByStruggle[struggle || "guesswork"]?.[goal || "race"]
  ) || {
    title: `Your Training Insight`,
    body: `Across ${activityCount} activities, your effort is not consistently targeted at a specific adaptation. With the right structure, every run has a purpose — and your fitness compounds week over week.`,
    lockedLabel: `Unlock Your Training Zones`,
    lockedDescription: `See the personalized pace and effort targets that match your goal and your physiology.`,
  };

  // --- CTA copy by goal ---
  const ctaByGoal: Record<string, PersonalizedCopy['cta']> = {
    race: {
      headline: `Your race-ready plan is built from your Strava history.`,
      subtext: `14-day free trial. Cancel anytime.`,
      button: `Unlock My 14-Day Plan`,
    },
    faster: {
      headline: `Your speed plan is built from your Strava history.`,
      subtext: `14-day free trial. Cancel anytime.`,
      button: `Unlock My 14-Day Plan`,
    },
    endurance: {
      headline: `Your endurance plan is built from your Strava history.`,
      subtext: `14-day free trial. Cancel anytime.`,
      button: `Unlock My 14-Day Plan`,
    },
    injury_free: {
      headline: `Your injury-prevention plan is built from your Strava history.`,
      subtext: `14-day free trial. Cancel anytime.`,
      button: `Unlock My 14-Day Plan`,
    },
  };

  // --- Headline/hook by goal+struggle ---
  const headlineHookMap: Record<string, { headline: string; hook: string }> = {
    "race_plateau": {
      headline: "Break through your plateau and crush your next race.",
      hook: `You are putting in the effort, but it is not converting to race fitness. Our analysis of your ${activityCount} activities shows your sessions are not structured to build the specific adaptations race day demands. With the right plan, that changes.`,
    },
    "race_burnout": {
      headline: "Race faster without burning out before the start line.",
      hook: `You reported feeling tired and heavy-legged — and the data backs it up. Your cumulative training load is outpacing your recovery. You are overloading your body instead of building race fitness. The fix is not less running. It is smarter running.`,
    },
    "race_inconsistency": {
      headline: "A race plan that fits your real life.",
      hook: `Sticking to a schedule is tough — but the runs you do fit in need to count. Right now, your sessions are not structured to build toward a race peak. A flexible ${daysLabel}-day plan keeps you progressing even on busy weeks.`,
    },
    "race_guesswork": {
      headline: "Stop guessing. Start training with a plan that peaks on race day.",
      hook: `You do not know if your training is on track — and our analysis of your ${activityCount} activities confirms the concern. Without clear targets, your effort accumulates without building race-specific fitness. That gap is fixable.`,
    },
    "faster_plateau": {
      headline: "You're working hard. Here's why you're not getting faster.",
      hook: `With a Runner IQ of ${runnerIQScore}, your effort is real — but it is not producing speed. Your runs are landing at an intensity that is too hard to fully recover from and too easy to trigger speed adaptations. That is the exact zone where progress stalls.`,
    },
    "faster_burnout": {
      headline: "Get faster without running yourself into the ground.",
      hook: `Feeling tired is not a badge of honor. It is a signal that your training is accumulating more fatigue than your body can clear. Speed adaptations happen during recovery — not during the run itself. You need structure that lets you actually absorb your training.`,
    },
    "faster_inconsistency": {
      headline: "Make every run count, even when life gets in the way.",
      hook: `You can not always control your schedule, but you can control what each run does for you. Right now, without clear targets, sessions are not building on each other. A ${daysLabel}-day plan gives every run a specific purpose — and delivers speed even with a busy life.`,
    },
    "faster_guesswork": {
      headline: "Stop wondering if your training is working. Know it.",
      hook: `Without clear targets, your effort is scattered — and you have no way of knowing if it is moving the needle. Our analysis of your ${activityCount} activities shows exactly where your speed ceiling is and what is holding it in place.`,
    },
    "endurance_plateau": {
      headline: "Push past the distance wall and keep building.",
      hook: `You have hit a ceiling on how far you can run comfortably. Our analysis shows your easy runs are not slow enough to build true aerobic base. Your body is working hard but not adapting. Running smarter — not harder — is how you break through.`,
    },
    "endurance_burnout": {
      headline: "Run longer without feeling destroyed the next day.",
      hook: `You want to go further, but fatigue keeps pulling you back. Your easy runs are not easy enough for your body to fully recover, which means you are starting each session already depleted. Slowing down strategically is the unlock.`,
    },
    "endurance_inconsistency": {
      headline: "Build endurance that sticks, even with an unpredictable schedule.",
      hook: `Endurance requires consistent stimulus over time — but life does not always cooperate. The good news: ${daysLabel} well-structured days per week builds more aerobic base than 6 unstructured ones. It is about pattern, not just mileage.`,
    },
    "endurance_guesswork": {
      headline: "Your easy runs are not easy enough. Here is the proof.",
      hook: `Without a defined easy pace, every run drifts toward the same moderate effort — fast enough to accumulate fatigue, too slow to build speed, and faster than the zone where your aerobic engine actually develops. We found your real easy pace in your data.`,
    },
    "injury_free_plateau": {
      headline: "Build sustainable fitness without breaking down.",
      hook: `You are working hard but not seeing results — and the effort is adding up in ways your body feels. Our analysis shows your load is not structured in a way that balances stress and recovery. The right plan makes progress possible without the breakdown risk.`,
    },
    "injury_free_burnout": {
      headline: "Stop the cycle of overtraining and injury.",
      hook: `You reported feeling tired — and the data shows why. Your cumulative load is exceeding your recovery capacity. That pattern, more than any single hard run, is what puts runners on the injury list. A recovery-first plan breaks the cycle.`,
    },
    "injury_free_inconsistency": {
      headline: "A plan your body can trust, even when your schedule changes.",
      hook: `Inconsistent training creates spiky load patterns — periods of low stress followed by sudden high demand. That contrast is one of the top predictors of running injuries, even at modest mileage. A ${daysLabel}-day plan with built-in flexibility keeps load steady and your body adapting safely.`,
    },
    "injury_free_guesswork": {
      headline: "Your body is telling you something. Let's listen to the data.",
      hook: `Without defined effort targets, your training load accumulates unpredictably. Some days too much stress, some days too little — and that variance, not total mileage, is what causes most running injuries. Our analysis found the specific zones where you can build fitness and stay healthy.`,
    },
  };

  const key = `${goal || "race"}_${struggle || "guesswork"}`;
  const headlineHook = headlineHookMap[key] || {
    headline: `We found a gap in your training for ${goalTarget}.`,
    hook: `Your Runner IQ is ${runnerIQScore}. Our analysis of your ${activityCount} activities shows your effort is not consistently targeted at a specific adaptation. With the right adjustments, you can see real improvement.`,
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
    insightCard,
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

function useAuditCheckout(onRequiresEmail: () => void) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/create-audit-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 402 && data.requiresEmail) {
        onRequiresEmail();
        return null;
      }
      if (!res.ok) throw new Error(data.message || "Checkout failed");
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data?.url) {
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

interface HeroCopy {
  outcomeHeadline: string;
  subheadline: string;
  current: string | null;
  potential: string | null;
  distanceLabel: string;
  timeSavedClean: string | null;
  heroIndex: number;
  stickyBarHeadline: string;
  blockerLine: string;
}

function getHeroCopy(
  auditData: AuditData,
  goal: string | null | undefined,
  activityCount: number
): HeroCopy {
  const greyZoneTooFast = auditData.greyZone.easyRunsAreTooFast;
  const blockerLine = greyZoneTooFast
    ? "your easy runs are too fast"
    : "your training intensity is unstructured";

  // Pick hero distance based on the user's stated goal
  let preferredIndex = 2; // Half by default
  if (goal === "faster") preferredIndex = 0; // 5K
  else if (goal === "race") preferredIndex = 2; // Half
  else if (goal === "endurance") preferredIndex = 2; // Half
  else if (goal === "injury_free") preferredIndex = 2; // Half

  const preds = auditData.racePotential?.predictions ?? [];
  if (preds.length === 0) {
    return {
      outcomeHeadline: "Your 14-day plan is ready.",
      subheadline: `We've analyzed ${activityCount} of your runs and built a plan that helps you train smarter — not just harder.`,
      current: null,
      potential: null,
      distanceLabel: "",
      timeSavedClean: null,
      heroIndex: -1,
      stickyBarHeadline: "Your 14-day plan is ready — built from your Strava history.",
      blockerLine,
    };
  }

  const idx = Math.min(preferredIndex, preds.length - 1);
  const hero = preds[idx];
  const timeSavedClean = (hero.timeSaved || "").replace(/^-/, "");
  const distanceLabel = hero.distance === "Half"
    ? "half marathon"
    : hero.distance === "Marathon"
      ? "marathon"
      : hero.distance.toLowerCase();

  // If there's no meaningful gap, fall back to a generic outcome line.
  // Parse cleaned time ("M:SS" or "H:MM:SS") into seconds; treat <30s as no-gap.
  const parseToSeconds = (s: string): number => {
    const parts = s.split(":").map((n) => parseInt(n, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  };
  const hasGap = !!timeSavedClean && parseToSeconds(timeSavedClean) >= 30;
  if (!hasGap) {
    return {
      outcomeHeadline: `Your ${distanceLabel} potential is ${hero.potentialTime}.`,
      subheadline: `Based on your last ${activityCount} runs, your structured 14-day plan is ready to help you peak when it matters.`,
      current: hero.currentTime,
      potential: hero.potentialTime,
      distanceLabel,
      timeSavedClean: null,
      heroIndex: idx,
      stickyBarHeadline: `Your ${distanceLabel} plan is ready — built from your Strava history.`,
      blockerLine,
    };
  }

  return {
    outcomeHeadline: `You could be ${timeSavedClean} faster in the ${distanceLabel}.`,
    subheadline: `Based on your last ${activityCount} runs, your current trajectory is ${hero.currentTime}, but your true potential is ${hero.potentialTime} if you fix one key issue: ${blockerLine}.`,
    current: hero.currentTime,
    potential: hero.potentialTime,
    distanceLabel,
    timeSavedClean,
    heroIndex: idx,
    stickyBarHeadline: `Start the plan that helps close your ${timeSavedClean} ${distanceLabel} gap.`,
    blockerLine,
  };
}

export default function AuditReportPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading, isReverseTrial } = useSubscription();
  const [, navigate] = useLocation();
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const checkout = useAuditCheckout(() => setShowEmailModal(true));

  const isStravaConnected = !!(user as any)?.stravaAthleteId;

  const params = new URLSearchParams(window.location.search);
  const justConnected = params.get('connected') === 'true' || params.get('strava_login') === 'success';

  // isNewStravaUser is computed later (after activityCount), placeholder needed for refetchInterval
  // below. Using a derived value based on sync state: always poll when syncing + Strava connected.
  const pollWhileSyncing = isStravaConnected;

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
    // Poll while syncing for both URL-param flow and any Strava-connected user syncing
    refetchInterval: isSyncing && pollWhileSyncing ? 3000 : false,
  });

  const activityCount = auditData?.greyZone?.activityCount || 0;
  const hasInsights = activityCount >= 5 && auditData?.runnerIQ?.score !== undefined && auditData.runnerIQ.score > 25;

  // True for new Strava OAuth users who have no activities yet
  const isNewStravaUser = isStravaConnected && !auditLoading && activityCount === 0;

  useEffect(() => {
    if (syncStatus && !isSyncing && (justConnected || isNewStravaUser)) {
      refetchAudit();
      if (justConnected) window.history.replaceState({}, '', '/audit-report');
    }
  }, [isSyncing, syncStatus, justConnected, isNewStravaUser, refetchAudit]);

  const shouldShowWizard = isStravaConnected && !hasCalibration && !calibrationLoading && !wizardDismissed;

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
      // Sync subscription from Stripe immediately so the user lands on the
      // dashboard already showing Premium, even if the webhook is delayed.
      (async () => {
        try {
          await apiRequest("/api/stripe/sync-subscription", "POST");
        } catch (err) {
          console.warn("sync-subscription failed:", err);
        } finally {
          queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          navigate('/dashboard');
        }
      })();
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

  // Show sync screen for new users (URL param OR any Strava-connected user with no activities syncing)
  const showSyncingScreen = !hasInsights && isSyncing && (justConnected || isNewStravaUser);
  
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

  const hero = auditData
    ? getHeroCopy(auditData, calibrationData?.goal, greyZone.activityCount)
    : null;

  const daysLabel = calibrationData?.days === "5+" ? "5+" : (calibrationData?.days || "3");
  const heroIndex = hero?.heroIndex ?? -1;

  const samplePlan = [
    { day: "Mon", session: `Easy ${daysLabel === "5+" ? 8 : 6}km @ ${greyZone.optimalEasyPaceKm.split(" - ")[0]}/km` },
    { day: "Wed", session: `Tempo intervals · 6×3min @ threshold` },
    { day: "Sat", session: `Long Run · build to ${daysLabel === "5+" ? 18 : 14}km easy` },
  ];

  const planBullets = [
    `${daysLabel} runs matched to your schedule`,
    `Easy pace target based on your actual data`,
    `One workout each week to improve race speed`,
    `Recovery guidance after each Strava upload`,
    `Plan adapts automatically as new runs sync`,
  ];

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pb-32">
      <SEO 
        title="Your Race Potential | AITracker.run"
        description="See how much faster you could be — and unlock your personalized 14-day plan."
      />

      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Audit Complete badge */}
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700" data-testid="badge-audit-complete">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Audit Complete · {greyZone.activityCount} runs analyzed
          </span>
        </div>

        {/* A. HERO — outcome-driven */}
        <section className="text-center mb-8" data-testid="section-hero">
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal leading-tight mb-3" data-testid="text-hero-headline">
            {hero?.outcomeHeadline || "Your 14-day plan is ready."}
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-5" data-testid="text-hero-subheadline">
            {hero?.subheadline}
          </p>

          {hero?.current && hero?.potential && (
            <div className="flex justify-center items-end gap-3 md:gap-6 mb-6" data-testid="block-current-vs-potential">
              <div className="text-center">
                <p className="text-[10px] md:text-xs uppercase tracking-wide text-gray-500 mb-1">Current</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-400 line-through decoration-2 decoration-gray-300">
                  {hero.current}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-strava-orange mb-1.5" />
              <div className="text-center">
                <p className="text-[10px] md:text-xs uppercase tracking-wide text-strava-orange font-bold mb-1">Your Potential</p>
                <p className="text-3xl md:text-4xl font-bold text-strava-orange">
                  {hero.potential}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpgrade}
            disabled={checkout.isPending}
            className="bg-strava-orange hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl text-base shadow-md w-full md:w-auto"
            data-testid="button-hero-cta"
          >
            {checkout.isPending ? "Redirecting…" : "Unlock My 14-Day Plan"}
            {!checkout.isPending && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
          <p className="text-xs text-gray-500 mt-2">Free for 14 days. Cancel anytime.</p>
        </section>

        <div className="space-y-4">
          {/* B. RACE POTENTIAL — table near the top, hero row highlighted */}
          {auditData?.racePotential && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm" data-testid="card-race-potential">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex-shrink-0 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg md:text-xl font-bold text-charcoal mb-1">
                    Your race potential at every distance
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Based on your last {greyZone.activityCount} runs. Your current trajectory is underperforming your potential by ~{auditData.racePotential.gapPercent}%.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2.5 px-3 md:px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Distance</th>
                      <th className="text-left py-2.5 px-3 md:px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Current</th>
                      <th className="text-left py-2.5 px-3 md:px-4 font-semibold text-charcoal text-xs uppercase tracking-wide">Potential</th>
                      <th className="text-left py-2.5 px-3 md:px-4 font-semibold text-strava-orange text-xs uppercase tracking-wide">Time Unlocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.racePotential.predictions.map((p, i) => {
                      const isHero = i === heroIndex;
                      return (
                        <tr
                          key={p.distance}
                          className={isHero ? 'bg-orange-50 border-l-4 border-strava-orange' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}
                          data-testid={`row-prediction-${p.distance}`}
                        >
                          <td className="py-3 px-3 md:px-4 font-bold text-charcoal">
                            <span className="flex items-center gap-1.5">
                              {p.distance}
                              {isHero && <span className="text-[10px] uppercase tracking-wide bg-strava-orange text-white px-1.5 py-0.5 rounded">Best opportunity</span>}
                            </span>
                          </td>
                          <td className="py-3 px-3 md:px-4 text-gray-500">{p.currentTime}</td>
                          <td className="py-3 px-3 md:px-4 font-bold text-charcoal">{p.potentialTime}</td>
                          <td className="py-3 px-3 md:px-4">
                            <span className={`inline-flex items-center gap-1 font-bold ${isHero ? 'text-strava-orange text-base' : 'text-amber-600'}`}>
                              <Zap className="h-3.5 w-3.5" />
                              {p.timeSaved.replace(/^-/, '')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* C. MAIN BLOCKER — supportive, not shaming */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6" data-testid="card-blocker">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 flex-shrink-0 bg-amber-100 rounded-xl flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-lg md:text-xl font-bold text-charcoal" data-testid="text-aerobic-base-score">
                    Your Aerobic Base Score: {runnerIQ.score}/100
                  </h2>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                    Big improvement opportunity
                  </span>
                </div>
                <p className="text-charcoal font-semibold mb-2">
                  {greyZone.easyRunsAreTooFast
                    ? "Your easy runs are limiting your endurance gains."
                    : "Your training intensity isn't structured around a clear adaptation."}
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {greyZone.easyRunsAreTooFast
                    ? "Most of your easy miles are being run faster than your aerobic adaptation pace. Slowing down on the right days can help you build a stronger base and run faster on race day."
                    : "Your runs sit in the moderate \"grey zone\" — too hard to recover well, too easy to drive real adaptation. Targeted easy and workout days unlock progress without adding mileage."}
                </p>

                {greyZone.easyRunsAreTooFast && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Your easy pace now</p>
                      <p className="text-base font-bold text-gray-700">{greyZone.currentEasyPaceKm}/km</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{greyZone.currentEasyPaceMiles}/mi</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-2 border-amber-300">
                      <p className="text-[10px] uppercase tracking-wide text-amber-700 font-bold mb-1">Aerobic target</p>
                      <p className="text-base font-bold text-amber-700">{greyZone.optimalEasyPaceKm}/km</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">{greyZone.optimalEasyPaceMiles}/mi</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* D. TRAINING GAP — schedule consistency */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6" data-testid="card-training-gap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold text-charcoal mb-1">
                  Your weekly schedule shifts week to week
                </h2>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  This week: <strong className="text-charcoal">{trainingLoad.thisWeekActivities} runs</strong>. Last week: <strong className="text-charcoal">{trainingLoad.lastWeekActivities} runs</strong>. A flexible {daysLabel}-day plan adapts when your week shifts — you don't have to start over.
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  <span>Reschedule any run from your phone in 2 taps</span>
                </div>
              </div>
            </div>
          </div>

          {/* E. LOCKED PLAN PREVIEW — concrete value */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 md:p-6" data-testid="card-plan-preview">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 flex-shrink-0 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold text-charcoal">
                  Your first 7 days are ready.
                </h2>
                <p className="text-gray-700 text-sm mt-1">
                  Built from your Strava history and tuned to your goal.
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {planBullets.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-charcoal">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="relative bg-white rounded-xl border border-purple-200 overflow-hidden">
              <div className="blur-[3px] select-none p-4 space-y-2.5">
                {samplePlan.map((row) => (
                  <div key={row.day} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-charcoal w-12">{row.day}</span>
                    <span className="text-gray-600 flex-1 text-right">{row.session}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpgrade}
                disabled={checkout.isPending}
                className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] hover:bg-white/70 transition-colors"
                data-testid="button-unlock-week"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold text-sm shadow-md">
                  <Lock className="h-4 w-4" />
                  {checkout.isPending ? "Redirecting…" : "Unlock My First Week"}
                </span>
              </button>
            </div>
          </div>

          {/* F. URGENCY */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 md:p-6" data-testid="card-urgency">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 flex-shrink-0 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold text-charcoal mb-1">
                  Your next 7 days matter.
                </h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Based on your current pattern, another week of unstructured running may continue reinforcing the same plateau. Your plan starts with low-risk aerobic corrections first — no extra mileage required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-strava-orange px-4 py-3 shadow-lg z-50" data-testid="sticky-cta">
        <div className="max-w-2xl mx-auto">
          <p className="text-white font-bold text-sm md:text-base text-center mb-2 leading-tight" data-testid="text-sticky-headline">
            {hero?.stickyBarHeadline || personalizedCopy?.cta.headline || "Your 14-day plan is ready — built from your Strava history."}
          </p>
          <Button
            onClick={handleUpgrade}
            disabled={checkout.isPending}
            className="w-full bg-white text-strava-orange hover:bg-gray-100 font-bold py-3 rounded-xl"
            data-testid="button-sticky-cta"
          >
            {checkout.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-strava-orange" />
                Redirecting to checkout…
              </div>
            ) : (
              <>
                Unlock My 14-Day Plan
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          <p className="text-center text-white/90 text-xs mt-1.5">
            14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
    <AddEmailModal
      open={showEmailModal}
      onClose={() => setShowEmailModal(false)}
      onSuccess={() => {
        setShowEmailModal(false);
        checkout.mutate();
      }}
    />
    </>
  );
}
