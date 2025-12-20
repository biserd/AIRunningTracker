import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowRight, ShoppingBag, Zap, Scale, Ruler, DollarSign, Star, Filter, X, Check, GitCompare, Plus, Minus } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
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

const stabilityLabels: Record<string, string> = {
  neutral: "Neutral",
  mild_stability: "Mild Stability",
  motion_control: "Motion Control"
};

const cushioningLabels: Record<string, string> = {
  soft: "Soft",
  medium: "Medium",
  firm: "Firm"
};

const COMPARE_STORAGE_KEY = 'runanalytics_shoe_compare';
const MAX_COMPARE_SHOES = 10;

function getCompareList(): string[] {
  try {
    const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setCompareList(slugs: string[]) {
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(slugs));
}

interface ShoeCardProps {
  shoe: RunningShoe;
  isInCompare: boolean;
  onToggleCompare: (slug: string) => void;
  canAddMore: boolean;
}

function ShoeCard({ shoe, isInCompare, onToggleCompare, canAddMore }: ShoeCardProps) {
  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shoe.slug) {
      onToggleCompare(shoe.slug);
    }
  };

  return (
    <div className="relative h-full">
      <Link href={`/tools/shoes/${shoe.slug}`} className="block h-full">
        <Card className={`hover:shadow-lg transition-shadow duration-200 h-full flex flex-col cursor-pointer ${isInCompare ? 'border-strava-orange ring-2 ring-strava-orange/20' : 'hover:border-strava-orange/50'}`} data-testid={`card-shoe-${shoe.id}`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-strava-orange">{shoe.brand}</p>
                <CardTitle className="text-lg mt-1">{shoe.model}</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-gray-100">
                {categoryLabels[shoe.category] || shoe.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{shoe.description}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
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
                <Zap className="h-4 w-4 text-gray-400" />
                <span>{cushioningLabels[shoe.cushioningLevel]}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {shoe.hasCarbonPlate && (
                <Badge className="bg-purple-100 text-purple-700 text-xs">Carbon Plate</Badge>
              )}
              {shoe.hasSuperFoam && (
                <Badge className="bg-blue-100 text-blue-700 text-xs">Super Foam</Badge>
              )}
              <Badge className="bg-gray-100 text-gray-600 text-xs">
                {stabilityLabels[shoe.stability]}
              </Badge>
            </div>

            <div className="mt-auto">
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{shoe.comfortRating}</span>
                  </div>
                  <p className="text-xs text-gray-500">Comfort</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="h-3 w-3 text-green-500 fill-green-500" />
                    <span className="text-sm font-medium">{shoe.durabilityRating}</span>
                  </div>
                  <p className="text-xs text-gray-500">Durability</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
                    <span className="text-sm font-medium">{shoe.responsivenessRating}</span>
                  </div>
                  <p className="text-xs text-gray-500">Response</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center text-strava-orange text-sm font-medium">
                <span>View Details</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      
      {/* Compare Toggle Button - Positioned absolutely */}
      <button
        onClick={handleCompareClick}
        disabled={!isInCompare && !canAddMore}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full shadow-md transition-all ${
          isInCompare 
            ? 'bg-strava-orange text-white hover:bg-strava-orange/90' 
            : canAddMore
              ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        title={isInCompare ? 'Remove from compare' : canAddMore ? 'Add to compare' : 'Max 10 shoes'}
        data-testid={`button-compare-${shoe.slug}`}
      >
        {isInCompare ? (
          <Minus className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export default function ShoeDatabasePage() {
  const { isAuthenticated } = useAuth();
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStability, setSelectedStability] = useState<string>("all");
  const [hasCarbonPlate, setHasCarbonPlate] = useState<string>("all");
  const [compareList, setCompareListState] = useState<string[]>([]);

  // Load compare list from localStorage on mount
  useEffect(() => {
    setCompareListState(getCompareList());
  }, []);

  const { data: shoes, isLoading } = useQuery<RunningShoe[]>({
    queryKey: ['/api/shoes']
  });

  const { data: brands } = useQuery<string[]>({
    queryKey: ['/api/shoes/brands']
  });

  useEffect(() => {
    if (shoes?.length === 0) {
      fetch('/api/shoes/seed', { method: 'POST' });
    }
  }, [shoes]);

  const handleToggleCompare = (slug: string) => {
    setCompareListState(prev => {
      const newList = prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length < MAX_COMPARE_SHOES 
          ? [...prev, slug]
          : prev;
      setCompareList(newList);
      return newList;
    });
  };

  const handleClearCompare = () => {
    setCompareListState([]);
    setCompareList([]);
  };

  const filteredShoes = (shoes?.filter(shoe => {
    if (selectedBrand !== "all" && shoe.brand !== selectedBrand) return false;
    if (selectedCategory !== "all" && shoe.category !== selectedCategory) return false;
    if (selectedStability !== "all" && shoe.stability !== selectedStability) return false;
    if (hasCarbonPlate === "yes" && !shoe.hasCarbonPlate) return false;
    if (hasCarbonPlate === "no" && shoe.hasCarbonPlate) return false;
    return true;
  })?.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })) || [];

  const hasActiveFilters = selectedBrand !== "all" || selectedCategory !== "all" || 
                            selectedStability !== "all" || hasCarbonPlate !== "all";

  const clearFilters = () => {
    setSelectedBrand("all");
    setSelectedCategory("all");
    setSelectedStability("all");
    setHasCarbonPlate("all");
  };

  const canAddMore = compareList.length < MAX_COMPARE_SHOES;
  const compareUrl = `/tools/shoes/compare?shoes=${compareList.join(',')}`;

  // Get shoe names for the compare bar
  const compareShoeNames = shoes?.filter(s => s.slug && compareList.includes(s.slug))
    .map(s => `${s.brand} ${s.model}`) || [];

  return (
    <>
      <Helmet>
        <title>Running Shoe Database - 100+ Verified Shoes from 16 Brands | RunAnalytics</title>
        <meta name="description" content="Browse our comprehensive running shoe database with 100+ verified shoes from Nike, Brooks, Hoka, Asics, New Balance, Saucony, On, Altra, Adidas, Puma, Mizuno, Salomon, and more. Compare specs, cushioning, stability, and find your perfect running shoe." />
        <meta name="keywords" content="running shoes database, best running shoes 2025, running shoe comparison, Nike running shoes, Hoka running shoes, Brooks running shoes, trail running shoes, racing flats" />
        <meta property="og:title" content="Running Shoe Database - 100+ Verified Running Shoes | RunAnalytics" />
        <meta property="og:description" content="Browse 100+ verified running shoes from 16 top brands. Filter by category, stability, and features to find your perfect shoe." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitracker.run/tools/shoes" />
        <link rel="canonical" href="https://aitracker.run/tools/shoes" />
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

        <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-strava-orange/10 text-strava-orange px-4 py-2 rounded-full mb-6">
                <ShoppingBag size={20} />
                <span className="font-semibold text-sm">Running Shoe Database</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mb-4">
                Find Your Perfect Running Shoe
              </h1>
              
              <p className="text-lg text-gray-600 mb-6">
                Browse {shoes?.length || 100}+ verified running shoes from 16 major brands. 
                Compare specs, cushioning, and stability features to find the right shoe for your running style.
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                {brands?.map(brand => (
                  <Badge key={brand} variant="outline" className="bg-white px-3 py-1">
                    {brand}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filter Shoes</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Brand</label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger data-testid="select-brand">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands?.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="daily_trainer">Daily Trainer</SelectItem>
                    <SelectItem value="racing">Racing</SelectItem>
                    <SelectItem value="long_run">Long Run</SelectItem>
                    <SelectItem value="recovery">Recovery</SelectItem>
                    <SelectItem value="speed_training">Speed Training</SelectItem>
                    <SelectItem value="trail">Trail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Stability</label>
                <Select value={selectedStability} onValueChange={setSelectedStability}>
                  <SelectTrigger data-testid="select-stability">
                    <SelectValue placeholder="All Stability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="mild_stability">Mild Stability</SelectItem>
                    <SelectItem value="motion_control">Motion Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Carbon Plate</label>
                <Select value={hasCarbonPlate} onValueChange={setHasCarbonPlate}>
                  <SelectTrigger data-testid="select-carbon">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="yes">With Carbon Plate</SelectItem>
                    <SelectItem value="no">No Carbon Plate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing <span className="font-medium">{filteredShoes.length}</span> shoes
              {hasActiveFilters && <span className="text-gray-400"> (filtered)</span>}
            </p>
            <p className="text-sm text-gray-500">
              Click <Plus className="h-3 w-3 inline" /> on shoes to compare (max 10)
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-80">
                  <CardHeader>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-40 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredShoes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shoes found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters to see more results.</p>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShoes.map(shoe => (
                <ShoeCard 
                  key={shoe.id} 
                  shoe={shoe} 
                  isInCompare={shoe.slug ? compareList.includes(shoe.slug) : false}
                  onToggleCompare={handleToggleCompare}
                  canAddMore={canAddMore}
                />
              ))}
            </div>
          )}

          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-charcoal mb-4">Need Help Choosing?</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <Link href="/tools/shoe-finder">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-strava-orange hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-strava-orange/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-strava-orange" />
                    </div>
                    <h3 className="font-semibold">Personalized Shoe Finder</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Answer a few questions about your running style and get personalized recommendations.
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
                    Build a complete shoe rotation for daily training, speed work, long runs, and racing.
                  </p>
                </div>
              </Link>
              <Link href={compareList.length >= 2 ? compareUrl : "#"} onClick={(e) => compareList.length < 2 && e.preventDefault()}>
                <div className={`p-4 border border-gray-200 rounded-lg transition-all cursor-pointer ${compareList.length >= 2 ? 'hover:border-strava-orange hover:shadow-md' : 'opacity-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-strava-orange/10 flex items-center justify-center">
                      <GitCompare className="h-5 w-5 text-strava-orange" />
                    </div>
                    <h3 className="font-semibold">Compare Shoes</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {compareList.length >= 2 
                      ? `Compare ${compareList.length} selected shoes side-by-side.`
                      : 'Select 2+ shoes above to compare them side-by-side.'}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Compare Bar */}
        {compareList.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-strava-orange text-white px-3 py-1">
                  {compareList.length} shoe{compareList.length !== 1 ? 's' : ''} selected
                </Badge>
                <div className="hidden sm:flex flex-wrap gap-1 max-w-xl">
                  {compareShoeNames.slice(0, 3).map((name, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {compareShoeNames.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{compareShoeNames.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearCompare}
                  className="text-gray-500"
                  data-testid="button-clear-compare"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Link href={compareUrl}>
                  <Button 
                    className="bg-strava-orange hover:bg-strava-orange/90 text-white"
                    disabled={compareList.length < 2}
                    data-testid="button-compare-shoes"
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare {compareList.length} Shoes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className={compareList.length > 0 ? 'pb-24' : ''}>
          <Footer />
        </div>
      </div>
    </>
  );
}
