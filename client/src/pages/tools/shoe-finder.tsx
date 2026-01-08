import { useState } from "react";
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
import type { RunningShoe } from "@shared/schema";

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
  { value: "racing", label: "Race Day Performance", description: "Maximum speed and energy return" },
  { value: "marathon", label: "Marathon Training", description: "Long distance comfort and protection" },
  { value: "speed", label: "Speed Work & Intervals", description: "Fast workouts and tempo runs" },
  { value: "recovery", label: "Easy Days & Recovery", description: "Maximum cushion for tired legs" },
  { value: "general", label: "All-Around Running", description: "One shoe for everything" }
];

const footTypeOptions = [
  { value: "neutral", label: "Neutral", description: "Normal arch, no overpronation" },
  { value: "overpronator", label: "Overpronator", description: "Flat feet, need stability support" },
  { value: "supinator", label: "Supinator (Underpronator)", description: "High arch, need flexibility" }
];

interface ShoeWithScore extends RunningShoe {
  matchScore: number;
}

export default function ShoeFinderPage() {
  const { isAuthenticated } = useAuth();
  const [weight, setWeight] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [footType, setFootType] = useState<string>("");
  const [showResults, setShowResults] = useState(false);

  const { data: results, isLoading: isLoadingResults, refetch: searchShoes } = useQuery<ShoeWithScore[]>({
    queryKey: ['/api/shoes/recommend', weight, goal, footType],
    queryFn: async () => {
      const params = new URLSearchParams({
        weight: weight,
        goal: goal,
        footType: footType
      });
      const response = await fetch(`/api/shoes/recommend?${params}`);
      if (!response.ok) throw new Error('Failed to get recommendations');
      return response.json();
    },
    enabled: showResults && !!weight && !!goal && !!footType
  });

  const handleSearch = () => {
    setShowResults(true);
  };

  const isFormComplete = weight && goal && footType;

  return (
    <>
      <SEO
        title="Running Shoe Finder | Personalized Shoe Recommendations | RunAnalytics"
        description="Find your perfect running shoe based on foot type, running style & goals. AI-powered recommendations from 100+ models."
        keywords="running shoe finder, best running shoes, shoe recommendations, running shoe quiz"
        url="https://aitracker.run/tools/shoe-finder"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Running Shoe Finder",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "description": "Find your perfect running shoe based on foot type, running style & goals. AI-powered recommendations from 100+ models."
        }}
      />

      <div className="min-h-screen bg-light-grey">
        {isAuthenticated ? (
          <AppHeader />
        ) : (
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <Link href="/tools">
                  <Button variant="ghost" size="sm" className="px-2 sm:px-4" data-testid="button-back-tools">
                    <ArrowRight className="h-4 w-4 sm:mr-2 rotate-180" />
                    <span className="hidden sm:inline">Back to Tools</span>
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

        <div className="bg-gradient-to-br from-green-50 via-white to-teal-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full mb-6">
                <Target size={20} />
                <span className="font-semibold text-sm">Personalized Shoe Finder</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mb-4">
                Find Your Perfect Running Shoe
              </h1>
              
              <p className="text-lg text-gray-600">
                Answer three simple questions and get personalized shoe recommendations 
                tailored to your body and running goals.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-bold text-charcoal mb-6">Tell Us About Yourself</h2>
            
            <div className="space-y-8">
              <div>
                <Label className="text-base font-medium flex items-center gap-2 mb-3">
                  <Scale className="h-5 w-5 text-gray-400" />
                  Your Weight (lbs)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g., 165"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-weight"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Weight helps determine cushioning and durability needs
                </p>
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
                  Your Foot Type
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
                {isFormComplete ? "Find My Perfect Shoes" : "Complete All Fields to Continue"}
              </Button>
            </div>
          </div>

          {showResults && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-charcoal">
                Your Top Shoe Recommendations
              </h2>
              <p className="text-gray-600">
                Based on your {weight}lb weight, {goalOptions.find(g => g.value === goal)?.label.toLowerCase()} focus, 
                and {footTypeOptions.find(f => f.value === footType)?.label.toLowerCase()} foot type.
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
              ) : results && results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((shoe, idx) => (
                    <Card 
                      key={shoe.id} 
                      className={`relative overflow-hidden ${idx === 0 ? 'ring-2 ring-strava-orange' : ''}`}
                      data-testid={`card-recommendation-${shoe.id}`}
                    >
                      {idx === 0 && (
                        <div className="absolute top-0 right-0 bg-strava-orange text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                          Best Match
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
                              {shoe.matchScore}
                            </div>
                            <p className="text-xs text-gray-500">Match Score</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">{shoe.description}</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-gray-400" />
                            <span>{shoe.weight} oz</span>
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
                            <span>{shoe.comfortRating} comfort</span>
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
                    Explore all 35+ shoes with detailed specifications and filter options.
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
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
