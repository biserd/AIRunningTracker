import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Calendar, 
  Clock, 
  TrendingUp,
  Target,
  Dumbbell,
  Heart,
  Activity,
  AlertCircle,
  CheckCircle,
  Timer,
  Footprints,
  Brain,
  ArrowRight,
  BarChart3
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function ImproveRunningPace() {
  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "How to Improve Running Pace: Complete Guide",
    "description": "Discover proven strategies to improve your running pace. Learn about interval training, tempo runs, strength training, proper pacing strategies, and common mistakes to avoid. Backed by science and tested by elite coaches.",
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
    "datePublished": "2025-11-21",
    "dateModified": "2025-11-21",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://aitracker.run/blog/how-to-improve-running-pace"
    },
    "keywords": "improve running pace, run faster, speed training, interval training, tempo runs, running performance, increase running speed, pace training"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="How to Improve Running Pace: Complete Guide 2025 | RunAnalytics"
        description="Discover proven strategies to improve your running pace. Learn about interval training, tempo runs, strength training, proper pacing strategies, and common mistakes to avoid. Backed by science and tested by elite coaches."
        keywords="improve running pace, run faster, speed training, interval training, tempo runs, running performance, increase running speed, pace training"
        url="https://aitracker.run/blog/how-to-improve-running-pace"
        type="article"
        structuredData={blogPostingSchema}
      />
      <AppHeader />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <article className="prose prose-lg max-w-none">
          {/* Article Header */}
          <div className="mb-8">
            <Badge className="mb-4">Training Tips</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal dark:text-white mb-4">
              How to Improve Running Pace: Complete Guide
            </h1>
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 text-sm mb-6">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>November 21, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>12 min read</span>
              </div>
            </div>
            <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
              Want to run faster? This comprehensive guide covers proven strategies and training methods to improve your running pace, backed by exercise science and tested by elite coaches. Whether you're a beginner or experienced runner, you'll find actionable advice to help you reach your speed goals.
            </p>
          </div>

          <Separator className="my-8" />

          {/* Table of Contents */}
          <Card className="bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-slate-700 mb-12">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="#understanding-pace" className="block text-blue-600 dark:text-blue-400 hover:underline">1. Understanding Running Pace</a>
              <a href="#interval-training" className="block text-blue-600 dark:text-blue-400 hover:underline">2. Interval Training</a>
              <a href="#tempo-runs" className="block text-blue-600 dark:text-blue-400 hover:underline">3. Tempo Runs</a>
              <a href="#strength-training" className="block text-blue-600 dark:text-blue-400 hover:underline">4. Strength Training for Runners</a>
              <a href="#proper-pacing" className="block text-blue-600 dark:text-blue-400 hover:underline">5. Proper Pacing Strategies</a>
              <a href="#common-mistakes" className="block text-blue-600 dark:text-blue-400 hover:underline">6. Common Mistakes to Avoid</a>
              <a href="#training-plans" className="block text-blue-600 dark:text-blue-400 hover:underline">7. Sample Training Plans</a>
              <a href="#nutrition-recovery" className="block text-blue-600 dark:text-blue-400 hover:underline">8. Nutrition & Recovery</a>
            </CardContent>
          </Card>

          {/* Main Content */}
          <section id="understanding-pace" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Activity className="text-blue-600" size={32} />
              Understanding Running Pace
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Before diving into training methods, it's crucial to understand what running pace actually means and why improving it requires a multifaceted approach. Your running pace is determined by several physiological factors:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Heart className="text-red-600" size={20} />
                    VO2 Max
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Your body's maximum oxygen consumption capacity. Higher VO2 max means your muscles can work harder for longer, directly impacting pace.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Zap className="text-yellow-600" size={20} />
                    Lactate Threshold
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  The intensity at which lactic acid accumulates faster than your body can clear it. Raising this threshold lets you maintain faster paces longer.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Dumbbell className="text-purple-600" size={20} />
                    Running Economy
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  How efficiently you use oxygen at a given pace. Better economy means using less energy to maintain the same speed.
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                    <Footprints className="text-green-600" size={20} />
                    Neuromuscular Power
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  Your ability to recruit muscle fibers quickly and efficiently. Stronger neuromuscular connections translate to faster turnover and speed.
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">💡 Key Insight:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  To improve pace, you need to work on ALL these factors through varied training. There's no single "magic workout" - it's the combination of different training stimuli that creates lasting improvements.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="interval-training" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Zap className="text-yellow-600" size={32} />
              Interval Training: The Speed Builder
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Interval training involves alternating periods of high-intensity running with recovery periods. It's one of the most effective methods for improving pace because it pushes your body beyond comfortable limits in controlled bursts.
            </p>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-4">Why Intervals Work</h3>
              <div className="space-y-4">
                <Card className="border-l-4 border-l-green-600 dark:border-l-green-500">
                  <CardContent className="pt-6">
                    <h4 className="font-bold mb-2 dark:text-white">Increases VO2 Max</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      High-intensity intervals force your cardiovascular system to deliver oxygen more efficiently, expanding your aerobic capacity.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600 dark:border-l-blue-500">
                  <CardContent className="pt-6">
                    <h4 className="font-bold mb-2 dark:text-white">Improves Speed Endurance</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Repeated fast efforts teach your body to maintain higher speeds even as fatigue sets in.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-600 dark:border-l-purple-500">
                  <CardContent className="pt-6">
                    <h4 className="font-bold mb-2 dark:text-white">Enhances Running Economy</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Running at faster paces improves your neuromuscular coordination and biomechanical efficiency.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-4">Types of Interval Workouts</h3>
              
              <div className="space-y-6">
                <Card className="bg-white dark:bg-slate-800 shadow-lg">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Short Intervals (200m - 400m)</CardTitle>
                    <CardDescription className="dark:text-gray-400">Speed and neuromuscular power</CardDescription>
                  </CardHeader>
                  <CardContent className="text-gray-700 dark:text-gray-300">
                    <p className="mb-3"><strong>Workout:</strong> 10-12 x 400m at 5K race pace with 200m jog recovery</p>
                    <p className="mb-3"><strong>Purpose:</strong> Develops top-end speed and teaches your body to run fast efficiently</p>
                    <p><strong>Frequency:</strong> Once per week during speed-focused training blocks</p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 shadow-lg">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Mid-Distance Intervals (800m - 1200m)</CardTitle>
                    <CardDescription className="dark:text-gray-400">VO2 max development</CardDescription>
                  </CardHeader>
                  <CardContent className="text-gray-700 dark:text-gray-300">
                    <p className="mb-3"><strong>Workout:</strong> 6 x 1000m at 10K pace with 90 seconds rest</p>
                    <p className="mb-3"><strong>Purpose:</strong> Maximizes aerobic power and improves lactate threshold</p>
                    <p><strong>Frequency:</strong> Once per week during build phase</p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 shadow-lg">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Long Intervals (1600m - 2000m)</CardTitle>
                    <CardDescription className="dark:text-gray-400">Aerobic capacity and mental toughness</CardDescription>
                  </CardHeader>
                  <CardContent className="text-gray-700 dark:text-gray-300">
                    <p className="mb-3"><strong>Workout:</strong> 4-5 x 1 mile at half-marathon pace with 2-3 minutes rest</p>
                    <p className="mb-3"><strong>Purpose:</strong> Builds stamina at faster paces, crucial for distance runners</p>
                    <p><strong>Frequency:</strong> Once every 10-14 days</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 mt-1 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">Important:</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Always warm up for 10-15 minutes with easy running before intervals, and cool down for 10 minutes afterward. Skipping warm-up significantly increases injury risk.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="tempo-runs" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Timer className="text-orange-600" size={32} />
              Tempo Runs: Building Sustained Speed
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Tempo runs, also called threshold runs, are sustained efforts at a "comfortably hard" pace. They're the secret weapon for improving your lactate threshold - the key to maintaining faster paces for longer distances.
            </p>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-4">What is Tempo Pace?</h3>
              <Card className="bg-white dark:bg-slate-800 shadow-lg mb-6">
                <CardContent className="pt-6">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Tempo pace is approximately your current half-marathon race pace, or about 25-30 seconds per mile slower than your 10K pace. It should feel "comfortably hard" - you could speak in short sentences but wouldn't want to hold a conversation.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">How to Find Your Tempo Pace:</p>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                      <li>• Use our <Link href="/tools/race-predictor" className="text-blue-600 dark:text-blue-400 hover:underline">Race Predictor tool</Link> to estimate your half-marathon pace</li>
                      <li>• Run at a pace where you're breathing hard but controlled</li>
                      <li>• Heart rate should be 85-90% of maximum</li>
                      <li>• Effort level of 7-8 out of 10</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-4">Tempo Run Variations</h3>
              
              <div className="space-y-6">
                <Card className="dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Classic Tempo (20-40 minutes)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-gray-700 dark:text-gray-300">
                    <p className="mb-3"><strong>Structure:</strong> Warm-up + 20-40 min at tempo pace + cool-down</p>
                    <p className="mb-3"><strong>Example:</strong> 2 miles easy, 5 miles at tempo pace, 1 mile easy</p>
                    <p><strong>Best for:</strong> Building lactate threshold in experienced runners</p>
                  </CardContent>
                </Card>

                <Card className="dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Cruise Intervals</CardTitle>
                  </CardHeader>
                  <CardContent className="text-gray-700 dark:text-gray-300">
                    <p className="mb-3"><strong>Structure:</strong> 3-5 x 5-8 min at tempo pace with 1-2 min recovery jog</p>
                    <p className="mb-3"><strong>Example:</strong> Warm-up, 4 x 6 min at tempo pace (1 min jog between), cool-down</p>
                    <p><strong>Best for:</strong> Runners building up to longer tempo runs, or as harder workout</p>
                  </CardContent>
                </Card>

                <Card className="dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Progression Tempo</CardTitle>
                  </CardHeader>
                  <CardContent className="text-gray-700 dark:text-gray-300">
                    <p className="mb-3"><strong>Structure:</strong> Start below tempo pace, gradually increase to above tempo pace</p>
                    <p className="mb-3"><strong>Example:</strong> 6 miles starting at marathon pace, ending at 10K pace</p>
                    <p><strong>Best for:</strong> Race simulation and mental toughness</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="pt-6">
                <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">🎯 Pro Tip:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  Tempo runs should feel challenging but sustainable. If you're struggling to maintain pace or completely exhausted afterward, you're going too fast. The goal is consistent, controlled speed - not all-out effort.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="strength-training" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Dumbbell className="text-purple-600" size={32} />
              Strength Training for Runners
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Many runners overlook strength training, but it's crucial for improving pace. Stronger muscles generate more power with each stride, improve running economy, and reduce injury risk.
            </p>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-4">Key Benefits</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="dark:border-slate-700">
                  <CardContent className="pt-6">
                    <CheckCircle className="text-green-600 mb-3" size={24} />
                    <h4 className="font-bold mb-2 dark:text-white">Increased Power Output</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Stronger muscles push off the ground with more force, propelling you forward faster with each stride.
                    </p>
                  </CardContent>
                </Card>

                <Card className="dark:border-slate-700">
                  <CardContent className="pt-6">
                    <CheckCircle className="text-green-600 mb-3" size={24} />
                    <h4 className="font-bold mb-2 dark:text-white">Better Running Economy</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Efficient muscle recruitment means you use less energy to maintain the same pace.
                    </p>
                  </CardContent>
                </Card>

                <Card className="dark:border-slate-700">
                  <CardContent className="pt-6">
                    <CheckCircle className="text-green-600 mb-3" size={24} />
                    <h4 className="font-bold mb-2 dark:text-white">Injury Prevention</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Strong muscles, tendons, and ligaments better absorb the impact forces of running.
                    </p>
                  </CardContent>
                </Card>

                <Card className="dark:border-slate-700">
                  <CardContent className="pt-6">
                    <CheckCircle className="text-green-600 mb-3" size={24} />
                    <h4 className="font-bold mb-2 dark:text-white">Improved Form</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      Core strength maintains proper posture even when fatigued, preventing form breakdown.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-4">Essential Exercises for Runners</h3>
              
              <Card className="bg-white dark:bg-slate-800 shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="dark:text-white">Runner-Specific Strength Routine (2-3x per week)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 text-gray-700 dark:text-gray-300">
                    <div>
                      <h4 className="font-bold mb-2 dark:text-white">Lower Body Power</h4>
                      <ul className="space-y-2">
                        <li>• <strong>Single-leg squats:</strong> 3 sets of 10-12 per leg (builds stability and power)</li>
                        <li>• <strong>Romanian deadlifts:</strong> 3 sets of 12 (strengthens hamstrings and glutes)</li>
                        <li>• <strong>Box jumps:</strong> 3 sets of 8 (develops explosive power)</li>
                        <li>• <strong>Calf raises:</strong> 3 sets of 15 (strengthens push-off)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 dark:text-white">Core Stability</h4>
                      <ul className="space-y-2">
                        <li>• <strong>Planks:</strong> 3 sets of 45-60 seconds (maintains posture)</li>
                        <li>• <strong>Side planks:</strong> 3 sets of 30 seconds per side (lateral stability)</li>
                        <li>• <strong>Dead bugs:</strong> 3 sets of 10 per side (core control)</li>
                        <li>• <strong>Bird dogs:</strong> 3 sets of 10 per side (balance and coordination)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 dark:text-white">Plyometrics</h4>
                      <ul className="space-y-2">
                        <li>• <strong>Jump rope:</strong> 3 sets of 1 minute (improves cadence and foot speed)</li>
                        <li>• <strong>Bounding:</strong> 3 sets of 30 meters (develops stride power)</li>
                        <li>• <strong>High knees:</strong> 3 sets of 30 seconds (improves turnover)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">⚡ Quick Wins:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  If you're short on time, prioritize single-leg exercises and plyometrics. These provide the biggest bang for your buck in terms of running-specific strength gains.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="proper-pacing" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Target className="text-green-600" size={32} />
              Proper Pacing Strategies
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Improving your pace isn't just about running faster—it's about running smarter. Proper pacing strategies help you train more effectively and race to your potential.
            </p>

            <div className="space-y-6 mb-8">
              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="dark:text-white">80/20 Rule</CardTitle>
                  <CardDescription className="dark:text-gray-400">The foundation of smart training</CardDescription>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <p className="mb-3">
                    Elite runners do 80% of their training at easy pace and only 20% at moderate-to-hard intensity. This approach allows for harder quality workouts while minimizing injury risk and overtraining.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <p className="font-bold mb-2 dark:text-white">Your Easy Pace Should Be:</p>
                    <ul className="space-y-1">
                      <li>• Conversational - you can speak in complete sentences</li>
                      <li>• 60-75 seconds per mile SLOWER than your tempo pace</li>
                      <li>• Around 65-75% of maximum heart rate</li>
                      <li>• Feeling comfortable and sustainable</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="dark:text-white">Progressive Overload</CardTitle>
                  <CardDescription className="dark:text-gray-400">Gradual, consistent improvement</CardDescription>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <p className="mb-3">
                    Don't try to improve everything at once. Focus on one aspect at a time: increase weekly mileage by no more than 10% per week, or increase workout intensity while keeping mileage stable.
                  </p>
                  <p>
                    Your body needs time to adapt to new training stimuli. Rushing the process leads to injury, not improvement.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="dark:text-white">Negative Splits</CardTitle>
                  <CardDescription className="dark:text-gray-400">Finish strong strategy</CardDescription>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <p className="mb-3">
                    Practice running the second half of your workout or race faster than the first half. This teaches pacing discipline and builds mental strength.
                  </p>
                  <p>
                    Try it on long runs: run the first half at easy pace, then gradually pick up the pace in the second half. Use tools like <Link href="/ai-running-coach" className="text-blue-600 dark:text-blue-400 hover:underline">RunAnalytics AI Coach</Link> to analyze your pacing patterns.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="common-mistakes" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={32} />
              Common Mistakes to Avoid
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Knowing what NOT to do is just as important as knowing what TO do. Here are the most common mistakes that prevent runners from improving their pace:
            </p>

            <div className="space-y-6">
              <Card className="border-l-4 border-l-red-600 dark:border-l-red-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 dark:text-white">Running Too Hard on Easy Days</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>The Problem:</strong> Turning every run into a workout prevents proper recovery and leads to chronic fatigue.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>The Fix:</strong> Embrace easy running. If you can't hold a conversation, slow down. Easy days should feel genuinely easy.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-600 dark:border-l-red-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 dark:text-white">Doing Too Many Hard Workouts</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>The Problem:</strong> More is not always better. Too much intensity without adequate recovery leads to overtraining and injury.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>The Fix:</strong> Limit hard workouts to 2-3 per week maximum. Space them out with easy days and rest days.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-600 dark:border-l-red-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 dark:text-white">Neglecting Recovery</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>The Problem:</strong> Improvements happen during recovery, not during workouts. Poor sleep and nutrition sabotage your training.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>The Fix:</strong> Prioritize 7-9 hours of sleep, eat enough protein and carbohydrates, and take at least one complete rest day per week.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-600 dark:border-l-red-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 dark:text-white">Ignoring Form and Technique</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>The Problem:</strong> Poor running form wastes energy and increases injury risk, no matter how hard you train.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>The Fix:</strong> Focus on quick cadence (170-180 steps per minute), landing under your center of mass, and relaxed shoulders. Use our <Link href="/tools/cadence-analyzer" className="text-blue-600 dark:text-blue-400 hover:underline" data-testid="link-inline-cadence">Cadence Analyzer</Link> to track your step rate patterns. Consider video analysis or working with a coach.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-600 dark:border-l-red-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 dark:text-white">Not Having a Plan</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>The Problem:</strong> Random workouts without progression lead to inconsistent results and wasted effort.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>The Fix:</strong> Follow a structured training plan that builds systematically toward your goal. Use <Link href="/ai-running-coach" className="text-blue-600 dark:text-blue-400 hover:underline">AI-powered coaching</Link> to get personalized guidance.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="training-plans" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <BarChart3 className="text-blue-600" size={32} />
              Sample Training Plans
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
              Here are example weekly training structures for different experience levels. Adjust based on your current fitness and goals.
            </p>

            <div className="space-y-8">
              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="dark:text-white">Beginner (Building Base)</CardTitle>
                  <CardDescription className="dark:text-gray-400">Focus: Consistency and aerobic development</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Monday:</strong> Rest or 20 min easy walk</p>
                    <p><strong>Tuesday:</strong> 30 min easy run</p>
                    <p><strong>Wednesday:</strong> 20 min easy run + strength training</p>
                    <p><strong>Thursday:</strong> 30 min easy run</p>
                    <p><strong>Friday:</strong> Rest</p>
                    <p><strong>Saturday:</strong> 6-8 x 30 seconds faster (not hard) with 90 sec easy between</p>
                    <p><strong>Sunday:</strong> 40-50 min long easy run</p>
                  </div>
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Total Weekly Mileage:</strong> 15-20 miles | <strong>Key Focus:</strong> Build aerobic base before adding intensity
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="dark:text-white">Intermediate (Speed Development)</CardTitle>
                  <CardDescription className="dark:text-gray-400">Focus: Adding structured speed work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Monday:</strong> Rest or 30 min easy + strength</p>
                    <p><strong>Tuesday:</strong> 45 min easy run</p>
                    <p><strong>Wednesday:</strong> Intervals: 8 x 800m at 10K pace (2 min rest)</p>
                    <p><strong>Thursday:</strong> 40 min easy run</p>
                    <p><strong>Friday:</strong> 30 min easy run + strides</p>
                    <p><strong>Saturday:</strong> Rest or cross-training</p>
                    <p><strong>Sunday:</strong> Long run: 10-12 miles at easy pace</p>
                  </div>
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Total Weekly Mileage:</strong> 30-40 miles | <strong>Key Focus:</strong> One quality speed workout per week
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="dark:text-white">Advanced (Peak Performance)</CardTitle>
                  <CardDescription className="dark:text-gray-400">Focus: Multiple quality sessions and race-specific training</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Monday:</strong> 6 miles easy + strength training</p>
                    <p><strong>Tuesday:</strong> Intervals: 10 x 400m at 5K pace (200m jog)</p>
                    <p><strong>Wednesday:</strong> 7 miles easy</p>
                    <p><strong>Thursday:</strong> Tempo: 2 miles easy + 5 miles at tempo pace + 1 mile easy</p>
                    <p><strong>Friday:</strong> 5 miles easy recovery</p>
                    <p><strong>Saturday:</strong> Rest or 30 min easy</p>
                    <p><strong>Sunday:</strong> Long run: 14-16 miles with last 3-4 miles at marathon pace</p>
                  </div>
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Total Weekly Mileage:</strong> 50-60 miles | <strong>Key Focus:</strong> Two quality sessions with race-specific elements
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8 bg-gradient-to-r from-strava-orange to-orange-600 text-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-3">Get Personalized Training Guidance</h3>
                <p className="mb-4">
                  Want a training plan tailored specifically to your fitness level, goals, and schedule? <Link href="/ai-running-coach" className="underline font-semibold hover:text-gray-100">RunAnalytics AI Coach</Link> creates customized recommendations based on your actual running data.
                </p>
                <Link href="/auth">
                  <Button className="bg-white text-strava-orange hover:bg-gray-100" data-testid="cta-get-plan">
                    Get Your Free Plan <ArrowRight className="ml-2" size={16} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          <section id="nutrition-recovery" className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6 flex items-center gap-3">
              <Heart className="text-red-600" size={32} />
              Nutrition & Recovery
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Training is only half the equation. Proper nutrition and recovery are essential for improving pace and avoiding burnout.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Pre-Run Nutrition</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <ul className="space-y-2">
                    <li>• <strong>2-3 hours before:</strong> Balanced meal with carbs and protein</li>
                    <li>• <strong>30-60 min before:</strong> Light carb snack (banana, toast)</li>
                    <li>• <strong>Hydrate:</strong> 16-20 oz water 2 hours before</li>
                    <li>• <strong>Avoid:</strong> High fiber and fatty foods before hard workouts</li>
                  </ul>
                  <p className="mt-4 text-sm">
                    For marathon-specific nutrition planning, check out our <Link href="/tools/marathon-fueling" className="text-blue-600 dark:text-blue-400 hover:underline" data-testid="link-inline-marathon-fueling">Marathon Fueling Calculator</Link>.
                  </p>
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Post-Run Recovery</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <ul className="space-y-2">
                    <li>• <strong>Within 30 min:</strong> 3:1 ratio carbs to protein (chocolate milk works!)</li>
                    <li>• <strong>Rehydrate:</strong> 16-24 oz water per pound lost</li>
                    <li>• <strong>Full meal:</strong> Within 2 hours of hard workouts</li>
                    <li>• <strong>Protein intake:</strong> 20-25g to aid muscle repair</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Sleep & Rest</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <ul className="space-y-2">
                    <li>• <strong>Target:</strong> 7-9 hours per night</li>
                    <li>• <strong>Consistency:</strong> Same sleep/wake times daily</li>
                    <li>• <strong>Quality:</strong> Cool, dark room; avoid screens before bed</li>
                    <li>• <strong>Rest days:</strong> At least one complete rest day per week</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Active Recovery</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700 dark:text-gray-300">
                  <ul className="space-y-2">
                    <li>• <strong>Easy runs:</strong> Very slow, conversational pace</li>
                    <li>• <strong>Cross-training:</strong> Cycling, swimming (low impact)</li>
                    <li>• <strong>Foam rolling:</strong> 10-15 min focusing on tight areas</li>
                    <li>• <strong>Stretching:</strong> Dynamic before, static after runs</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Conclusion and CTA */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-6">
              Putting It All Together
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Improving your running pace is a journey that requires patience, consistency, and smart training. Focus on these key principles:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <p className="text-gray-700 dark:text-gray-300">Incorporate varied training: intervals, tempo runs, and easy runs</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <p className="text-gray-700 dark:text-gray-300">Add strength training 2-3x per week</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <p className="text-gray-700 dark:text-gray-300">Follow the 80/20 rule for pacing</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <p className="text-gray-700 dark:text-gray-300">Prioritize recovery and nutrition</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <p className="text-gray-700 dark:text-gray-300">Be patient - improvements take 8-12 weeks</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <p className="text-gray-700 dark:text-gray-300">Track progress and adjust your plan</p>
              </div>
            </div>

            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <CardContent className="py-12 text-center">
                <Brain className="mx-auto mb-4" size={48} />
                <h3 className="text-3xl font-bold mb-4">Train Smarter with AI Guidance</h3>
                <p className="text-xl mb-6 max-w-2xl mx-auto">
                  Get personalized training recommendations, accurate pace predictions, and expert insights from <Link href="/ai-running-coach" className="underline font-bold hover:text-gray-100">RunAnalytics AI Coach</Link>. All completely free.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth">
                    <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100" data-testid="cta-start-improving">
                      Start Improving Today <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </Link>
                  <Link href="/tools/race-predictor">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="cta-predict-pace">
                      Predict Your Race Pace
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Related Articles */}
          <section className="mt-12 pt-8 border-t dark:border-slate-700">
            <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-6">Related Articles</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/blog/ai-running-coach-complete-guide-2025">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-white">AI Running Coach: Complete Guide</CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      How AI-powered coaching can accelerate your improvement
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/blog/best-strava-analytics-tools-2025">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-white">Best Strava Analytics Tools</CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Find the right platform to track your progress
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
