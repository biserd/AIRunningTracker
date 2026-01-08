import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Scale, 
  Ruler, 
  DollarSign, 
  Star, 
  Zap, 
  X,
  Plus,
  ExternalLink,
  Trophy
} from "lucide-react";
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

interface ComparisonSpec {
  label: string;
  key: string;
  getValue: (shoe: RunningShoe) => string | number;
  unit?: string;
  isBestFn?: (values: (string | number)[]) => number; // returns index of best value
  icon?: React.ReactNode;
}

const specs: ComparisonSpec[] = [
  {
    label: "Weight",
    key: "weight",
    getValue: (shoe) => shoe.weight,
    unit: "oz",
    isBestFn: (values) => values.indexOf(Math.min(...values.map(Number))),
    icon: <Scale className="h-4 w-4" />
  },
  {
    label: "Drop",
    key: "heelToToeDrop",
    getValue: (shoe) => shoe.heelToToeDrop,
    unit: "mm",
    icon: <Ruler className="h-4 w-4" />
  },
  {
    label: "Heel Stack",
    key: "heelStackHeight",
    getValue: (shoe) => shoe.heelStackHeight,
    unit: "mm",
    icon: <Ruler className="h-4 w-4" />
  },
  {
    label: "Forefoot Stack",
    key: "forefootStackHeight",
    getValue: (shoe) => shoe.forefootStackHeight,
    unit: "mm",
    icon: <Ruler className="h-4 w-4" />
  },
  {
    label: "Price",
    key: "price",
    getValue: (shoe) => shoe.price,
    unit: "$",
    isBestFn: (values) => values.indexOf(Math.min(...values.map(Number))),
    icon: <DollarSign className="h-4 w-4" />
  },
  {
    label: "Cushioning",
    key: "cushioningLevel",
    getValue: (shoe) => cushioningLabels[shoe.cushioningLevel] || shoe.cushioningLevel,
    icon: <Zap className="h-4 w-4" />
  },
  {
    label: "Stability",
    key: "stability",
    getValue: (shoe) => stabilityLabels[shoe.stability] || shoe.stability,
  },
  {
    label: "Comfort",
    key: "comfortRating",
    getValue: (shoe) => shoe.comfortRating,
    unit: "/5",
    isBestFn: (values) => values.indexOf(Math.max(...values.map(Number))),
    icon: <Star className="h-4 w-4 text-yellow-500" />
  },
  {
    label: "Durability",
    key: "durabilityRating",
    getValue: (shoe) => shoe.durabilityRating,
    unit: "/5",
    isBestFn: (values) => values.indexOf(Math.max(...values.map(Number))),
    icon: <Star className="h-4 w-4 text-green-500" />
  },
  {
    label: "Responsiveness",
    key: "responsivenessRating",
    getValue: (shoe) => shoe.responsivenessRating,
    unit: "/5",
    isBestFn: (values) => values.indexOf(Math.max(...values.map(Number))),
    icon: <Star className="h-4 w-4 text-orange-500" />
  },
  {
    label: "Carbon Plate",
    key: "hasCarbonPlate",
    getValue: (shoe) => shoe.hasCarbonPlate ? "Yes" : "No",
  },
  {
    label: "Super Foam",
    key: "hasSuperFoam",
    getValue: (shoe) => shoe.hasSuperFoam ? "Yes" : "No",
  },
  {
    label: "Category",
    key: "category",
    getValue: (shoe) => categoryLabels[shoe.category] || shoe.category,
  },
  {
    label: "Release Year",
    key: "releaseYear",
    getValue: (shoe) => shoe.releaseYear,
  },
];

export default function ShoeComparePage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [slugsParam, setSlugsParam] = useState('');
  
  // Parse slugs from URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shoes = params.get('shoes') || '';
    setSlugsParam(shoes);
  }, []);
  
  const slugs = slugsParam.split(',').filter(s => s.trim().length > 0);
  
  const { data, isLoading, error } = useQuery<{ shoes: RunningShoe[]; foundCount: number }>({
    queryKey: ['/api/shoes/compare', slugsParam],
    queryFn: async () => {
      if (!slugsParam) return { shoes: [], foundCount: 0 };
      const response = await fetch(`/api/shoes/compare?slugs=${encodeURIComponent(slugsParam)}`);
      if (!response.ok) throw new Error('Failed to fetch shoes');
      return response.json();
    },
    enabled: slugs.length > 0,
  });

  const shoes = data?.shoes || [];
  
  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link to show your comparison",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleRemoveShoe = (slugToRemove: string) => {
    const newSlugs = slugs.filter(s => s !== slugToRemove);
    if (newSlugs.length > 0) {
      window.location.href = `/tools/shoes/compare?shoes=${newSlugs.join(',')}`;
    } else {
      window.location.href = '/tools/shoes';
    }
  };

  const pageTitle = shoes.length > 0 
    ? `Compare: ${shoes.map(s => `${s.brand} ${s.model}`).join(' vs ')} | RunAnalytics`
    : 'Shoe Comparison Tool | RunAnalytics';
  
  const pageDescription = shoes.length > 0
    ? `Compare ${shoes.length} running shoes side-by-side: ${shoes.map(s => `${s.brand} ${s.model}`).join(', ')}. View specs, ratings, and find the best shoe for you.`
    : 'Compare running shoes side-by-side. View weight, drop, cushioning, price, and ratings to find the perfect shoe for your running needs.';

  const seoTitle = shoes.length > 0 
    ? `Compare: ${shoes.map(s => `${s.brand} ${s.model}`).join(' vs ')} | RunAnalytics`
    : "Running Shoe Comparison | Side-by-Side Analysis | RunAnalytics";
  
  const seoDescription = shoes.length > 0
    ? `Compare ${shoes.length} running shoes side-by-side: ${shoes.map(s => `${s.brand} ${s.model}`).join(', ')}. View specs, ratings, and find the best shoe for you.`
    : "Compare running shoes head-to-head. See specs, features & AI analysis to find your best match.";

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords="compare running shoes, shoe comparison, running shoe vs"
        url="https://aitracker.run/tools/shoes/compare"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Running Shoe Comparison",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "description": "Compare running shoes head-to-head. See specs, features & AI analysis to find your best match."
        }}
      />

      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/tools/shoes">
              <Button variant="ghost" size="sm" className="mb-2" data-testid="link-back-shoes">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Shoe Database
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Shoe Comparison
            </h1>
            <p className="text-gray-600 mt-1">
              {shoes.length > 0 
                ? `Comparing ${shoes.length} shoe${shoes.length > 1 ? 's' : ''} side-by-side`
                : 'Select shoes from the database to compare'}
            </p>
          </div>
          
          {shoes.length > 0 && (
            <Button 
              onClick={handleCopyLink}
              variant="outline"
              className="shrink-0"
              data-testid="button-copy-link"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Share Link
                </>
              )}
            </Button>
          )}
        </div>

        {slugs.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="pt-6">
              <Scale className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Shoes Selected</h2>
              <p className="text-gray-600 mb-6">
                Go to the shoe database and click "Add to Compare" on shoes you want to compare.
              </p>
              <Link href="/tools/shoes">
                <Button className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-browse-shoes">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Shoes
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 w-64 shrink-0" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <CardContent className="pt-6">
              <p className="text-red-500">Failed to load shoes. Please try again.</p>
            </CardContent>
          </Card>
        ) : shoes.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="pt-6">
              <p className="text-gray-600">None of the selected shoes were found. They may have been removed.</p>
              <Link href="/tools/shoes">
                <Button className="mt-4 bg-strava-orange hover:bg-strava-orange/90" data-testid="button-browse-shoes-error">
                  Browse Shoes
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Comparison Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-gray-50 z-10 p-4 text-left font-semibold text-gray-700 min-w-[160px] border-b border-gray-200">
                        Specification
                      </th>
                      {shoes.map(shoe => (
                        <th key={shoe.id} className="p-4 text-center border-b border-gray-200 min-w-[200px]">
                          <div className="relative group">
                            <button
                              onClick={() => handleRemoveShoe(shoe.slug || '')}
                              className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                              data-testid={`button-remove-${shoe.slug}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <Link href={`/tools/shoes/${shoe.slug}`}>
                              <div className="cursor-pointer hover:opacity-80 transition-opacity">
                                <Badge className="mb-2 bg-strava-orange/10 text-strava-orange hover:bg-strava-orange/20">
                                  {shoe.brand}
                                </Badge>
                                <h3 className="font-bold text-gray-900">{shoe.model}</h3>
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {categoryLabels[shoe.category]}
                                </Badge>
                              </div>
                            </Link>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((spec, rowIndex) => {
                      const values = shoes.map(shoe => spec.getValue(shoe));
                      const bestIndex = spec.isBestFn ? spec.isBestFn(values) : -1;
                      
                      return (
                        <tr 
                          key={spec.key} 
                          className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="sticky left-0 z-10 p-4 font-medium text-gray-700 border-r border-gray-100" style={{ backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                            <div className="flex items-center gap-2">
                              {spec.icon && <span className="text-gray-400">{spec.icon}</span>}
                              {spec.label}
                            </div>
                          </td>
                          {shoes.map((shoe, colIndex) => {
                            const value = spec.getValue(shoe);
                            const isBest = bestIndex === colIndex && bestIndex !== -1;
                            
                            return (
                              <td 
                                key={shoe.id} 
                                className={`p-4 text-center ${isBest ? 'bg-green-50' : ''}`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {isBest && (
                                    <Trophy className="h-4 w-4 text-green-600" />
                                  )}
                                  <span className={`font-medium ${isBest ? 'text-green-700' : 'text-gray-900'}`}>
                                    {spec.unit === '$' ? `$${value}` : value}
                                    {spec.unit && spec.unit !== '$' ? ` ${spec.unit}` : ''}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add More Shoes */}
            <div className="flex justify-center pt-4">
              <Link href="/tools/shoes">
                <Button variant="outline" size="lg" data-testid="button-add-more-shoes">
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Shoes to Compare
                </Button>
              </Link>
            </div>

            {/* Quick Links to Individual Shoes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {shoes.map(shoe => (
                <Link key={shoe.id} href={`/tools/shoes/${shoe.slug}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-quicklink-${shoe.slug}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-strava-orange font-medium">{shoe.brand}</p>
                        <p className="font-semibold">{shoe.model}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
