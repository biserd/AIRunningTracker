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
    "@graph": [
      {
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
        "datePublished": "2026-01-18",
        "dateModified": "2026-01-18",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://aitracker.run/blog/ai-agent-coach-proactive-coaching"
        },
        "keywords": "AI running coach, proactive coaching, automated training feedback, Strava AI analysis, post-run coaching, running analytics AI, personalized running advice, human coach vs AI coach"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How accurate is AI coaching compared to a human coach?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "AI Agent Coach analyzes the same data a human coach would—heart rate, pace, cadence, elevation—but processes it instantly and consistently. It excels at pattern recognition across your entire training history, identifying trends a human might miss. However, it can't observe your running form visually or understand external life factors affecting your training."
            }
          },
          {
            "@type": "Question",
            "name": "Can I use AI Agent Coach alongside a human running coach?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely! Many runners use both. AI Agent Coach provides immediate feedback after every run, while your human coach handles big-picture strategy, race planning, and personal motivation. The AI insights can actually help your human coach by providing detailed data summaries."
            }
          },
          {
            "@type": "Question",
            "name": "What data does AI Agent Coach analyze?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The AI analyzes all available data from your Strava activities: pace and splits, heart rate zones and trends, cadence, elevation gain, time in zones, effort distribution, and historical patterns. It also considers your stated goals, upcoming races, and training preferences."
            }
          },
          {
            "@type": "Question",
            "name": "How do I change my coaching preferences?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can update your coaching tone, goals, race dates, and available training days anytime in your Coach Settings. Changes take effect immediately for your next synced activity."
            }
          },
          {
            "@type": "Question",
            "name": "Does AI Agent Coach work for non-running activities?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Currently, AI Agent Coach is optimized for running activities. It will analyze walks and hikes but provides the most detailed insights for runs. Support for cycling and other activities is on our roadmap."
            }
          },
          {
            "@type": "Question",
            "name": "Is my training data private and secure?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Your data is encrypted in transit and at rest. AI analysis is performed securely using OpenAI's enterprise API with no data retention. We never share or sell your personal training data."
            }
          },
          {
            "@type": "Question",
            "name": "What if I disagree with the AI's recommendation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You're always in control. AI Agent Coach provides recommendations, not mandates. If you disagree, run how you feel is best—the AI will learn from your choices over time and adjust future suggestions based on outcomes."
            }
          }
        ]
      }
    ]
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
                <span>January 18, 2026</span>
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

          <section className="mb-12" data-testid="section-comparison">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-comparison">
              Human Running Coach vs AI Running Coach
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Both human and AI coaches have their strengths. Here's how they compare:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800">
                    <th className="text-left p-4 font-semibold text-charcoal dark:text-white border-b border-gray-200 dark:border-slate-700">Feature</th>
                    <th className="text-center p-4 font-semibold text-charcoal dark:text-white border-b border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">👤</span>
                        Human Coach
                      </div>
                    </th>
                    <th className="text-center p-4 font-semibold text-charcoal dark:text-white border-b border-gray-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-center justify-center gap-2">
                        <Bot className="h-6 w-6 text-strava-orange" />
                        AI Agent Coach
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900">
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Cost</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">$100-$500/month</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold bg-orange-50/50 dark:bg-orange-900/10">Included in Premium</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Availability</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">Business hours, scheduled calls</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold bg-orange-50/50 dark:bg-orange-900/10">24/7, after every run</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Response Time</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">Hours to days</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold bg-orange-50/50 dark:bg-orange-900/10">Seconds after sync</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Data Analysis</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">Manual review of key metrics</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold bg-orange-50/50 dark:bg-orange-900/10">Deep analysis of all data points</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Consistency</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">Varies by coach availability</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold bg-orange-50/50 dark:bg-orange-900/10">Every single activity</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Emotional Support</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold">Excellent, personal connection</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400 bg-orange-50/50 dark:bg-orange-900/10">Good, adjustable tone</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Race Day Experience</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold">Can be there in person</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400 bg-orange-50/50 dark:bg-orange-900/10">Virtual support only</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Pattern Recognition</td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">Limited by time and memory</td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-semibold bg-orange-50/50 dark:bg-orange-900/10">Analyzes full training history</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4 italic">
              Many elite runners use both: a human coach for strategy and emotional support, and AI Agent Coach for immediate post-run feedback and daily accountability.
            </p>
          </section>

          <section className="mb-12" data-testid="section-faq">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-6" data-testid="heading-faq">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    How accurate is the AI coaching compared to a human coach?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    AI Agent Coach analyzes the same data a human coach would—heart rate, pace, cadence, elevation—but processes it instantly and consistently. It excels at pattern recognition across your entire training history, identifying trends a human might miss. However, it can't observe your running form visually or understand external life factors affecting your training.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    Can I use AI Agent Coach alongside a human running coach?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Absolutely! Many runners use both. AI Agent Coach provides immediate feedback after every run, while your human coach handles big-picture strategy, race planning, and personal motivation. The AI insights can actually help your human coach by providing detailed data summaries.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    What data does AI Agent Coach analyze?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    The AI analyzes all available data from your Strava activities: pace and splits, heart rate zones and trends, cadence, elevation gain, time in zones, effort distribution, and historical patterns. It also considers your stated goals, upcoming races, and training preferences.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    How do I change my coaching preferences?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    You can update your coaching tone, goals, race dates, and available training days anytime in your Coach Settings. Changes take effect immediately for your next synced activity.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    Does AI Agent Coach work for non-running activities?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Currently, AI Agent Coach is optimized for running activities. It will analyze walks and hikes but provides the most detailed insights for runs. Support for cycling and other activities is on our roadmap.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    Is my training data private and secure?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Yes. Your data is encrypted in transit and at rest. AI analysis is performed securely using OpenAI's enterprise API with no data retention. We never share or sell your personal training data.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">
                    What if I disagree with the AI's recommendation?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    You're always in control. AI Agent Coach provides recommendations, not mandates. If you disagree, run how you feel is best—the AI will learn from your choices over time and adjust future suggestions based on outcomes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-8 sm:p-10 text-center shadow-lg border border-orange-200 dark:border-slate-600" data-testid="section-cta">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-strava-orange to-amber-500 rounded-full flex items-center justify-center shadow-md">
                <Bot className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal dark:text-white mb-3" data-testid="heading-cta">
              Ready for an Always-On Running Coach?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Transform passive data into active coaching. Get personalized feedback after every run with AI Agent Coach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/ai-agent-coach">
                <Button size="lg" className="w-full sm:w-auto bg-charcoal dark:bg-white text-white dark:text-charcoal hover:bg-gray-800 dark:hover:bg-gray-100 font-semibold px-8 h-12 shadow-md" data-testid="cta-learn-more">
                  <Zap className="mr-2 h-5 w-5" />
                  Learn More
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" className="w-full sm:w-auto bg-strava-orange text-white hover:bg-orange-600 font-semibold px-8 h-12 shadow-md" data-testid="cta-get-started">
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
