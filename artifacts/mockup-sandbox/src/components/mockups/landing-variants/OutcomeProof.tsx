import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Trophy, ArrowRight, Mail, Star, Quote, ArrowUpRight } from "lucide-react";
import { SiStrava } from "react-icons/si";

export function OutcomeProof() {
  return (
    <div className="min-h-screen bg-[#FDFCF9] font-sans text-gray-900 selection:bg-orange-100">
      <style dangerouslySetInterInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');
          .font-serif { font-family: 'Playfair Display', serif; }
          .font-sans { font-family: 'Inter', sans-serif; }
        `
      }} />

      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FC4C02] rounded flex items-center justify-center">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">RunAnalytics</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">Log in</Link>
          <Button className="bg-[#FC4C02] hover:bg-[#E34402] text-white rounded-full px-6">
            Start 14-Day Trial
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 mb-6 px-4 py-1.5 rounded-full text-sm font-medium">
            Based on data from 50,000+ runners
          </Badge>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 mb-6 leading-tight">
            Runners using AITracker drop an average of <span className="text-[#FC4C02] italic">12 sec/km</span> in their first 8 weeks.
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto font-sans leading-relaxed">
            Stop guessing your fitness. Connect Strava and let our AI coach find the hidden gains in your training history.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="w-full sm:w-auto h-14 px-8 bg-[#FC4C02] hover:bg-[#E34402] text-white rounded-full text-lg font-medium flex items-center gap-2 shadow-lg shadow-orange-200 transition-transform hover:-translate-y-0.5">
              <SiStrava className="w-5 h-5" />
              Continue with Strava
            </Button>
            <Button variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg font-medium border-gray-300 hover:bg-gray-50 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-500" />
              Sign up with Email
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4 font-medium">
            14-day free trial • $7.99/mo after • Cancel anytime
          </p>
        </div>

        {/* Testimonials Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {[
            {
              name: "Anna S.",
              details: "34, London",
              outcome: "Went from 4:45 to 4:12 marathon in 16 weeks",
              image: "https://i.pravatar.cc/150?u=anna"
            },
            {
              name: "Marcus T.",
              details: "29, New York",
              outcome: "Cured my recurring shin splints with workload insights",
              image: "https://i.pravatar.cc/150?u=marcus"
            },
            {
              name: "Elena R.",
              details: "41, Berlin",
              outcome: "Nailed my Boston Qualifier pacing perfectly",
              image: "https://i.pravatar.cc/150?u=elena"
            }
          ].map((t, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
              <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-orange-400 text-orange-400" />)}
                </div>
                <p className="font-serif font-bold text-gray-900 text-lg leading-tight mb-1">"{t.outcome}"</p>
                <p className="text-sm text-gray-500">{t.name} • {t.details}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After Section */}
      <section className="bg-gray-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#FC4C02_0%,_transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">The Proof is in the Data</h2>
            <p className="text-xl text-gray-300 mb-8 font-light">
              Most runners plateau because they run the same pace every day. Our AI Coach analyzes your last 90 days of Strava data to build a Runner Score, predicting exact training adaptations that lead to PRs.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Instant AI analysis of your fitness trends",
                "Form stability metrics late in long runs",
                "Personalized race pacing strategy"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-lg text-gray-200">
                  <CheckCircle className="w-6 h-6 text-[#FC4C02]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            {/* Chart Card */}
            <div className="bg-white rounded-2xl p-6 shadow-2xl relative z-10 text-gray-900">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Runner Score</p>
                  <p className="text-4xl font-bold font-serif text-gray-900">84.2</p>
                </div>
                <Badge className="bg-green-100 text-green-700 px-3 py-1 text-sm">+12.4 in 8 weeks</Badge>
              </div>
              <div className="h-48 flex items-end gap-2">
                {[40, 42, 45, 43, 50, 58, 65, 72, 75, 80, 82, 84].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-orange-100 to-orange-400 rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-gray-400 font-medium">
                <span>Week 1</span>
                <span>Week 4</span>
                <span>Week 8</span>
              </div>
            </div>
            
            {/* Decorative background card */}
            <div className="absolute -bottom-6 -right-6 w-full h-full bg-orange-600 rounded-2xl -z-10 opacity-50"></div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
            <div className="text-center px-4">
              <p className="text-4xl font-serif font-bold text-gray-900 mb-2">52,491</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Runners Tracked</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-serif font-bold text-gray-900 mb-2">12.4M</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Miles Analyzed</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-serif font-bold text-gray-900 mb-2">3.2M</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Insights Generated</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-serif font-bold text-[#FC4C02] mb-2">+9.8%</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg Score Increase</p>
            </div>
          </div>
        </div>
      </section>

      {/* Press Row */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">As featured in</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="text-2xl font-serif font-bold">Runner's World</div>
            <div className="text-xl font-bold uppercase tracking-tighter">Marathon Handbook</div>
            <div className="text-2xl font-serif italic">The Daily Mile</div>
            <div className="text-xl font-bold tracking-widest">TRAIL MAG</div>
          </div>
        </div>
      </section>

      {/* Image / Content Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <img 
              src="/__mockup/images/runner-training.jpg" 
              alt="Runner checking watch" 
              className="rounded-2xl shadow-xl object-cover h-[500px] w-full"
            />
          </div>
          <div className="order-1 md:order-2">
            <Quote className="w-12 h-12 text-orange-200 mb-6" />
            <h3 className="text-4xl font-serif font-bold text-gray-900 mb-6 leading-snug">
              "The AI Coach told me to slow down my long runs by 30 seconds per mile. Six weeks later, I broke my 10K record."
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden">
                <img src="https://i.pravatar.cc/150?u=david" alt="David" />
              </div>
              <div>
                <p className="font-bold text-gray-900">David Chen</p>
                <p className="text-gray-500">Sub-40 10K Runner</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center bg-gray-50 rounded-3xl p-12 md:p-20 border border-gray-100 shadow-sm">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6">
            Join 50,000+ runners getting faster today.
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Start your 14-day free trial. Full access to AI coaching, predictions, and Runner Score. Cancel anytime directly in the app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="w-full sm:w-auto h-14 px-10 bg-[#FC4C02] hover:bg-[#E34402] text-white rounded-full text-lg font-medium flex items-center justify-center gap-2">
              <SiStrava className="w-5 h-5" />
              Continue with Strava
            </Button>
            <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full text-lg font-medium border-gray-300 hover:bg-white flex items-center justify-center gap-2 bg-transparent">
              <Mail className="w-5 h-5 text-gray-500" />
              Sign up with Email
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-6 font-medium">
            $7.99/month or $79.99/year • Secure checkout
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100 bg-white text-center sm:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gray-400" />
            <span className="font-bold text-gray-900">RunAnalytics</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-500">
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/contact" className="hover:text-gray-900">Contact</Link>
          </div>
          <div className="text-sm text-gray-400">
            © 2025 RunAnalytics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
