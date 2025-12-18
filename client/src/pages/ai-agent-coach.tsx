import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Target, 
  Zap, 
  MessageCircle,
  CheckCircle,
  Star,
  ArrowRight,
  Sparkles,
  Bell,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  Bot,
  Crown
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function AIAgentCoachLanding() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "AI Agent Coach",
    "description": "Proactive AI running coach that automatically analyzes your runs and delivers personalized coaching recaps, next-step recommendations, and training insights.",
    "brand": {
      "@type": "Organization",
      "name": "RunAnalytics"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": "14.99",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="AI Agent Coach - Proactive Running Coach | RunAnalytics Premium"
        description="Get an always-on AI running coach that proactively analyzes every run and delivers personalized coaching recaps, next-step recommendations, and training insights. Premium feature."
        keywords="AI agent coach, proactive running coach, automated running feedback, AI training analysis, personalized coaching, running AI, Strava coaching, post-run analysis"
        url="https://aitracker.run/ai-agent-coach"
        type="website"
        structuredData={structuredData}
      />
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        <section className="py-12 sm:py-20 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
              <Crown className="mr-1" size={14} />
              Premium Feature
            </Badge>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-charcoal dark:text-white mb-6 leading-tight" data-testid="heading-hero">
            Your Coach That <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Never Sleeps</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            AI Agent Coach proactively analyzes every run and delivers personalized coaching—without you asking.
          </p>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Stop checking dashboards. Get coaching insights delivered to you after every activity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all" data-testid="cta-start-trial">
                <Sparkles className="mr-2" size={20} />
                Start Premium Trial <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link href="/blog/ai-agent-coach-proactive-coaching">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg" data-testid="cta-learn-more">
                How It Works
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>Automatic After Every Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>Personalized to Your Goals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>No Action Required</span>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white dark:bg-slate-800 rounded-3xl shadow-xl mb-16 px-8" data-testid="section-how-it-works">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-how-it-works">
              How AI Agent Coach Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A coaching system that works in the background so you can focus on running
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">You Run</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Complete any run and sync it to Strava as usual. No extra steps required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">AI Analyzes</h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI Agent Coach automatically analyzes your activity—pace, heart rate, effort, and patterns.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">You Learn</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Receive personalized coaching recap with observations and next-step recommendations.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-charcoal dark:text-white mb-1">Coach Recap Example</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">After your 8K easy run</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-charcoal dark:text-white">Grade: B+</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Good effort, room to grow</span>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Excellent pacing consistency—splits varied by only 8 seconds/km</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Heart rate stayed in Zone 2 for 85% of the run—great aerobic development</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>Cadence dropped 5% in final 2km—focus on maintaining rhythm when tired</span>
                  </li>
                </ul>
                
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-charcoal dark:text-white">Next Step: Easy Run</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Tomorrow would be ideal for a short 5K recovery run. Your body is responding well to this week's load.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16" data-testid="section-personalize">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-personalize">
              Personalize Your Coach
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Set your goals, preferences, and coaching style during a quick onboarding
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-3">
                  <Target className="text-white" size={24} />
                </div>
                <CardTitle className="text-lg dark:text-white">Your Goal</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 text-sm">
                Race PR, general fitness, injury recovery, or just staying active—coaching adapts to your objective.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="text-white" size={24} />
                </div>
                <CardTitle className="text-lg dark:text-white">Race Date</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 text-sm">
                Training for a specific event? Set the date and get periodized recommendations as race day approaches.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="text-white" size={24} />
                </div>
                <CardTitle className="text-lg dark:text-white">Training Days</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 text-sm">
                Specify how many days per week you can train. Recommendations respect your available time.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                  <MessageCircle className="text-white" size={24} />
                </div>
                <CardTitle className="text-lg dark:text-white">Coaching Tone</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 text-sm">
                Gentle, balanced, or direct—choose the communication style that motivates you best.
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 bg-white dark:bg-slate-800 rounded-3xl shadow-xl mb-16 px-8" data-testid="section-testimonials">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className="fill-yellow-400 text-yellow-400" size={28} />
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-testimonials">
              What Runners Are Saying
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg dark:bg-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    MR
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Michael R.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ultra Runner</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "I used to ignore my data. Now I actually understand what each run means for my training. The next-step recommendations are spot on."
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg dark:bg-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    KT
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Katie T.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Half Marathon</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "The proactive coaching is a game-changer. I don't have to remember to check my stats—the insights come to me."
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg dark:bg-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    DL
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">David L.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">10K Racer</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "I set my coaching tone to 'direct' and the AI doesn't hold back. Finally, feedback that pushes me to improve."
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 text-center" data-testid="section-cta-bottom">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-cta">
              Ready for Proactive Coaching?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join thousands of runners getting personalized coaching after every run.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="bg-white text-purple-700 hover:bg-gray-100 px-8 py-6 text-lg" data-testid="cta-bottom-start">
                  <Zap className="mr-2 h-5 w-5" />
                  Start Premium Trial
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg" data-testid="cta-bottom-pricing">
                  View All Plans
                </Button>
              </Link>
            </div>
            <p className="text-sm text-purple-200 mt-6" data-testid="text-pricing-info">
              AI Agent Coach is included with RunAnalytics Premium at $14.99/month
            </p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
