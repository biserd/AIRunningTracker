import React from 'react';
import { SiStrava } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Activity, 
  BrainCircuit, 
  Trophy, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Zap,
  TrendingUp,
  MessageCircle
} from 'lucide-react';

export function StravaFirst() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">RunAnalytics</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-orange-500 transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-orange-500 transition-colors">Pricing</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm mb-8">
          <Zap className="w-4 h-4 fill-orange-500" />
          Connect your data in seconds
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
          The analytics your <br className="hidden md:block" />
          Strava dashboard is missing.
        </h1>
        
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Race predictions, Runner Score, and an AI coach that knows your entire running history. 
          Connect your account and see your insights instantly.
        </p>

        <div className="max-w-md mx-auto space-y-4">
          <Button 
            className="w-full h-16 text-lg font-bold bg-[#FC4C02] hover:bg-[#E34402] text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02]"
          >
            <SiStrava className="w-6 h-6 mr-3" />
            Continue with Strava
          </Button>
          
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-slate-500">
              60 seconds from connect to your first AI insight.<br/>
              No data entry. No long questionnaire.
            </p>
            <a href="#" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
              Prefer email? Sign up here <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </main>

      {/* How it Works / Flow */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 -z-10" />
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-orange-200">
                <SiStrava className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">1. Connect Strava</h3>
              <p className="text-slate-600">One tap to securely link your account. We only read your activity data.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-200">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">2. We Sync Your Runs</h3>
              <p className="text-slate-600">Our engine processes your last 12 months of training data in seconds.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-green-200">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">3. Your Coach is Ready</h3>
              <p className="text-slate-600">Instantly view your Runner Score, predictions, and chat with your AI coach.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mock Previews */}
      <section className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What you'll see immediately</h2>
            <p className="text-lg text-slate-600">No waiting weeks for the algorithm to learn you. It's ready day one.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Mock Card 1 */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">Your Runner Score</div>
                    <div className="text-2xl font-bold text-slate-900">78 <span className="text-sm font-medium text-blue-600">Top 22%</span></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Volume</span>
                    <span className="font-semibold">82</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                  <div className="flex justify-between text-sm mt-4">
                    <span className="text-slate-500">Consistency</span>
                    <span className="font-semibold">91</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mock Card 2 */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white translate-y-4 md:-translate-y-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">Race Predictions</div>
                    <div className="text-lg font-bold text-slate-900">Optimal Conditions</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="font-semibold text-slate-700">5K</div>
                    <div className="font-bold text-slate-900">21:45</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="font-semibold text-slate-700">Half Marathon</div>
                    <div className="font-bold text-slate-900">1:42:10</div>
                  </div>
                  <div className="p-3 rounded-lg border border-purple-100 bg-purple-50 flex justify-between items-center">
                    <div className="font-semibold text-purple-900">Marathon</div>
                    <div className="font-bold text-purple-700">3:42:18</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mock Card 3 */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500">AI Coach Insight</div>
                    <div className="text-lg font-bold text-slate-900">Post-Run Analysis</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed">
                  <p className="mb-2"><strong>Great long run today!</strong> Your aerobic decoupling was only 3.2% over 14 miles, showing excellent endurance.</p>
                  <p>However, your cadence dropped from 172 to 164 in the last 3 miles. Let's work on form stability when fatigued.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quiet Pricing */}
      <section id="pricing" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Simple Pricing</h2>
            <p className="text-slate-500 mt-2">Try it free, cancel anytime.</p>
          </div>
          
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Premium</h3>
                  <p className="text-sm text-slate-500">All features included</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900">$7.99<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                  <div className="text-sm text-slate-500">or $79.99/yr</div>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> 14-day free trial
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> AI Coach Chat
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Race Predictions
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Runner Score
                </li>
              </ul>
              
              <div className="p-4 bg-slate-50 rounded-lg flex items-start gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Card required to start trial to prevent abuse. You will not be charged if you cancel before the 14 days end.
                </p>
              </div>

              <Button className="w-full bg-[#FC4C02] hover:bg-[#E34402] text-white">
                Start 14-Day Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="text-orange-500 w-5 h-5" />
            <span className="font-bold text-slate-900">RunAnalytics</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">About</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
          
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} RunAnalytics.
          </div>
        </div>
      </footer>
    </div>
  );
}
