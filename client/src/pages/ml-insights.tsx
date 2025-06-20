import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import RacePredictions from "@/components/dashboard/RacePredictions";
import TrainingPlan from "@/components/dashboard/TrainingPlan";
import InjuryRiskAnalysis from "@/components/dashboard/InjuryRiskAnalysis";

export default function MLInsightsPage() {
  const { user, isLoading } = useAuth();
  
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
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal">ML Performance Insights</h1>
              <p className="text-gray-600">AI-powered analysis and predictions for your running</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="xl:col-span-1">
            <RacePredictions userId={user.id} />
          </div>
          <div className="xl:col-span-1">
            <InjuryRiskAnalysis userId={user.id} />
          </div>
          <div className="xl:col-span-2">
            <TrainingPlan userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Race Predictions */}
          <div className="xl:col-span-1">
            <RacePredictions userId={user.id} />
          </div>

          {/* Injury Risk Analysis */}
          <div className="xl:col-span-1">
            <InjuryRiskAnalysis userId={user.id} />
          </div>

          {/* Training Plan - Full Width */}
          <div className="xl:col-span-2">
            <TrainingPlan userId={user.id} />
          </div>
        </div>

        {/* Educational Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center">
            <Brain className="mr-3 h-6 w-6 text-purple-600" />
            How Our AI Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Data Analysis</h3>
              <p className="text-sm text-gray-600">
                Our AI analyzes your training patterns, paces, distances, and progression trends from your Strava activities.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Pattern Recognition</h3>
              <p className="text-sm text-gray-600">
                Advanced algorithms identify performance patterns, training load distribution, and potential risk factors.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Personalized Insights</h3>
              <p className="text-sm text-gray-600">
                Generate customized predictions, training plans, and recommendations tailored to your specific fitness level and goals.
              </p>
            </div>
          </div>

          <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-lg p-6">
            <h4 className="font-semibold text-charcoal mb-3">Key Features:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-strava-orange rounded-full"></div>
                  <span>Race time predictions for 5K, 10K, and half marathon</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-performance-blue rounded-full"></div>
                  <span>Personalized training plans with progressive structure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-achievement-green rounded-full"></div>
                  <span>Injury risk assessment and prevention strategies</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Training load optimization recommendations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Pace guidance for different workout types</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Recovery and rest day recommendations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}