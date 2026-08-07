import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";
import { SEO } from "@/components/SEO";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <SEO title="About RunAnalytics | Built for Runners" description="Learn how RunAnalytics turns Strava activity data into clear running insights, practical tools and optional AI coaching." url="https://aitracker.run/about" />
      <PublicHeader />

      {/* About Content */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-8 text-center">
            About <span className="text-strava-orange">RunAnalytics</span>
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8 text-center">
              We're passionate about helping runners of all levels optimize their performance through AI-powered analytics and insights.
            </p>

            <div className="grid md:grid-cols-2 gap-12 mt-16">
              <div>
                <h2 className="text-2xl font-bold text-charcoal mb-4">Our Mission</h2>
                <p className="text-gray-600 mb-6">
                  To democratize advanced running analytics and make professional-level insights accessible to every runner, from beginners to elite athletes.
                </p>
                
                <h2 className="text-2xl font-bold text-charcoal mb-4">What We Do</h2>
                <p className="text-gray-600">
                  RunAnalytics combines your Strava data with cutting-edge AI to provide personalized insights, race predictions, injury risk analysis, and training recommendations tailored to your unique running profile.
                </p>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-charcoal mb-4">Our Story</h2>
                <p className="text-gray-600 mb-6">
                  Founded by runners who understand the challenge of making sense of training data, RunAnalytics was born from the need for smarter, more actionable insights that actually help improve performance.
                </p>
                
                <h2 className="text-2xl font-bold text-charcoal mb-4">Why Choose Us</h2>
                <ul className="text-gray-600 space-y-2">
                  <li>• AI-powered personalized insights</li>
                  <li>• Seamless Strava integration</li>
                  <li>• Comprehensive performance tracking</li>
                  <li>• Free to use with premium features</li>
                </ul>
              </div>
            </div>

            <section className="mt-16 rounded-2xl border border-gray-200 bg-white p-8">
              <h2 className="text-2xl font-bold text-charcoal mb-4">How the analysis works</h2>
              <div className="grid md:grid-cols-3 gap-6 text-gray-600">
                <div><h3 className="font-semibold text-charcoal mb-2">1. Your data</h3><p>RunAnalytics reads the Strava activities and streams you authorize. Missing heart-rate, cadence or GPS data limits the metrics we can calculate.</p></div>
                <div><h3 className="font-semibold text-charcoal mb-2">2. Transparent metrics</h3><p>Calculators apply documented formulas and show the inputs behind the result. Estimates should be compared with similar runs, not treated as laboratory measurements.</p></div>
                <div><h3 className="font-semibold text-charcoal mb-2">3. Coaching context</h3><p>AI turns those metrics into suggestions based on your recent history and goals. It does not diagnose injury or replace a qualified coach or clinician.</p></div>
              </div>
              <p className="mt-6 text-sm text-gray-500">See the <a className="text-strava-orange hover:underline" href="/faq">methodology and limitations FAQ</a> or <a className="text-strava-orange hover:underline" href="/contact">ask us a data question</a>.</p>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
