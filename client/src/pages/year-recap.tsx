import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { DashboardData } from "@/lib/api";
import { 
  Activity, 
  Download, 
  Share2
} from "lucide-react";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import YearRecapInfographic, { YearRecapInfographicRef } from "@/components/YearRecapInfographic";

interface YearlyStats {
  totalRuns: number;
  totalDistanceMeters: number;
  totalDistanceMiles: number;
  totalDistanceKm: number;
  totalTimeSeconds: number;
  totalElevationMeters: number;
  totalElevationFeet: number;
  longestRunMeters: number;
  longestRunMiles: number;
  longestRunKm: number;
  fastestPaceMinPerMile: number;
  fastestPaceMinPerKm: number;
  averagePaceMinPerMile: number;
  averagePaceMinPerKm: number;
  totalCalories: number;
  averageHeartrate: number | null;
  maxHeartrateAchieved: number | null;
  mostActiveMonth: string;
  mostActiveMonthRuns: number;
  streakDays: number;
  mostRunLocation: {
    name: string;
    latitude: number;
    longitude: number;
    runCount: number;
    description: string;
  } | null;
  averageCadence: number | null;
  zone2Hours: number | null;
  estimatedVO2Max: number | null;
  trainingDistribution: {
    easy: number;
    moderate: number;
    hard: number;
  };
  totalSufferScore: number;
  averageRunDistance: number;
  averageRunTime: number;
  favoriteDay?: { day: string; count: number };
  percentile?: number;
  aiInsights?: string[];
}

export default function YearRecapPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const selectedYear = currentYear.toString();
  const infographicRef = useRef<YearRecapInfographicRef>(null);

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  const unitPreference = (dashboardData?.user?.unitPreference || 'km') as 'km' | 'miles';

  const { data: stats, isLoading: statsLoading } = useQuery<YearlyStats>({
    queryKey: ['/api/year-recap', user?.id, 'stats', selectedYear],
    queryFn: async () => {
      return await apiRequest(`/api/year-recap/${user?.id}/stats?year=${selectedYear}`, 'GET');
    },
    enabled: !!user?.id,
  });

  const handleDownload = async () => {
    if (!infographicRef.current) return;
    
    try {
      const dataUrl = await infographicRef.current.generateImage();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `RunAnalytics-${selectedYear}-Recap.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!infographicRef.current) return;

    try {
      const dataUrl = await infographicRef.current.generateImage();
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `RunAnalytics-${selectedYear}-Recap.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My ${selectedYear} Running Year`,
          text: `Check out my ${selectedYear} running stats!`,
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(`Check out my ${selectedYear} Running Year with RunAnalytics!`);
        toast({
          title: "Link Copied!",
          description: "Share message copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Please download and share manually.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <>
        <AppHeader />
        <div className="container mx-auto py-8 px-4 min-h-screen">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-64 w-full max-w-2xl mx-auto" />
        </div>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AppHeader />
        <div className="container mx-auto py-8 px-4 text-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your Year in Running</h1>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Year in Running {selectedYear} | RunAnalytics</title>
        <meta name="description" content={`View your personalized ${selectedYear} running statistics and generate a beautiful infographic to share.`} />
      </Helmet>

      <AppHeader />
      
      <div className="container mx-auto py-8 px-4 max-w-4xl min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
            Your {selectedYear} Running Year
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a personalized infographic to share your achievements
          </p>
        </div>

        {statsLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : stats && stats.totalRuns > 0 ? (
          <div className="flex flex-col items-center gap-6">
            <YearRecapInfographic
              ref={infographicRef}
              stats={stats}
              userName={user.firstName || user.username || "Runner"}
              year={parseInt(selectedYear)}
              percentile={stats.percentile || 29}
              aiInsights={stats.aiInsights || []}
              favoriteDay={stats.favoriteDay}
              unitPreference={unitPreference}
            />

            <div className="flex gap-3">
              <Button 
                onClick={handleDownload}
                variant="outline"
                data-testid="button-download"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button 
                onClick={handleShare}
                className="bg-gradient-to-r from-orange-500 to-purple-600"
                data-testid="button-share"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Running Data for {selectedYear}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find any running activities for this year. Connect your Strava account and sync your activities to see your Year in Running.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </>
  );
}
