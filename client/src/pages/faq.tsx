import { HelpCircle, Zap, Target, BarChart, Shield, Clock, Bot } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-light-grey">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <div className="mb-8">
            <p className="text-gray-600">
              Find answers to the most common questions about our AI-powered running analytics platform.
              Can't find what you're looking for? <Link href="/contact" className="text-strava-orange hover:underline">Contact us</Link> for personalized support.
            </p>
          </div>

          <div className="grid gap-8">
            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Getting Started</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What is RunAnalytics?</h3>
                  <p>
                    RunAnalytics is an AI-powered running analytics platform that integrates with Strava to provide 
                    personalized insights, performance tracking, and training recommendations. We use advanced machine 
                    learning algorithms to analyze your running data and help you improve your performance.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Do I need a Strava account?</h3>
                  <p>
                    While you can create an account without Strava, connecting your Strava account unlocks the full 
                    potential of our platform. Strava integration provides access to your historical running data, 
                    which enables more accurate AI insights and personalized recommendations.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Is RunAnalytics free to use?</h3>
                  <p>
                    Yes! RunAnalytics offers a comprehensive free tier that includes basic analytics, AI insights, 
                    and performance tracking. Premium features and advanced analytics are available through our 
                    subscription plans.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Features & Analytics</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What kind of insights do you provide?</h3>
                  <p>
                    Our AI analyzes your running data to provide insights on performance trends, pace analysis, 
                    training load, recovery recommendations, race predictions, injury risk assessment, and 
                    personalized training plans. Each insight is tailored to your specific running patterns and goals.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How accurate are the race time predictions?</h3>
                  <p>
                    Our race time predictions use advanced machine learning models trained on thousands of runner 
                    profiles and performance data. While individual results may vary, our predictions are typically 
                    accurate within 2-5% for most runners with consistent training data.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What is the Runner Score?</h3>
                  <p>
                    The Runner Score is our comprehensive fitness metric that evaluates multiple aspects of your 
                    running performance including endurance, speed, consistency, and efficiency. It's displayed 
                    on a radar chart with scores from 0-100 across different categories.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BarChart className="h-4 w-4 text-yellow-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Fitness, Fatigue & Form Chart</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What do CTL, ATL, and TSB mean?</h3>
                  <p className="mb-2">
                    These are industry-standard metrics used by serious runners and coaches to track training load and recovery:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>CTL (Chronic Training Load)</strong> is your "Fitness" - a 42-day rolling average showing your long-term training buildup</li>
                    <li><strong>ATL (Acute Training Load)</strong> is your "Fatigue" - a 7-day rolling average showing your recent training stress</li>
                    <li><strong>TSB (Training Stress Balance)</strong> is your "Form" - calculated as CTL minus ATL, showing your race readiness</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How do I use the Fitness/Fatigue/Form chart?</h3>
                  <p className="mb-2">
                    The chart helps you understand your training status and plan your races:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Building fitness:</strong> TSB is negative (-10 to -30) as you train hard and accumulate fatigue</li>
                    <li><strong>Tapering:</strong> TSB rises toward positive as you reduce training volume before a race</li>
                    <li><strong>Race ready:</strong> TSB is positive (+5 to +15) when you're fresh and ready to perform</li>
                    <li><strong>Recovery:</strong> After hard training, watch TSB increase as you recover</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What's a good Form (TSB) score?</h3>
                  <p>
                    There's no single "good" score - it depends on your training phase. During hard training blocks, TSB of 
                    -15 to -30 is normal (you're building fitness). Before a race, aim for TSB of +5 to +15 (fresh and ready). 
                    Very negative scores (below -30) may indicate you're at risk of overtraining and should consider rest.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">When should I pay attention to this chart?</h3>
                  <p>
                    Check it regularly if you're training for a specific race or goal. The chart helps you avoid overtraining, 
                    plan your taper correctly, and ensure you're fresh on race day. If your TSB drops below -30 for extended 
                    periods, it's a sign you may need a recovery week.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Training & Performance</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How do you calculate VO2 Max?</h3>
                  <p>
                    We use Jack Daniels' formula combined with your recent running performance data to estimate 
                    VO2 Max. This calculation considers your best recent race times or time trial performances 
                    across different distances to provide an accurate fitness assessment.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Can you help me train for a specific race?</h3>
                  <p>
                    Absolutely! Our AI can generate personalized training plans based on your current fitness level, 
                    target race distance, available training time, and race date. The plans adapt based on your 
                    progress and performance data.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How often should I sync my Strava data?</h3>
                  <p>
                    Your Strava data syncs automatically after each run when connected. For the most accurate 
                    insights and real-time performance tracking, we recommend keeping your Strava connection active. 
                    You can also manually sync from your dashboard if needed.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart className="h-4 w-4 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Data & Analytics</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How much running history do you need for accurate insights?</h3>
                  <p>
                    While you can get basic insights immediately, we recommend at least 4-6 weeks of consistent 
                    running data for more accurate AI analysis. The more data you have, the better our algorithms 
                    can understand your patterns and provide personalized recommendations.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What if I don't have heart rate data?</h3>
                  <p>
                    Heart rate data enhances our analysis, but it's not required. We can provide valuable insights 
                    using pace, distance, and elevation data alone. However, heart rate zones and recovery 
                    recommendations will be more accurate with heart rate information.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Can I export my data?</h3>
                  <p>
                    Yes, you can export your analytics data, insights, and reports in various formats. Your original 
                    running data remains in your Strava account, and our generated insights can be downloaded from 
                    your dashboard.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">AI Agent Coach (Premium)</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What is AI Agent Coach?</h3>
                  <p>
                    AI Agent Coach is a Premium feature that proactively analyzes every run after it syncs from 
                    Strava. Instead of waiting for you to check dashboards, it delivers personalized coaching 
                    recaps, observations, and next-step recommendations automatically.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How is it different from the AI Coach Chat?</h3>
                  <p>
                    AI Coach Chat is reactive—you ask questions and get answers. AI Agent Coach is proactive—it 
                    analyzes your runs automatically and delivers coaching insights without you asking. Think of 
                    it as having a coach who reviews every run and leaves you notes.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What kind of insights does AI Agent Coach provide?</h3>
                  <p>
                    Each recap includes 3-5 personalized observations about your run (pacing, heart rate, effort 
                    distribution), a coaching cue to focus on, and a clear next-step recommendation (rest, easy run, 
                    workout, long run, or recovery).
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Can I customize the coaching style?</h3>
                  <p>
                    Yes! During onboarding, you choose your preferred coaching tone: gentle (encouraging and 
                    supportive), balanced (mix of encouragement and direct feedback), or direct (no-nonsense, 
                    data-driven feedback for competitive athletes).
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Privacy & Security</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Is my running data secure?</h3>
                  <p>
                    Absolutely. We use enterprise-grade security measures including data encryption, secure 
                    authentication, and trusted cloud infrastructure. Your data is never shared with third parties 
                    without your explicit consent. Read our <Link href="/privacy" className="text-strava-orange hover:underline">Privacy Policy</Link> for details.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Can I disconnect Strava anytime?</h3>
                  <p>
                    Yes, you can disconnect your Strava account at any time from your settings page. This will 
                    stop future data syncing, but your historical analytics and insights will remain available 
                    in your RunAnalytics account.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">What happens if I delete my account?</h3>
                  <p>
                    When you delete your account, all your personal data, analytics, and insights are permanently 
                    removed from our systems within 30 days. Your original Strava data remains unaffected in your 
                    Strava account.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Support</h2>
              </div>
              
              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How can I get help with my account?</h3>
                  <p>
                    You can reach our support team through the <Link href="/contact" className="text-strava-orange hover:underline">Contact page</Link>. 
                    We typically respond within 24 hours during business days. For urgent issues, please include 
                    "URGENT" in your subject line.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Do you offer coaching services?</h3>
                  <p>
                    While RunAnalytics provides AI-powered insights and training recommendations, we don't currently 
                    offer direct coaching services. However, our detailed analytics and personalized plans are 
                    designed to guide your training effectively.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Can I suggest new features?</h3>
                  <p>
                    We love hearing from our users! Please send feature requests and suggestions through our 
                    <Link href="/contact" className="text-strava-orange hover:underline">Contact page</Link>. 
                    We review all suggestions and prioritize features based on user feedback and demand.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 bg-light-grey rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-charcoal mb-2">Still have questions?</h3>
            <p className="text-gray-600 mb-4">
              Our support team is here to help you get the most out of RunAnalytics.
            </p>
            <Link href="/contact">
              <Button className="bg-strava-orange text-white hover:bg-strava-orange/90" data-testid="button-contact-support">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}