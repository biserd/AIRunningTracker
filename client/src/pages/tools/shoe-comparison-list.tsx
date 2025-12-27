import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { 
  ArrowLeft, 
  ArrowRight,
  Trophy,
  GitCompare,
  TrendingUp,
  Star
} from "lucide-react";
import type { RunningShoe, ShoeComparison } from "@shared/schema";

interface ComparisonWithShoes extends ShoeComparison {
  shoe1: RunningShoe;
  shoe2: RunningShoe;
}

const comparisonTypeLabels: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  evolution: { 
    label: "Model Evolution", 
    description: "Compare different versions of the same shoe line",
    icon: <TrendingUp className="h-5 w-5" />
  },
  category_rival: { 
    label: "Category Rivals", 
    description: "Head-to-head matchups in the same category",
    icon: <GitCompare className="h-5 w-5" />
  },
  popular: { 
    label: "Popular Matchups", 
    description: "Most-searched brand vs brand comparisons",
    icon: <Star className="h-5 w-5" />
  }
};

function ComparisonCard({ comparison }: { comparison: ComparisonWithShoes }) {
  const { shoe1, shoe2 } = comparison;
  const typeInfo = comparisonTypeLabels[comparison.comparisonType] || comparisonTypeLabels.popular;

  return (
    <Link href={`/tools/shoes/compare/${comparison.slug}`}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow group" data-testid={`comparison-card-${comparison.slug}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {typeInfo.label}
            </Badge>
            {comparison.verdictWinner && comparison.verdictWinner !== 'tie' && (
              <Badge className="bg-green-500 text-white text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                Winner
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-strava-orange transition-colors">
            {shoe1.brand} {shoe1.model} vs {shoe2.brand} {shoe2.model}
          </h3>
          <div className="flex justify-between text-sm text-gray-500">
            <span>${shoe1.price} vs ${shoe2.price}</span>
            <span>{shoe1.weight}oz vs {shoe2.weight}oz</span>
          </div>
          <div className="mt-3 flex items-center text-sm text-strava-orange group-hover:translate-x-1 transition-transform">
            View comparison <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ShoeComparisonList() {
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: comparisons, isLoading } = useQuery<ComparisonWithShoes[]>({
    queryKey: ['/api/shoes/comparisons'],
    queryFn: async () => {
      const res = await fetch('/api/shoes/comparisons');
      if (!res.ok) throw new Error('Failed to fetch comparisons');
      return res.json();
    }
  });

  const filteredComparisons = comparisons?.filter(c => 
    activeTab === 'all' || c.comparisonType === activeTab
  ) || [];

  const evolutionCount = comparisons?.filter(c => c.comparisonType === 'evolution').length || 0;
  const rivalCount = comparisons?.filter(c => c.comparisonType === 'category_rival').length || 0;
  const popularCount = comparisons?.filter(c => c.comparisonType === 'popular').length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Running Shoe Comparisons | Side-by-Side Reviews | RunAnalytics</title>
        <meta name="description" content="Compare running shoes side-by-side. Nike vs Adidas, AlphaFly vs Endorphin Pro, and more. Expert verdicts on weight, price, durability, and performance." />
        <meta property="og:title" content="Running Shoe Comparisons | RunAnalytics" />
        <meta property="og:description" content="Compare running shoes side-by-side with expert verdicts and detailed specs." />
        <link rel="canonical" href="https://aitracker.run/tools/shoes/compare" />
      </Helmet>

      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/tools/shoes">
          <a className="inline-flex items-center text-gray-600 hover:text-strava-orange mb-6" data-testid="link-back-shoes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Running Shoe Hub
          </a>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="page-title">
            Running Shoe Comparisons
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            Side-by-side comparisons of popular running shoes. Find out which shoe is right for you with our expert verdicts and detailed specs analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {Object.entries(comparisonTypeLabels).map(([type, info]) => {
            const count = type === 'evolution' ? evolutionCount : type === 'category_rival' ? rivalCount : popularCount;
            return (
              <Card key={type} className="text-center">
                <CardContent className="pt-6">
                  <div className="text-strava-orange mb-2">{info.icon}</div>
                  <h3 className="font-semibold">{info.label}</h3>
                  <p className="text-sm text-gray-500 mb-2">{info.description}</p>
                  <Badge variant="outline">{count} comparisons</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({comparisons?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="evolution" data-testid="tab-evolution">
              Evolution ({evolutionCount})
            </TabsTrigger>
            <TabsTrigger value="category_rival" data-testid="tab-rivals">
              Rivals ({rivalCount})
            </TabsTrigger>
            <TabsTrigger value="popular" data-testid="tab-popular">
              Popular ({popularCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredComparisons.length === 0 ? (
          <div className="text-center py-12">
            <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No comparisons yet</h3>
            <p className="text-gray-500 mb-4">Check back soon for new shoe comparisons!</p>
            <Link href="/tools/shoe-compare">
              <Button variant="outline" data-testid="button-create-comparison">
                Create Custom Comparison
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComparisons.map((comparison) => (
              <ComparisonCard key={comparison.id} comparison={comparison} />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Can't find the comparison you're looking for?</p>
          <Link href="/tools/shoe-compare">
            <Button data-testid="button-custom-compare">
              <GitCompare className="h-4 w-4 mr-2" />
              Create Custom Comparison
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
