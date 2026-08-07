import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Activity, TrendingDown, Calculator, BarChart3, ArrowRight, Zap, MapPin, ShoppingBag, Target, RefreshCw, GitCompare } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import AppHeader from "@/components/AppHeader";
import PublicHeader from "@/components/PublicHeader";

const tools = [
  {
    id: "running-heatmap",
    title: "Running Heatmap",
    description: "Visualize where you run most frequently with an interactive map showing your last 30 activities overlaid to reveal your favorite routes and training patterns.",
    icon: MapPin,
    url: "/tools/heatmap",
    status: "available",
    authRequired: false,
    ctaLabel: "View Heatmap",
    features: [
      "Interactive route visualization",
      "Last 30 activities",
      "Training pattern analysis",
      "Favorite routes discovery"
    ]
  },
  {
    id: "aerobic-decoupling-calculator",
    title: "Aerobic Decoupling Calculator",
    description: "Quantify late-run aerobic fade on your long runs. Analyze the relationship between pace and heart rate to measure endurance efficiency.",
    icon: TrendingDown,
    url: "/tools/aerobic-decoupling-calculator",
    status: "available",
    ctaLabel: "Open Calculator",
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
    ctaLabel: "Analyze Training",
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
    description: "Turn a practiced carbohydrate target and product choice into a marathon fueling schedule you can rehearse before race day.",
    icon: Zap,
    url: "/tools/marathon-fueling",
    status: "available",
    ctaLabel: "Plan Fueling",
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
    ctaLabel: "Predict Times",
    features: [
      "Modeled performance range",
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
    ctaLabel: "Analyze Form",
    features: [
      "Form stability score",
      "Cadence drift tracking",
      "Stride analysis",
      "Weekly trends"
    ]
  },
  {
    id: "training-pace-calculator",
    title: "Training Pace Calculator",
    description: "Turn a recent race into broad easy, long-run, steady, threshold, and interval pace ranges with a transparent usefulness rating.",
    icon: Calculator,
    url: "/tools/training-pace-calculator",
    status: "available",
    authRequired: false,
    ctaLabel: "Calculate Paces",
    features: ["Five practical pace ranges", "Race-recency rating", "Miles or kilometers", "No account required"]
  },
  {
    id: "race-split-calculator",
    title: "Race Split Calculator",
    description: "Create exact mile or kilometer splits for even, conservative-start, or negative-split race strategies.",
    icon: Target,
    url: "/tools/race-split-calculator",
    status: "available",
    authRequired: false,
    ctaLabel: "Build Split Chart",
    features: ["Exact cumulative times", "Three pacing strategies", "Partial final splits", "Copy and print"]
  },
  {
    id: "shoe-database",
    title: "Running Shoe Database",
    description: "Browse currently available sourced running-shoe records with specifications, verification details, and clearly labeled editorial guidance.",
    icon: ShoppingBag,
    url: "/tools/shoes",
    status: "available",
    ctaLabel: "Browse Shoes",
    features: [
      "Sourced shoe specifications",
      "Verified specifications",
      "Filter by category",
      "Compare side-by-side"
    ]
  },
  {
    id: "shoe-finder",
    title: "Personalized Shoe Finder",
    description: "Get shoe recommendations tailored to your weight, running goals, and foot type. Find the perfect shoe match for your running style.",
    icon: Target,
    url: "/tools/shoe-finder",
    status: "available",
    ctaLabel: "Find Your Shoe",
    features: [
      "Weight-based matching",
      "Goal-specific suggestions",
      "Stability recommendations",
      "Match scoring"
    ]
  },
  {
    id: "rotation-planner",
    title: "Shoe Rotation Planner",
    description: "Draft a practical shoe rotation for daily training, speed work, long runs, and racing based on the records currently available.",
    icon: RefreshCw,
    url: "/tools/rotation-planner",
    status: "available",
    ctaLabel: "Build Rotation",
    features: [
      "Complete rotation setup",
      "Role-based recommendations",
      "Runner-weight optimized",
      "Usage guidelines"
    ]
  },
  {
    id: "shoe-comparisons",
    title: "Shoe Comparisons",
    description: "Browse current side-by-side comparisons with sourced specifications and clearly labeled editorial verdicts.",
    icon: GitCompare,
    url: "/tools/shoes/compare",
    status: "available",
    ctaLabel: "Browse Comparisons",
    features: [
      "Current indexed comparisons",
      "Side-by-side specs",
      "Expert verdicts",
      "Evolution & rivals"
    ]
  }
];

export default function ToolsPage() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <SEO
        title="Free Running Tools & Calculators | RunAnalytics"
        description="Running calculators for race pacing, fueling and training analysis. Manual tools work without an account; Strava-powered analysis requires sign-in."
        keywords="running tools, running calculators, free running apps, marathon calculator, running analysis"
        url="https://aitracker.run/tools"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Free Running Tools & Calculators",
          "description": "Running calculators and analyzers. Manual tools work without an account; connected analysis requires Strava sign-in.",
          "numberOfItems": 12,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Running Heatmap", "url": "https://aitracker.run/tools/heatmap" },
            { "@type": "ListItem", "position": 2, "name": "Aerobic Decoupling Calculator", "url": "https://aitracker.run/tools/aerobic-decoupling-calculator" },
            { "@type": "ListItem", "position": 3, "name": "Training Split Analyzer", "url": "https://aitracker.run/tools/training-split-analyzer" },
            { "@type": "ListItem", "position": 4, "name": "Marathon Fueling Planner", "url": "https://aitracker.run/tools/marathon-fueling" },
            { "@type": "ListItem", "position": 5, "name": "Race Time Predictor", "url": "https://aitracker.run/tools/race-predictor" },
            { "@type": "ListItem", "position": 6, "name": "Cadence Analyzer", "url": "https://aitracker.run/tools/cadence-analyzer" },
            { "@type": "ListItem", "position": 7, "name": "Training Pace Calculator", "url": "https://aitracker.run/tools/training-pace-calculator" },
            { "@type": "ListItem", "position": 8, "name": "Race Split Calculator", "url": "https://aitracker.run/tools/race-split-calculator" },
            { "@type": "ListItem", "position": 9, "name": "Running Shoe Database", "url": "https://aitracker.run/tools/shoes" },
            { "@type": "ListItem", "position": 10, "name": "Shoe Finder", "url": "https://aitracker.run/tools/shoe-finder" },
            { "@type": "ListItem", "position": 11, "name": "Rotation Planner", "url": "https://aitracker.run/tools/rotation-planner" },
            { "@type": "ListItem", "position": 12, "name": "Shoe Comparisons", "url": "https://aitracker.run/tools/shoes/compare" }
          ]
        }}
      />

      <div className="min-h-screen bg-light-grey">
        {/* Header */}
        <PublicHeader />

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
                Use focused calculators and analyzers with clearly labeled inputs and limitations.
                {isAuthenticated ? (
                  <> Auto-import your Strava data or enter values manually.</>
                ) : (
                  <> Manual tools need no account; connected analyzers clearly show when Strava sign-in is required.</>
                )}
              </p>

              {!isAuthenticated && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/auth">
                    <Button size="lg" className="bg-strava-orange text-white hover:bg-strava-orange/90 w-full sm:w-auto" data-testid="button-get-started">
                      Get My Free Strava Analysis
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
              const requiresAuth = tool.authRequired;
              
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
                  {isAvailable && requiresAuth && !isAuthenticated && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-blue-500 text-white">Login Required</Badge>
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
                            {tool.ctaLabel || "Open Tool"}
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
                  Get realistic race estimates with a modeled scenario range. Plan your pacing strategy
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
