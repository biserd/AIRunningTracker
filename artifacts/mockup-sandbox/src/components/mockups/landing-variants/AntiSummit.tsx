import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight, Brain, Zap, Target, Activity, Shield, Star, Quote } from "lucide-react";
import { SiStrava } from "react-icons/si";

export function AntiSummit() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-300 font-sans selection:bg-orange-500/30">
      
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span className="text-white font-bold text-xl tracking-tight">AITracker<span className="text-cyan-400">.run</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#comparison" className="hover:text-white transition-colors">Comparison</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm font-medium hover:text-white transition-colors hidden sm:block">Sign In</Link>
            <Button className="bg-white text-black hover:bg-slate-200 font-semibold rounded-full px-6 h-9 text-sm">
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Abstract glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <Badge className="bg-white/10 text-cyan-400 hover:bg-white/15 border-0 mb-8 py-1.5 px-4 text-sm font-medium rounded-full backdrop-blur-sm">
            The Alternative to Strava Summit
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-[1.1]">
            Strava Summit is $79.99/yr.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">So is AITracker.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            You're already paying for running insights. It's time to get your money's worth. 
            Same price, strictly more features, including a 24/7 AI Running Coach.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button className="w-full sm:w-auto h-14 px-8 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-lg rounded-full shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)] transition-all">
              Start 14-Day Free Trial
            </Button>
            <Button variant="outline" className="w-full sm:w-auto h-14 px-8 border-[#FC4C02] text-[#FC4C02] hover:bg-[#FC4C02] hover:text-white font-bold text-lg rounded-full bg-transparent transition-all group">
              <SiStrava className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Continue with Strava
            </Button>
          </div>
          
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" /> No charges until day 14. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section id="comparison" className="py-20 px-6 border-t border-white/5 bg-[#0F1014]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Direct Comparison</h2>
            <p className="text-slate-400 text-lg">See exactly what you get for your $79.99.</p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px] border border-white/10 rounded-2xl bg-[#0A0A0B] shadow-2xl">
              <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 rounded-t-2xl">
                <div className="p-6 font-semibold text-slate-400">Feature</div>
                <div className="p-6 text-center border-l border-white/10 bg-[#FC4C02]/10 relative">
                  <div className="text-[#FC4C02] font-bold text-xl flex items-center justify-center gap-2">
                    <SiStrava className="h-5 w-5" /> Summit
                  </div>
                  <div className="text-sm text-slate-500 mt-1">$79.99 / year</div>
                </div>
                <div className="p-6 text-center border-l border-white/10 bg-cyan-500/10 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">OUR PICK</div>
                  <div className="text-cyan-400 font-bold text-xl flex items-center justify-center gap-2">
                    <Activity className="h-5 w-5" /> AITracker
                  </div>
                  <div className="text-sm text-slate-500 mt-1">$79.99 / year</div>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {[
                  { name: "Segment Leaderboards", strava: true, ai: false, note: "Strava's bread and butter" },
                  { name: "Live Tracking (Beacon)", strava: true, ai: false },
                  { name: "Basic Heart Rate Zones", strava: true, ai: true },
                  { name: "Custom Route Builder", strava: true, ai: true },
                  { name: "Interactive AI Coach Chat", strava: false, ai: true, highlight: true },
                  { name: "Runner Score (0-100)", strava: false, ai: true },
                  { name: "Accurate Race Predictions", strava: false, ai: true },
                  { name: "Aerobic Decoupling Analysis", strava: false, ai: true },
                  { name: "Marathon Fueling Planner", strava: false, ai: true },
                  { name: "Recovery & Readiness Score", strava: false, ai: true },
                  { name: "Form & Efficiency Trends", strava: false, ai: true },
                ].map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 hover:bg-white/[0.02] transition-colors ${row.highlight ? 'bg-cyan-500/5' : ''}`}>
                    <div className="p-5 flex flex-col justify-center">
                      <span className={`font-medium ${row.highlight ? 'text-cyan-300' : 'text-slate-300'}`}>{row.name}</span>
                      {row.note && <span className="text-xs text-slate-500 mt-1">{row.note}</span>}
                    </div>
                    <div className="p-5 border-l border-white/10 flex items-center justify-center">
                      {row.strava ? <Check className="h-6 w-6 text-slate-400" /> : <X className="h-6 w-6 text-slate-700" />}
                    </div>
                    <div className="p-5 border-l border-white/10 flex items-center justify-center bg-cyan-500/5">
                      {row.ai ? <Check className="h-6 w-6 text-cyan-400" /> : <X className="h-6 w-6 text-slate-700" />}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-3 border-t border-white/10 bg-white/5 rounded-b-2xl">
                <div className="p-6"></div>
                <div className="p-6 border-l border-white/10 text-center">
                  <span className="text-slate-500 font-medium">Keep your subscription</span>
                </div>
                <div className="p-6 border-l border-white/10 text-center bg-cyan-500/10">
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-full">
                    Start Trial
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Quote className="h-16 w-16 text-white/10 mx-auto mb-8" />
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            "I was paying for Strava Summit anyway. Now I get an actual coach for the same money."
          </h3>
          <div className="flex items-center justify-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              MD
            </div>
            <div className="text-left">
              <div className="font-bold text-white text-lg">Marcus Davis</div>
              <div className="text-slate-400">Switched from Summit • Boston Qualifier</div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Built It */}
      <section id="features" className="py-24 px-6 border-t border-white/5 bg-[#0F1014]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Architecture of Better Running</h2>
            <p className="text-slate-400 text-lg max-w-2xl">
              We didn't just build another dashboard. We built an analytics engine that actually understands your fitness.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-[#0A0A0B] border-white/10 hover:border-cyan-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-6">
                  <Brain className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">GPT-5.1 Coaching Engine</h3>
                <p className="text-slate-400 leading-relaxed">
                  Every run is analyzed by our specialized LLM fine-tuned on endurance training principles. It reads your splits, heart rate drift, and historic baselines before generating a verdict.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0B] border-white/10 hover:border-orange-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-lg bg-[#FC4C02]/10 flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-[#FC4C02]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Zero-Latency Strava Sync</h3>
                <p className="text-slate-400 leading-relaxed">
                  Connect your account once. The second you hit "Save" on your watch, your data is webhooked to our servers, processed in milliseconds, and ready for analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0B] border-white/10 hover:border-blue-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Proprietary Runner Score</h3>
                <p className="text-slate-400 leading-relaxed">
                  We calculate a singular 0-100 metric based on 4 pillars: Volume, Consistency, Performance, and Improvement. Instantly know if your fitness is actually trending up.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-32 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F1014] to-[#0A0A0B] z-0" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            More in your pocket.<br />
            More in your training.
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            $7.99/mo or $79.99/yr. Start your 14-day free trial today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="w-full sm:w-auto h-16 px-10 bg-white hover:bg-slate-200 text-black font-bold text-lg rounded-full transition-all">
              Start with Email
            </Button>
            <Button className="w-full sm:w-auto h-16 px-10 bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold text-lg rounded-full transition-all flex items-center gap-2">
              <SiStrava className="h-6 w-6" /> Connect with Strava
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">Requires a credit card. Cancel easily online before trial ends.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050505] py-12 px-6 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <span className="text-white font-bold tracking-tight">AITracker.run</span>
          </div>
          
          <div className="flex gap-8">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>

          <div className="text-xs">
            Not affiliated with Strava. Built for Strava users.
          </div>
        </div>
      </footer>
    </div>
  );
}
