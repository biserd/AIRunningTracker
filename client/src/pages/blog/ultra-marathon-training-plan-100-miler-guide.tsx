import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mountain,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  Sparkles,
  ChevronRight,
  Home,
  Footprints,
  Timer,
  Utensils,
  Brain,
  TrendingDown,
  Flag,
  Cpu
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function UltraMarathonTrainingPlanBlogPost() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "headline": "Ultra Marathon Training Plan: The Complete Guide to Training for a 100 Miler",
        "description": "Everything you need to know about creating an ultra marathon training plan for your first 100 mile race. Covers periodization, back-to-back long runs, fueling strategy, vertical gain training, tapering, and race day execution.",
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
        "datePublished": "2026-02-11",
        "dateModified": "2026-02-11",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "https://aitracker.run/blog/ultra-marathon-training-plan-100-miler-guide"
        },
        "keywords": "ultra marathon training plan, 100 mile training plan, ultra running training, ultramarathon training plan, how to train for 100 miler, ultra marathon periodization, back-to-back long runs, ultra fueling strategy, 100 mile race preparation"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How long should an ultra marathon training plan be?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "For a 100-mile race, plan for 24-30 weeks of structured training. This includes base building, progressive build phases, race-specific training with back-to-back long runs, a peak phase, and a 4-5 week taper."
            }
          },
          {
            "@type": "Question",
            "name": "What weekly mileage do I need for 100-mile training?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Build to a peak of 120-160 km (75-100 miles) per week. Start with a solid base of at least 70 km per week before beginning your ultra marathon training plan."
            }
          },
          {
            "@type": "Question",
            "name": "What are back-to-back long runs and why are they important?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Back-to-back long runs involve running long on Saturday (4-7 hours) followed by another long effort on Sunday (60-70% of Saturday). They teach your body to perform on pre-fatigued legs, simulating race conditions."
            }
          },
          {
            "@type": "Question",
            "name": "How should I taper for a 100-mile race?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A 100-mile taper should be 4-5 weeks, reducing volume by approximately 20% each week while maintaining some moderate intensity. This is significantly longer than a marathon taper."
            }
          },
          {
            "@type": "Question",
            "name": "Can AI help build an ultra marathon training plan?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. AI-powered platforms like RunAnalytics create personalized ultra marathon training plans with true periodization, time-based long runs, back-to-back scheduling, vertical gain targets, and fueling practice sessions that adapt based on your training progress."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="Ultra Marathon Training Plan: The Complete Guide to Training for a 100 Miler | RunAnalytics"
        description="Everything you need to know about creating an ultra marathon training plan for your first 100 mile race. Covers periodization, back-to-back long runs, fueling strategy, vertical gain training, tapering, and race day execution."
        keywords="ultra marathon training plan, 100 mile training plan, ultra running training, ultramarathon training plan, how to train for 100 miler, ultra marathon periodization, back-to-back long runs, ultra fueling strategy, 100 mile race preparation"
        url="https://aitracker.run/blog/ultra-marathon-training-plan-100-miler-guide"
        type="article"
        structuredData={structuredData}
      />
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/blog" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            Blog
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-medium">Ultra Marathon Training Plan</span>
        </nav>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                <Mountain className="mr-1 h-3 w-3" />
                Ultra Running
              </Badge>
              <Badge variant="outline">Training Plan</Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal dark:text-white mb-4">
              Ultra Marathon Training Plan: The Complete Guide to Training for a 100 Miler
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Everything you need to know about creating an ultra marathon training plan for your first 100 mile race. Covers periodization, back-to-back long runs, fueling strategy, vertical gain training, tapering, and race day execution.
            </p>

            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>February 11, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>20 min read</span>
              </div>
            </div>
          </header>

          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              What You'll Learn
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>How to structure a 24-30 week ultra marathon training plan with true periodization</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>The science behind back-to-back long runs and time-based training</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Race-tested fueling strategies for running 100 miles</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Mental preparation techniques used by successful ultra runners</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>How AI-powered training plans optimize your ultra preparation</span>
              </li>
            </ul>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Why an Ultra Marathon Training Plan is Different
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Marathon training revolves around speed, lactate threshold, and race-pace workouts. A 100-mile ultra marathon training plan demands something fundamentally different. The focus shifts from how fast you can run to how long you can keep moving—through fatigue, darkness, nausea, blisters, and self-doubt.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Ultra training emphasizes time on feet over pace, resilience over speed, and fueling under fatigue over negative splits. You'll need to practice running (and hiking) through the night, managing your nutrition for 20-30+ hours of continuous effort, and making decisions when your brain is foggy from sleep deprivation.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>A 100-miler isn't a long marathon—it's an entirely different sport.</strong> Your ultra marathon training plan must reflect that reality from day one, or you'll find yourself unprepared when the real challenges begin around mile 60.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Prerequisites: Are You Ready for 100 Miles?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Before committing to a 100-mile ultra marathon training plan, honestly assess whether you meet these prerequisites. Jumping to 100 miles too soon is the fastest path to injury, DNF, or burnout.
            </p>

            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">70+ km/week base for 6 months</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">A consistent aerobic foundation is non-negotiable before starting structured ultra training.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">50K or 50-mile race experience</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">You need to know how your body responds to extended efforts and aid station logistics.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Comfortable with 4+ hour long runs</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">If 3 hours feels like your limit, build that endurance before tackling 100-mile training.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Regular strength training</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Hip, glute, and core strength prevents the biomechanical breakdown that causes late-race injuries.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">10-15 hours/week commitment for 24-30 weeks</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Ultra training is a significant time investment. Make sure your life supports it.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              The recommended progression is <strong>50K → 50-mile → 100-mile</strong>. Each step teaches you something the previous distance couldn't—and those lessons are what keep you moving when things get hard at mile 70.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              How to Structure Your Ultra Marathon Training Plan
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              A well-structured ultra marathon training plan for 100 miles includes these key components:
            </p>
            <ul className="space-y-3 mb-6 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>24-30 week duration</strong> with progressive phases building toward race day</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Peak weekly volume of 120-160 km</strong> (75-100 miles), reached gradually</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Time-based long runs</strong> (3-7 hours) rather than distance-based</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Back-to-back long runs</strong> on consecutive days to simulate race fatigue</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Vertical training</strong> for trail races with targeted elevation gain</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Fueling practice sessions</strong> integrated into every long run</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Recovery weeks every 3-4 weeks</strong> to allow adaptation and prevent overtraining</span>
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>The biggest mistake aspiring ultra runners make?</strong> Trying to replicate marathon training at higher volume. More miles at marathon effort will break you. Ultra training is about building durability at easy effort, with strategic harder sessions sprinkled in.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Periodization: The 6 Phases of Ultra Training
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              True periodization is what separates a training plan from a random collection of runs. Each phase has a specific purpose, and skipping or rushing phases leads to undertrained or overtrained athletes on race day.
            </p>

            <div className="space-y-6">
              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold">1</span>
                    <h3 className="font-bold text-charcoal dark:text-white text-lg">Base Phase (6-8 weeks)</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    Build your aerobic foundation with easy-effort running. Long runs of 2-3 hours at conversational pace. The goal is consistent volume without intensity—teaching your body to burn fat efficiently and strengthening tendons and ligaments for the demands ahead.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 rounded-full text-sm font-bold">2</span>
                    <h3 className="font-bold text-charcoal dark:text-white text-lg">Build 1 (4-6 weeks)</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    Introduce tempo efforts and sustained climbs. Volume increases by 10-12% per week. Long runs extend to 3-4 hours. This phase begins to stress your aerobic system beyond base levels while maintaining an overall easy training load.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold">3</span>
                    <h3 className="font-bold text-charcoal dark:text-white text-lg">Build 2 / Race-Specific (4-6 weeks)</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    Back-to-back long runs begin. Fueling practice becomes a priority on every long effort. Simulate race-day conditions: run at the time of day your race starts, practice with your race gear, and match the terrain profile. Long runs reach 4-6 hours.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 rounded-full text-sm font-bold">4</span>
                    <h3 className="font-bold text-charcoal dark:text-white text-lg">Peak (2-3 weeks)</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    Highest volume weeks with your longest runs of 5-7 hours (50-60 km). The most demanding back-to-back weekends happen here. This is where you prove to yourself that you can handle the distance—but don't overdo it. You can't build more fitness this close to race day.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold">5</span>
                    <h3 className="font-bold text-charcoal dark:text-white text-lg">Taper (4-5 weeks)</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    Reduce volume by approximately 20% each week while maintaining some moderate intensity. A 100-mile taper is significantly longer than a marathon taper—your body needs extra time to fully absorb months of heavy training and arrive at the start line fresh.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 rounded-full text-sm font-bold">6</span>
                    <h3 className="font-bold text-charcoal dark:text-white text-lg">Recovery (2-3 weeks post-race)</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                    Take 1-2 weeks completely off from running. Easy walking and gentle movement only. Return to easy running gradually. Full physiological recovery from a 100-miler takes 4-8 weeks—don't rush back regardless of how you feel.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Back-to-Back Long Runs: The Ultra Secret Weapon
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Back-to-back (B2B) long runs are the single most important element of your ultra marathon training plan. They simulate the fatigue of running 20-30 hours by teaching your body to perform on pre-fatigued legs—something a single long run can never replicate.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Here's how to structure them effectively:
            </p>

            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <Timer className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Schedule every 2-3 weeks</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Begin in Build 2 and continue through Peak phase. Allow recovery between B2B weekends.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <Footprints className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Saturday: Primary long run (4-7 hours)</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">This is your big effort. Practice fueling, carry your race gear, and match race terrain as closely as possible.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <Footprints className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Sunday: Secondary long run (60-70% of Saturday)</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Start on tired legs. This is where the magic happens—your body learns to keep going when everything says stop.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg">
                  <Utensils className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-charcoal dark:text-white">Practice fueling on both days</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Your stomach needs training too. Test gels, real food, electrolytes, and aid station simulation.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              <strong>Time-based vs. distance-based long runs:</strong> Ultra training should be measured in hours, not kilometers. A 5-hour long run on hilly trails might cover 35 km, while the same 5 hours on flat road covers 50 km. Both provide similar training stress. Time on feet is what matters for 100-mile preparation.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Vertical Gain and Terrain Training
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Most 100-mile races are on trails with significant elevation change. Your ultra marathon training plan must include progressive vertical gain targets to prepare your body for sustained climbing and technical descending.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-3">Weekly Vertical Targets</h3>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2"><Mountain className="h-4 w-4 text-emerald-600" /> Base: 1,000 m/week</li>
                    <li className="flex items-center gap-2"><Mountain className="h-4 w-4 text-emerald-600" /> Build 1: 1,500-2,000 m/week</li>
                    <li className="flex items-center gap-2"><Mountain className="h-4 w-4 text-emerald-600" /> Build 2: 2,000-3,000 m/week</li>
                    <li className="flex items-center gap-2"><Mountain className="h-4 w-4 text-emerald-600" /> Peak: 3,000-5,000 m/week</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-3">Key Training Elements</h3>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-teal-600" /> Hill repeats for climbing power</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-teal-600" /> Sustained 30-60 min climbs</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-teal-600" /> Downhill training (quad preservation)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-teal-600" /> Power hiking at 4-5 km/h</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <strong>Don't neglect downhill training.</strong> In a 100-miler, your quads will take enormous punishment on descents. Eccentric loading from downhill running causes "quad destruction"—the deep muscle damage that makes stairs impossible the next day. Train your quads to handle this by progressively increasing downhill volume.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              If your race allows trekking poles, practice with them extensively. Power hiking at 4-5 km/h with poles on steep climbs is more efficient than trying to run everything, and poles save your legs for the flats and descents.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Fueling Strategy for 100 Miles
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Fueling is the most common reason runners DNF a 100-miler. Your stomach is a muscle that needs training just like your legs. Get this wrong and no amount of fitness will save you.
            </p>

            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-charcoal dark:text-white mb-4">The Numbers You Need to Know</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Calorie Burn</p>
                  <p className="text-lg font-bold text-charcoal dark:text-white">8,000-12,000 calories</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Intake Target</p>
                  <p className="text-lg font-bold text-charcoal dark:text-white">200-300 cal/hour</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Carbohydrates</p>
                  <p className="text-lg font-bold text-charcoal dark:text-white">60-90 g/hour</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Fluid Intake</p>
                  <p className="text-lg font-bold text-charcoal dark:text-white">500-800 ml/hour</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg sm:col-span-2">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Sodium</p>
                  <p className="text-lg font-bold text-charcoal dark:text-white">500-1,000 mg/hour</p>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Start practicing fueling in Build 1. Test everything you plan to eat on race day—gels, chews, real food like sandwiches, potatoes, and broth. Simulate aid station eating by stopping briefly during long runs. Practice eating at night when your stomach is most vulnerable.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Record everything in a fueling log. Track what you ate, when, and how your stomach responded. By race day, you should know exactly what works for your body at every stage of fatigue.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>The golden rule of ultra fueling:</strong> Eat before you're hungry, drink before you're thirsty. By the time you feel hunger or thirst, you're already behind—and catching up after mile 50 is nearly impossible.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Mental Preparation for Ultra Running
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Running 100 miles is at least 50% mental. Your body will want to quit many times. The runners who finish are the ones who have trained their minds as deliberately as their legs.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Segment the race:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Don't think about 100 miles. Think about getting to the next aid station. Break the race into 10-15 mini races of 6-10 miles each.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Embrace low points:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Every 100-miler has terrible lows. Expect them, accept them, and know that they pass. The worst moments often come right before a breakthrough.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Practice discomfort:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Run in bad weather, run when tired, run at night. The more uncomfortable situations you face in training, the less they'll shock you on race day.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold flex-shrink-0">4</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Visualization and mantras:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Rehearse crossing the finish line. Develop 2-3 personal mantras for the dark moments. "Relentless forward progress" is a classic for a reason.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full text-sm font-bold flex-shrink-0">5</span>
                <div>
                  <strong className="text-charcoal dark:text-white">Crew and pacer strategy:</strong>
                  <span className="text-gray-600 dark:text-gray-300"> Your crew keeps you moving when you want to quit. Your pacer keeps you company through the darkest hours. Plan their roles carefully.</span>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              <strong>The key mental skill:</strong> Learning to separate pain from injury. Pain is normal and expected in a 100-miler—everything will hurt. Injury is structural damage that worsens with each step. Knowing the difference keeps you both safe and moving forward.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Tapering for Your 100 Mile Race
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              A 100-mile taper is 4-5 weeks—significantly longer than a marathon taper. Your body needs this extended recovery period to fully absorb the massive training load of the preceding months.
            </p>

            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-charcoal dark:text-white mb-4">Example Taper Progression (from 150 km peak week)</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">Week 1:</span>
                  <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-6 relative">
                    <div className="bg-emerald-500 dark:bg-emerald-600 rounded-full h-6 flex items-center justify-end pr-3" style={{ width: "80%" }}>
                      <span className="text-xs font-bold text-white">120 km</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">Week 2:</span>
                  <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-6 relative">
                    <div className="bg-emerald-500 dark:bg-emerald-600 rounded-full h-6 flex items-center justify-end pr-3" style={{ width: "64%" }}>
                      <span className="text-xs font-bold text-white">96 km</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">Week 3:</span>
                  <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-6 relative">
                    <div className="bg-emerald-500 dark:bg-emerald-600 rounded-full h-6 flex items-center justify-end pr-3" style={{ width: "51%" }}>
                      <span className="text-xs font-bold text-white">77 km</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">Week 4:</span>
                  <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-6 relative">
                    <div className="bg-emerald-500 dark:bg-emerald-600 rounded-full h-6 flex items-center justify-end pr-3" style={{ width: "41%" }}>
                      <span className="text-xs font-bold text-white">61 km</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">Race Week:</span>
                  <div className="flex-1 bg-emerald-200 dark:bg-emerald-800 rounded-full h-6 relative">
                    <div className="bg-emerald-500 dark:bg-emerald-600 rounded-full h-6 flex items-center justify-end pr-3" style={{ width: "20%" }}>
                      <span className="text-xs font-bold text-white">30 km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Maintain 1-2 moderate-effort sessions per week during the taper to keep your legs sharp. Your final long run should be 3-4 weeks before race day. Race week should be very easy—short jogs and walking only.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Trust the process.</strong> You'll feel restless, sluggish, and doubt your fitness during the taper. This is normal. The fitness is already in your legs—you just need to let your body absorb it.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              Race Day Execution
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              A 100-mile race unfolds in four distinct phases. Understanding each phase helps you make better decisions when fatigue compromises your judgment.
            </p>

            <div className="space-y-6">
              <Card className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Miles 0-30: Bank Patience</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Start slower than you think you should. Walk uphills from the very first climb—this isn't a sign of weakness, it's a strategy. Eat and drink on a strict schedule regardless of how you feel. Your only job in this phase is to not make mistakes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 dark:border-l-teal-400">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Miles 30-60: The Real Race Begins</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    This is where your training starts to matter. Maintain your fueling schedule even as your appetite fades. Keep effort conversational. When you pass runners who went out too fast, don't speed up—stay disciplined. Trust your back-to-back training.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Miles 60-80: The Dark Place</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Nausea, blisters, chafing, muscle cramps, and profound doubt are all normal. This is the phase where most runners drop. Keep moving—even if it's a walk. Think only about the next aid station. Don't make any decisions about dropping when you're in this phase.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 dark:border-l-teal-400">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Miles 80-100: Finding Another Gear</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Something remarkable happens when you know the end is within reach. Energy you didn't know you had unlocks. The pain doesn't disappear, but it becomes manageable. Let the emotion of what you're accomplishing carry you. Embrace every step of the final miles.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white mb-4">
              AI-Powered Ultra Marathon Training Plans
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Building a 24-30 week ultra marathon training plan manually is complex. You need to balance volume progression, recovery timing, back-to-back scheduling, vertical targets, and fueling practice—all while adapting to how your body responds week by week.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This is where AI-powered training platforms like RunAnalytics transform your preparation:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                    <Cpu className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">True Periodization</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    AI builds all 6 phases with proper volume progression, recovery weeks, and phase-appropriate workouts tailored to your fitness level and race goals.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Time-Based Long Runs</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Long runs prescribed in hours, not kilometers, ensuring appropriate training stress regardless of terrain or conditions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                    <Footprints className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">B2B Scheduling</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Automatic back-to-back long run placement with proper recovery, progressive loading, and integration with your available training days.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                    <Mountain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Vertical Gain Targets</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Weekly elevation gain targets that progress through each phase, matched to your race profile and available terrain.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                    <Utensils className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Fueling Practice Sessions</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Structured fueling targets integrated into long runs with tracking and adaptation based on your stomach's response.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-teal-200 dark:border-teal-800">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-charcoal dark:text-white mb-2">Adaptive Coaching</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Your plan adapts based on actual training data—adjusting volume, intensity, and recovery when your body needs it, with clear explanations for every phase change.
                  </p>
                </CardContent>
              </Card>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              Ready to build your personalized ultra marathon training plan? RunAnalytics creates AI-powered plans with true periodization, back-to-back scheduling, and adaptive coaching that evolves with your training.
            </p>
          </section>
        </article>

        <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 border-0 text-white mt-12">
          <CardHeader className="text-center py-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to Start Your Ultra Marathon Training Plan?
            </h2>
            <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
              Build an AI-powered, personalized ultra marathon training plan with true periodization, back-to-back long runs, vertical gain targets, and fueling strategies—all adapted to your fitness level and race goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/training-plans">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-gray-100 font-semibold px-8">
                  Create Your Plan
                </Button>
              </Link>
              <Link href="/blog">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-semibold px-8">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </main>

      <Footer />
    </div>
  );
}