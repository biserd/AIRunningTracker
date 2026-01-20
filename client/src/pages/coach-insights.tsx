import { useState } from "react";
import { Flame, Shield, Activity, Brain, Target, Heart, AlertTriangle, Gauge, Bot, Settings, Calendar, MessageSquare, ChevronRight, Sparkles, Clock, CheckCircle, XCircle, Timer, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import { FloatingAICoach } from "@/components/FloatingAICoach";
import RacePredictions from "@/components/dashboard/RacePredictions";
import VO2MaxTracker from "@/components/dashboard/VO2MaxTracker";
import HeartRateZones from "@/components/dashboard/HeartRateZones";
import InjuryRiskAnalysis from "@/components/dashboard/InjuryRiskAnalysis";
import RunningEfficiency from "@/components/dashboard/RunningEfficiency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoachRecap, User } from "@shared/schema";

function getConfidenceText(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

function getInjuryRiskColor(risk: string): string {
  switch (risk?.toLowerCase()) {
    case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getEfficiencyLabel(efficiency: number): string {
  if (efficiency >= 85) return "Excellent";
  if (efficiency >= 70) return "Good";
  if (efficiency >= 55) return "Fair";
  return "Needs Work";
}

function formatGoalType(goal: string | null | undefined): string {
  if (!goal) return "Not set";
  const labels: Record<string, string> = {
    "5k": "5K Race",
    "10k": "10K Race",
    "half_marathon": "Half Marathon",
    "marathon": "Marathon",
    "general_fitness": "General Fitness"
  };
  return labels[goal] || goal;
}

function formatTone(tone: string | null | undefined): string {
  if (!tone) return "Not set";
  const labels: Record<string, string> = {
    "gentle": "Gentle & Encouraging",
    "direct": "Direct & No-Nonsense",
    "data_nerd": "Data-Driven"
  };
  return labels[tone] || tone;
}

function formatDays(days: string[] | null | undefined): string {
  if (!days || days.length === 0) return "Not set";
  return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");
}

interface RecoveryState {
  daysSinceLastRun: number;
  lastRunDate: string | null;
  lastRunName: string | null;
  acuteLoadKm: number;
  chronicLoadKm: number;
  acuteChronicRatio: number;
  freshnessScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  originalRiskLevel: "low" | "moderate" | "high" | "critical";
  riskReduced: boolean;
  readyToRun: boolean;
  recommendedNextStep: "rest" | "easy" | "workout" | "long_run" | "recovery";
  statusMessage: string;
  recoveryMessage: string;
}

function RecoveryStatusCard({ recovery, isLoading }: { recovery: RecoveryState | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="mb-6 bg-white rounded-xl border-2 border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      </div>
    );
  }

  if (!recovery) return null;

  const getRiskStyles = () => {
    if (recovery.readyToRun) {
      return {
        border: "border-emerald-300",
        bg: "bg-gradient-to-r from-emerald-50 to-green-50",
        icon: <CheckCircle className="text-emerald-600" size={28} />,
        badge: "bg-emerald-100 text-emerald-700 border-emerald-300"
      };
    }
    switch (recovery.riskLevel) {
      case "critical":
        return {
          border: "border-red-300",
          bg: "bg-gradient-to-r from-red-50 to-orange-50",
          icon: <XCircle className="text-red-600" size={28} />,
          badge: "bg-red-100 text-red-700 border-red-300"
        };
      case "high":
        return {
          border: "border-orange-300",
          bg: "bg-gradient-to-r from-orange-50 to-amber-50",
          icon: <AlertTriangle className="text-orange-600" size={28} />,
          badge: "bg-orange-100 text-orange-700 border-orange-300"
        };
      case "moderate":
        return {
          border: "border-amber-300",
          bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
          icon: <Timer className="text-amber-600" size={28} />,
          badge: "bg-amber-100 text-amber-700 border-amber-300"
        };
      default:
        return {
          border: "border-emerald-300",
          bg: "bg-gradient-to-r from-emerald-50 to-green-50",
          icon: <CheckCircle className="text-emerald-600" size={28} />,
          badge: "bg-emerald-100 text-emerald-700 border-emerald-300"
        };
    }
  };

  const styles = getRiskStyles();
  const nextStepLabels: Record<string, string> = {
    rest: "Take a rest day",
    easy: "Easy run",
    workout: "Quality workout",
    long_run: "Long run",
    recovery: "Recovery run"
  };

  return (
    <div className={`mb-6 rounded-xl border-2 ${styles.border} ${styles.bg} p-5`} data-testid="recovery-status-card">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-lg font-bold text-charcoal">
              {recovery.readyToRun ? "Ready to Run" : "Recovery Needed"}
            </h3>
            {recovery.riskReduced && (
              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1">
                <TrendingDown size={12} />
                Risk reduced by rest
              </Badge>
            )}
          </div>
          
          <p className="text-gray-700 mb-3">{recovery.statusMessage}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-500" />
              <span className="text-gray-600">{recovery.recoveryMessage}</span>
            </div>
            <div className={`px-3 py-1 rounded-full border ${styles.badge} font-medium`}>
              Next: {nextStepLabels[recovery.recommendedNextStep]}
            </div>
            <div className="text-gray-500">
              Freshness: <span className="font-semibold text-charcoal">{recovery.freshnessScore}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsTab({ user, batchData, isDataLoading, recoveryData, isRecoveryLoading }: { user: User; batchData: any; isDataLoading: boolean; recoveryData: RecoveryState | null; isRecoveryLoading: boolean }) {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const topPrediction = batchData?.predictions?.[0];
  const vo2Max = batchData?.vo2Max;
  const injuryRisk = batchData?.injuryRisk;
  const efficiency = batchData?.efficiency;

  return (
    <>
      {/* Recovery Status Card - Time-aware freshness indicator */}
      <RecoveryStatusCard recovery={recoveryData} isLoading={isRecoveryLoading} />

      {/* Anchor Navigation Bar */}
      <div className="flex items-center gap-4 mb-6" data-testid="anchor-nav">
        <button
          onClick={() => scrollToSection('section-engine')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 text-orange-700 font-medium text-sm transition-colors border border-orange-200"
          data-testid="nav-engine"
        >
          <Flame size={14} />
          The Engine
        </button>
        <span className="text-gray-400">•</span>
        <button
          onClick={() => scrollToSection('section-mechanics')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-blue-100 hover:from-emerald-200 hover:to-blue-200 text-emerald-700 font-medium text-sm transition-colors border border-emerald-200"
          data-testid="nav-mechanics"
        >
          <Shield size={14} />
          The Mechanics
        </button>
      </div>

      {/* Snapshot Row - TL;DR Chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8" data-testid="snapshot-row">
        {/* Race Potential */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-orange-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Race Potential</span>
          </div>
          {isDataLoading ? (
            <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
          ) : topPrediction ? (
            <p className="text-sm font-semibold text-charcoal">
              {topPrediction.distance} · {topPrediction.predictedTime}
              <span className="text-xs text-gray-500 ml-1">({getConfidenceText(topPrediction.confidence)} confidence)</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>

        {/* Fitness (VO2 Max) */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Heart size={14} className="text-red-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fitness</span>
          </div>
          {isDataLoading ? (
            <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
          ) : vo2Max?.current ? (
            <p className="text-sm font-semibold text-charcoal">
              VO₂ Max {vo2Max.current.toFixed(1)} · <span className="text-red-600">{vo2Max.comparison || 'Good'}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>

        {/* Injury Risk */}
        <div className={`rounded-lg border p-3 shadow-sm ${getInjuryRiskColor(injuryRisk?.riskLevel)}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium uppercase tracking-wide opacity-70">Injury Risk</span>
          </div>
          {isDataLoading ? (
            <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
          ) : injuryRisk?.riskLevel ? (
            <p className="text-sm font-semibold capitalize">{injuryRisk.riskLevel}</p>
          ) : (
            <p className="text-sm opacity-60">No data</p>
          )}
        </div>

        {/* Efficiency */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Gauge size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Efficiency</span>
          </div>
          {isDataLoading ? (
            <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
          ) : efficiency?.efficiency ? (
            <p className="text-sm font-semibold text-charcoal">
              {Math.round(efficiency.efficiency)}% · <span className="text-blue-600">{getEfficiencyLabel(efficiency.efficiency)}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>

      {/* Section 1: The Engine (Race Potential) - Orange/Red Theme */}
      <section id="section-engine" className="mb-12 scroll-mt-24" data-testid="section-engine">
        <div className="flex items-center space-x-4 mb-6 pb-4 border-b-2 border-orange-200">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Flame className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-charcoal">The Engine</h2>
            <p className="text-base text-gray-500">Your race potential and cardiovascular power</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column: Race Predictions + Heart Rate Zones */}
          <div className="space-y-6">
            <RacePredictions userId={user.id} batchData={batchData} />
            <HeartRateZones userId={user.id} batchData={batchData} />
          </div>
          
          {/* Right Column: VO2 Max Tracker */}
          <div className="xl:col-span-1">
            <VO2MaxTracker userId={user.id} batchData={batchData} />
          </div>
        </div>
      </section>

      {/* Contextual Bridge */}
      <div className="relative my-10" data-testid="section-bridge">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="bg-gradient-to-r from-orange-50 via-white to-emerald-50 px-6 py-3 rounded-full border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="text-orange-500">●</span>
              Your fitness is strong. Now let's check your durability.
              <span className="text-emerald-500">●</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: The Mechanics (Form & Health) - Green/Blue Theme */}
      <section id="section-mechanics" className="mb-12 scroll-mt-24" data-testid="section-mechanics">
        <div className="flex items-center space-x-4 mb-6 pb-4 border-b-2 border-emerald-200">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-charcoal">The Mechanics</h2>
            <p className="text-base text-gray-500">Your form stability and injury resilience</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Injury Risk Analysis */}
          <div className="xl:col-span-1">
            <InjuryRiskAnalysis userId={user.id} batchData={batchData} />
          </div>
          
          {/* Running Efficiency */}
          <div className="xl:col-span-1">
            <RunningEfficiency userId={user.id} batchData={batchData} />
          </div>
        </div>
      </section>

      {/* Educational Summary */}
      <div className="mt-12 bg-gradient-to-r from-orange-50 via-white to-emerald-50 border border-gray-200 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center">
          <Activity className="mr-3 h-6 w-6 text-gray-600" />
          Understanding Your Running Profile
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Engine Metrics */}
          <div className="bg-orange-50/50 rounded-lg p-6 border border-orange-100">
            <h3 className="font-semibold text-orange-700 mb-4 flex items-center">
              <Flame className="mr-2 h-5 w-5" />
              Engine Metrics
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                <span><strong>Race Predictions:</strong> AI-powered finish time estimates based on your training</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                <span><strong>VO2 Max:</strong> Your maximum oxygen capacity - the ceiling of your endurance</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5"></div>
                <span><strong>Heart Rate Zones:</strong> Training intensity targets for optimal adaptation</span>
              </div>
            </div>
          </div>
          
          {/* Mechanics Metrics */}
          <div className="bg-emerald-50/50 rounded-lg p-6 border border-emerald-100">
            <h3 className="font-semibold text-emerald-700 mb-4 flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Mechanics Metrics
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5"></div>
                <span><strong>Injury Risk:</strong> Early warning signals based on training patterns</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span><strong>Running Efficiency:</strong> Cadence and form analysis for sustainable performance</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
          <p className="text-sm text-gray-600 text-center">
            <strong>Pro Tip:</strong> Balance your training to improve both your engine (power) and mechanics (durability). 
            A strong engine with poor mechanics leads to injury. Good mechanics with a weak engine limits your potential.
          </p>
        </div>
      </div>
    </>
  );
}

function AIAgentCoachTab({ user, canAccessAICoachChat }: { user: User; canAccessAICoachChat: boolean }) {
  const isPremium = canAccessAICoachChat;
  const hasOnboarded = !!user.coachGoal;

  const { data: recapsData, isLoading: recapsLoading } = useQuery<{ recaps: CoachRecap[] }>({
    queryKey: ['/api/coach-recaps'],
    enabled: isPremium,
  });

  const recaps = recapsData?.recaps || [];

  if (!isPremium) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
          <Bot className="text-white" size={36} />
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-3">AI Agent Coach</h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Get personalized coaching feedback after every run. AI Agent Coach analyzes your activities and delivers proactive insights, recommendations, and training cues.
        </p>
        <Badge className="mb-6 bg-amber-100 text-amber-700 border-amber-300">
          Premium Feature
        </Badge>
        <div className="flex justify-center gap-4">
          <Link href="/pricing">
            <Button className="bg-strava-orange text-white hover:bg-orange-600" data-testid="btn-upgrade-premium">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Premium
            </Button>
          </Link>
          <Link href="/ai-agent-coach">
            <Button variant="outline" data-testid="btn-learn-more">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
          <Bot className="text-white" size={36} />
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-3">Set Up Your AI Coach</h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Complete the onboarding wizard to personalize your AI coaching experience. Set your goals, training preferences, and coaching style.
        </p>
        <Link href="/coach/onboarding">
          <Button className="bg-strava-orange text-white hover:bg-orange-600" data-testid="btn-start-onboarding">
            <Sparkles className="mr-2 h-4 w-4" />
            Start Onboarding
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Coach Preferences Summary */}
      <Card className="border-2 border-amber-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Bot className="text-white" size={20} />
              </div>
              <div>
                <CardTitle className="text-lg">Your AI Coach Preferences</CardTitle>
                <p className="text-sm text-gray-500">Customize how your coach interacts with you</p>
              </div>
            </div>
            <Link href="/coach/settings">
              <Button variant="outline" size="sm" data-testid="btn-coach-settings">
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-strava-orange" />
                <span className="text-sm font-medium text-gray-600">Goal</span>
              </div>
              <p className="font-semibold text-charcoal">{formatGoalType(user.coachGoal)}</p>
              {user.coachRaceDate && (
                <p className="text-sm text-gray-500 mt-1">
                  Race: {new Date(user.coachRaceDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Coaching Tone</span>
              </div>
              <p className="font-semibold text-charcoal">{formatTone(user.coachTone)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-green-500" />
                <span className="text-sm font-medium text-gray-600">Training Days</span>
              </div>
              <p className="font-semibold text-charcoal text-sm">{formatDays(user.coachDaysAvailable)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Coaching Recaps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="text-white" size={20} />
              </div>
              <div>
                <CardTitle className="text-lg">Recent Coaching Recaps</CardTitle>
                <p className="text-sm text-gray-500">AI-generated feedback from your recent activities</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recapsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recaps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="font-medium">No coaching recaps yet</p>
              <p className="text-sm">Complete a run and sync with Strava to receive your first coaching recap.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recaps.slice(0, 5).map((recap) => (
                <Link key={recap.id} href={`/activity/${recap.activityId}`}>
                  <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors cursor-pointer border border-gray-100" data-testid={`recap-card-${recap.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                            {recap.nextStep?.replace(/_/g, ' ') || 'Feedback'}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {recap.activityDate ? new Date(recap.activityDate).toLocaleDateString() : 'N/A'}
                          </span>
                          {!recap.viewedAt && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-charcoal mb-1">{recap.activityName}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {recap.coachingCue || "View activity for detailed coaching feedback"}
                        </p>
                        {recap.nextStep && (
                          <p className="text-xs text-gray-500 mt-1">
                            <strong>Next:</strong> {recap.nextStep.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="text-gray-400 flex-shrink-0 ml-4" size={20} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoachInsightsPage() {
  const { user, isLoading } = useAuth();
  const { canAccessAICoachChat } = useFeatureAccess();
  const [activeTab, setActiveTab] = useState("insights");
  
  const { data: batchData, isLoading: isDataLoading } = useQuery({
    queryKey: ['/api/analytics/batch', user?.id],
    queryFn: () => fetch(`/api/analytics/batch/${user!.id}`).then(res => res.json()),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: recoveryData, isLoading: isRecoveryLoading } = useQuery<RecoveryState>({
    queryKey: ['/api/performance/recovery', user?.id],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/performance/recovery/${user!.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch recovery state');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal" data-testid="page-title">Coach Insights</h1>
              <p className="text-gray-600">AI-powered analysis of your running performance and health</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="insights" className="flex items-center gap-2" data-testid="tab-insights">
                <Brain size={16} />
                Insights
              </TabsTrigger>
              <TabsTrigger value="agent-coach" className="flex items-center gap-2" data-testid="tab-agent-coach">
                <Bot size={16} />
                AI Agent Coach
                {canAccessAICoachChat && !user.coachGoal && (
                  <span className="w-2 h-2 bg-strava-orange rounded-full"></span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="insights" className="mt-6">
              <InsightsTab user={user} batchData={batchData} isDataLoading={isDataLoading} recoveryData={recoveryData || null} isRecoveryLoading={isRecoveryLoading} />
            </TabsContent>
            
            <TabsContent value="agent-coach" className="mt-6">
              <AIAgentCoachTab user={user} canAccessAICoachChat={canAccessAICoachChat} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <FloatingAICoach 
        userId={user.id} 
        pageContext={{
          pageName: "Coach Insights",
          pageDescription: "AI-powered analysis page showing race predictions, VO2 max, heart rate zones, injury risk, and running efficiency metrics",
          relevantData: {
            activeTab: activeTab,
            hasCoachSetup: !!user.coachGoal
          }
        }}
      />
    </div>
  );
}
