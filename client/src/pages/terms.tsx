import Footer from "@/components/Footer";
import { Activity } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                  <Activity className="text-white" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
              </div>
            </Link>
            <Link href="/auth">
              <Button variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Terms Content */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-8 text-center">
            Terms of <span className="text-strava-orange">Service</span>
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-8 text-center">
              Last updated: September 2025
            </p>

            <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-600">
                  By accessing and using RunAnalytics, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">2. Use License</h2>
                <p className="text-gray-600 mb-4">
                  Permission is granted to temporarily access RunAnalytics for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="text-gray-600 space-y-2 ml-6">
                  <li>• Modify or copy the materials</li>
                  <li>• Use the materials for any commercial purpose or for any public display</li>
                  <li>• Attempt to reverse engineer any software contained in RunAnalytics</li>
                  <li>• Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">3. Data and Privacy</h2>
                <p className="text-gray-600">
                  Your privacy is important to us. We collect and use your running data to provide personalized analytics and insights. We integrate with Strava to access your activity data with your explicit consent. For more details, please review our Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">4. User Accounts</h2>
                <p className="text-gray-600">
                  You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">5. Service Availability</h2>
                <p className="text-gray-600">
                  While we strive to provide continuous service, we do not guarantee that RunAnalytics will be available 100% of the time. The service may be temporarily unavailable for maintenance, updates, or due to technical issues.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">6. Limitation of Liability</h2>
                <p className="text-gray-600">
                  RunAnalytics and its team shall not be held liable for any damages arising from the use or inability to use the service, including but not limited to training advice, performance predictions, or health recommendations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">7. Contact Information</h2>
                <p className="text-gray-600">
                  If you have any questions about these Terms of Service, please contact us through our contact page or email support.
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}