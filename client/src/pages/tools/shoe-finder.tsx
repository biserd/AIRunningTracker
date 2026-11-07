import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowRight, Target, Scale, Zap, Star, DollarSign, Ruler, TrendingUp, Check } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import AppHeader from "@/components/AppHeader";
import PublicHeader from "@/components/PublicHeader";
import type { RunningShoe } from "@shared/schema";
import { shoeNumber } from "@shared/shoeEvidence";
import { shoeEvidence } from "@shared/shoeEditorial";
import { ToolResultActions } from "@/components/ToolResultActions";
import { trackFunnelEvent } from "@/lib/analytics";

const categoryLabels: Record<string, string> = {
  daily_trainer: "Daily Trainer",
  racing: "Racing",
  long_run: "Long Run",
  recovery: "Recovery",
  speed_training: "Speed Training",
  trail: "Trail"
};

const goalOptions = [
  { value: "daily", label: "Daily Training", description: "Versatile shoes for most runs" },
  { value: "racing", label: "Race Day", description: "Models catalogued for racing" },
  { value: "marathon", label: "Marathon Training", description: "Long-run and race-day options" },
  { value: "speed", label: "Speed Work & Intervals", description: "Fast workouts and tempo runs" },
  { value: "recovery", label: "Easy Days & Recovery", description: "Easy-day and recovery categories" },
  { value: "general", label: "All-Around Running", description: "One shoe for everything" }
];

const footTypeOptions = [
  { value: "neutral", label: "Neutral", description: "I usually prefer a neutral shoe" },
  { value: "overpronator", label: "More support", description: "I prefer a stability category" },
  { value: "unsure", label: "Not sure", description: "Show options without a support preference" }
];

interface ShoeWithScore extends RunningShoe {
  matchScore: number;
  matchReasons?: string[];
}

export default function ShoeFinderPage() {
  const { isAuthenticated } = useAuth();
  const [weight, setWeight] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [footType, setFootType] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [submitted, setSubmitted] = useState({ weight: "", goal: "", footType: "" });
  useEffect(() => { trackFunnelEvent("tool_viewed", { source: "shoe_finder", capability: "shoe_shortlist" }, { oncePerSession: true, dedupeParts: ["shoe_finder"] }); }, []);

  const { data: results, isLoading: isLoadingResults, isError: resultsError, refetch: searchShoes } = useQuery<ShoeWithScore[]>({
    queryKey: ['/api/shoes/recommend', submitted],
    queryFn: async () => {
      const params = new URLSearchParams({
        weight: submitted.weight,
        goal: submitted.goal,
        footType: submitted.footType
      });
      const response = await fetch(`/api/shoes/recommend?${params}`);
      if (!response.ok) throw new Error('Failed to get recommendations');
      return response.json();
    },
    enabled: showResults && !!submitted.weight && !!submitted.goal && !!submitted.footType
  });

  const handleSearch = () => {
    setVisibleCount(3);
    setSubmitted({ weight, goal, footType });
    setShowResults(true);
  };

  const validWeight = Number(weight) >= 50 && Number(weight) <= 500;
  const isFormComplete = validWeight && goal && footType;

  return (
    <>
      <SEO
        title="Running Shoe Finder: Build a Shortlist in 3 Questions"
        description="Find running-shoe options by running goal, body weight and support preference. Review why each model appears, then compare specifications and check fit. Free tool."
        keywords="running shoe finder, best running shoes 2026, shoe recommendations by pace, shoe finder by brand, running shoe quiz"
        url="https://aitracker.run/tools/shoe-finder"
        ogTitle="Running Shoe Finder: Build a Shortlist in 3 Questions"
        ogDescription="Choose your running goal, weight and support preference, then compare a shortlist of catalogued models."
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Running Shoe Finder",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "description": "A free catalogue shortlist based on three inputs, with source dates and specification comparisons."
        }}
      />

      <div className="min-h-screen bg-light-grey">
        <PublicHeader />

        <div className="bg-gradient-to-br from-green-50 via-white to-teal-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full mb-6">
                <Target size={20} />
                <span className="font-semibold text-sm">Personalized Shoe Finder</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mb-4">
                Running Shoe Finder
              </h1>
              
              <p className="text-lg text-gray-600">
                Answer three questions to build a running-shoe shortlist. We rank catalogue categories and your preferences; a try-on and your experience decide the fit.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-bold text-charcoal mb-6">Tell Us About Yourself</h2>
            
            <div className="space-y-8">
              <div>
                <Label htmlFor="finder-weight" className="text-base font-medium flex items-center gap-2 mb-3">
                  <Scale className="h-5 w-5 text-gray-400" />
                  Your Weight (lbs)
                </Label>
                <Input
                  id="finder-weight"
                  type="number"
                  min="50" max="500"
                  placeholder="e.g., 165"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-weight"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Used only where the catalogue includes a runner-weight range. It does not predict comfort or durability.
                </p>
                {weight && !validWeight && <p role="alert" className="text-sm text-red-700 mt-2">Enter a weight between 50 and 500 lb.</p>}
              </div>

              <div>
                <Label className="text-base font-medium flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                  Primary Running Goal
                </Label>
                <RadioGroup value={goal} onValueChange={setGoal} className="grid sm:grid-cols-2 gap-3">
                  {goalOptions.map(option => (
                    <div key={option.value} className="relative">
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className="flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-strava-orange peer-data-[state=checked]:bg-orange-50"
                        data-testid={`radio-goal-${option.value}`}
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-sm text-gray-500">{option.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-gray-400" />
                  Your Support Preference
                </Label>
                <RadioGroup value={footType} onValueChange={setFootType} className="grid sm:grid-cols-3 gap-3">
                  {footTypeOptions.map(option => (
                    <div key={option.value} className="relative">
                      <RadioGroupItem
                        value={option.value}
                        id={`foot-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`foot-${option.value}`}
                        className="flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-strava-orange peer-data-[state=checked]:bg-orange-50 text-center"
                        data-testid={`radio-foot-${option.value}`}
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button 
                onClick={handleSearch}
                disabled={!isFormComplete}
                className="w-full bg-strava-orange text-white hover:bg-strava-orange/90 h-12 text-lg"
                data-testid="button-find-shoes"
              >
                {isLoadingResults ? "Finding shoe options…" : isFormComplete ? "Build my shortlist" : "Complete the three questions"}
              </Button>
            </div>
          </div>

          {showResults && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-charcoal">
                Your Running-Shoe Shortlist
              </h2>
              <p className="text-gray-600">
                Based on {submitted.weight} lb, {goalOptions.find(g => g.value === submitted.goal)?.label.toLowerCase()} and {footTypeOptions.find(f => f.value === submitted.footType)?.label.toLowerCase()} support preference. Rankings describe catalogue matches, not measured performance or injury prevention.
              </p>

              {isLoadingResults ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-60" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : resultsError ? <p role="alert">Your shortlist could not load. <button onClick={() => searchShoes()} className="underline">Try again</button>.</p> : results && results.length > 0 ? (
                <div className="space-y-4">
                  {results.slice(0, visibleCount).map((shoe, idx) => (
                    <Card 
                      key={shoe.id} 
                      className={`relative overflow-hidden ${idx === 0 ? 'ring-2 ring-strava-orange' : ''}`}
                      data-testid={`card-recommendation-${shoe.id}`}
                    >
                      {idx === 0 && (
                        <div className="absolute top-0 right-0 bg-strava-orange text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                          First option to research
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-strava-orange">{shoe.brand}</p>
                            <CardTitle className="text-xl">{shoe.model}</CardTitle>
                            <CardDescription className="mt-1">
                              {categoryLabels[shoe.category]} | {shoe.stability === 'neutral' ? 'Neutral' : shoe.stability === 'mild_stability' ? 'Mild Stability' : 'Motion Control'}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-2xl font-bold text-strava-orange">
                              <TrendingUp className="h-5 w-5" />
                              {idx + 1}
                            </div>
                            <p className="text-xs text-gray-500">Shortlist order</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">{shoe.description}</p>
                        <p className="text-sm mb-3">{shoe.matchReasons?.join(" · ") || "Review category and support against your preferences."}</p>
                        <p className="text-xs text-slate-600 mb-4">Source checked: {shoeEvidence(shoe).checked || "not recorded"}. Recorded USD price; confirm your size and current offer with the source.</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-gray-400" />
                            <span>{shoeNumber(shoe.weight, ' oz')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-gray-400" />
                            <span>{shoe.heelToToeDrop}mm drop</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span>${shoe.price}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{shoe.comfortRating == null ? 'Comfort not rated' : `${shoe.comfortRating} comfort`}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          {shoe.hasCarbonPlate && (
                            <Badge className="bg-purple-100 text-purple-700">Carbon Plate</Badge>
                          )}
                          {shoe.hasSuperFoam && (
                            <Badge className="bg-blue-100 text-blue-700">Super Foam</Badge>
                          )}
                          {shoe.bestFor?.map((use, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {use.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <Link href={`/tools/shoes/${shoe.slug}`}>
                            <Button variant="outline" className="w-full hover:bg-strava-orange hover:text-white hover:border-strava-orange" data-testid={`button-view-shoe-${shoe.id}`}>
                              View Full Details
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
                    <p className="text-gray-500">Complete the form above to get personalized shoe recommendations.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {showResults && results && results.length > 1 && !isLoadingResults && !resultsError && <div className="mt-6"><Link className="inline-block rounded-lg bg-orange-700 text-white font-semibold px-5 py-3" href={`/tools/shoe-compare?shoes=${results.slice(0, 2).map(s => s.slug).join(",")}`}>Compare the first two options →</Link><ToolResultActions source="shoe_finder_result" capability="shoe_shortlist" title="My running-shoe shortlist" summary={results.slice(0, 5).map(s => `${s.brand} ${s.model}: ${s.matchReasons?.join(", ") || s.category}; recorded $${s.price}; https://aitracker.run/tools/shoes/${s.slug}`).join("\n")} /></div>}

          {showResults && results && results.length > visibleCount && <button onClick={() => setVisibleCount(results.length)} className="mt-5 underline text-orange-800">Show {results.length - visibleCount} more options</button>}
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-charcoal mb-4">Explore More</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <Link href="/tools/shoes">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-strava-orange hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-strava-orange/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-strava-orange" />
                    </div>
                    <h3 className="font-semibold">Browse Full Database</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Browse the catalogue by brand, category and specifications.
                  </p>
                </div>
              </Link>
              <Link href="/tools/rotation-planner">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-strava-orange hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-strava-orange/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-strava-orange" />
                    </div>
                    <h3 className="font-semibold">Shoe Rotation Planner</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Build a complete rotation for all your training needs.
                  </p>
                </div>
              </Link>
            </div>
            <p className="mt-5 text-sm"><Link href="/tools/shoes/compare" className="underline text-orange-800 mr-4">Compare running shoes</Link><Link href="/blog/how-to-compare-running-shoes" className="underline text-orange-800">How to compare before buying</Link></p>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
