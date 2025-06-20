import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import VO2MaxTracker from "@/components/dashboard/VO2MaxTracker";
import HeartRateZones from "@/components/dashboard/HeartRateZones";
import RunningEfficiency from "@/components/dashboard/RunningEfficiency";

export default function PerformancePage() {
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
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal">Performance Analytics</h1>
              <p className="text-gray-600">Advanced metrics for running optimization</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* VO2 Max Tracker */}
          <div className="xl:col-span-1">
            <VO2MaxTracker userId={user.id} />
          </div>

          {/* Running Efficiency */}
          <div className="xl:col-span-1">
            <RunningEfficiency userId={user.id} />
          </div>

          {/* Heart Rate Zones - Full Width */}
          <div className="xl:col-span-2">
            <HeartRateZones userId={user.id} />
          </div>
        </div>

        {/* Educational Section */}
        <div className="mt-12 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-charcoal mb-4 flex items-center">
            <Activity className="mr-3 h-6 w-6 text-red-600" />
            Understanding Performance Metrics
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 font-bold">VO2</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">VO2 Max</h3>
              <p className="text-sm text-gray-600">
                Maximum oxygen uptake capacity. Higher values indicate better cardiovascular fitness and endurance potential.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold">HR</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Heart Rate Zones</h3>
              <p className="text-sm text-gray-600">
                Training intensity guidelines based on heart rate. Different zones target specific fitness adaptations.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-yellow-600 font-bold">EFF</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Running Efficiency</h3>
              <p className="text-sm text-gray-600">
                Biomechanical analysis of running form. Optimizing efficiency reduces energy waste and injury risk.
              </p>
            </div>
          </div>

          <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-lg p-6">
            <h4 className="font-semibold text-charcoal mb-3">Performance Optimization Tips:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Track VO2 max trends over months for fitness progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Spend 80% of training time in aerobic zones (1-2)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Focus on cadence consistency around 180 steps/min</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Monitor efficiency metrics to prevent overstriding</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Use heart rate zones for structured training</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Combine high-intensity intervals with base building</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}