import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target, 
  Zap, 
  DollarSign, 
  MessageCircle,
  CheckCircle,
  Star,
  Activity,
  BarChart3,
  Heart,
  Award,
  Users,
  Smartphone,
  ArrowRight,
  Sparkles,
  Calendar
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function AICoachLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="AI Running Coach - Free Personalized Training | RunAnalytics"
        description="Get a free AI-powered running coach that analyzes your Strava data and provides personalized training advice, race predictions, and performance insights. Available 24/7 with expert guidance based on your actual running history."
        keywords="AI running coach, free running coach, AI fitness coach, personalized running training, virtual running coach, Strava AI coach, running performance analysis"
        url="https://aitracker.run/ai-running-coach"
        type="website"
      />
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero Section */}
        <section className="py-12 sm:py-20 text-center">
          <Badge className="mb-4 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            <Sparkles className="mr-1" size={14} />
            AI-Powered Coaching
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-charcoal dark:text-white mb-6 leading-tight">
            Your Personal AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Running Coach</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Get expert training advice, personalized insights, and race predictions powered by AI. Available 24/7, completely free.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg" data-testid="hero-cta-start">
                Start Free Now <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link href="/blog/ai-running-coach-complete-guide-2025">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg" data-testid="hero-cta-learn">
                Learn More
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>14-Day Free Trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span>2-Minute Setup</span>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl mb-16">
          <div className="text-center mb-8">
            <div className="flex justify-center gap-1 mb-3">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className="fill-yellow-400 text-yellow-400" size={24} />
              ))}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              Trusted by thousands of runners improving their performance with AI
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 px-8">
            <Card className="border-0 shadow-lg dark:bg-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    SM
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Sarah M.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Marathon Runner</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "The AI Coach helped me break 3:30 in my marathon. The personalized insights based on my actual data were game-changing!"
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg dark:bg-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    JL
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">James L.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">5K Competitor</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "Having an AI coach that understands my training history is like having a professional coach without the $200/month cost."
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg dark:bg-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    EC
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Emily C.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Beginner Runner</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "As a beginner, I love having instant answers to my training questions. The AI is patient and explains things clearly."
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
              Why Choose AI Running Coach?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Get professional-level coaching insights powered by artificial intelligence that learns from your running data
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <Brain className="text-white" size={28} />
                </div>
                <CardTitle className="text-xl dark:text-white">Personalized Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Get training advice tailored to your unique running history, fitness level, and goals. The AI analyzes your Strava data to provide recommendations that actually work for you.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <DollarSign className="text-white" size={28} />
                </div>
                <CardTitle className="text-xl dark:text-white">100% Free Forever</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Professional running coaches charge $100-300/month. Get similar value completely free with no hidden costs, subscriptions, or paywalls. Ever.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="text-white" size={28} />
                </div>
                <CardTitle className="text-xl dark:text-white">Available 24/7</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Get instant answers to your training questions anytime, anywhere. No scheduling conflicts or waiting for email responses.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                  <Target className="text-white" size={28} />
                </div>
                <CardTitle className="text-xl dark:text-white">Accurate Race Predictions</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Know what race times you're capable of with AI-powered predictions based on your recent training. Plan your race strategy with confidence.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                  <Heart className="text-white" size={28} />
                </div>
                <CardTitle className="text-xl dark:text-white">Injury Prevention</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Advanced algorithms detect early warning signs of overtraining or injury risk, helping you stay healthy and consistent.
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 dark:border-slate-700">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="text-white" size={28} />
                </div>
                <CardTitle className="text-xl dark:text-white">Data-Driven Decisions</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Every recommendation is backed by analysis of your actual performance data. No guesswork, just objective insights that drive improvement.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl text-white mb-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                How AI Running Coach Works
              </h2>
              <p className="text-xl opacity-90">
                Get started in minutes and start receiving personalized insights
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-purple-600">1</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Connect Strava</h3>
                <p className="opacity-90">
                  Sign up and connect your Strava account with one click. Takes less than 30 seconds.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-purple-600">2</span>
                </div>
                <h3 className="text-xl font-bold mb-3">AI Analyzes Your Data</h3>
                <p className="opacity-90">
                  Our AI instantly analyzes your running history, identifying patterns and opportunities for improvement.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-purple-600">3</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Get Personalized Coaching</h3>
                <p className="opacity-90">
                  Ask questions, get training recommendations, and receive insights tailored specifically to you.
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link href="/auth">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-6 text-lg" data-testid="cta-how-it-works">
                  Get Started Free <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Sample Chat Interactions */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
              Real Conversations with Your AI Coach
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              See how the AI Coach provides personalized, actionable advice based on your running data
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {/* Chat Example 1 */}
            <Card className="shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="text-gray-600 dark:text-gray-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-gray-800 dark:text-gray-200">
                        I want to run a sub-20 minute 5K. What workouts should I focus on?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl rounded-tl-none px-4 py-3 text-gray-800 dark:text-gray-200">
                        Based on your current 5K pace of 6:50/mile, you're about 90 seconds away from sub-20. Here's my recommendation:
                        <br/><br/>
                        <strong>1. Weekly Intervals:</strong> 8-10 x 400m at 6:15-6:20/mile pace with 90 sec recovery
                        <br/>
                        <strong>2. Tempo Run:</strong> 20-25 min at 6:30/mile pace once per week
                        <br/>
                        <strong>3. Long Run:</strong> Keep your Sunday runs easy (8:00-8:30/mile) to build aerobic base
                        <br/><br/>
                        You're making good progress! Your recent runs show consistent pacing. Focus on these workouts for 6-8 weeks and we'll reassess.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Example 2 */}
            <Card className="shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="text-gray-600 dark:text-gray-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-gray-800 dark:text-gray-200">
                        My legs feel heavy after yesterday's long run. Should I run today?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl rounded-tl-none px-4 py-3 text-gray-800 dark:text-gray-200">
                        I see you ran 14 miles yesterday at a strong pace. Your average heart rate was elevated compared to recent long runs, suggesting you pushed hard. Here's what I recommend:
                        <br/><br/>
                        <strong>Option 1:</strong> Easy 3-4 mile recovery run at very slow pace (2 min/mile slower than usual)
                        <br/>
                        <strong>Option 2:</strong> Complete rest day or gentle cross-training (swimming, cycling)
                        <br/><br/>
                        Since you have a tempo run scheduled for tomorrow, I'd lean toward Option 2. Your body needs recovery to perform well in that workout. Heavy legs are your body's signal—listen to it!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Example 3 */}
            <Card className="shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="text-gray-600 dark:text-gray-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-gray-800 dark:text-gray-200">
                        What should my marathon pace be for a race in 6 weeks?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl rounded-tl-none px-4 py-3 text-gray-800 dark:text-gray-200">
                        Based on your recent training, here's my race prediction:
                        <br/><br/>
                        <strong>Target Marathon Pace: 8:15-8:20/mile (3:36-3:38 finish)</strong>
                        <br/><br/>
                        This is based on your 1:45 half-marathon last month and your recent 20-mile long run at 8:45/mile. Your aerobic base is solid.
                        <br/><br/>
                        <strong>Race Strategy:</strong>
                        <br/>
                        • Miles 1-6: 8:25/mile (slightly conservative start)
                        <br/>
                        • Miles 7-20: 8:15/mile (settle into rhythm)
                        <br/>
                        • Miles 21-26.2: Hold 8:15 or push if feeling strong
                        <br/><br/>
                        Check out the full prediction details on your <Link href="/tools/race-predictor" className="text-blue-600 dark:text-blue-400 underline">Race Predictor page</Link>.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AI vs Human Coach Comparison */}
        <section className="py-16 bg-white dark:bg-slate-800 rounded-3xl mb-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
                AI Coach vs Human Coach
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                See how AI coaching compares to traditional coaching
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-gray-50 dark:bg-slate-900 rounded-lg overflow-hidden">
                <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Feature</th>
                    <th className="px-6 py-4 text-center">AI Coach</th>
                    <th className="px-6 py-4 text-center">Human Coach</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  <tr className="border-b dark:border-slate-700">
                    <td className="px-6 py-4 font-semibold">Monthly Cost</td>
                    <td className="px-6 py-4 text-center">
                      <Badge className="bg-green-600 text-white">FREE</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">$100-300+</td>
                  </tr>
                  <tr className="border-b dark:border-slate-700">
                    <td className="px-6 py-4 font-semibold">Availability</td>
                    <td className="px-6 py-4 text-center">
                      <CheckCircle className="text-green-600 mx-auto" size={24} />
                      <span className="block text-sm mt-1">24/7 Instant</span>
                    </td>
                    <td className="px-6 py-4 text-center">Limited by schedule</td>
                  </tr>
                  <tr className="border-b dark:border-slate-700">
                    <td className="px-6 py-4 font-semibold">Data Analysis</td>
                    <td className="px-6 py-4 text-center">
                      <CheckCircle className="text-green-600 mx-auto" size={24} />
                      <span className="block text-sm mt-1">Automatic & Deep</span>
                    </td>
                    <td className="px-6 py-4 text-center">Manual review</td>
                  </tr>
                  <tr className="border-b dark:border-slate-700">
                    <td className="px-6 py-4 font-semibold">Response Time</td>
                    <td className="px-6 py-4 text-center">
                      <CheckCircle className="text-green-600 mx-auto" size={24} />
                      <span className="block text-sm mt-1">Instant</span>
                    </td>
                    <td className="px-6 py-4 text-center">Hours to days</td>
                  </tr>
                  <tr className="border-b dark:border-slate-700">
                    <td className="px-6 py-4 font-semibold">Personalization</td>
                    <td className="px-6 py-4 text-center">Data-driven</td>
                    <td className="px-6 py-4 text-center">
                      <CheckCircle className="text-green-600 mx-auto" size={24} />
                      <span className="block text-sm mt-1">Holistic & Intuitive</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold">Emotional Support</td>
                    <td className="px-6 py-4 text-center">Limited</td>
                    <td className="px-6 py-4 text-center">
                      <CheckCircle className="text-green-600 mx-auto" size={24} />
                      <span className="block text-sm mt-1">Strong Personal Bond</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">💡 Best of Both Worlds:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  Many successful runners use AI coaching for day-to-day training guidance and data analysis, supplemented by periodic check-ins with a human coach for motivation and big-picture strategy. Start with free AI coaching and add human coaching if you need it later.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Everything you need to know about AI Running Coach
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">Is AI Running Coach really free?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Yes, 100% free forever. We believe every runner deserves access to quality coaching insights. There are no hidden costs, subscriptions, or feature limitations.
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">How accurate are the AI's recommendations?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                The AI analyzes thousands of successful training programs and your personal running history to provide evidence-based recommendations. Race predictions are typically within 2-5% of actual times when based on sufficient training data. The more you use it, the more it learns about what works for you.
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">Do I need Strava to use AI Running Coach?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Currently yes, we integrate with Strava to access your running data. Strava is free to use for activity tracking. If you don't have a Strava account yet, you can create one at strava.com in just a few minutes.
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">Is my data private and secure?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Absolutely. Your data is encrypted and stored securely. We only access what's necessary to provide coaching insights, and we never sell your data to third parties. You can disconnect or delete your account anytime.
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">Can beginners use AI Running Coach?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Yes! The AI adapts to your experience level. Whether you're running your first 5K or training for your 20th marathon, you'll get appropriate, personalized guidance. The AI is patient and explains concepts clearly, making it ideal for beginners.
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">How is this different from Strava's features?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                While Strava excels at tracking and social features, RunAnalytics provides deep performance analysis, AI-powered coaching conversations, race predictions, injury risk detection, and comprehensive training insights that Strava doesn't offer. Plus, it's completely free while Strava Summit costs $79.99/year.
              </CardContent>
            </Card>

            <Card className="shadow-lg dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white">Can the AI create custom training plans?</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 dark:text-gray-300">
                Yes! The AI can create personalized training plans based on your current fitness, goals, available training time, and schedule. Plans automatically adapt based on your actual performance and recovery status.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 mb-16">
          <Card className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white border-0 shadow-2xl">
            <CardContent className="py-16 px-6 text-center">
              <Sparkles className="mx-auto mb-6" size={48} />
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Start Training Smarter Today
              </h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto opacity-95">
                Join thousands of runners who are achieving their goals with personalized AI coaching. It's free, takes 2 minutes to set up, and could transform your training.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/auth">
                  <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-6 text-lg" data-testid="cta-final-signup">
                    Get Started Free <ArrowRight className="ml-2" size={20} />
                  </Button>
                </Link>
                <Link href="/blog/ai-running-coach-complete-guide-2025">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-10 py-6 text-lg" data-testid="cta-final-learn">
                    Read Complete Guide
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-8 text-sm opacity-90">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} />
                  <span>Cancel Anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} />
                  <span>Setup in 2 Minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Related Resources */}
        <section className="py-12 mb-16">
          <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-8 text-center">
            Related Resources
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/blog/ai-running-coach-complete-guide-2025">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full dark:border-slate-700">
                <CardHeader>
                  <Brain className="text-purple-600 mb-3" size={32} />
                  <CardTitle className="text-lg dark:text-white">Complete AI Coach Guide</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    In-depth guide covering everything about AI running coaches
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/blog/how-to-improve-running-pace">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full dark:border-slate-700">
                <CardHeader>
                  <Zap className="text-yellow-600 mb-3" size={32} />
                  <CardTitle className="text-lg dark:text-white">Improve Your Pace</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    Proven strategies and training methods to run faster
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/tools/race-predictor">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full dark:border-slate-700">
                <CardHeader>
                  <Target className="text-green-600 mb-3" size={32} />
                  <CardTitle className="text-lg dark:text-white">Race Predictor Tool</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    See what race times you're capable of achieving
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
