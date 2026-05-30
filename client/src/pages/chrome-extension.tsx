import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Chrome,
  Gauge,
  Activity,
  ShieldCheck,
  Zap,
  Brain,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Lock,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/ginbekolfhooancaldnodcdhabjffbem/";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RunAnalytics for Strava — Chrome Extension",
  operatingSystem: "Chrome",
  applicationCategory: "BrowserApplication",
  description:
    "Free Chrome extension that adds AI-powered RunAnalytics insights directly to every Strava activity page — run grade, Runner Score, readiness, and injury risk, with no extra clicks.",
  url: "https://aitracker.run/chrome-extension",
  downloadUrl: CHROME_STORE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: "RunAnalytics",
    url: "https://aitracker.run",
  },
};

const features = [
  {
    icon: Gauge,
    title: "Run Grade on Every Activity",
    description:
      "See an instant A–F grade for each Strava run, scored against your own history — right on the activity page.",
  },
  {
    icon: TrendingUp,
    title: "Your Runner Score",
    description:
      "Your performance index, updated with every run, surfaced inline so you always know where you stand.",
  },
  {
    icon: Activity,
    title: "Readiness at a Glance",
    description:
      "A live readiness score tells you whether to push hard or back off, based on your recent training load.",
  },
  {
    icon: ShieldCheck,
    title: "Injury Risk Signals",
    description:
      "Proactive warnings flag overtraining patterns before they turn into time off your feet.",
  },
  {
    icon: Brain,
    title: "AI Coaching Insights",
    description:
      "The same AI engine that powers RunAnalytics, delivering context-aware takeaways for each run.",
  },
  {
    icon: Zap,
    title: "Zero Extra Clicks",
    description:
      "The panel appears automatically on Strava activity pages. Sign in once on aitracker.run and you're set.",
  },
];

const steps = [
  {
    icon: Chrome,
    title: "Add to Chrome",
    description:
      "Install the free RunAnalytics extension from the Chrome Web Store in one click.",
  },
  {
    icon: Lock,
    title: "Sign in once",
    description:
      "Log in at aitracker.run and connect Strava. Your auth token syncs to the extension automatically — no separate extension login.",
  },
  {
    icon: MousePointerClick,
    title: "Open any Strava run",
    description:
      "Visit any Strava activity page and the RunAnalytics panel appears with your grade, score, readiness, and insights.",
  },
];

export default function ChromeExtensionLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="RunAnalytics Chrome Extension for Strava | AI Insights on Every Run"
        description="Add AI-powered running insights to every Strava activity with the free RunAnalytics Chrome extension. Get run grades, your Runner Score, readiness, and injury-risk signals without leaving Strava."
        keywords="Strava Chrome extension, RunAnalytics extension, Strava AI insights, running analytics chrome extension, Strava run grade, Runner Score extension, Strava browser extension"
        url="https://aitracker.run/chrome-extension"
        type="website"
        structuredData={structuredData}
      />
      <PublicHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="py-12 sm:py-20 text-center">
          <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
            <Chrome className="mr-1" size={14} />
            Free Chrome Extension
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-charcoal dark:text-white mb-6 leading-tight">
            AI Running Insights on{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
              Every Strava Run
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            The free RunAnalytics Chrome extension drops your run grade, Runner
            Score, readiness, and injury-risk signals straight onto every Strava
            activity page — no extra clicks, no new tab.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600 text-white px-8 py-6 text-lg"
                data-testid="hero-cta-install"
              >
                <Chrome className="mr-2" size={20} /> Add to Chrome — Free
              </Button>
            </a>
            <Link href="/auth">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg"
                data-testid="hero-cta-signup"
              >
                Create Free Account <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Works alongside your free RunAnalytics account. Install in seconds.
          </p>
        </section>

        {/* Features */}
        <section className="py-12 sm:py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
              Everything you need, right inside Strava
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              No more bouncing between tabs. The insights you rely on appear
              exactly where you already review your runs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-2 hover:border-orange-400 transition-colors"
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mb-3">
                    <feature.icon className="text-strava-orange" size={24} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 sm:py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
              Up and running in under a minute
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Three steps and your Strava activity pages get a serious upgrade.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="text-center"
                data-testid={`step-${index + 1}`}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 text-white">
                  <step.icon size={28} />
                </div>
                <div className="text-sm font-semibold text-strava-orange mb-1">
                  Step {index + 1}
                </div>
                <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Why it matters */}
        <section className="py-12 sm:py-16">
          <Card className="bg-white/70 dark:bg-slate-800/50 border-2">
            <CardContent className="p-8 sm:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
                    <Sparkles className="mr-1" size={14} /> Why runners love it
                  </Badge>
                  <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-4">
                    Context the moment you finish a run
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                    Strava tells you what you did. RunAnalytics tells you what it
                    means. The extension bridges the two so every activity comes
                    with instant, personalized analysis.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Built for the way you already use Strava",
                      "Free to install and free to use",
                      "Private and secure — only your auth token syncs",
                      "Powered by the full RunAnalytics AI engine",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle
                          className="text-green-500 mt-0.5 flex-shrink-0"
                          size={20}
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 mb-6">
                    <Chrome className="text-white" size={64} />
                  </div>
                  <a
                    href={CHROME_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600 text-white px-8 py-6 text-lg w-full sm:w-auto"
                      data-testid="why-cta-install"
                    >
                      <Chrome className="mr-2" size={20} /> Get the Extension
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="py-12 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-white mb-4">
            Make every Strava run smarter
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Install the free RunAnalytics Chrome extension and turn Strava into a
            coaching tool.
          </p>
          <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600 text-white px-8 py-6 text-lg"
              data-testid="final-cta-install"
            >
              <Chrome className="mr-2" size={20} /> Add to Chrome — It's Free
            </Button>
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
