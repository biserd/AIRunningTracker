import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Bot, 
  User, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { SiStrava } from "react-icons/si";

export function AICoachConvo() {
  const [typedText, setTypedText] = useState("");
  const fullText = "Your splits show your HR climbs above 168 around km 7. That's your aerobic threshold. Three options: 1) Add 2x easy runs/week to raise your threshold, 2) Practice fueling earlier, 3) Try negative splits in your long run.";
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const sampleQuestions = [
    "Should I race this weekend?",
    "Why is my HR drifting?",
    "Plan my marathon block",
    "How's my recovery?",
    "Pacing for my 10k tomorrow?"
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-teal-500/30 font-sans overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">AITracker<span className="text-teal-400">.run</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-12 pb-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 mb-6 px-3 py-1 text-xs">
                <Sparkles className="w-3 h-3 mr-2" /> Powered by GPT-5.1
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Your AI Running Coach. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-500">
                  Chats like a real coach. Knows your every run.
                </span>
              </h1>
              <p className="text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">
                Connect Strava and start talking. Get instant, personalized advice based on your actual data, not generic templates.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button className="h-14 px-8 bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold text-lg rounded-xl shadow-[0_0_40px_-10px_#FC4C02]">
                  <SiStrava className="w-5 h-5 mr-2" /> Continue with Strava
                </Button>
                <Button variant="outline" className="h-14 px-8 border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-lg rounded-xl">
                  Sign up with Email
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                14-day free trial. Card required. Cancel anytime.
              </div>
            </div>

            {/* Chat UI Mockup */}
            <div className="order-1 lg:order-2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-purple-500/20 blur-3xl -z-10 rounded-[3rem]" />
              <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800/50 shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[550px]">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center p-[2px]">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                          <Bot className="w-5 h-5 text-teal-400" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100">Coach Alex</h3>
                      <p className="text-xs text-slate-400">Analyzing your Strava data...</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                  <div className="flex items-end gap-2 justify-end">
                    <div className="bg-teal-600 text-white px-5 py-3 rounded-2xl rounded-br-sm max-w-[85%] shadow-sm">
                      <p className="text-[15px] leading-relaxed">Why am I slowing down at km 8 lately?</p>
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mb-1">
                      <Bot className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="bg-slate-800 border border-slate-700/50 text-slate-200 px-5 py-4 rounded-2xl rounded-bl-sm max-w-[85%] shadow-sm">
                      <p className="text-[15px] leading-relaxed">
                        {typedText}
                        {typedText.length < fullText.length && <span className="inline-block w-2 h-4 bg-teal-400 ml-1 animate-pulse" />}
                      </p>
                      {typedText.length === fullText.length && (
                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-teal-400"/> HR Data attached</span>
                          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-purple-400"/> Split Analysis</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-slate-900/80 border-t border-slate-800/50">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask your coach..." 
                      className="w-full bg-slate-950 border border-slate-800 rounded-full py-3 pl-5 pr-12 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                      disabled
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center hover:bg-teal-400 transition-colors">
                      <Send className="w-4 h-4 text-slate-950 ml-1" />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Suggestion Pills */}
        <section className="pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">Ask about anything</p>
            <div className="flex flex-wrap justify-center gap-3">
              {sampleQuestions.map((q, i) => (
                <button key={i} className="px-5 py-2.5 rounded-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-teal-500/30 text-slate-300 text-sm transition-all flex items-center gap-2 group">
                  <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Proactive Coaching Section */}
        <section className="py-24 bg-slate-900/50 border-y border-slate-800/50 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Card className="bg-slate-950 border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                <div className="flex gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Recovery Alert</h4>
                    <p className="text-sm text-slate-400">2 mins ago</p>
                  </div>
                </div>
                <p className="text-slate-300 text-[15px] leading-relaxed mb-4">
                  Hey! I noticed your resting HR is 8bpm higher today and your sleep score dropped. Yesterday's track session was intense. 
                  <span className="block mt-2 font-medium text-slate-200">I've modified today's schedule: switched your 10k tempo to a 5k easy recovery run.</span>
                </p>
                <div className="flex gap-3">
                  <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg">Accept Change</Button>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white rounded-lg">Keep Original</Button>
                </div>
              </Card>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">A coach that watches your back.</h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                You don't always have to ask. Your AI coach monitors your incoming Strava data, sleep metrics, and training load to proactively flag overtraining risks and suggest plan adjustments.
              </p>
              <ul className="space-y-4">
                {[
                  "Dynamic training plans that adapt daily",
                  "Form & efficiency analysis from your watch data",
                  "Marathon fueling & pacing strategies"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Coach in your pocket.</h2>
            <p className="text-xl text-slate-400 mb-12">Cheaper than one in-person session.</p>
            
            <Card className="bg-slate-900 border-slate-800 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full" />
              <div className="relative z-10">
                <div className="inline-block bg-teal-500/10 text-teal-400 font-semibold px-4 py-1.5 rounded-full text-sm mb-6">
                  Premium Membership
                </div>
                <div className="flex justify-center items-baseline gap-2 mb-4">
                  <span className="text-6xl font-extrabold">$7.99</span>
                  <span className="text-slate-400 text-lg">/mo</span>
                </div>
                <p className="text-slate-400 mb-8">or $79.99/year. 14-day free trial.</p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                  <Button className="h-14 px-8 bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold text-lg rounded-xl w-full sm:w-auto">
                    <SiStrava className="w-5 h-5 mr-2" /> Start Trial with Strava
                  </Button>
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Card required for 14-day free trial. Cancel anytime before trial ends and you won't be charged.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-400" />
              <span className="font-bold text-lg">AITracker.run</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-400">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="text-sm text-slate-500">
              © 2026 RunAnalytics. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
