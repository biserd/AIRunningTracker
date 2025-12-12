import { Flame, Shield, Activity, Brain, Target, Heart, AlertTriangle, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import RacePredictions from "@/components/dashboard/RacePredictions";
import VO2MaxTracker from "@/components/dashboard/VO2MaxTracker";
import HeartRateZones from "@/components/dashboard/HeartRateZones";
import InjuryRiskAnalysis from "@/components/dashboard/InjuryRiskAnalysis";
import RunningEfficiency from "@/components/dashboard/RunningEfficiency";

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

export default function CoachInsightsPage() {
  const { user, isLoading } = useAuth();
  
  const { data: batchData, isLoading: isDataLoading } = useQuery({
    queryKey: ['/api/analytics/batch', user?.id],
    queryFn: () => fetch(`/api/analytics/batch/${user!.id}`).then(res => res.json()),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Extract snapshot data
  const topPrediction = batchData?.predictions?.[0];
  const vo2Max = batchData?.vo2Max;
  const injuryRisk = batchData?.injuryRisk;
  const efficiency = batchData?.efficiency;
  
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
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal" data-testid="page-title">Coach Insights</h1>
              <p className="text-gray-600">AI-powered analysis of your running performance and health</p>
            </div>
          </div>

          {/* Anchor Navigation Bar */}
          <div className="flex items-center gap-4 mt-4" data-testid="anchor-nav">
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
      </main>
    </div>
  );
}
