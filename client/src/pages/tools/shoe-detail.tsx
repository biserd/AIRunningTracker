import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet";
import { useEffect } from "react";
import {
  ArrowLeft,
  Scale,
  Ruler,
  DollarSign,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Target,
  Award,
  ChevronRight,
  Activity,
  Gauge,
  BadgeCheck,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { RunningShoe } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  daily_trainer: "Daily Trainer",
  racing: "Racing",
  long_run: "Long Run",
  recovery: "Recovery",
  speed_training: "Speed Training",
  trail: "Trail",
};

const stabilityLabels: Record<string, string> = {
  neutral: "Neutral",
  mild_stability: "Mild Stability",
  motion_control: "Motion Control",
};

const cushioningLabels: Record<string, string> = {
  soft: "Soft",
  medium: "Medium",
  firm: "Firm",
};

function SpecCard({
  icon: Icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
      <div className="p-2 bg-strava-orange/10 rounded-lg">
        <Icon className="h-5 w-5 text-strava-orange" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
        {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
      </div>
    </div>
  );
}

function AIInsightPanel({
  resilienceScore,
  mileageEstimate,
  targetUsage,
}: {
  resilienceScore: number | null;
  mileageEstimate: string | null;
  targetUsage: string | null;
}) {
  const targetUsageList = targetUsage?.split(", ") || [];

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-purple-600" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {resilienceScore !== null && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Resilience Score
              </span>
              <span className="text-2xl font-bold text-purple-600">{resilienceScore}</span>
            </div>
            <Progress value={resilienceScore} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {resilienceScore >= 80
                ? "Exceptional durability for high-mileage training"
                : resilienceScore >= 60
                ? "Good balance of durability and performance"
                : "Designed for performance over longevity"}
            </p>
          </div>
        )}

        {mileageEstimate && (
          <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <Activity className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Mileage</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{mileageEstimate}</p>
            </div>
          </div>
        )}

        {targetUsageList.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Best For
            </p>
            <div className="flex flex-wrap gap-2">
              {targetUsageList.map((usage, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-white dark:bg-gray-800 border-purple-300 text-purple-700 dark:text-purple-300"
                  data-testid={`badge-usage-${idx}`}
                >
                  <Target className="h-3 w-3 mr-1" />
                  {usage}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeriesComparisonChart({ seriesShoes }: { seriesShoes: RunningShoe[] }) {
  if (seriesShoes.length <= 1) return null;

  const chartData = seriesShoes.map((shoe) => ({
    name: shoe.model,
    weight: shoe.weight,
    heelStack: shoe.heelStackHeight,
    forefootStack: shoe.forefootStackHeight,
    drop: shoe.heelToToeDrop,
    price: shoe.price,
  }));

  return (
    <Card data-testid="series-comparison-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-strava-orange" />
          Series Evolution
        </CardTitle>
        <p className="text-sm text-gray-500">
          How specifications have changed across versions
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="#FC4C02"
                name="Weight (oz)"
                strokeWidth={2}
                dot={{ fill: "#FC4C02" }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heelStack"
                stroke="#7C3AED"
                name="Heel Stack (mm)"
                strokeWidth={2}
                dot={{ fill: "#7C3AED" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                stroke="#059669"
                name="Price ($)"
                strokeWidth={2}
                dot={{ fill: "#059669" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {seriesShoes.map((shoe, idx) => (
            <Link
              key={shoe.id}
              href={`/tools/shoes/${shoe.slug}`}
              className="block"
            >
              <div className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                idx === seriesShoes.length - 1
                  ? "border-strava-orange bg-strava-orange/5"
                  : "border-gray-200 dark:border-gray-700"
              }`}>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {shoe.model}
                </p>
                <p className="text-xs text-gray-500">{shoe.weight} oz • ${shoe.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Breadcrumbs({ brand, model, slug }: { brand: string; model: string; slug: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap" data-testid="breadcrumbs">
        <li>
          <Link href="/tools" className="text-gray-500 hover:text-strava-orange">
            Tools
          </Link>
        </li>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <li>
          <Link href="/tools/shoes" className="text-gray-500 hover:text-strava-orange">
            Running Shoes
          </Link>
        </li>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <li>
          <span className="text-gray-900 dark:text-white font-medium">
            {brand} {model}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function ProductJsonLd({ shoe }: { shoe: RunningShoe }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${shoe.brand} ${shoe.model}`,
    description: shoe.description,
    brand: {
      "@type": "Brand",
      name: shoe.brand,
    },
    category: categoryLabels[shoe.category] || shoe.category,
    offers: {
      "@type": "Offer",
      price: shoe.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ((shoe.comfortRating + shoe.durabilityRating + shoe.responsivenessRating) / 3).toFixed(1),
      ratingCount: 50,
      bestRating: 5,
      worstRating: 1,
    },
    weight: {
      "@type": "QuantitativeValue",
      value: shoe.weight,
      unitCode: "OZ",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Heel Stack Height",
        value: `${shoe.heelStackHeight}mm`,
      },
      {
        "@type": "PropertyValue",
        name: "Forefoot Stack Height",
        value: `${shoe.forefootStackHeight}mm`,
      },
      {
        "@type": "PropertyValue",
        name: "Heel-to-Toe Drop",
        value: `${shoe.heelToToeDrop}mm`,
      },
      {
        "@type": "PropertyValue",
        name: "Stability",
        value: stabilityLabels[shoe.stability],
      },
      {
        "@type": "PropertyValue",
        name: "Cushioning Level",
        value: cushioningLabels[shoe.cushioningLevel],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function BreadcrumbJsonLd({ brand, model, slug }: { brand: string; model: string; slug: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Tools",
        item: "https://runanalytics.com/tools",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Running Shoes",
        item: "https://runanalytics.com/tools/shoes",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${brand} ${model}`,
        item: `https://runanalytics.com/tools/shoes/${slug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function ShoeDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";

  const { data, isLoading, error } = useQuery<{
    shoe: RunningShoe;
    seriesShoes: RunningShoe[];
    hasSeriesData: boolean;
  }>({
    queryKey: [`/api/shoes/by-slug/${slug}`],
    enabled: !!slug,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data?.shoe) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Shoe Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find the shoe you're looking for.
          </p>
          <Link href="/tools/shoes">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shoe Database
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const { shoe, seriesShoes, hasSeriesData } = data;
  const avgRating = (
    (shoe.comfortRating + shoe.durabilityRating + shoe.responsivenessRating) /
    3
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        <title>
          {shoe.brand} {shoe.model} Review & Specs | RunAnalytics Running Shoe Database
        </title>
        <meta
          name="description"
          content={`${shoe.brand} ${shoe.model} - ${shoe.description} Weight: ${shoe.weight}oz, Drop: ${shoe.heelToToeDrop}mm, Price: $${shoe.price}. AI-powered insights and series comparison.`}
        />
        <link rel="canonical" href={`https://runanalytics.com/tools/shoes/${shoe.slug}`} />
        <meta property="og:title" content={`${shoe.brand} ${shoe.model} | RunAnalytics`} />
        <meta
          property="og:description"
          content={`${shoe.description} - Complete specs, AI insights, and series comparison.`}
        />
        <meta property="og:type" content="product" />
        <meta
          property="og:url"
          content={`https://runanalytics.com/tools/shoes/${shoe.slug}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${shoe.brand} ${shoe.model}`} />
        <meta name="twitter:description" content={shoe.description || ""} />
      </Helmet>

      <ProductJsonLd shoe={shoe} />
      <BreadcrumbJsonLd brand={shoe.brand} model={shoe.model} slug={shoe.slug || ""} />

      <AppHeader />

      <main className="container mx-auto px-4 py-8" data-testid="shoe-detail-page">
        <Breadcrumbs brand={shoe.brand} model={shoe.model} slug={shoe.slug || ""} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-strava-orange mb-1">
                      {shoe.brand}
                    </p>
                    <h1
                      className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
                      data-testid="shoe-title"
                    >
                      {shoe.model}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="secondary" className="bg-gray-100">
                        {categoryLabels[shoe.category]}
                      </Badge>
                      <Badge variant="outline" className="border-gray-300">
                        {stabilityLabels[shoe.stability]}
                      </Badge>
                      {shoe.hasCarbonPlate && (
                        <Badge className="bg-purple-100 text-purple-700">
                          Carbon Plate
                        </Badge>
                      )}
                      {shoe.hasSuperFoam && (
                        <Badge className="bg-blue-100 text-blue-700">Super Foam</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{shoe.description}</p>
                  </div>
                  <div className="flex items-center gap-4 md:flex-col md:items-end">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xl font-bold">{avgRating}</span>
                    </div>
                    <p className="text-3xl font-bold text-strava-orange" data-testid="shoe-price">
                      ${shoe.price}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specifications Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-strava-orange" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SpecCard
                    icon={Scale}
                    label="Weight"
                    value={`${shoe.weight} oz`}
                    subLabel={`${(shoe.weight * 28.35).toFixed(0)}g`}
                  />
                  <SpecCard
                    icon={Ruler}
                    label="Heel Stack"
                    value={`${shoe.heelStackHeight}mm`}
                  />
                  <SpecCard
                    icon={Ruler}
                    label="Forefoot Stack"
                    value={`${shoe.forefootStackHeight}mm`}
                  />
                  <SpecCard
                    icon={TrendingUp}
                    label="Drop"
                    value={`${shoe.heelToToeDrop}mm`}
                  />
                  <SpecCard
                    icon={Shield}
                    label="Cushioning"
                    value={cushioningLabels[shoe.cushioningLevel]}
                  />
                  <SpecCard
                    icon={DollarSign}
                    label="MSRP"
                    value={`$${shoe.price}`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ratings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-strava-orange" />
                  Performance Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="mb-2">
                      <Progress value={shoe.comfortRating * 20} className="h-3" />
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{shoe.comfortRating}/5</p>
                    <p className="text-sm text-gray-500">Comfort</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-2">
                      <Progress value={shoe.durabilityRating * 20} className="h-3" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{shoe.durabilityRating}/5</p>
                    <p className="text-sm text-gray-500">Durability</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-2">
                      <Progress value={shoe.responsivenessRating * 20} className="h-3" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {shoe.responsivenessRating}/5
                    </p>
                    <p className="text-sm text-gray-500">Responsiveness</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            {shoe.aiFaq && (() => {
              try {
                const faqData = typeof shoe.aiFaq === 'string' ? JSON.parse(shoe.aiFaq) : shoe.aiFaq;
                if (!Array.isArray(faqData) || faqData.length === 0) return null;
                
                return (
                  <Card data-testid="faq-section">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-strava-orange" />
                        Frequently Asked Questions
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Common questions about the {shoe.brand} {shoe.model}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {faqData.map((faq: any, index: number) => (
                          <AccordionItem key={index} value={`faq-${index}`} data-testid={`faq-item-${index}`}>
                            <AccordionTrigger className="text-left">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {faq.q}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 dark:text-gray-400 pt-2">
                              {faq.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              } catch (err) {
                console.error("FAQ parsing error:", err);
                return null;
              }
            })()}

            {/* Series Comparison Chart */}
            {hasSeriesData && <SeriesComparisonChart seriesShoes={seriesShoes} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Insights Panel */}
            <AIInsightPanel
              resilienceScore={shoe.aiResilienceScore}
              mileageEstimate={shoe.aiMileageEstimate}
              targetUsage={shoe.aiTargetUsage}
            />

            {/* Quick Facts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BadgeCheck className="h-5 w-5 text-green-600" />
                  Quick Facts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Best For</span>
                  <span className="font-medium">{categoryLabels[shoe.category]}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Carbon Plate</span>
                  <span className="font-medium">{shoe.hasCarbonPlate ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Super Foam</span>
                  <span className="font-medium">{shoe.hasSuperFoam ? "Yes" : "No"}</span>
                </div>
                {shoe.releaseYear && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">Release Year</span>
                    <span className="font-medium">{shoe.releaseYear}</span>
                  </div>
                )}
                {shoe.seriesName && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400">Series</span>
                    <span className="font-medium">{shoe.seriesName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-gradient-to-br from-strava-orange to-orange-600 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-bold mb-2">Find Your Perfect Fit</h3>
                <p className="text-sm opacity-90 mb-4">
                  Use our AI-powered shoe finder to get personalized recommendations
                </p>
                <Link href="/tools/shoe-finder">
                  <Button variant="secondary" className="w-full" data-testid="button-shoe-finder">
                    Try Shoe Finder
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Related in Series */}
            {hasSeriesData && seriesShoes.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">More in {shoe.seriesName} Series</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {seriesShoes
                    .filter((s) => s.id !== shoe.id)
                    .slice(0, 3)
                    .map((relatedShoe) => (
                      <Link
                        key={relatedShoe.id}
                        href={`/tools/shoes/${relatedShoe.slug}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div>
                            <p className="font-medium text-sm">{relatedShoe.model}</p>
                            <p className="text-xs text-gray-500">
                              {relatedShoe.weight} oz • ${relatedShoe.price}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link href="/tools/shoes">
            <Button variant="outline" data-testid="button-back-to-shoes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shoe Database
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
