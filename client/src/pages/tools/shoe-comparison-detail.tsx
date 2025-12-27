import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { 
  ArrowLeft, 
  Scale, 
  Ruler, 
  DollarSign, 
  Star, 
  Zap, 
  Trophy,
  Check,
  X,
  ArrowRight
} from "lucide-react";
import type { RunningShoe, ShoeComparison } from "@shared/schema";

interface ComparisonWithShoes extends ShoeComparison {
  shoe1: RunningShoe;
  shoe2: RunningShoe;
}

const categoryLabels: Record<string, string> = {
  daily_trainer: "Daily Trainer",
  racing: "Racing",
  long_run: "Long Run",
  recovery: "Recovery",
  speed_training: "Speed Training",
  trail: "Trail"
};

const comparisonTypeLabels: Record<string, string> = {
  evolution: "Model Evolution",
  category_rival: "Category Rivals",
  popular: "Popular Matchup"
};

function SpecRow({ 
  label, 
  value1, 
  value2, 
  unit = "", 
  isBetter1 = false, 
  isBetter2 = false,
  icon 
}: { 
  label: string; 
  value1: string | number; 
  value2: string | number; 
  unit?: string; 
  isBetter1?: boolean; 
  isBetter2?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        {icon}
        {label}
      </div>
      <div className={`text-center font-medium ${isBetter1 ? 'text-green-600 dark:text-green-400' : ''}`}>
        {value1}{unit}
        {isBetter1 && <Check className="inline-block ml-1 h-4 w-4" />}
      </div>
      <div className={`text-center font-medium ${isBetter2 ? 'text-green-600 dark:text-green-400' : ''}`}>
        {value2}{unit}
        {isBetter2 && <Check className="inline-block ml-1 h-4 w-4" />}
      </div>
    </div>
  );
}

export default function ShoeComparisonDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: comparison, isLoading, error } = useQuery<ComparisonWithShoes>({
    queryKey: ['/api/shoes/comparisons/by-slug', slug],
    queryFn: async () => {
      const res = await fetch(`/api/shoes/comparisons/by-slug/${slug}`);
      if (!res.ok) throw new Error('Comparison not found');
      return res.json();
    },
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Comparison Not Found</h1>
          <p className="text-gray-600 mb-6">This shoe comparison doesn't exist.</p>
          <Link href="/tools/shoes/compare">
            <a className="text-strava-orange hover:underline">View all comparisons</a>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { shoe1, shoe2 } = comparison;
  const keyDifferences = comparison.keyDifferences ? JSON.parse(comparison.keyDifferences) : [];
  const bestFor = comparison.bestFor ? JSON.parse(comparison.bestFor) : {};

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{comparison.title} | Running Shoe Comparison | RunAnalytics</title>
        <meta name="description" content={comparison.metaDescription || `Compare ${shoe1.brand} ${shoe1.model} vs ${shoe2.brand} ${shoe2.model}. Side-by-side specs, features, and expert verdict.`} />
        <meta property="og:title" content={comparison.title} />
        <meta property="og:description" content={comparison.metaDescription || ''} />
        <link rel="canonical" href={`https://aitracker.run/tools/shoes/compare/${comparison.slug}`} />
      </Helmet>

      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/tools/shoes/compare">
          <a className="inline-flex items-center text-gray-600 hover:text-strava-orange mb-6" data-testid="link-back-comparisons">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Comparisons
          </a>
        </Link>

        <div className="mb-8">
          <Badge variant="outline" className="mb-2">
            {comparisonTypeLabels[comparison.comparisonType] || comparison.comparisonType}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="comparison-title">
            {comparison.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            {comparison.metaDescription}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className={`${comparison.verdictWinner === 'shoe1' ? 'ring-2 ring-green-500' : ''}`}>
            <CardHeader className="text-center">
              {comparison.verdictWinner === 'shoe1' && (
                <Badge className="bg-green-500 text-white mb-2 mx-auto">
                  <Trophy className="h-3 w-3 mr-1" /> Our Pick
                </Badge>
              )}
              <CardTitle className="text-xl">
                <Link href={`/tools/shoes/${shoe1.slug}`}>
                  <a className="hover:text-strava-orange" data-testid="link-shoe1">
                    {shoe1.brand} {shoe1.model}
                  </a>
                </Link>
              </CardTitle>
              <Badge variant="outline">{categoryLabels[shoe1.category] || shoe1.category}</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-strava-orange">${shoe1.price}</p>
              <p className="text-sm text-gray-500">{shoe1.weight} oz</p>
            </CardContent>
          </Card>

          <Card className={`${comparison.verdictWinner === 'shoe2' ? 'ring-2 ring-green-500' : ''}`}>
            <CardHeader className="text-center">
              {comparison.verdictWinner === 'shoe2' && (
                <Badge className="bg-green-500 text-white mb-2 mx-auto">
                  <Trophy className="h-3 w-3 mr-1" /> Our Pick
                </Badge>
              )}
              <CardTitle className="text-xl">
                <Link href={`/tools/shoes/${shoe2.slug}`}>
                  <a className="hover:text-strava-orange" data-testid="link-shoe2">
                    {shoe2.brand} {shoe2.model}
                  </a>
                </Link>
              </CardTitle>
              <Badge variant="outline">{categoryLabels[shoe2.category] || shoe2.category}</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-strava-orange">${shoe2.price}</p>
              <p className="text-sm text-gray-500">{shoe2.weight} oz</p>
            </CardContent>
          </Card>
        </div>

        {comparison.verdict && (
          <Card className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-strava-orange" />
                Our Verdict
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">{comparison.verdict}</p>
              {comparison.verdictReason && (
                <p className="text-gray-600 dark:text-gray-400">{comparison.verdictReason}</p>
              )}
            </CardContent>
          </Card>
        )}

        {keyDifferences.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Key Differences</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {keyDifferences.map((diff: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-1 text-strava-orange flex-shrink-0" />
                    <span>{diff}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Specifications Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 py-2 border-b font-semibold">
              <div>Spec</div>
              <div className="text-center">{shoe1.brand} {shoe1.model}</div>
              <div className="text-center">{shoe2.brand} {shoe2.model}</div>
            </div>
            
            <SpecRow 
              label="Weight" 
              value1={shoe1.weight} 
              value2={shoe2.weight} 
              unit=" oz"
              isBetter1={shoe1.weight < shoe2.weight}
              isBetter2={shoe2.weight < shoe1.weight}
              icon={<Scale className="h-4 w-4" />}
            />
            <SpecRow 
              label="Drop" 
              value1={shoe1.heelToToeDrop} 
              value2={shoe2.heelToToeDrop} 
              unit=" mm"
              icon={<Ruler className="h-4 w-4" />}
            />
            <SpecRow 
              label="Heel Stack" 
              value1={shoe1.heelStackHeight} 
              value2={shoe2.heelStackHeight} 
              unit=" mm"
              icon={<Ruler className="h-4 w-4" />}
            />
            <SpecRow 
              label="Price" 
              value1={`$${shoe1.price}`} 
              value2={`$${shoe2.price}`}
              isBetter1={shoe1.price < shoe2.price}
              isBetter2={shoe2.price < shoe1.price}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <SpecRow 
              label="Comfort" 
              value1={shoe1.comfortRating} 
              value2={shoe2.comfortRating} 
              unit="/5"
              isBetter1={shoe1.comfortRating > shoe2.comfortRating}
              isBetter2={shoe2.comfortRating > shoe1.comfortRating}
              icon={<Star className="h-4 w-4 text-yellow-500" />}
            />
            <SpecRow 
              label="Durability" 
              value1={shoe1.durabilityRating} 
              value2={shoe2.durabilityRating} 
              unit="/5"
              isBetter1={shoe1.durabilityRating > shoe2.durabilityRating}
              isBetter2={shoe2.durabilityRating > shoe1.durabilityRating}
              icon={<Star className="h-4 w-4 text-green-500" />}
            />
            <SpecRow 
              label="Responsiveness" 
              value1={shoe1.responsivenessRating} 
              value2={shoe2.responsivenessRating} 
              unit="/5"
              isBetter1={shoe1.responsivenessRating > shoe2.responsivenessRating}
              isBetter2={shoe2.responsivenessRating > shoe1.responsivenessRating}
              icon={<Zap className="h-4 w-4 text-blue-500" />}
            />
            <SpecRow 
              label="Carbon Plate" 
              value1={shoe1.hasCarbonPlate ? 'Yes' : 'No'} 
              value2={shoe2.hasCarbonPlate ? 'Yes' : 'No'}
              isBetter1={!!shoe1.hasCarbonPlate && !shoe2.hasCarbonPlate}
              isBetter2={!!shoe2.hasCarbonPlate && !shoe1.hasCarbonPlate}
            />
            <SpecRow 
              label="Super Foam" 
              value1={shoe1.hasSuperFoam ? 'Yes' : 'No'} 
              value2={shoe2.hasSuperFoam ? 'Yes' : 'No'}
              isBetter1={!!shoe1.hasSuperFoam && !shoe2.hasSuperFoam}
              isBetter2={!!shoe2.hasSuperFoam && !shoe1.hasSuperFoam}
            />
          </CardContent>
        </Card>

        {(bestFor.shoe1 || bestFor.shoe2) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Best For</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">{shoe1.brand} {shoe1.model}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{bestFor.shoe1 || 'General running'}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{shoe2.brand} {shoe2.model}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{bestFor.shoe2 || 'General running'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
