import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  CheckCircle, 
  MessageCircle, 
  Zap, 
  Target, 
  TrendingUp,
  Bot,
  Bell,
  Sparkles,
  Award
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function AIAgentCoachBlogPost() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "AI Agent Coach: How Proactive AI Coaching Transforms Your Running",
    "description": "Discover how AI Agent Coach analyzes every run and delivers personalized coaching recaps, next-step recommendations, and training insights without you asking.",
    "author": {
      "@type": "Organization",
      "name": "RunAnalytics"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RunAnalytics",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aitracker.run/logo.png"
      }
    },
    "datePublished": "2025-12-18",
    "dateModified": "2025-12-18",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://aitracker.run/blog/ai-agent-coach-proactive-coaching"
    },
    "keywords": "AI running coach, proactive coaching, automated training feedback, Strava AI analysis, post-run coaching, running analytics AI, personalized running advice"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="AI Agent Coach: Proactive AI Coaching for Runners | RunAnalytics"
        description="Learn how AI Agent Coach automatically analyzes your runs and delivers personalized coaching recaps, next-step recommendations, and training cues. Transform passive tracking into active coaching."
        keywords="AI running coach, proactive coaching, automated training feedback, Strava AI analysis, post-run coaching, running analytics AI, personalized running advice, AI agent coach"
        url="https://aitracker.run/blog/ai-agent-coach-proactive-coaching"
        type="article"
        structuredData={structuredData}
      />
      <PublicHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link href="/blog">
          <Button variant="ghost" className="mb-6" data-testid="btn-back-blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                <Bot className="mr-1 h-3 w-3" />
                Premium Feature
              </Badge>
              <Badge variant="outline">AI Coaching</Badge>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-title">
              AI Agent Coach: How Proactive AI Coaching Transforms Your Running
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Stop checking dashboards. Let your AI coach come to you with personalized insights after every run.
            </p>
            
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>December 18, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>10 min read</span>
              </div>
            </div>
          </header>

          <div className="bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-600" />
              What You'll Learn
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>What makes AI Agent Coach different from reactive coaching tools</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>How proactive post-run recaps accelerate improvement</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>The science behind personalized coaching tone and recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>How to set up AI Agent Coach for your training goals</span>
              </li>
            </ul>
          </div>

          <section className="mb-12" data-testid="section-problem">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-problem">
              The Problem with Passive Running Analytics
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Most running analytics tools are reactive. They wait for you to log in, navigate through dashboards, and interpret data yourself. The result? Valuable insights sit unused while you continue training in the dark.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Think about it: How often do you actually analyze your runs in detail? Most runners sync their activity to Strava, glance at the summary, and move on. Critical patterns like early fatigue, pacing inconsistency, or signs of overtraining go unnoticed.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>AI Agent Coach changes this entirely.</strong> Instead of waiting for you to ask questions, it proactively analyzes every run and delivers coaching insights directly to you.
            </p>
          </section>

          <section className="mb-12" data-testid="section-what-is">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-what-is">
              What is AI Agent Coach?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              AI Agent Coach is a Premium feature that acts as your always-on running coach. Here's how it works:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Automatic Analysis</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    After every Strava sync, AI Agent Coach analyzes your activity—pace patterns, heart rate trends, effort distribution, and more.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Coaching Recaps</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Receive 3-5 personalized observations about your run, written in your preferred coaching tone (gentle, balanced, or direct).
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Next Step Recommendations</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Get clear guidance on what to do next: rest, easy run, workout, long run, or recovery—based on your training load and goals.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Proactive Delivery</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Insights appear on your activity page and can be delivered via email—no need to search for them.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              The Science of Personalized Coaching Tone
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Research shows that coaching effectiveness depends heavily on communication style matching the athlete's personality. AI Agent Coach lets you choose your coaching tone:
            </p>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Gentle Coach:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Encouraging, supportive feedback that celebrates progress and frames challenges positively.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Balanced Coach:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Mix of encouragement and direct feedback, suitable for most runners.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Direct Coach:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> No-nonsense, data-driven feedback for competitive athletes who want honest assessments.</span>
                </div>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              How AI Agent Coach Fits Your Training Goals
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              During onboarding, you set your primary goal—whether it's a specific race, general fitness, or injury recovery. The AI tailors every recommendation to this context:
            </p>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <Award className="h-8 w-8 text-strava-orange" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Race Goal Example</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">"Great tempo run! This puts you on track for your April marathon. Consider an easy 5K tomorrow to recover before your weekend long run."</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Fitness Goal Example</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">"Solid effort today. Your aerobic base is building nicely. Tomorrow would be a good day for active recovery or complete rest."</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Getting Started with AI Agent Coach
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Setting up AI Agent Coach takes just 2 minutes:
            </p>
            <ol className="space-y-4 mb-6">
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Upgrade to Premium:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> AI Agent Coach is available exclusively on the Premium plan.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Complete the Onboarding Wizard:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Set your goal, race date (optional), available training days, and preferred coaching tone.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Sync Your Activities:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> After your next run syncs from Strava, you'll receive your first coaching recap automatically.</span>
                </div>
              </li>
            </ol>
          </section>

          <section className="bg-gradient-to-r from-strava-orange to-amber-500 rounded-2xl p-8 text-white text-center" data-testid="section-cta">
            <h2 className="text-2xl font-bold mb-4" data-testid="heading-cta">
              Ready for an Always-On Running Coach?
            </h2>
            <p className="text-lg text-orange-100 mb-6 max-w-2xl mx-auto">
              Transform passive data into active coaching. Get personalized feedback after every run with AI Agent Coach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/ai-agent-coach">
                <Button size="lg" className="bg-white text-strava-orange hover:bg-gray-100" data-testid="cta-learn-more">
                  <Zap className="mr-2 h-5 w-5" />
                  Learn More About AI Agent Coach
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="cta-get-started">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </section>
        </article>
      </main>
      
      <Footer />
    </div>
  );
}
