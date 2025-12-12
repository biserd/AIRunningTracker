import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Target,
  Brain,
  ArrowRight,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  TrendingUp,
  RefreshCcw,
  AlertTriangle,
  Sparkles,
  Activity,
  BarChart3,
  Heart,
  Timer,
  MessageSquare,
  UserCheck
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import comparisonImage from "@assets/generated_images/generic_vs_ai_plan_comparison.png";

export default function HowToPickTrainingPlan() {
  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "How to Pick a Training Plan: Complete Guide to Finding Your Perfect Running Program",
    "description": "Learn how to choose the right training plan for your running goals. Discover why AI-personalized plans outperform generic schedules, what to look for in a quality training program, and how RunAnalytics Training Plan HQ creates custom plans based on your Strava data.",
    "image": "https://aitracker.run/og-image.jpg",
    "author": {
      "@type": "Organization",
      "name": "RunAnalytics"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RunAnalytics",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aitracker.run/og-image.jpg"
      }
    },
    "datePublished": "2025-12-12",
    "dateModified": "2025-12-12",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://aitracker.run/blog/how-to-pick-a-training-plan"
    },
    "keywords": "how to pick a training plan, best training plan for runners, personalized running plan, marathon training plan, AI training plan, custom running schedule, training plan selection, half marathon plan, 5k training plan, running plan for beginners"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I pick the right training plan for my running goals?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Choose a training plan that matches your current fitness level, target race distance, and available training time. Look for plans that include progressive overload, scheduled recovery weeks, variety in workout types, and personalization based on your running history. Avoid generic one-size-fits-all plans."
        }
      },
      {
        "@type": "Question",
        "name": "What makes a good training plan for runners?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A quality training plan includes: progressive weekly mileage increases (no more than 10-15% per week), scheduled recovery weeks every 3-4 weeks, variety of workout types (easy runs, tempo, intervals, long runs), personalized pacing based on your current fitness, and built-in taper period before race day."
        }
      },
      {
        "@type": "Question",
        "name": "Are AI-generated training plans better than generic plans?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, AI-generated plans analyze your actual running data to create truly personalized programs. They consider your baseline mileage, typical paces, recent training patterns, and recovery needs. Unlike generic plans, AI plans adapt to your progress and can adjust when you're tired or performing better than expected."
        }
      },
      {
        "@type": "Question",
        "name": "How long should my training plan be for a marathon?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most marathon training plans are 12-20 weeks long, depending on your current fitness level. Beginners typically need 16-20 weeks, while experienced runners may use 12-16 week plans. The key is having enough time to build your long run distance progressively without injury."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="How to Pick a Training Plan: Complete Guide 2025 | RunAnalytics"
        description="Learn how to choose the right training plan for your running goals. Discover why AI-personalized plans outperform generic schedules and how to find your perfect running program."
        keywords="how to pick a training plan, best training plan for runners, personalized running plan, marathon training plan, AI training plan, custom running schedule, training plan selection, half marathon plan, 5k training plan"
        url="https://aitracker.run/blog/how-to-pick-a-training-plan"
        type="article"
        structuredData={blogPostingSchema}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <article className="prose prose-lg max-w-none">
          {/* Article Header */}
          <div className="mb-8">
            <Badge className="mb-4" data-testid="badge-category">Training Plans</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal dark:text-white mb-4" data-testid="heading-title">
              How to Pick a Training Plan: Complete Guide to Finding Your Perfect Running Program
            </h1>
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 text-sm mb-6">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>December 12, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>15 min read</span>
              </div>
            </div>
            <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
              Choosing the right training plan can make or break your running goals. Whether you're preparing for your first 5K or chasing a marathon PR, this guide covers everything you need to know about picking a training plan that actually works for <strong>you</strong>—not some hypothetical "average" runner.
            </p>
          </div>

          <Separator className="my-8" />

          {/* Table of Contents */}
          <Card className="bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-slate-700 mb-12" data-testid="card-toc">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="#why-it-matters" className="block text-blue-600 dark:text-blue-400 hover:underline">1. Why Your Training Plan Choice Matters</a>
              <a href="#common-mistakes" className="block text-blue-600 dark:text-blue-400 hover:underline">2. 5 Common Mistakes When Choosing a Training Plan</a>
              <a href="#what-to-look-for" className="block text-blue-600 dark:text-blue-400 hover:underline">3. What to Look for in a Quality Training Plan</a>
              <a href="#generic-vs-personalized" className="block text-blue-600 dark:text-blue-400 hover:underline">4. Generic vs. Personalized Plans: Why It Matters</a>
              <a href="#ai-advantage" className="block text-blue-600 dark:text-blue-400 hover:underline">5. The AI Advantage: How Smart Plans Adapt to You</a>
              <a href="#training-plan-hq" className="block text-blue-600 dark:text-blue-400 hover:underline">6. RunAnalytics Training Plan HQ: Your Personal Coach</a>
              <a href="#getting-started" className="block text-blue-600 dark:text-blue-400 hover:underline">7. How to Get Started Today</a>
              <a href="#faq" className="block text-blue-600 dark:text-blue-400 hover:underline">8. Frequently Asked Questions</a>
            </CardContent>
          </Card>

          {/* Section 1: Why It Matters */}
          <section id="why-it-matters" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Target className="text-blue-600" size={32} />
              Why Your Training Plan Choice Matters
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              A training plan is more than just a schedule of runs—it's your roadmap to race day success. The right plan builds your fitness progressively, keeps you healthy, and peaks your performance exactly when you need it. The wrong plan? It can lead to injury, burnout, or showing up to race day undertrained.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card className="dark:border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">60%</div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    of runners who follow generic plans report injury or burnout
                  </p>
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">3x</div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    more likely to hit race goals with personalized training
                  </p>
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">12-15%</div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    max weekly mileage increase for safe progression
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">The Bottom Line:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  A well-designed training plan doesn't just tell you what to do—it understands <em>where you are now</em> and builds you up safely to <em>where you want to be</em>. That's why personalization isn't a luxury; it's essential.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Section 2: Common Mistakes */}
          <section id="common-mistakes" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <AlertTriangle className="text-yellow-600" size={32} />
              5 Common Mistakes When Choosing a Training Plan
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Before diving into what makes a great training plan, let's identify the pitfalls that trip up most runners:
            </p>

            <div className="space-y-4 mb-6">
              <Card className="border-l-4 border-l-red-500 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="font-bold text-lg mb-2 dark:text-white">Mistake #1: Following a Plan Designed for Someone Else</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        That sub-3 marathon plan your friend used? It's built for someone running 50+ miles per week. If you're at 25 miles, you'll either burn out or get injured trying to keep up.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="font-bold text-lg mb-2 dark:text-white">Mistake #2: Ignoring Your Current Fitness Level</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Starting a plan mid-cycle because "Week 8 looks about right for my fitness" skips crucial base-building phases and disrupts the progressive overload that makes training effective.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="font-bold text-lg mb-2 dark:text-white">Mistake #3: No Recovery Weeks Built In</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Plans without scheduled recovery weeks every 3-4 weeks accumulate fatigue until your body forces a break—usually through injury or illness.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="font-bold text-lg mb-2 dark:text-white">Mistake #4: All Easy Runs or All Hard Runs</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Polarized training works. Running every run at "medium effort" doesn't. Quality plans mix easy aerobic runs (80%) with targeted hard sessions (20%).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="font-bold text-lg mb-2 dark:text-white">Mistake #5: No Taper Before Race Day</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        The final 1-3 weeks before your race should reduce volume while maintaining intensity. Many runners keep training hard right up to race day and show up fatigued.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 3: What to Look For */}
          <section id="what-to-look-for" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={32} />
              What to Look for in a Quality Training Plan
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Whether you're evaluating a free plan online or considering a premium coaching service, these are the non-negotiables:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <TrendingUp className="text-green-600" size={20} />
                    Progressive Overload
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Weekly mileage should increase gradually—ideally 10-15% max. Look for plans that build volume in blocks, not straight-line increases every week.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <RefreshCcw className="text-blue-600" size={20} />
                    Scheduled Recovery
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Every 3-4 weeks should include a "down week" with reduced volume (typically 25% less). This is when your body actually adapts and gets stronger.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Activity className="text-purple-600" size={20} />
                    Workout Variety
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  A balanced mix: easy runs (most of your mileage), tempo runs, interval sessions, long runs, and rest days. Each serves a specific physiological purpose.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Target className="text-orange-600" size={20} />
                    Specificity for Your Race
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Training for a 5K vs. marathon requires different approaches. Your long run length, interval distances, and overall volume should match your target race.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Timer className="text-red-600" size={20} />
                    Proper Taper Period
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Marathons need 2-3 weeks of taper, half marathons 1-2 weeks. The plan should reduce volume while keeping some intensity to stay sharp.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Heart className="text-pink-600" size={20} />
                    Pacing Guidance
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Vague instructions like "run easy" aren't enough. Quality plans provide target paces based on your current fitness—not arbitrary numbers.
                </CardContent>
              </Card>
            </div>

            <Card className="bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">Quick Checklist:</p>
                    <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                      <li>✓ Starts at your current fitness level</li>
                      <li>✓ Increases mileage progressively (max 10-15%/week)</li>
                      <li>✓ Includes recovery weeks every 3-4 weeks</li>
                      <li>✓ Mixes easy runs, speed work, and long runs</li>
                      <li>✓ Has a taper phase before race day</li>
                      <li>✓ Provides specific pacing targets</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 4: Generic vs Personalized */}
          <section id="generic-vs-personalized" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <BarChart3 className="text-indigo-600" size={32} />
              Generic vs. Personalized Plans: Why It Matters
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Most free training plans you find online are designed for a hypothetical "average" runner. But you're not average—you have specific strengths, weaknesses, and constraints that generic plans can't address.
            </p>

            {/* Comparison Image */}
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <img 
                src={comparisonImage} 
                alt="Side-by-side comparison of generic training plan versus AI-personalized training plan showing the difference in workout variety and progressive structure" 
                className="w-full h-auto"
                data-testid="img-comparison"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="border-2 border-gray-300 dark:border-gray-600">
                <CardHeader className="bg-gray-100 dark:bg-gray-800">
                  <CardTitle className="text-xl dark:text-white">Generic Plans</CardTitle>
                  <CardDescription className="dark:text-gray-400">One-size-fits-all approach</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <XCircle className="text-red-500" size={16} />
                    <span>Assumes specific baseline fitness</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <XCircle className="text-red-500" size={16} />
                    <span>Fixed paces that may not match yours</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <XCircle className="text-red-500" size={16} />
                    <span>No adaptation based on progress</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <XCircle className="text-red-500" size={16} />
                    <span>Can't adjust when you're tired or sick</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <XCircle className="text-red-500" size={16} />
                    <span>Ignores your schedule constraints</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-500">
                <CardHeader className="bg-green-50 dark:bg-green-900/30">
                  <CardTitle className="text-xl dark:text-white">Personalized Plans</CardTitle>
                  <CardDescription className="dark:text-gray-400">Built specifically for you</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="text-green-500" size={16} />
                    <span>Starts from YOUR current fitness</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="text-green-500" size={16} />
                    <span>Paces based on your actual running data</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="text-green-500" size={16} />
                    <span>Adapts as your fitness improves</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="text-green-500" size={16} />
                    <span>Adjusts when life happens</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="text-green-500" size={16} />
                    <span>Fits your available training days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 5: AI Advantage */}
          <section id="ai-advantage" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Brain className="text-purple-600" size={32} />
              The AI Advantage: How Smart Plans Adapt to You
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Traditional training plans are static—they don't change based on how training is going. AI-powered plans bring the intelligence of a personal coach, analyzing your data and adjusting your training in real-time.
            </p>

            <div className="space-y-6 mb-8">
              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <UserCheck className="text-blue-600" size={24} />
                    Athlete Profile Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <p className="mb-3">
                    AI analyzes your last 12 weeks of Strava data to understand your:
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Current weekly mileage baseline</li>
                    <li>Typical easy, tempo, and hard paces</li>
                    <li>Average runs per week and preferred days</li>
                    <li>Longest recent run distance</li>
                    <li>Estimated VO2 max and race potential</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Shield className="text-green-600" size={24} />
                    Safety Guardrails
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <p className="mb-3">
                    Unlike human coaches who might push too hard, AI enforces evidence-based limits:
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Max 12% weekly mileage increase</li>
                    <li>Long runs capped at 32% of weekly volume</li>
                    <li>Automatic recovery weeks every 4 weeks</li>
                    <li>Appropriate taper based on race distance</li>
                    <li>Maximum 3 hard workouts per week</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <RefreshCcw className="text-orange-600" size={24} />
                    Real-Time Adaptation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <p className="mb-3">
                    The plan evolves based on how training is actually going:
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Low adherence? Volume automatically reduces to match reality</li>
                    <li>Feeling tired? One click softens next week's training</li>
                    <li>Running strong? Maintain or progress as planned</li>
                    <li>Missed workouts? Plan adjusts without derailing goals</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 6: Training Plan HQ */}
          <section id="training-plan-hq" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Sparkles className="text-yellow-500" size={32} />
              RunAnalytics Training Plan HQ: Your Personal Coach
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              We built Training Plan HQ to solve the problems we saw runners facing: generic plans that don't fit, no adaptation when life happens, and zero guidance on whether training is actually working.
            </p>

            <Card className="bg-gradient-to-r from-blue-600 to-teal-500 text-white mb-8">
              <CardContent className="py-8">
                <h3 className="text-2xl font-bold mb-4">What Makes Training Plan HQ Different</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Zap className="text-yellow-300 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold mb-1">Strava-Powered Personalization</h4>
                      <p className="text-white/90 text-sm">
                        Your plan is built from your actual running history—not guesswork about your fitness level.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="text-green-300 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold mb-1">Built-In Safety Guardrails</h4>
                      <p className="text-white/90 text-sm">
                        Every plan is validated against coaching best practices to prevent injury.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RefreshCcw className="text-blue-300 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold mb-1">Automatic Activity Linking</h4>
                      <p className="text-white/90 text-sm">
                        Your Strava runs automatically match to planned workouts—no manual logging required.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="text-pink-300 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold mb-1">Weekly Coach Notes</h4>
                      <p className="text-white/90 text-sm">
                        Each week includes AI-generated guidance explaining the focus and purpose.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white">How It Works</h3>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-lg dark:text-white">Connect Your Strava</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    We analyze your recent training to understand your current fitness, typical paces, and running patterns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-lg dark:text-white">Set Your Goal</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    Choose your target race (5K, 10K, half marathon, or marathon), race date, and goal time. Tell us which days you prefer to run.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-lg dark:text-white">Get Your Custom Plan</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    AI generates a periodized plan with proper build phases, recovery weeks, and taper—all validated by coaching guardrails.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <h4 className="font-bold text-lg dark:text-white">Train & Adapt</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    Your Strava activities sync automatically. Feeling tired? One click adjusts your plan. Running strong? Stay the course.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Getting Started CTA */}
          <section id="getting-started" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Zap className="text-orange-500" size={32} />
              How to Get Started Today
            </h2>
            
            <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xl">
              <CardContent className="py-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to Train Smarter?</h3>
                <p className="text-white/90 mb-6 max-w-2xl mx-auto">
                  Stop guessing with generic plans. Get a personalized training program built from your actual running data—free to start.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth">
                    <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-8" data-testid="button-cta-signup">
                      Create Free Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/training-plans">
                    <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100 font-bold px-8" data-testid="button-cta-plans">
                      Explore Training Plans
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 8: FAQ */}
          <section id="faq" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <MessageSquare className="text-blue-600" size={32} />
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">How do I pick the right training plan for my running goals?</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Choose a training plan that matches your current fitness level, target race distance, and available training time. Look for plans that include progressive overload, scheduled recovery weeks, variety in workout types, and personalization based on your running history. Avoid generic one-size-fits-all plans.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">What makes a good training plan for runners?</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  A quality training plan includes: progressive weekly mileage increases (no more than 10-15% per week), scheduled recovery weeks every 3-4 weeks, variety of workout types (easy runs, tempo, intervals, long runs), personalized pacing based on your current fitness, and a built-in taper period before race day.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Are AI-generated training plans better than generic plans?</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Yes, AI-generated plans analyze your actual running data to create truly personalized programs. They consider your baseline mileage, typical paces, recent training patterns, and recovery needs. Unlike generic plans, AI plans adapt to your progress and can adjust when you're tired or performing better than expected.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">How long should my training plan be for a marathon?</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Most marathon training plans are 12-20 weeks long, depending on your current fitness level. Beginners typically need 16-20 weeks, while experienced runners may use 12-16 week plans. The key is having enough time to build your long run distance progressively without injury.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Can I adjust my training plan if I miss workouts?</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  With RunAnalytics Training Plan HQ, absolutely. Our AI tracks your training adherence and automatically adjusts future weeks based on what you've actually completed. If you're falling behind, the plan adapts to get you back on track safely rather than forcing you to play catch-up.
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="my-8" />

          {/* Related Articles */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/blog/how-to-improve-running-pace" data-testid="link-related-pace">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <TrendingUp className="text-orange-600" size={20} />
                      How to Improve Running Pace
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Proven strategies to run faster with interval training, tempo runs, and strength work.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/blog/ai-running-coach-complete-guide-2025" data-testid="link-related-ai-coach">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Brain className="text-purple-600" size={20} />
                      AI Running Coach: Complete Guide
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Everything you need to know about AI-powered running coaches and how they work.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </section>

          {/* Final CTA */}
          <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 border-0 text-white">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-4">
                Stop Guessing. Start Training Smarter.
              </CardTitle>
              <CardDescription className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
                Get your personalized AI training plan built from your Strava data. Free to start, no credit card required.
              </CardDescription>
              <Link href="/auth">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 font-bold" data-testid="button-final-cta">
                  Get Your Free Plan
                </Button>
              </Link>
            </CardHeader>
          </Card>
        </article>
      </main>

      <Footer />
    </div>
  );
}
