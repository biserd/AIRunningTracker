import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, HelpCircle, Zap, Target, BarChart, Shield, Clock } from "lucide-react";
import { Link } from "wouter";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-light-grey">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-charcoal">Frequently Asked Questions</h1>
                <p className="text-gray-600">Get answers to common questions about RunAnalytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}