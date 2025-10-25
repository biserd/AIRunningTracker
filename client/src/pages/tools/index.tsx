import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Activity, TrendingDown, Calculator, BarChart3, ArrowRight, Zap } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";

const tools = [
  {
    id: "aerobic-decoupling-calculator",
    title: "Aerobic Decoupling Calculator",
    description: "Quantify late-run aerobic fade on your long runs. Analyze the relationship between pace and heart rate to measure endurance efficiency.",
    icon: TrendingDown,
    url: "/tools/aerobic-decoupling-calculator",
    status: "available",
    features: [
      "Split-halves analysis",
      "Drift visualization",
      "Durability scoring",
      "Auto-import from Strava"
    ]
  },
  {
    id: "training-split-analyzer",
    title: "Polarized vs Pyramidal Training Split Analyzer",
    description: "Analyze your training intensity distribution and discover if you're following a polarized, pyramidal, or threshold-heavy approach.",
    icon: Activity,
    url: "/tools/training-split-analyzer",
    status: "available",
    features: [
      "Zone distribution analysis",
      "Weekly trends",
      "Training prescription",
      "Auto-import from Strava"
    ]
  },
  {
    id: "marathon-fueling",
    title: "Marathon Fueling Planner",
    description: "Calculate your optimal race nutrition strategy with precise gel timing, carb targets, and electrolyte balance for marathon success.",
    icon: Zap,
    url: "/tools/marathon-fueling",
    status: "available",
    features: [
      "Feeding schedule",
      "Carb & sodium tracking",
      "Gel optimization",
      "Shopping list"
    ]
  },
  {
    id: "race-predictor",
    title: "Race Time Predictor",
    description: "Predict your race times for 10K, Half Marathon, and Marathon distances based on recent performances and training consistency.",
    icon: BarChart3,
    url: "/tools/race-predictor",
    status: "available",
    features: [
      "Confidence intervals",
      "Pace tables",
      "Weather adjustments",
      "Course profiles"
    ]
  },
  {
    id: "cadence-analyzer",
    title: "Cadence & Form Stability",
    description: "Detect form fade and variability with a comprehensive Form Stability Score based on cadence, stride length, and drift patterns.",
    icon: Calculator,
    url: "/tools/cadence-analyzer",
    status: "available",
    features: [
      "Form stability score",
      "Cadence drift tracking",
      "Stride analysis",
      "Weekly trends"
    ]
  }
];

export default function ToolsPage() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Helmet>
        <title>Free Running Analysis Tools | RunAnalytics</title>
        <meta name="description" content="Free running analysis tools for every runner. Calculate aerobic decoupling, predict race times, analyze training zones, and monitor form stability. Works with or without Strava." />
        <meta property="og:title" content="Free Running Analysis Tools | RunAnalytics" />
        <meta property="og:description" content="Professional running analysis tools accessible to everyone. Aerobic decoupling, race prediction, training analysis, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitracker.run/tools" />
      </Helmet>

      <div className="min-h-screen bg-light-grey">
        {/* Header */}
        {isAuthenticated ? (
          <AppHeader />
        ) : (
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="px-2 sm:px-4" data-testid="button-back-home">
                    <ArrowRight className="h-4 w-4 sm:mr-2 rotate-180" />
                    <span className="hidden sm:inline">Back to Home</span>
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button className="bg-strava-orange text-white hover:bg-strava-orange/90" size="sm" data-testid="button-sign-in">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-strava-orange/10 text-strava-orange px-4 py-2 rounded-full mb-6">
                <Calculator size={20} />
                <span className="font-semibold text-sm">Free Running Tools</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-bold text-charcoal mb-6">
                Professional Running Analysis Tools
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
                Access powerful calculators and analyzers used by elite coaches. 
                {isAuthenticated ? (
                  <> Auto-import your Strava data or enter values manually.</>
                ) : (
                  <> Works with manual input - no account required. Connect Strava for auto-import.</>
                )}
              </p>

              {!isAuthenticated && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/auth">
                    <Button size="lg" className="bg-strava-orange text-white hover:bg-strava-orange/90 w-full sm:w-auto" data-testid="button-get-started">
                      Get Started Free
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-500">or scroll down to use tools without signing in</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isAvailable = tool.status === "available";
              
              return (
                <Card 
                  key={tool.id} 
                  className={`relative overflow-hidden transition-all duration-200 ${
                    isAvailable 
                      ? 'hover:shadow-lg hover:border-strava-orange cursor-pointer' 
                      : 'opacity-75'
                  }`}
                  data-testid={`card-tool-${tool.id}`}
                >
                  {!isAvailable && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-gray-500 text-white">Coming Soon</Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isAvailable 
                          ? 'bg-strava-orange text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-2">{tool.title}</CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {tool.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {tool.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-strava-orange flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {isAvailable ? (
                        <Link href={tool.url}>
                          <Button 
                            className="w-full bg-strava-orange text-white hover:bg-strava-orange/90 mt-2"
                            data-testid={`button-open-${tool.id}`}
                          >
                            Open Calculator
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full mt-2" 
                          disabled
                        >
                          Available Soon
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Educational Section */}
          <div className="mt-16 bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-charcoal mb-4">Why Use Running Analysis Tools?</h2>
            <div className="grid sm:grid-cols-2 gap-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-charcoal mb-2">📊 Data-Driven Training</h3>
                <p className="text-sm leading-relaxed">
                  Make informed decisions about your training based on objective metrics, not guesswork. 
                  Understand your strengths and weaknesses to train smarter.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal mb-2">🎯 Avoid Overtraining</h3>
                <p className="text-sm leading-relaxed">
                  Monitor fatigue indicators like aerobic decoupling and form drift to catch early 
                  warning signs before they become injuries.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal mb-2">🏃 Optimize Race Day</h3>
                <p className="text-sm leading-relaxed">
                  Get realistic race predictions with confidence intervals. Plan your pacing strategy 
                  and adjust for course terrain and weather conditions.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal mb-2">📈 Track Long-Term Progress</h3>
                <p className="text-sm leading-relaxed">
                  See how your efficiency, form stability, and training distribution evolve over time. 
                  Celebrate improvements and identify plateaus.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
