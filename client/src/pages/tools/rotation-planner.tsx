import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowRight, RefreshCw, Scale, Timer, Star, DollarSign, Ruler, Zap, Lightbulb, Check } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import type { RunningShoe } from "@shared/schema";

interface RotationItem {
  role: string;
  shoe: RunningShoe;
  usage: string;
  description: string;
}

interface RotationResponse {
  rotation: RotationItem[];
  userProfile: {
    weight: number;
    weeklyMileage: number;
  };
  tip: string;
}

const roleIcons: Record<string, typeof Zap> = {
  "Daily Trainer": Timer,
  "Long Run": RefreshCw,
  "Speed Work": Zap,
  "Race Day": Star,
  "Recovery": Lightbulb
};

const roleColors: Record<string, string> = {
  "Daily Trainer": "bg-blue-500",
  "Long Run": "bg-green-500",
  "Speed Work": "bg-orange-500",
  "Race Day": "bg-purple-500",
  "Recovery": "bg-teal-500"
};

export default function RotationPlannerPage() {
  const { isAuthenticated } = useAuth();
  const [weight, setWeight] = useState<string>("");
  const [weeklyMileage, setWeeklyMileage] = useState<string>("");
  const [showResults, setShowResults] = useState(false);

  const { data: rotation, isLoading, refetch } = useQuery<RotationResponse>({
    queryKey: ['/api/shoes/rotation', weight, weeklyMileage],
    queryFn: async () => {
      const params = new URLSearchParams({
        weight: weight || "160",
        weeklyMileage: weeklyMileage || "30"
      });
      const response = await fetch(`/api/shoes/rotation?${params}`);
      return response.json();
    },
    enabled: showResults
  });

  const handleBuildRotation = () => {
    setShowResults(true);
    refetch();
  };

  const isFormComplete = weight && weeklyMileage;
  const totalCost = rotation?.rotation.reduce((sum, item) => sum + (item.shoe?.price || 0), 0) || 0;

  return (
    <>
      <Helmet>
        <title>Running Shoe Rotation Planner - Build Your Perfect Training Setup | RunAnalytics</title>
        <meta name="description" content="Build the optimal running shoe rotation for your training. Get personalized recommendations from 100+ verified shoes for daily trainers, speed work, long runs, racing, and recovery." />
        <meta name="keywords" content="shoe rotation planner, running shoe rotation, training shoe setup, best shoes for daily training, racing shoes vs training shoes" />
        <meta property="og:title" content="Running Shoe Rotation Planner | RunAnalytics" />
        <meta property="og:description" content="Build a complete shoe rotation tailored to your weight and mileage. Expert recommendations for every type of run from 100+ verified shoes." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitracker.run/tools/rotation-planner" />
        <link rel="canonical" href="https://aitracker.run/tools/rotation-planner" />
      </Helmet>

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

        <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-purple-500/10 text-purple-600 px-4 py-2 rounded-full mb-6">
                <RefreshCw size={20} />
                <span className="font-semibold text-sm">Shoe Rotation Planner</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mb-4">
                Build Your Perfect Shoe Rotation
              </h1>
              
              <p className="text-lg text-gray-600">
                Get personalized recommendations for a complete shoe rotation. 
                Different shoes for different runs keeps you injury-free and performing your best.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-bold text-charcoal mb-6">Your Running Profile</h2>
            
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
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
                  data-testid="input-weight"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Helps match cushioning and durability
                </p>
              </div>

              <div>
                <Label className="text-base font-medium flex items-center gap-2 mb-3">
                  <Timer className="h-5 w-5 text-gray-400" />
                  Weekly Mileage
                </Label>
                <Input
                  type="number"
                  placeholder="e.g., 35"
                  value={weeklyMileage}
                  onChange={(e) => setWeeklyMileage(e.target.value)}
                  data-testid="input-mileage"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Average miles per week
                </p>
              </div>
            </div>

            <Button 
              onClick={handleBuildRotation}
              disabled={!isFormComplete}
              className="w-full bg-strava-orange text-white hover:bg-strava-orange/90 h-12 text-lg"
              data-testid="button-build-rotation"
            >
              {isFormComplete ? "Build My Rotation" : "Enter Your Details to Continue"}
            </Button>
          </div>

          {showResults && (
            <div className="space-y-6">
              {rotation?.tip && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                    <p className="text-gray-700">{rotation.tip}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-charcoal">
                  Your Recommended Rotation
                </h2>
                {totalCost > 0 && (
                  <Badge className="bg-gray-100 text-gray-700 text-lg px-4 py-1">
                    Total: ${totalCost}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : rotation?.rotation && rotation.rotation.length > 0 ? (
                <div className="space-y-4">
                  {rotation.rotation.map((item, idx) => {
                    const Icon = roleIcons[item.role] || Timer;
                    const bgColor = roleColors[item.role] || "bg-gray-500";
                    
                    return (
                      <Card key={idx} className="overflow-hidden" data-testid={`card-rotation-${idx}`}>
                        <div className="flex">
                          <div className={`w-2 ${bgColor}`} />
                          <div className="flex-1">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center text-white`}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{item.role}</CardTitle>
                                    <CardDescription>{item.usage}</CardDescription>
                                  </div>
                                </div>
                                {item.shoe && (
                                  <Badge className="bg-strava-orange text-white">
                                    ${item.shoe.price}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            
                            {item.shoe && (
                              <CardContent>
                                <p className="text-sm text-gray-500 mb-3">{item.description}</p>
                                
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <p className="text-sm font-medium text-strava-orange">{item.shoe.brand}</p>
                                      <h4 className="font-semibold text-lg">{item.shoe.model}</h4>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                      <span className="text-sm font-medium">{item.shoe.comfortRating}</span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-sm text-gray-600 mb-3">{item.shoe.description}</p>
                                  
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <Scale className="h-4 w-4 text-gray-400" />
                                      <span>{item.shoe.weight} oz</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Ruler className="h-4 w-4 text-gray-400" />
                                      <span>{item.shoe.heelToToeDrop}mm drop</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Zap className="h-4 w-4 text-gray-400" />
                                      <span className="capitalize">{item.shoe.cushioningLevel}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {item.shoe.hasCarbonPlate && (
                                      <Badge className="bg-purple-100 text-purple-700 text-xs">Carbon Plate</Badge>
                                    )}
                                    {item.shoe.hasSuperFoam && (
                                      <Badge className="bg-blue-100 text-blue-700 text-xs">Super Foam</Badge>
                                    )}
                                  </div>

                                  <div className="mt-4">
                                    <Link href={`/tools/shoes/${item.shoe.slug}`}>
                                      <Button variant="outline" size="sm" className="w-full hover:bg-strava-orange hover:text-white hover:border-strava-orange" data-testid={`button-view-shoe-${item.shoe.id}`}>
                                        View Full Details
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </CardContent>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Building your rotation...</h3>
                    <p className="text-gray-500">Enter your weight and weekly mileage above.</p>
                  </CardContent>
                </Card>
              )}

              {rotation?.rotation && rotation.rotation.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-charcoal mb-4">Why Use a Shoe Rotation?</h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Reduce Injury Risk</p>
                        <p className="text-gray-500">Different shoes stress your body differently</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Extend Shoe Life</p>
                        <p className="text-gray-500">Shoes last longer with rest days between runs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Optimize Performance</p>
                        <p className="text-gray-500">Right shoe for each workout type</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Strengthen Your Feet</p>
                        <p className="text-gray-500">Variety builds more resilient muscles</p>
                      </div>
                    </div>
                  </div>
                </div>
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
                    Explore all 35+ shoes with detailed specifications.
                  </p>
                </div>
              </Link>
              <Link href="/tools/shoe-finder">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-strava-orange hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-strava-orange/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-strava-orange" />
                    </div>
                    <h3 className="font-semibold">Personalized Shoe Finder</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Get recommendations based on your specific needs.
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
